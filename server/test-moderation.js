// ทดสอบระบบรายงานผู้เล่น + แบน/ปิดอีโมตฝั่งเซิร์ฟเวอร์ (จำลอง fetch — ไม่ยิง Supabase จริง)
// รายงานต้องส่งแค่เลขที่นั่ง · เซิร์ฟเวอร์หาบัญชีเอง · แบน = เชื่อมต่อไม่ได้ · ปิดอีโมต = อีโมตไม่ถึงคนอื่น · ฐานข้อมูลยังไม่มี v18 = ไม่มีโทษ
const assert = require('assert');
let passed = 0;
const ok = (c, m) => {
  assert(c, m);
  passed++;
  console.log('  ✓', m);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const USERS = { 'tok-alice': 'uid-alice', 'tok-bob': 'uid-bob', 'tok-banned': 'uid-banned', 'tok-old': 'uid-old' };
const SANCTIONS = {
  'uid-banned': { banned: true, banned_until: '2999-01-01T00:00:00Z', muted: false },
  'uid-bob': { banned: false, muted: true, muted_until: '2999-01-01T00:00:00Z' },
};
const calls = [];
global.fetch = async (url, opt = {}) => {
  const u = new URL(url),
    h = opt.headers || {},
    body = opt.body ? JSON.parse(opt.body) : null,
    res = (b, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(b) });
  calls.push({ path: u.pathname, body });
  if (u.pathname === '/auth/v1/user') {
    const id = USERS[(h.Authorization || '').replace('Bearer ', '')];
    return id ? res({ id }) : res({ message: 'bad jwt' }, 401);
  }
  if (u.pathname === '/rest/v1/profiles') return res([{ display_name: 'ผู้เล่น' }]);
  if (u.pathname === '/rest/v1/rpc/get_sanction') {
    if (body.p_user === 'uid-old') return res({ message: 'function not found' }, 404); // ฐานข้อมูลยังไม่มี v18
    return res(SANCTIONS[body.p_user] || { banned: false, muted: false });
  }
  if (u.pathname === '/rest/v1/rpc/record_report') return res({ id: 1, duplicate: false });
  return res(null, 204);
};
const M = require('./test-mock-sio');
(async () => {
  const srv = M.load({
    OPENING_MS: 0,
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
    BOT_DELAY_MS: '5',
  });
  const { rooms } = require('./src/index.js');
  console.log('Moderation: report + ban + mute');

  // ---------- แบน ----------
  const banned = srv.connect({ token: 'tok-banned' });
  await sleep(30);
  ok(banned.err && banned.err.message === 'unauthorized', 'บัญชีที่ถูกแบน → เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
  const old = srv.connect({ token: 'tok-old' });
  await sleep(30);
  ok(!old.err, 'ฐานข้อมูลยังไม่มี v18 (ตรวจโทษไม่ได้) → ยังเชื่อมต่อได้ตามปกติ');

  // ---------- ห้อง 2 คน ----------
  const alice = M.client(srv, { token: 'tok-alice' });
  const bob = M.client(srv, { token: 'tok-bob' });
  await sleep(50);
  let lobby = null;
  const reportReplies = [];
  const emotesSeenByAlice = [];
  const errorsForBob = [];
  alice.on('room:lobby', l => {
    lobby = l;
  });
  alice.on('report:done', r => reportReplies.push(r));
  alice.on('room:emote', e => emotesSeenByAlice.push(e));
  bob.on('system:error', m => errorsForBob.push(m));
  alice.emit('room:create', { name: 'a', ch: 'boy', rule: 'dummy', options: {}, bots: false });
  await sleep(30);
  bob.emit('room:join', { code: lobby.code, name: 'b', ch: 'girl' });
  await sleep(30);
  const room = rooms.get(lobby.code);
  ok(room && room.players.length === 2, 'สองคนอยู่ห้องเดียวกัน');
  room.players.forEach((p, i) => {
    p.seat = i; // จำลองว่าเริ่มเกมแล้ว (ที่นั่งถูกกำหนดตอนเริ่มตา)
  });

  // ---------- รายงาน ----------
  alice.emit('player:report', { seat: 1, reason: 'spam', note: 'ส่งอีโมตรัว' });
  await sleep(40);
  const sent = calls.filter(c => c.path === '/rest/v1/rpc/record_report');
  ok(sent.length === 1, 'รายงานถูกส่งไปฐานข้อมูล');
  ok(
    sent[0].body.p_reporter === 'uid-alice' && sent[0].body.p_target === 'uid-bob' && sent[0].body.p_reason === 'spam' && sent[0].body.p_room === lobby.code,
    'เซิร์ฟเวอร์หาบัญชีจากเลขที่นั่งเอง (client ไม่ได้ส่ง id บัญชี) + แนบรหัสห้อง'
  );
  ok(reportReplies[0] && reportReplies[0].ok === true, 'ผู้รายงานได้รับคำตอบว่าส่งแล้ว');

  alice.emit('player:report', { seat: 1, reason: 'spam' });
  await sleep(40);
  ok(reportReplies[1] && reportReplies[1].ok === false && calls.filter(c => c.path === '/rest/v1/rpc/record_report').length === 1,
    'กดรายงานติด ๆ กัน → ต้องรอ (ไม่ส่งซ้ำ)');

  const aliceSocket = [...srv.sockets.sockets.values()].find(s => s.data.uid === 'uid-alice');
  aliceSocket.data.reportAt = 0;
  alice.emit('player:report', { seat: 0, reason: 'spam' });
  alice.emit('player:report', { seat: 3, reason: 'spam' });
  alice.emit('player:report', { seat: 1, reason: 'bad-reason' });
  await sleep(40);
  ok(reportReplies.slice(2).every(r => r.ok === false) && calls.filter(c => c.path === '/rest/v1/rpc/record_report').length === 1,
    'รายงานตัวเอง · ที่นั่งว่าง/บอท · เหตุผลแปลก ๆ → ไม่ส่ง');

  // ---------- ปิดอีโมต ----------
  bob.emit('room:emote', { e: '👍' });
  await sleep(40);
  ok(emotesSeenByAlice.length === 0, 'บัญชีที่ถูกปิดอีโมต → อีโมตไม่ถึงคนอื่น');
  ok(errorsForBob.some(m => m.includes('ปิดการส่งอีโมต')), 'คนที่ถูกปิดอีโมตได้รับแจ้ง');
  alice.emit('room:emote', { e: '👍' });
  await sleep(40);
  ok(emotesSeenByAlice.length === 1, 'คนที่ไม่มีโทษส่งอีโมตได้ตามปกติ');

  console.log(`\n${passed} passed`);
  process.exit(0);
})().catch(e => {
  console.error('✗', e.message);
  process.exit(1);
});
