// events/match-events.js — Socket.IO: หาแมตช์ (ธรรมดา/แรงก์) · กดพร้อม · โหวตรอต่อ/เติมบอท
// Public: registerMatchEvents(socket, ctx)

function registerMatchEvents(socket, ctx) {
  const { rooms, SB } = ctx;
  const { on, allow, obj } = ctx;

  // ranked: true = ห้องแรงก์ (ต้องล็อกอิน · กติกามาตรฐานของเกมนั้น · ไม่มีบอท · นับตารางอันดับ)
  on(socket, 'match:find', raw =>
    ctx.withOwned(socket, raw, data => {
      if (!allow(socket)) return;
      if (socket.data.roomCode) return socket.emit('system:error', 'คุณอยู่ในห้องแล้ว');
      const ranked = data.ranked === true;
      const uid = socket.data.uid || null;
      if (ranked && !(SB.enabled() && uid)) return socket.emit('system:error', 'ต้องล็อกอินก่อนเล่นแรงก์');
      const room = ctx.findOrCreateMatchRoom(data.rule, data.options, ranked, uid);
      if (!room) return socket.emit('system:error', 'เซิร์ฟเวอร์เต็มชั่วคราว ลองใหม่อีกครั้ง');
      const player = ctx.joinRoom(socket, room, {
        name: data.name,
        ch: data.ch,
        bg: data.bg,
        fr: data.fr,
        s5: data.s5,
        farm: data.farm,
        e2: data.e2,
      });
      player.ready = true; // ห้องจับคู่ใช้หน้าต่างกดพร้อมแทนปุ่มพร้อม
      ctx.matchTick(room, true);
    })
  );

  // หน้าต่างกดพร้อม (ครบ 4 คนแล้ว): ทุกคนกด → เริ่มเกมทันที
  on(socket, 'match:accept', () => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (room) ctx.acceptReady(room, ctx.findPlayer(room, socket.id));
  });

  // โหวตตอนหาคนไม่ครบ: 'wait' รอต่อ · 'bots' เติมบอทแล้วเล่นเลย (เริ่มเมื่อทุกคนเลือกเติมบอท)
  on(socket, 'match:choice', raw => {
    if (!allow(socket)) return;
    const room = rooms.get(socket.data.roomCode);
    if (room) ctx.voteFill(room, socket.id, String(obj(raw).c || ''));
  });
}

module.exports = registerMatchEvents;
