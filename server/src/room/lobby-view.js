// room/lobby-view.js — ข้อมูลห้องที่ส่งให้ผู้เล่น (room:lobby) และสถานะเกมรายที่นั่ง (game:state)
// กฎสำคัญ: ไม่ส่งลำดับไพ่ที่สับแล้ว และไม่ส่งไพ่ในมือคนอื่น (view() ของกติกาแต่ละเกมกรองให้)
// Public: installLobbyView(ctx) → ctx.shufflerOf · publicLobby · emitLobby · emitStates
// EXTEND: ข้อมูลห้องที่ client ต้องการเพิ่ม ให้เพิ่มใน publicLobby() (ฟิลด์เดิมห้ามเปลี่ยนชื่อ — client เก่าใช้อยู่)

function installLobbyView(ctx) {
  const { io, config } = ctx;

  // สิทธิ์กดสับไพ่: ตาแรก = เจ้าของห้อง · ตาถัดไป = ผู้ชนะตาก่อนหน้า (ถ้าเขาออก/หลุด/เป็นบอท → กลับไปเป็นเจ้าของห้อง)
  function shufflerOf(room) {
    const winner = room.lastWinner;
    if (winner && winner.connected && winner.id && room.players.includes(winner)) return winner;
    return ctx.connectedPlayers(room)[0] || null;
  }

  // เซิร์ฟเวอร์สับให้เองตอนเริ่มเกม (ผู้เล่นไม่ต้องกดสับ) — คงฟิลด์ไว้ให้ client รุ่นเก่า
  const needShuffle = () => false;

  function shuffleInfo(room, forPlayer, shuffler) {
    return {
      ready: !!room.deck, // บอกแค่ว่าสับแล้วหรือยัง ไม่ส่งลำดับไพ่
      needed: needShuffle(room),
      by: room.shuffledBy || null,
      shuffler: shuffler ? shuffler.name : null,
      youShuffler: !!forPlayer && forPlayer === shuffler,
      round: room.round || 0,
      seq: room.shuffleSeq || 0,
    };
  }

  function matchInfo(room, forPlayer) {
    const match = room.match;
    if (!match) return null;
    return {
      state: match.state,
      ranked: !!match.ranked,
      readyLeftMs: match.state === 'ready' ? Math.max(0, match.readyUntil - Date.now()) : null,
      readyMs: config.MATCH_READY_MS,
      youAccepted: !!forPlayer && !!forPlayer.accepted,
      humans: ctx.connectedPlayers(room).length,
      max: config.MAX_PLAYERS,
      waitedMs: Date.now() - (match.since || Date.now()),
      prompt: match.prompt
        ? {
            leftMs: Math.max(0, match.prompt.until - Date.now()),
            voted: forPlayer ? match.prompt.votes[forPlayer.id] || null : null,
          }
        : null,
    };
  }

  function playerInfo(player, host, shuffler, forPlayer) {
    const isMe = !!forPlayer && player === forPlayer;
    return {
      name: player.name,
      ch: player.ch,
      bg: player.bg,
      fr: player.fr || null,
      s5: !!player.s5,
      connected: player.connected,
      acc: !!player.accepted,
      host: player === host,
      ready: player === host || !!player.ready, // เจ้าของห้องถือว่าพร้อมเสมอ
      again: !!player.again,
      farm: isMe ? player.farm : undefined, // โหมดฟาร์มเป็นของส่วนตัว เห็นเฉพาะตัวเอง
      shuffler: player === shuffler,
      seat: player.seat,
      you: isMe,
    };
  }

  function publicLobby(room, forPlayer) {
    ctx.settle(room); // ทำซ้ำได้ไม่เป็นไร: ให้ล็อบบี้สะท้อนผู้ชนะตาก่อนเสมอ
    const connected = ctx.connectedPlayers(room);
    const host = connected[0];
    const shuffler = shufflerOf(room);
    const others = connected.filter(p => p !== host);
    const rule = ctx.ruleOf(room).meta;
    return {
      code: room.code,
      started: ctx.active(room),
      maxPlayers: config.MAX_PLAYERS,
      rule: { id: rule.id, name: rule.name },
      options: room.options,
      youHost: !!forPlayer && forPlayer === host,
      shuffle: shuffleInfo(room, forPlayer, shuffler),
      allowBots: room.allowBots !== false, // ตั้งตอนสร้างห้อง เปลี่ยนระหว่างเล่นไม่ได้
      allReady: others.every(p => p.ready),
      waitingFor: others.filter(p => !p.ready).map(p => p.name),
      match: matchInfo(room, forPlayer),
      next: room.next ? { leftMs: room.next.until ? Math.max(0, room.next.until - Date.now()) : null } : null,
      players: room.players.map(p => playerInfo(p, host, shuffler, forPlayer)),
    };
  }

  function emitLobby(room) {
    for (const player of ctx.connectedPlayers(room)) {
      io.to(player.id).emit('room:lobby', publicLobby(room, player));
    }
  }

  // ส่งสถานะเกมให้ทุกที่นั่ง (แต่ละคนเห็นเฉพาะไพ่ของตัวเอง) แล้วตามด้วยข้อมูลห้อง
  function emitStates(room) {
    if (!room.game) return;
    ctx.settle(room);
    for (const player of room.players) {
      const hasSeat = player.connected && player.id && player.seat != null && room.game.P[player.seat];
      if (hasSeat) io.to(player.id).emit('game:state', ctx.ruleOf(room).view(room.game, player.seat));
    }
    emitLobby(room);
  }

  Object.assign(ctx, { shufflerOf, publicLobby, emitLobby, emitStates });
}

module.exports = installLobbyView;
