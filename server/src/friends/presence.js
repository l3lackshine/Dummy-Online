// friends/presence.js — เพื่อน: สถานะออนไลน์ + ชวนเข้าห้อง (รายชื่อเพื่อนมาจากฐานข้อมูล friend_ids · แคชสั้น ๆ)
// สถานะ: off · online · room (บอกรหัสห้องเฉพาะห้องที่เข้าได้) · matching · playing
// Public: installFriends(ctx) → ctx.online · friendCache · registerFriendEvents(socket)
// EXTEND: สถานะใหม่ ให้เพิ่มใน presenceOf() และหน้า client (Code/Friends/friends.js → ST)

const INVITE_COOLDOWN_MS = 5000;     // ชวนคนเดิมซ้ำได้ทุก 5 วินาที
const MAX_CACHED_USERS = 5000;       // กันแคชโตไม่หยุด
const MAX_USERNAME_LENGTH = 30;

function installFriends(ctx) {
  const { io, rooms, config, SB } = ctx;
  const online = new Map();        // uid → Set(socket.id) ของผู้เล่นที่ล็อกอินและเชื่อมต่ออยู่
  const friendCache = new Map();   // uid → { t, list: [{ id, username }] }

  async function friendsOf(uid, fresh) {
    const cached = friendCache.get(uid);
    if (cached && !fresh && Date.now() - cached.t < config.FRIEND_TTL_MS) return cached.list;
    const list = await SB.rpc('friend_ids', { p_user: uid });
    const friends = Array.isArray(list) ? list : [];
    friendCache.set(uid, { t: Date.now(), list: friends });
    if (friendCache.size > MAX_CACHED_USERS) friendCache.delete(friendCache.keys().next().value);
    return friends;
  }

  // ห้องที่เพื่อนกดเข้าร่วมได้: ห้องสร้างเอง (ไม่ใช่ห้องจับคู่/บทสอน) ที่ยังไม่เริ่มและยังไม่เต็ม
  const joinable = room => !!room && !room.match && !room.tutorial && !ctx.active(room) && ctx.connectedPlayers(room).length < config.MAX_PLAYERS;

  function presenceOf(uid) {
    const socketIds = online.get(uid);
    if (!socketIds || !socketIds.size) return { st: 'off' };
    for (const socketId of socketIds) {
      const socket = io.sockets.sockets.get(socketId);
      const room = socket && rooms.get(socket.data.roomCode);
      if (room) return roomPresence(room);
    }
    return { st: 'online' };
  }

  function roomPresence(room) {
    const rule = ctx.ruleOf(room).meta.name;
    if (ctx.active(room)) return { st: 'playing', rule, ranked: !!(room.match && room.match.ranked) };
    if (room.match) return { st: 'matching', rule };
    if (!joinable(room)) return { st: 'room', rule };
    return { st: 'room', rule, code: room.code, n: ctx.connectedPlayers(room).length, max: config.MAX_PLAYERS };
  }

  function trackOnline(socket) {
    const uid = socket.data.uid;
    if (!uid) return;
    if (!online.has(uid)) online.set(uid, new Set());
    online.get(uid).add(socket.id);
    socket.on('disconnect', () => {
      const socketIds = online.get(uid);
      if (!socketIds) return;
      socketIds.delete(socket.id);
      if (!socketIds.size) online.delete(uid);
    });
  }

  function sendPresence(socket, raw) {
    if (!ctx.allow(socket) || !SB.enabled() || !socket.data.uid) return;
    friendsOf(socket.data.uid, ctx.obj(raw).fresh === true)
      .then(list => {
        const out = {};
        list.forEach(friend => { out[friend.username] = presenceOf(friend.id); });
        socket.emit('friends:presence', out);
      })
      .catch(e => console.error('friends:presence', e && e.message));
  }

  function invite(socket, raw) {
    if (!ctx.allow(socket) || !SB.enabled() || !socket.data.uid) return;
    const username = String(ctx.obj(raw).username || '').toLowerCase().slice(0, MAX_USERNAME_LENGTH);
    const room = rooms.get(socket.data.roomCode);
    if (!joinable(room)) return socket.emit('system:error', 'ชวนเพื่อนได้เฉพาะห้องที่สร้างเอง ที่ยังไม่เริ่มเกมและยังไม่เต็ม');
    const lastInvites = socket.data.inv || (socket.data.inv = {});
    if (Date.now() - (lastInvites[username] || 0) < INVITE_COOLDOWN_MS) return;
    lastInvites[username] = Date.now();
    friendsOf(socket.data.uid)
      .then(list => deliverInvite(socket, room, list, username))
      .catch(e => console.error('friend:invite', e && e.message));
  }

  function deliverInvite(socket, room, friends, username) {
    const friend = friends.find(x => x.username === username);
    if (!friend) return socket.emit('system:error', 'ชวนได้เฉพาะเพื่อนในรายชื่อ');
    const socketIds = online.get(friend.id);
    if (!socketIds || !socketIds.size) return socket.emit('friend:invite-result', { username, ok: false, reason: 'เพื่อนออฟไลน์อยู่' });
    const me = ctx.findPlayer(room, socket.id);
    const message = {
      from: (me && me.name) || socket.data.uname || 'เพื่อน',
      code: room.code,
      rule: ctx.ruleOf(room).meta.name,
      n: ctx.connectedPlayers(room).length,
      max: config.MAX_PLAYERS,
    };
    socketIds.forEach(socketId => io.to(socketId).emit('friend:invite', message));
    socket.emit('friend:invite-result', { username, ok: true });
  }

  function registerFriendEvents(socket) {
    trackOnline(socket);
    ctx.on(socket, 'friends:presence', raw => sendPresence(socket, raw));
    ctx.on(socket, 'friend:invite', raw => invite(socket, raw));
  }

  Object.assign(ctx, { online, friendCache, registerFriendEvents });
}

module.exports = installFriends;
