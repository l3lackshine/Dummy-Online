// ทดสอบ src/index.js ตัวจริงกับระบบบัญชี: ล็อกอินด้วยโทเคน · ซื้อของ · บันทึกสกิน · จบตาแล้วบันทึกผล/จ่ายเหรียญ · หลุดแล้วกลับ · ลองใหม่เมื่อ DB ล้มเหลว
// ใช้ตัวจำลอง socket.io (test-mock-sio.js) + ที่เก็บหน่วยความจำ (โทเคนทดสอบ "test:<uuid>" เปิดด้วย DB_TEST_TOKENS=1)
const assert = require('assert'), M = require('./test-mock-sio');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const until = async (fn, ms = 4000, what = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(10); } throw new Error('timeout: ' + what); };
const UA = '11111111-1111-4111-8111-111111111111', UB = '22222222-2222-4222-8222-222222222222', UG = '33333333-3333-4333-8333-333333333333';
function cli(srv) {
  const c = { me: null, mes: 0, err: [], aerr: [], shop: [], joined: null, lob: null, S: null, sock: M.client(srv) };
  c.sock.on('me', m => { c.me = m; c.mes++; }); c.sock.on('auth:error', m => c.aerr.push(m)); c.sock.on('system:error', m => c.err.push(m));
  c.sock.on('shop:result', r => c.shop.push(r)); c.sock.on('room:joined', d => { c.joined = d; }); c.sock.on('room:lobby', l => { c.lob = l; }); c.sock.on('game:state', s => { c.S = s; });
  c.emit = (ev, d) => c.sock.emit(ev, d);
  c.login = async (u, name) => { const n = c.mes; c.emit('auth:token', { token: 'test:' + u, name }); await until(() => c.mes > n, 3000, 'me ' + u); };
  return c;
}
(async () => {
  const A = M.load({ BOT_DELAY_MS: 15, EMPTY_ROOM_TTL_MS: 2000, RATE_PER_SEC: 5000, DB_TEST_TOKENS: '1', SETTLE_RETRY_MS: 10 });
  const X = require.cache[require.resolve('./src/index.js')].exports, rooms = X.rooms, db = X.db;
  const force = (R, delta) => { R.game.over = true; R.game.res = { k: delta.indexOf(Math.max(...delta)), nt: [[], [], [], []], pts: [0, 0, 0, 0], coin: { stake: 20, delta, lines: [] } }; };
  // ทำให้ตาที่บังคับจบถูก settle: การเข้า/ออกห้องของคนอื่นทำให้เซิร์ฟเวอร์ส่งล็อบบี้ (ซึ่งเรียก settle)
  const poke = async R => { const j = cli(A); j.emit('room:join', { code: R.code, name: 'poke' }); await until(() => j.joined, 2000, 'poke join'); j.emit('room:leave'); };
  const startSolo = async (c, opts) => { c.joined = null; c.S = null; c.emit('room:create', Object.assign({ name: 'x' }, opts)); await until(() => c.joined, 2000, 'create'); const R = rooms.get(c.joined.code); c.emit('game:shuffle'); await until(() => R.deck, 2000, 'shuffle'); c.emit('game:start'); await until(() => c.S, 2000, 'start'); return R; };

  console.log('[1] เข้าสู่ระบบ');
  ok(M.callRoute(A, '/health').db === 'memory', '/health บอกชนิดที่เก็บข้อมูล');
  const G0 = cli(A); await sleep(30); ok(G0.me === null, 'แขกที่ไม่ล็อกอิน ไม่ได้รับข้อมูลบัญชี');
  G0.emit('shop:buy', { kind: 'backs', id: 'gold' }); await until(() => G0.shop.length, 2000, 'guest shop');
  ok(!G0.shop[0].ok && /เข้าสู่ระบบ/.test(G0.shop[0].error), 'แขกซื้อของบนเซิร์ฟเวอร์ไม่ได้');
  const bad = cli(A); bad.emit('auth:token', { token: 'garbage' }); await until(() => bad.aerr.length, 2000, 'bad token');
  ok(bad.me === null && /ไม่ถูกต้อง/.test(bad.aerr[0]), 'โทเคนปลอม → ไม่ได้บัญชี');
  bad.emit('auth:token', null); bad.emit('auth:token', { token: 123 }); await sleep(50); ok(bad.me === null && bad.aerr.length === 3, 'payload ขยะไม่ทำให้เซิร์ฟเวอร์ล้ม');
  const H = cli(A); await H.login(UA, 'อลิซ');
  ok(H.me.account && H.me.coins === 5000 && H.me.name === 'อลิซ' && Array.isArray(H.me.own) && H.me.own.length === 0 && H.me.eq === 'classic', 'ล็อกอินแล้วได้ me: ชื่อ/เหรียญ 5000/ของที่ซื้อ/ธีม');

  console.log('\n[2] ซื้อของ + บันทึกสกิน');
  H.emit('shop:buy', { kind: 'characters', id: 'rina-01' }); await until(() => H.shop.length, 2000, 'buy');
  ok(H.shop[0].ok && H.me.coins === 3500 && H.me.own.includes('characters:rina-01'), 'ซื้อตัวละคร 1500 → เหลือ 3500 และได้ของ');
  H.emit('shop:buy', { kind: 'characters', id: 'rina-01' }); await until(() => H.shop.length === 2, 2000, 'buy2'); ok(H.shop[1].ok && H.me.coins === 3500, 'ซื้อซ้ำไม่หักซ้ำ');
  H.emit('shop:buy', { kind: 'characters', id: 'ไม่มี' }); H.emit('shop:buy', { kind: '../x', id: 'a' }); H.emit('shop:buy', { price: 0 }); await until(() => H.shop.length === 5, 2000, 'buy bad');
  ok(H.shop.slice(2).every(r => !r.ok) && H.me.coins === 3500, 'สินค้าไม่มี/รูปแบบแปลก → ปฏิเสธ ไม่หักเหรียญ');
  db._profiles.get(UA).coins = 100; H.emit('shop:buy', { kind: 'backs', id: 'gold' }); await until(() => H.shop.length === 6, 2000, 'insufficient');
  ok(!H.shop[5].ok && /เหรียญไม่พอ/.test(H.shop[5].error) && H.me.coins === 100, 'เหรียญไม่พอ → ปฏิเสธ'); db._profiles.get(UA).coins = 3500;
  H.emit('profile:save', { name: 'อลิซใหม่', equipped: { dummyCharacterSkin: 'rina-01', dummyBackSkin: 'gold', dummyTitle: 'เซียน' } }); await sleep(60);
  const pe = db._profiles.get(UA); ok(pe.name === 'อลิซใหม่' && pe.equipped.dummyCharacterSkin === 'rina-01' && pe.equipped.dummyTitle === 'เซียน' && !pe.equipped.dummyBackSkin, 'บันทึกสกินที่เป็นเจ้าของ; สกินที่ยังไม่ซื้อ (หลังไพ่ทอง) ถูกทิ้ง');

  console.log('\n[3] ห้อง: ตัวตนผู้เล่นมาจากบัญชี');
  H.joined = null; H.emit('room:create', { name: 'แฮกเกอร์', ch: 'arya-01', bg: 'gold' }); await until(() => H.lob && H.joined, 2000, 'room');
  ok(H.lob.players[0].name === 'อลิซใหม่' && H.lob.players[0].ch === null, 'ชื่อในห้องใช้ชื่อบัญชี (ไม่ใช่ที่ client ส่ง) และตัวละครที่ไม่ได้ซื้อ (arya-01) ใช้ไม่ได้');
  const RJ = rooms.get(H.joined.code); H.emit('auth:token', { token: 'test:' + UB }); await until(() => H.aerr.length, 2000, 'switch'); ok(/ออกจากห้อง/.test(H.aerr[0]), 'เปลี่ยนบัญชีระหว่างอยู่ในห้องไม่ได้');
  H.emit('auth:logout'); await sleep(40); ok(H.aerr.length === 2 && /ออกจากห้องก่อนออกจากระบบ/.test(H.aerr[1]), 'ออกจากระบบระหว่างอยู่ในห้องไม่ได้'); H.emit('room:leave'); await sleep(40);
  const GR = cli(A); GR.emit('room:create', { name: 'แขก' }); await until(() => GR.joined, 2000, 'guest room'); GR.emit('auth:token', { token: 'test:' + UG }); await until(() => GR.aerr.length, 2000, 'guest login in room');
  ok(GR.me === null, 'แขกที่นั่งอยู่ในห้องแล้วล็อกอินกลางเกมไม่ได้ (ไม่งั้นเหรียญจะไม่ถูกบันทึก)'); GR.emit('room:leave');

  console.log('\n[4] จบตา → บันทึกผล + จ่ายเหรียญ');
  let R = await startSolo(H, { name: 'อลิซ' }); const gid1 = R.game.gid; const before = db._profiles.get(UA).coins;
  force(R, [60, -20, -20, -20]); await poke(R); await until(() => db._matches.has(gid1), 3000, 'match saved');
  const mm = db._matches.get(gid1); await until(() => H.me.coins === before + 60, 2000, 'me after match');
  ok(H.me.coins === 3560 && H.me.stats.games === 1 && H.me.stats.wins === 1, 'ชนะ +60 → 3560, นับ 1 ตา 1 ชนะ, ส่ง me ใหม่ให้ client');
  ok(mm.rule === 'dummy' && mm.stake >= 0 && mm.seats === 4 && mm.humans === 1 && mm.players.length === 4, 'บันทึก rule/ที่นั่ง/จำนวนผู้เล่นจริง และทุกที่นั่ง');
  ok(mm.players[0].userId === UA && mm.players[0].won && mm.players[0].place === 1 && mm.players.slice(1).every(x => x.userId === null && !x.won && x.place === 2), 'ที่นั่งคนจริงผูกบัญชี ส่วนบอทเป็นแถวไม่มี user_id');
  await poke(R); await sleep(60); ok(db._profiles.get(UA).coins === 3560 && db._matches.size === 1, 'ตาเดิมถูกเรียกซ้ำ ไม่จ่ายซ้ำ');

  console.log('\n[5] ยอดไม่ติดลบ · ตาถัดไป');
  db._profiles.get(UA).coins = 10; H.emit('game:shuffle'); await until(() => R.deck, 2000, 'shuffle2'); H.S = null; H.emit('game:start'); await until(() => H.S, 2000, 'start2'); const gid2 = R.game.gid;
  ok(gid2 !== gid1, 'ตาใหม่ได้ gid ใหม่'); force(R, [-20, 20, 0, 0]); await poke(R); await until(() => db._matches.has(gid2), 3000, 'match2');
  ok(db._profiles.get(UA).coins === 0 && db._matches.get(gid2).players[0].applied === -10 && db._matches.get(gid2).players[0].delta === -20, 'แพ้เกินที่มี → ยอดเป็น 0 (ไม่ติดลบ) และเก็บทั้ง delta/applied');
  H.emit('room:leave'); await sleep(40);

  console.log('\n[6] คนที่หลุดกลางเกมยังได้รับผลตามจริง');
  db._profiles.get(UA).coins = 1000; db._profiles.get(UA).games = 0;
  const B = cli(A); await B.login(UB, 'บ๊อบ'); H.joined = null; H.emit('room:create', { name: 'x', bots: false }); await until(() => H.joined, 2000, 'room6'); const code6 = H.joined.code; R = rooms.get(code6);
  B.emit('room:join', { code: code6, name: 'y' }); await until(() => B.joined, 2000, 'join6'); H.emit('game:shuffle'); await until(() => R.deck, 2000, 'sh6'); H.emit('game:start'); await until(() => H.S && B.S, 2000, 'start6');
  const gid3 = R.game.gid, bSeat = R.players.find(p => p.userId === UB).seat; B.sock.close(); await until(() => R.game.P[bSeat].bot, 2000, 'B became bot');
  const d3 = [0, 0, 0, 0]; d3[1 - bSeat] = 40; d3[bSeat] = -40; d3[2] = 0; d3[3] = 0; const bBefore = db._profiles.get(UB).coins; force(R, d3); await poke(R); await until(() => db._matches.has(gid3), 3000, 'match3');
  ok(db._profiles.get(UB).coins === bBefore - 40 && db._profiles.get(UB).games === 1 && db._matches.get(gid3).humans === 2, 'คนที่หลุด (ที่นั่งถูกบอทแทน) ยังเสีย 40 ตามผลจริง และนับว่าเล่น 1 ตา');
  const B2 = cli(A); B2.emit('room:rejoin', { code: code6, token: R.players.find(p => p.userId === UB).token }); B2.emit('auth:token', { token: 'test:' + UB }); await until(() => B2.me, 3000, 'rejoin me');
  ok(B2.me.coins === bBefore - 40 && !B2.aerr.length, 'เชื่อมกลับเข้าที่นั่งเดิมแล้วล็อกอินด้วยบัญชีเดิมได้ ได้ยอดล่าสุด');
  H.emit('room:leave'); B2.emit('room:leave'); await sleep(40);

  console.log('\n[7] แขก/บอทล้วน ไม่บันทึก · DB ล้มแล้วลองใหม่');
  const n0 = db._matches.size, Gst = cli(A); R = await startSolo(Gst, { name: 'แขก' }); force(R, [60, -20, -20, -20]); await poke(R); await sleep(80);
  ok(db._matches.size === n0, 'ตาที่ไม่มีผู้เล่นล็อกอิน ไม่เขียน DB');
  const orig = db.settleMatch.bind(db); let calls = 0; db.settleMatch = async m => { calls++; if (calls < 3) throw new Error('db down'); return orig(m); };
  const C = cli(A); await C.login(UG, 'ซี'); R = await startSolo(C, { name: 'ซี' }); const gid4 = R.game.gid; force(R, [60, -20, -20, -20]);
  const errs = console.error; console.error = () => {}; await poke(R); await until(() => db._matches.has(gid4), 3000, 'retry'); console.error = errs;
  ok(calls === 3 && db._profiles.get(UG).coins === 5060, 'DB ล้ม 2 ครั้ง → ลองใหม่จนสำเร็จ จ่ายเหรียญครั้งเดียว'); db.settleMatch = orig;
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
})().then(() => setTimeout(() => process.exit(0), 50)).catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
