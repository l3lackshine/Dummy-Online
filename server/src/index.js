// index.js — จุดเริ่มเซิร์ฟเวอร์เกม: ตั้งค่า Express + Socket.IO แล้วประกอบระบบย่อยเข้าด้วยกัน
// ไฟล์นี้ไม่มีตรรกะของระบบไหนเลย — แต่ละระบบอยู่ไฟล์ของตัวเอง และคุยกันผ่าน ctx (ของกลางที่แชร์กัน)
//   room/       ห้อง: ตัวช่วยพื้นฐาน · ข้อมูลที่ส่งให้ client · เริ่ม/จบตา · เล่นต่อ · เข้า/ออกห้อง
//   match/      หาแมตช์ + หน้าต่างกดพร้อม          results/  บันทึกผลเกม + แรงก์ลงฐานข้อมูล
//   friends/    สถานะออนไลน์ + ชวนเข้าห้อง           net/      ด่านกรองข้อมูลจาก client
//   events/     ผูก Socket.IO event กับระบบข้างบน    rules/    กติกาเกม (เรียกผ่านทะเบียน Rules เท่านั้น)
// Public (ใช้ในเทส): module.exports = { server, io, rooms, online, friendCache }
// EXTEND: ระบบใหม่ = สร้างไฟล์ install<ระบบ>(ctx) แล้วเรียกใน buildContext() · event ใหม่ = เพิ่มไฟล์ใน events/ แล้วเรียกใน onConnection()
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const Rules = require('./rules');
const SB = require('./supabase');
const { readConfig } = require('./config');
const VERSION = require('../package.json').version;

const installRoomBasics = require('./room/basics');
const installLobbyView = require('./room/lobby-view');
const installGameFlow = require('./room/game-flow');
const installPlayOn = require('./room/play-on');
const installMembership = require('./room/membership');
const installMatchmaking = require('./match/matchmaking');
const installRecordResults = require('./results/record-results');
const installGuards = require('./net/guards');
const installFriends = require('./friends/presence');
const registerRoomEvents = require('./events/room-events');
const registerMatchEvents = require('./events/match-events');
const registerGameEvents = require('./events/game-events');
const registerEmoteEvents = require('./events/emote-events');

const config = readConfig();
const app = express();
app.use(cors({ origin: config.ORIGINS }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.ALLOWED_ORIGIN === '*' ? '*' : config.ORIGINS, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e5,
});

// ของกลางที่ทุกระบบใช้ร่วมกัน — แต่ละ install*() เติมฟังก์ชันของตัวเองลงไป (เรียกกันผ่าน ctx ตอนทำงาน จึงไม่ติดลำดับ)
function buildContext() {
  const ctx = { io, rooms: new Map(), config, SB };
  installGuards(ctx);
  installRoomBasics(ctx);
  installLobbyView(ctx);
  installGameFlow(ctx);
  installPlayOn(ctx);
  installMembership(ctx);
  installMatchmaking(ctx);
  installRecordResults(ctx);
  installFriends(ctx);
  return ctx;
}
const ctx = buildContext();

// ---------- HTTP ----------
// ส่งกุญแจแพ็กแอสเซ็ตตามสิทธิ์ผู้เล่น (ดู src/packkeys.js) — ต้องตั้ง PACK_MASTER ใน Environment
app.get('/pack-key', require('./packkeys').route({ master: config.PACK_MASTER, verifyToken: SB.verifyToken, ownsItem: SB.ownsItem }));
// db = ต่อฐานข้อมูลอยู่ไหม (ไม่บอกค่าคีย์)
app.get('/health', (_req, res) => res.json({ ok: true, service: 'dummy-online-4p', version: VERSION, rules: Rules.list().map(r => r.id), rooms: ctx.rooms.size, db: SB.enabled() }));
app.get('/', (_req, res) => res.send('Dummy Online backend is running'));

// ---------- ตรวจตัวตน: เปิดใช้ Supabase แล้วต้องแนบ access token ตอนเชื่อมต่อ (client ส่งใน auth.token) ----------
io.use(async (socket, next) => {
  if (!SB.enabled()) return next();
  const user = await SB.verifyToken(socket.handshake.auth && socket.handshake.auth.token);
  if (!user) return next(new Error('unauthorized'));
  socket.data.uid = user.id;
  socket.data.uname = user.name;
  next();
});

// รายการกฎ + ตัวเลือกของแต่ละกฎ ให้ client สร้างหน้าตั้งค่าห้องเอง
const rulesPayload = () => ({ version: VERSION, default: Rules.DEFAULT, rules: Rules.list() });

function onConnection(socket) {
  ctx.registerFriendEvents(socket);
  socket.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');
  socket.emit('rules:list', rulesPayload());
  ctx.on(socket, 'rules:get', () => {
    if (ctx.allow(socket)) socket.emit('rules:list', rulesPayload());
  });
  registerRoomEvents(socket, ctx);
  registerMatchEvents(socket, ctx);
  registerGameEvents(socket, ctx);
  registerEmoteEvents(socket, ctx);
}
io.on('connection', onConnection);

if (require.main === module) server.listen(config.PORT, () => console.log(`Dummy Online backend listening on ${config.PORT}`));
module.exports = { server, io, rooms: ctx.rooms, online: ctx.online, friendCache: ctx.friendCache };
