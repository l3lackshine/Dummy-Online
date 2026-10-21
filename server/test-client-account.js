// รัน client ตัวจริง (app.js + account.js) ใน sandbox ต่อกับ src/index.js: ล็อกอิน → ซื้อของ → เล่นจนจบ → เหรียญต้องมาจากเซิร์ฟเวอร์เท่านั้น (client ไม่บวกเอง)
// ใช้ Supabase ปลอมฝั่ง client (ออกโทเคน "test:<uuid>" ที่เซิร์ฟเวอร์โหมดหน่วยความจำยอมรับ) — ไม่ได้ทดสอบ Supabase จริง
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert'), M = require('./test-mock-sio');
const P = f => fs.readFileSync(path.join(__dirname, '../client/public', f), 'utf8');
const SRC = ['gamegx.js', 'app.js', 'games.js', 'account.js'].map(P).join('\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = M.load({ BOT_DELAY_MS: 10, EMPTY_ROOM_TTL_MS: 60000, RATE_PER_SEC: 5000, DB_TEST_TOKENS: '1' });
const db = require.cache[require.resolve('./src/index.js')].exports.db;
const UA = '11111111-1111-4111-8111-111111111111';
const store = {}; let fakeSession = null, cbs = [];
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
function openPage() {
  const appEl = { innerHTML: '' }, socks = []; cbs = [];
  const sb = { auth: {
    onAuthStateChange: cb => { cbs.push(cb); setTimeout(() => cb('INITIAL_SESSION', fakeSession), 0); },
    signInWithPassword: async () => { fakeSession = { access_token: 'test:' + UA, user: { id: UA, user_metadata: { display_name: 'อลิซ' } } }; store['sb-x-auth-token'] = '1'; cbs.forEach(cb => cb('SIGNED_IN', fakeSession)); return { data: { session: fakeSession }, error: null }; },
    signOut: async () => { fakeSession = null; delete store['sb-x-auth-token']; cbs.forEach(cb => cb('SIGNED_OUT', null)); return { error: null }; },
    signUp: async () => ({ data: { session: null }, error: null }) } };
  const g = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: { getElementById: id => (id === 'app' ? appEl : id === 'acEmail' ? { value: 'a@b.c' } : id === 'acPass' ? { value: 'secret1' } : null), querySelector: () => null, documentElement: { style: { setProperty() {}, removeProperty() {} }, dataset: {} }, body: { appendChild() {} } },
    fetch: u => (String(u).includes('skins.json') ? Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(P('skin/skins.json'))) }) : Promise.resolve({ ok: false })), requestAnimationFrame: () => 0, confirm: () => true, console, setTimeout, clearTimeout, JSON, Math, Set, Array, Number, String, Object, Date, Promise, Error };
  g.window = g; g.addEventListener = () => {}; g.DUMMY_VERSION = '7.0.0-test';
  g.DUMMY_CONFIG = { BACKEND_URL: 'http://fake', DEAL_MS: 1, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };
  g.supabase = { createClient: () => sb }; g.io = () => { const c = M.client(srv); socks.push(c); return c; };
  const ctx = vm.createContext(g); vm.runInContext(SRC, ctx, { filename: 'bundle.js' });
  return { ctx, appEl, socks, ev: code => vm.runInContext(code, ctx) };
}
const waitFor = async (f, ms = 3000, what = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return; await sleep(10); } throw new Error('timeout: ' + what); };
(async () => {
  console.log('[A] แขก → ล็อกอิน');
  let pg = openPage(); await sleep(30); pg.ev("go('profile')");
  ok(pg.appEl.innerHTML.includes('dummyAcctLogin()') && pg.appEl.innerHTML.includes('เหรียญแขกไม่ย้ายเข้าบัญชี') && pg.ev('acctOn()') === false, 'หน้าโปรไฟล์ของแขก: มีฟอร์มเข้าสู่ระบบ และบอกชัดว่าเหรียญแขกไม่ย้ายเข้าบัญชี');
  pg.ev('dummyAcctLogin()'); await waitFor(() => pg.ev('acctOn()'), 3000, 'login');
  ok(pg.ev('sv.coins') === 5000 && pg.ev('sv.name') === 'อลิซ' && pg.ev('nick') === 'อลิซ' && pg.appEl.innerHTML.includes('dummyAcctLogout()'), 'ล็อกอินแล้ว: sv มาจากเซิร์ฟเวอร์ (5000 เหรียญ ชื่อบัญชี) และแผงบัญชีเปลี่ยนเป็นปุ่มออกจากระบบ');
  const localCoin0 = store.dummyCoins, localOwned0 = store.dummyOwned;

  console.log('\n[B] ซื้อของผ่านเซิร์ฟเวอร์');
  pg.ev("go('shop')"); pg.ev("buyItem('characters', 'rina-01')"); await waitFor(() => pg.ev("sv.own.includes('characters:rina-01')"), 3000, 'buy');
  ok(pg.ev('sv.coins') === 3500 && db._profiles.get(UA).coins === 3500 && pg.appEl.innerHTML.includes('ซื้อสำเร็จ'), 'ซื้อตัวละคร 1500: client แสดง 3500 ตรงกับ DB และมีข้อความซื้อสำเร็จ');
  ok(store.dummyCoins === localCoin0 && store.dummyOwned === localOwned0, 'localStorage ของเครื่อง (เหรียญ/ของแขก) ไม่ถูกแตะ');
  pg.ev("go('profile')"); pg.ev("equip('backs', 'sakura-navy')"); pg.ev("equip('characters', 'rina-01')"); await waitFor(() => db._profiles.get(UA).equipped.dummyCharacterSkin === 'rina-01', 3000, 'save equip');
  ok(db._profiles.get(UA).equipped.dummyBackSkin === 'sakura-navy', 'เลือกสกินแล้วถูกบันทึกลงบัญชี (ส่งแบบรวมหลายครั้ง)');

  console.log('\n[C] เล่นจนจบ → เหรียญมาจากเซิร์ฟเวอร์ ไม่ถูกบวกซ้ำที่ client');
  pg.ev('goPlay()'); pg.ev("chooseGame('dummy')"); pg.ev('solo()'); await sleep(30); pg.ev('startCreate()'); await waitFor(() => pg.ev('lob'), 3000, 'room');
  pg.ev('doShuffle()'); await waitFor(() => pg.ev('lob.shuffle.ready'), 3000, 'shuffle'); pg.ev('begin()'); await waitFor(() => pg.ev('S'), 3000, 'state');
  pg.ev("dummyAcctLogout()"); await sleep(40); ok(pg.ev('acctOn()') === true && /ออกจากห้องก่อน/.test(pg.appEl.innerHTML.replace(/<[^>]+>/g, ' ')) || pg.ev('acctOn()') === true, 'กดออกจากระบบกลางเกมไม่ได้ (ยังเป็นบัญชีเดิม)');
  pg.socks.forEach(s => s.close()); await waitFor(() => [...require.cache[require.resolve('./src/index.js')].exports.rooms.values()].some(r => r.game && r.game.over), 15000, 'game over'); await sleep(100);
  pg = openPage(); await waitFor(() => pg.ev('S') && pg.ev('S.over') && pg.ev('acctOn()'), 5000, 'reopen');
  const dlt = pg.ev('S.res.coin.delta[S.my]'), srvCoins = db._profiles.get(UA).coins;
  ok(srvCoins === Math.max(0, 3500 + dlt) && db._matches.size === 1, `เซิร์ฟเวอร์จ่ายเหรียญตามผล (3500 ${dlt >= 0 ? '+' : ''}${dlt} → ${srvCoins}) และบันทึก 1 ตา`);
  await waitFor(() => pg.ev('sv.coins') === srvCoins, 3000, 'me coins');
  ok(pg.ev('sv.coins') === srvCoins && store.dummyCoins === localCoin0 && store.dummyPaid === undefined, 'client แสดงยอดเดียวกับเซิร์ฟเวอร์ ไม่บวกซ้ำ และไม่แตะเหรียญ/dummyPaid ในเครื่อง');
  for (let k = 0; k < 2; k++) { pg.socks.forEach(s => s.close()); await sleep(40); pg = openPage(); await waitFor(() => pg.ev('acctOn()') && pg.ev('S'), 5000, 'refresh ' + k); await sleep(30); }
  ok(pg.ev('sv.coins') === srvCoins && db._profiles.get(UA).coins === srvCoins && db._matches.size === 1, 'รีเฟรชซ้ำหลังเกมจบ เหรียญไม่เปลี่ยน (ไม่จ่ายซ้ำ)');

  console.log('\n[D] ออกจากห้อง → ออกจากระบบ → กลับเป็นแขก');
  pg.ev('leave()'); await sleep(40); pg.ev('dummyAcctLogout()'); await waitFor(() => !pg.ev('acctOn()'), 3000, 'logout');
  ok(pg.ev('sv.coins') === Number(localCoin0 || 5000) && !pg.ev("sv.own.includes('characters:rina-01')"), 'ออกจากระบบแล้วกลับเป็นเหรียญ/ของของแขกในเครื่อง (ไม่เอาของบัญชีติดมา)');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
})().then(() => setTimeout(() => process.exit(0), 50)).catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
