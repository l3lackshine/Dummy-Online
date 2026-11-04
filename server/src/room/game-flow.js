// room/game-flow.js — เริ่มตาใหม่ · ให้บอทเดิน · ปิดตาเมื่อจบ (บันทึกผล + เปิดหน้าสรุป)
// Public: installGameFlow(ctx) → ctx.startGame · scheduleBots · settle
// EXTEND: ห้องแบบพิเศษที่ต้องจัดสำรับเอง ให้เพิ่มเงื่อนไขใน gameSetup() (ดูตัวอย่างห้องสอนเล่น)
const Shuffle = require('../shuffle');
const DummyTutorial = require('../rules/dummy/tutorial');

function installGameFlow(ctx) {
  const { config, SB } = ctx;

  // ค่าที่ส่งให้ newGame ของกติกา: ห้องสอนเล่นใช้สำรับ/บอทตามสคริปต์ · ห้องปกติใช้สำรับที่เซิร์ฟเวอร์สับ
  function gameSetup(room, humanCount) {
    const tutorial = room.tutorial && room.rule === 'dummy' ? DummyTutorial : null;
    if (tutorial) {
      return { deck: tutorial.deck(), options: room.options, minSeats: config.MAX_PLAYERS, first: 0, script: tutorial.script() };
    }
    const deck = room.deck || Shuffle.shuffle().ids; // สับใหม่ทุกตาโดยเซิร์ฟเวอร์
    const minSeats = room.allowBots === false ? humanCount : config.MAX_PLAYERS; // ปิดบอท = เล่นเท่าจำนวนคนจริง
    return { deck, options: room.options, minSeats };
  }

  function startGame(room) {
    const humans = ctx.connectedPlayers(room);
    if (humans.length < 1 || humans.length > config.MAX_PLAYERS) return false;
    clearBotTimer(room);
    room.players = humans; // คนที่หลุดไปแล้วไม่ถูกนับในตาใหม่
    room.players.forEach((p, i) => {
      p.seat = i;
    });
    const setup = gameSetup(room, humans.length);
    room.deck = null; // สำรับที่สับไว้ใช้ได้ครั้งเดียว
    room.shuffledBy = null;
    room.shuffleSeq = (room.shuffleSeq || 0) + 1;
    room.players.forEach(p => {
      p.ready = false;
    });
    const seats = room.players.map(p => ({ id: p.id, n: p.name, ch: p.ch, bg: p.bg }));
    room.game = ctx.ruleOf(room).newGame(seats, setup);
    // ตัดสินตอนเริ่ม: คนหลุดกลางเกมแล้วบอทเล่นแทน ไม่ทำให้กลายเป็นเกมที่มีบอท
    room.game.humans0 = room.players.length;
    room.game.bots0 = room.game.P.length - room.players.length;
    ctx.closeNext(room);
    if (room.match) ctx.markMatchPlaying(room);
    room.game.v++;
    room.openingUntil = Date.now() + config.OPENING_MS;
    touchLastGame(room);
    ctx.emitStates(room);
    scheduleBots(room);
    return true;
  }

  function touchLastGame(room) {
    if (!SB.enabled()) return;
    for (const player of room.players) {
      if (player.uid) SB.rpc('touch_last_game', { p_user: player.uid, p_game: room.rule }).catch(() => {});
    }
  }

  function clearBotTimer(room) {
    if (!room.botTimer) return;
    clearTimeout(room.botTimer);
    room.botTimer = null;
  }

  // ถึงตาบอท → รอสักครู่ (และรอแอนิเมชันแจกไพ่ตอนเปิดตา) แล้วให้บอทเดิน 1 ครั้ง
  function scheduleBots(room) {
    if (!ctx.alive(room) || !room.game || room.game.over || room.botTimer) return;
    const current = room.game.P[room.game.cur];
    if (!current || !current.bot) return;
    const delay = Math.max(config.BOT_DELAY_MS, (room.openingUntil || 0) - Date.now());
    room.botTimer = setTimeout(() => playBotTurn(room), delay);
  }

  function playBotTurn(room) {
    room.botTimer = null;
    if (!ctx.alive(room) || !room.game || room.game.over) return;
    const current = room.game.P[room.game.cur];
    if (!current || !current.bot) return;
    try {
      ctx.ruleOf(room).botTurn(room.game);
    } catch (e) {
      console.error('botTurn error', e);
      return;
    }
    room.game.v++;
    ctx.emitStates(room);
    scheduleBots(room);
  }

  // จบตาแล้ว (ทำครั้งเดียวต่อเกม): บันทึกผล · จดผู้ชนะไว้ให้สิทธิ์สับตาถัดไป · เปิดหน้าสรุปให้กดเล่นต่อ
  function settle(room) {
    const game = room.game;
    if (!game || !game.over || game.settled) return;
    game.settled = true;
    const seat = ctx.ruleOf(room).winner(game);
    const winner = seat == null ? null : room.players.find(p => p.seat === seat);
    if (!room.tutorial) ctx.recordResults(room); // ตาสอนเล่นไม่นับผล ไม่หักสตามิน่า
    room.lastWinner = winner || null; // ผู้ชนะเป็นบอท → เจ้าของห้องได้สิทธิ์สับแทน
    room.round = (room.round || 0) + 1;
    ctx.openNext(room);
  }

  Object.assign(ctx, { startGame, scheduleBots, settle, clearBotTimer });
}

module.exports = installGameFlow;
