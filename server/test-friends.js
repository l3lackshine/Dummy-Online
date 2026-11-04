// เพื่อน: สถานะออนไลน์ (เห็นเฉพาะเพื่อน) · ชวนเข้าห้อง (เฉพาะเพื่อน · ห้องสร้างเองที่ยังไม่เริ่ม) · คนถูกชวนเข้าห้องได้
const assert = require('assert'),
  M = require('./test-mock-sio'),
  SB = require('./src/supabase');
const FR = { u1: ['u2'], u2: ['u1'], u3: [] };
SB.enabled = () => true;
SB.verifyToken = async t => (FR[t] ? { id: t, name: 'ชื่อ' + t } : null);
SB.ownsItem = async () => false;
SB.charStars = async () => 1;
SB.rpc = async (fn, a) => (fn === 'friend_ids' ? (FR[a.p_user] || []).map(id => ({ id, username: 'n_' + id })) : {});
SB.rpcRetry = async () => ({});
let passed = 0;
const ok = (c, m) => {
  assert(c, m);
  passed++;
  console.log('  ✓', m);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 2000, what = '') => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (fn()) return;
    await sleep(10);
  }
  throw new Error('timeout: ' + what);
};
(async () => {
  const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 100000, NEXT_MS: 0, FRIEND_TTL_MS: 0, RATE_PER_SEC: 5000 });
  const cl = uid => {
    const c = M.client(srv, { token: uid }),
      o = { c, pres: null, inv: null, res: null, joined: null, errs: [] };
    c.on('friends:presence', p => {
      o.pres = p;
    });
    c.on('friend:invite', d => {
      o.inv = d;
    });
    c.on('friend:invite-result', d => {
      o.res = d;
    });
    c.on('room:joined', d => {
      o.joined = d;
    });
    c.on('system:error', e => o.errs.push(e));
    return o;
  };
  const a = cl('u1');
  await sleep(30);
  a.c.emit('friends:presence');
  await until(() => a.pres, 2000, 'pres');
  ok(
    a.pres.n_u2 && a.pres.n_u2.st === 'off' && !('n_u3' in a.pres),
    'เพื่อนยังไม่เข้าเกม → ออฟไลน์ · คนที่ไม่ใช่เพื่อนไม่อยู่ในรายการ'
  );
  const b = cl('u2'),
    c3 = cl('u3');
  await sleep(30);
  a.pres = null;
  a.c.emit('friends:presence');
  await until(() => a.pres);
  ok(a.pres.n_u2.st === 'online', 'เพื่อนเชื่อมต่อแล้ว → ออนไลน์');
  a.c.emit('friend:invite', { username: 'n_u2' });
  await until(() => a.errs.length, 1000, 'need room');
  ok(/ห้องที่สร้างเอง/.test(a.errs[0]), 'ยังไม่อยู่ในห้อง → ชวนไม่ได้');
  a.c.emit('room:create', { name: 'u1', rule: 'dummy', bots: false });
  await until(() => a.joined);
  b.pres = null;
  b.c.emit('friends:presence');
  await until(() => b.pres);
  ok(b.pres.n_u1.st === 'room' && b.pres.n_u1.code === a.joined.code, 'เพื่อนเห็นว่าอยู่ในห้อง พร้อมรหัสห้องให้กดเข้าร่วม');
  a.c.emit('friend:invite', { username: 'N_U2' });
  await until(() => b.inv && a.res);
  ok(b.inv.code === a.joined.code && b.inv.from === 'ชื่อu1' && a.res.ok, 'ชวนเพื่อน → เพื่อนได้รับคำชวนพร้อมรหัสห้อง');
  a.errs.length = 0;
  a.c.emit('friend:invite', { username: 'n_u3' });
  await sleep(80);
  ok(!c3.inv && a.errs.some(e => /เฉพาะเพื่อน/.test(e)), 'ชวนคนที่ไม่ใช่เพื่อนไม่ได้');
  b.c.emit('room:join', { code: b.inv.code, name: 'u2' });
  await until(() => b.joined);
  ok(b.joined.code === a.joined.code, 'กดรับคำชวน → เข้าห้องเพื่อน');
  b.c.emit('game:ready', { ready: true });
  await sleep(20);
  a.c.emit('game:start');
  await sleep(60);
  c3.pres = null;
  a.pres = null;
  a.c.emit('friends:presence');
  await until(() => a.pres);
  ok(a.pres.n_u2.st === 'playing' && !a.pres.n_u2.code, 'กำลังเล่น → ไม่ส่งรหัสห้อง');
  b.c.close();
  await sleep(40);
  a.pres = null;
  a.c.emit('friends:presence');
  await until(() => a.pres);
  ok(a.pres.n_u2.st === 'off', 'เพื่อนปิดเกม → ออฟไลน์');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
  process.exit(0);
})().catch(e => {
  console.error('\n✗ ล้มเหลว:', e.message);
  process.exit(1);
});
