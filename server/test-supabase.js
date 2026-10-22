// ทดสอบการเชื่อม Supabase ฝั่งเซิร์ฟเวอร์ (จำลอง fetch — ไม่ยิง Supabase จริง): ตรวจ token, ชื่อจากฐานข้อมูล, บันทึกผลเกม, ส่งยอดใหม่กลับ client
const assert = require('assert');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const calls = [];
global.fetch = async (url, opt = {}) => {
  const u = new URL(url), h = opt.headers || {}, res = (b, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(b) });
  calls.push({ path: u.pathname + u.search, h, body: opt.body ? JSON.parse(opt.body) : null });
  if (u.pathname === '/auth/v1/user') { const t = (h.Authorization || '').replace('Bearer ', ''); return t === 'tok-alice' ? res({ id: 'uid-alice' }) : res({ message: 'bad jwt' }, 401); }
  if (u.pathname === '/rest/v1/profiles') return res([{ display_name: 'อลิซจากDB' }]);
  if (u.pathname === '/rest/v1/rpc/record_game_result') return res({ duplicate: false, result: 'win', delta: opt.body ? JSON.parse(opt.body).p_delta : 0, bonus: 5, coins: 5205, mcash: 0 });
  if (u.pathname === '/rest/v1/rpc/touch_last_game') return res(null, 204);
  return res({ message: 'unexpected ' + u.pathname }, 404);
};
const M = require('./test-mock-sio');
(async () => {
  const srv = M.load({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', SUPABASE_SECRET_KEY: 'sb_secret_test', BOT_DELAY_MS: '5' });
  const { rooms } = require('./src/index.js');
  console.log('Supabase server integration');
  const bad = srv.connect({ token: 'nope' }); await sleep(30);
  ok(bad.err && bad.err.message === 'unauthorized', 'token ผิด → เชื่อมต่อไม่ได้ (unauthorized)');
  const none = srv.connect({}); await sleep(30);
  ok(none.err && none.err.message === 'unauthorized', 'ไม่มี token → เชื่อมต่อไม่ได้');
  ok(calls.every(c => c.h.Authorization === undefined || c.path === '/auth/v1/user'), 'secret key ไม่ถูกส่งเป็น Bearer ของผู้ใช้');
  ok(calls.filter(c => c.path.startsWith('/rest/')).every(c => c.h.apikey === 'sb_secret_test'), 'คำสั่งฐานข้อมูลใช้ secret key ผ่าน apikey');

  const c = M.client(srv, { token: 'tok-alice' }); await sleep(50);
  let lob = null, wallet = null; c.on('room:lobby', l => { lob = l; }); c.on('wallet:update', w => { wallet = w; });
  c.emit('room:create', { name: 'ชื่อปลอม', ch: 'boy', rule: 'dummy', options: { stake: 20 }, bots: true }); await sleep(30);
  ok(lob && lob.players[0].name === 'อลิซจากDB', 'ชื่อผู้เล่นใช้ display_name จากฐานข้อมูล ไม่ใช่ที่ client ส่งมา');
  c.emit('game:shuffle'); await sleep(30); c.emit('game:start'); await sleep(50);
  ok(calls.some(x => x.path.endsWith('touch_last_game') && x.body.p_user === 'uid-alice' && x.body.p_game === 'dummy'), 'เริ่มเกม → บันทึกเกมล่าสุด');

  const room = [...rooms.values()][0], G = room.game;
  G.over = true; G.res = { k: 0, coin: { delta: [120, -40, -40, -40], lines: [], stake: 20 }, pts: [0, 0, 0, 0], nt: [[], [], [], []] };
  G.melds = [{ o: 0, cs: [1, 2, 3] }, { o: 0, cs: [4, 5, 6] }, { o: 1, cs: [7, 8, 9] }];
  c.emit('game:shuffle'); await sleep(80);  // ทำให้เซิร์ฟเวอร์ประมวลผลจบตา (settle)
  const rec = calls.filter(x => x.path.endsWith('record_game_result'));
  ok(rec.length === 1, 'จบตา → บันทึกผลครั้งเดียวต่อผู้เล่นที่ล็อกอิน (บอทไม่ถูกบันทึก)');
  const a = rec[0].body;
  ok(a.p_user === 'uid-alice' && a.p_game === 'dummy' && a.p_delta === 120 && a.p_won === true && a.p_melds === 2 && a.p_knock === true && a.p_char === 'boy', 'ส่งผลถูก: เดลตา 120, ชนะ, เกิด 2 ชุด, น็อก, ตัวละคร boy');
  ok(a.p_gid === G.gid, 'ใช้ gid ของเกมกันบันทึกซ้ำ');
  c.emit('game:shuffle'); await sleep(60);
  ok(calls.filter(x => x.path.endsWith('record_game_result')).length === 1, 'event ต่อมาไม่บันทึกซ้ำ');
  ok(wallet && wallet.coins === 5205 && wallet.bonus === 5 && wallet.gid === G.gid, 'client ได้รับ wallet:update (ยอดใหม่ + โบนัส)');
  console.log(`\n${passed} passed`); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
