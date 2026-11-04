// results/record-results.js — จบตา: ส่งผลของผู้เล่นที่ล็อกอินเข้าฐานข้อมูล แล้วแจ้งยอดใหม่กลับไปที่ client
// - record_game_result: เหรียญตามอันดับ (ไม่มีเดิมพัน — ดู economy.js) · ฐานข้อมูลตัดเพดานรายวัน/คิด EXP/สตามิน่า/แบทเทิลพาส
// - record_rank: ตารางอันดับรายสัปดาห์ + แรงก์ — เฉพาะห้องแรงก์ (คนจริงล้วน) · อันดับคิดในหมู่ผู้เล่นที่ล็อกอิน
// Public: installRecordResults(ctx) → ctx.recordResults
const Economy = require('../economy');

function installRecordResults(ctx) {
  const { io, SB } = ctx;

  // อันดับใช้ผลชิป/แต้มในโต๊ะของตานั้น (G.res.coin.delta) · เสมอกัน: ผู้ชนะตามกติกาได้อันดับดีกว่า
  function standings(room) {
    const game = room.game;
    const delta = (game.res && game.res.coin && game.res.coin.delta) || game.P.map(() => 0);
    const winner = ctx.ruleOf(room).winner(game);
    const ranks = Economy.ranks(delta.map((v, i) => (Number(v) || 0) + (i === winner ? 0.5 : 0)));
    const humans =
      game.humans0 != null
        ? game.humans0
        : room.players.filter(p => p.seat != null && game.P[p.seat] && !game.P[p.seat].bot).length;
    const bots = (game.bots0 != null ? game.bots0 : game.P.length - humans) > 0;
    return { ranks, seats: game.P.length, humans, bots };
  }

  function recordResults(room) {
    if (!SB.enabled()) return;
    const game = room.game;
    const gameId = String(game.gid || room.code + ':' + room.round);
    const result = standings(room);
    // ที่นั่งที่นับตารางอันดับ: คนจริงที่ล็อกอิน (แขกไม่นับ กันเปิดแท็บแขกมาปั่นแต้ม)
    const rankSeats = room.players.filter(p => p.uid && p.seat != null && game.P[p.seat] && !game.P[p.seat].bot).map(p => p.seat);
    for (const player of room.players) {
      if (!player.uid || player.seat == null || !game.P[player.seat]) continue;
      recordPlayerResult(room, player, gameId, result);
      if (room.match && room.match.ranked && !result.bots && rankSeats.length >= 2)
        recordRank(room, player, gameId, result, rankSeats);
    }
  }

  function recordPlayerResult(room, player, gameId, result) {
    const game = room.game;
    const seat = player.seat;
    const rank = result.ranks[seat];
    const reward = Economy.reward(rank, result.seats, result.bots ? 1 : result.humans); // โต๊ะมีบอท: ไม่มีโบนัสคนจริง
    const isDummy = room.rule === 'dummy';
    const args = {
      p_user: player.uid,
      p_gid: gameId,
      p_game: room.rule,
      p_delta: reward,
      p_won: rank === 1,
      p_melds: isDummy ? (game.melds || []).filter(m => m.o === seat).length : 0,
      p_knock: isDummy && !!game.res && game.res.k === seat,
      p_char: player.ch || null,
      p_bots: result.bots, // มีบอท = หักสตามิน่า + ได้ของตามโหมดฟาร์ม (ฐานข้อมูลตัดสิน)
      p_farm: player.farm || 'coins',
      p_rank: rank,
      p_seats: result.seats,
    };
    SB.rpcRetry('record_game_result', args)
      .then(r => {
        if (r && player.id)
          io.to(player.id).emit('wallet:update', {
            gid: gameId,
            rank,
            seats: result.seats,
            humans: result.humans,
            bots: result.bots,
            reward,
            ...r,
          });
      })
      .catch(e => console.error('record_game_result failed', e && e.message));
  }

  function recordRank(room, player, gameId, result, rankSeats) {
    const rank = result.ranks[player.seat];
    const humanRank = 1 + rankSeats.filter(seat => result.ranks[seat] < rank).length;
    SB.rpcRetry('record_rank', {
      p_user: player.uid,
      p_gid: gameId,
      p_game: room.rule,
      p_hrank: humanRank,
      p_humans: rankSeats.length,
    })
      .then(r => {
        if (r && r.counted && player.id) io.to(player.id).emit('rank:update', r);
      })
      .catch(e => console.error('record_rank failed', e && e.message));
  }

  Object.assign(ctx, { recordResults });
}

module.exports = installRecordResults;
