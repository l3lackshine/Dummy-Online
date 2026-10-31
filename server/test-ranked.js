// ห้องแรงก์: ต้องล็อกอิน · ไม่มีบอท (ไม่มีโหวตเติมบอท) · ครบ 4 คนกดพร้อมแล้วเริ่ม · บัญชีเดียวกันไม่ลงห้องเดียวกัน · จบตาส่งผลเข้า record_rank เฉพาะห้องแรงก์
const assert = require('assert'), M = require('./test-mock-sio'), SB = require('./src/supabase');
SB.enabled = () => true;
SB.verifyToken = async t => (t && t.startsWith('u') ? { id: t, name: t } : null);
SB.ownsItem = async () => false; SB.charStars = async () => 1;
const calls = []; SB.rpc = async () => ({}); SB.rpcRetry = async (fn, a) => { calls.push({ fn, a }); return fn === 'record_rank' ? { counted: true, pts: 30 } : {}; };
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 3000, what = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return; await sleep(10); } throw new Error('timeout: ' + what); };
(async () => {
  const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 100000, MATCH_WAIT_MS: 150, MATCH_PROMPT_MS: 150, MATCH_READY_MS: 400, NEXT_MS: 0 });
  const rooms = require.cache[require.resolve('./src/index.js')].exports.rooms;
  const cl = uid => { const c = M.client(srv, { token: uid }), o = { c, uid, lob: null, joined: null, errs: [], S: null }; c.on('room:lobby', l => { o.lob = l; }); c.on('room:joined', d => { o.joined = d; }); c.on('system:error', e => o.errs.push(e)); c.on('game:state', s => { o.S = s; }); return o; };
  const rk = (o, rule = 'pokdeng') => o.c.emit('match:find', { name: o.uid, rule, ranked: true, options: { stake: 999 } });
  await sleep(20);
  const [a, b, c, d, a2] = ['u1', 'u2', 'u3', 'u4', 'u1'].map(cl); await sleep(30);
  rk(a); await until(() => a.lob, 2000, 'a lob'); ok(a.lob.match.ranked && a.lob.allowBots === false, 'เข้าห้องแรงก์: ไม่มีบอท');
  const R = rooms.get(a.joined.code); ok(JSON.stringify(R.options) === JSON.stringify(require('./src/rules').cleanOptions('pokdeng', {})), 'ห้องแรงก์ใช้กติกามาตรฐาน (ไม่สนตัวเลือกที่ส่งมา)');
  rk(a2); await until(() => a2.joined, 2000, 'a2'); ok(a2.joined.code !== a.joined.code, 'บัญชีเดียวกันสองแท็บ → ไม่ลงห้องเดียวกัน'); a2.c.emit('room:leave'); await sleep(30);
  b.c.emit('match:find', { name: 'u2', rule: 'pokdeng' }); await until(() => b.joined, 2000, 'b'); ok(b.joined.code !== a.joined.code, 'หาแมตช์ธรรมดา ไม่ปนกับห้องแรงก์'); b.c.emit('room:leave'); await sleep(30); b.joined = null;
  await sleep(400); ok(!a.lob.match.prompt && a.lob.match.state === 'searching', 'ห้องแรงก์ไม่ถามเติมบอท รอจนครบ');
  rk(b); rk(c); rk(d); await until(() => a.lob.match.state === 'ready', 2000, 'ready'); ok([b, c, d].every(o => o.joined.code === a.joined.code), 'ครบ 4 คน → หน้าต่างกดพร้อม');
  [a, b, c, d].forEach(o => o.c.emit('match:accept')); await until(() => a.S && d.S, 2000, 'start');
  ok(R.game.P.length === 4 && R.game.P.every(p => !p.bot), 'เริ่มเกม 4 คนจริง ไม่มีบอท');
  // จบตา → ส่ง record_rank ทุกคน (อันดับในหมู่คนจริง 1–4)
  R.game.over = true; R.game.res = { coin: { delta: [30, 10, -10, -30] } }; R.game.v++; a.c.emit('game:ready', { ready: true }); await sleep(80);
  const rr = calls.filter(x => x.fn === 'record_rank');
  ok(rr.length === 4 && rr.every(x => x.a.p_humans === 4 && x.a.p_game === 'pokdeng') && new Set(rr.map(x => x.a.p_hrank)).size === 4, 'จบตาห้องแรงก์ → บันทึกแรงก์ครบ 4 คน อันดับไม่ซ้ำ');
  // ห้องธรรมดาที่มีคน 2 คน (เติมบอท) → ไม่บันทึกแรงก์
  calls.length = 0; const [e, f] = ['u5', 'u6'].map(cl); await sleep(30);
  e.c.emit('room:create', { name: 'u5', rule: 'pokdeng', bots: false }); await until(() => e.joined); f.c.emit('room:join', { code: e.joined.code, name: 'u6' }); await until(() => f.joined);
  f.c.emit('game:ready', { ready: true }); await sleep(30); e.c.emit('game:start'); await until(() => e.S, 2000, 'custom start');
  const R2 = rooms.get(e.joined.code); R2.game.over = true; R2.game.res = { coin: { delta: [30, -30] } }; R2.game.v++; e.c.emit('game:ready', { ready: true }); await sleep(80);
  ok(calls.some(x => x.fn === 'record_game_result') && !calls.some(x => x.fn === 'record_rank'), 'ห้องสร้างเอง (คนล้วนก็ตาม) → ไม่นับแรงก์');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`); process.exit(0);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
