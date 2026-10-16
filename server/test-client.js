// รัน client/public/app.js ตัวจริงใน sandbox (DOM/localStorage จำลอง) ต่อกับ src/index.js: โฮมเพจ → เล่นคนเดียว → รีเฟรชหน้า → เชื่อมต่อกลับ → จ่ายเหรียญครั้งเดียว
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert'), M = require('./test-mock-sio');
const SRC = fs.readFileSync(path.join(__dirname, '../client/public/app.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = M.load({ BOT_DELAY_MS: 10, EMPTY_ROOM_TTL_MS: 60000, RATE_PER_SEC: 5000 });
const store = {}; // localStorage ที่ "คงอยู่ข้ามการรีเฟรช"
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
function openPage() { // = เปิด/รีเฟรชหน้าเว็บหนึ่งครั้ง
  const appEl = { innerHTML: '' }, socks = [];
  const g = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: { getElementById: id => (id === 'app' ? appEl : null), querySelector: () => null, documentElement: { style: { setProperty() {} }, dataset: {} }, body: { appendChild() {} } },
    fetch: () => Promise.resolve({ ok: false }), requestAnimationFrame: () => 0, confirm: () => true, console, setTimeout, clearTimeout, JSON, Math, Set, Array, Number, String, Object, Date, Promise, Error };
  g.window = g; g.addEventListener = () => {}; g.DUMMY_CONFIG = { BACKEND_URL: 'http://fake' };
  g.io = () => { const c = M.client(srv); socks.push(c); return c; };
  const ctx = vm.createContext(g); vm.runInContext(SRC, ctx, { filename: 'app.js' });
  return { ctx, appEl, socks, ev: code => vm.runInContext(code, ctx) };
}
(async () => {
  console.log('\n[A] เปิดหน้าแรก + เล่นคนเดียว');
  let pg = openPage(); ok(pg.appEl.innerHTML.includes('เล่นคนเดียวกับบอท'), 'หน้าแรกแสดงปุ่มเล่นคนเดียว');
  pg.ev('solo()'); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10);
  ok(pg.ev('S && S.my === 0 && S.hand.length >= 7') && pg.appEl.innerHTML.includes('class=hand'), 'เริ่มเกม: หน้าจอเกมแสดงไพ่ในมือ');
  const sess = JSON.parse(store.dummySession || 'null'); ok(sess && sess.code && sess.token, 'บันทึก session (รหัสห้อง+token) ไว้ใน localStorage');
  const coin0 = Number(store.dummyCoins || 5000);

  console.log('\n[B] รีเฟรชหน้ากลางเกม → ต้องกลับเข้าที่นั่งเดิมเอง');
  pg.socks.forEach(s => s.close()); await sleep(60); // แท็บเดิมหาย
  pg = openPage(); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10);
  ok(pg.ev('S && S.my === 0 && screen === "game"') && pg.appEl.innerHTML.includes('class=hand'), 'รีเฟรชแล้วเข้าหน้าเกม ที่นั่งเดิม ไม่ต้องกดอะไร');
  ok(pg.ev('S.P[0].bot') === false, 'ที่นั่งกลับเป็นคนจริง (ไม่ใช่บอท)');

  console.log('\n[C] ปล่อยให้เกมจบ แล้วรีเฟรชหลายครั้ง → เหรียญต้องถูกจ่ายครั้งเดียว');
  pg.socks.forEach(s => s.close()); // บอทเล่นแทนจนจบ
  for (let i = 0; i < 600; i++) { await sleep(20); const r = [...srv.sockets.sockets.values()].length; if (i > 5 && [...(require.cache[require.resolve('./src/index.js')].exports.rooms.values())].some(rm => rm.game && rm.game.over)) break; }
  pg = openPage(); for (let i = 0; i < 200 && !(pg.ev('S') && pg.ev('S.over')); i++) await sleep(10);
  ok(pg.ev('S.over') && pg.appEl.innerHTML.includes('class=ov'), 'เกมจบ: แสดงหน้าสรุปผล');
  const coin1 = Number(store.dummyCoins); ok(coin1 > coin0, `ได้เหรียญหลังจบเกม (${coin0} → ${coin1})`);
  ok(pg.appEl.innerHTML.includes('ได้รับ +' + (coin1 - coin0)), 'หน้าสรุปแสดงจำนวนเหรียญที่ได้ตรงกับที่เพิ่มจริง');
  for (let k = 0; k < 3; k++) { pg.socks.forEach(s => s.close()); await sleep(40); pg = openPage(); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10); await sleep(30); }
  ok(Number(store.dummyCoins) === coin1, 'รีเฟรช 3 ครั้งหลังเกมจบ เหรียญไม่เพิ่ม (บั๊กเดิม: ได้เหรียญซ้ำทุกครั้ง)');
  console.log('\n[D] กดออกจากห้อง → ล้าง session ไม่ย้อนกลับ');
  pg.ev('leave()'); await sleep(40); ok(!store.dummySession && pg.ev('screen') === 'home', 'ออกจากห้องแล้วกลับหน้าแรก ไม่มี session ค้าง');
  pg.socks.forEach(s => s.close()); pg = openPage(); await sleep(60); ok(pg.ev('S') === null && pg.appEl.innerHTML.includes('เล่นคนเดียวกับบอท'), 'เปิดหน้าใหม่หลังออกห้อง ไม่ถูกดึงกลับเข้าเกมเก่า');
  console.log('\n[E] ห้องออนไลน์ 2 คน: ปุ่มสับไพ่ในล็อบบี้ (เจ้าของห้อง) → เริ่มเกมได้หลังสับ');
  pg.socks.forEach(s => s.close()); pg = openPage(); pg.ev("go('lobby')"); pg.ev('mk()'); for (let i = 0; i < 200 && !pg.ev('code'); i++) await sleep(10);
  const rc = pg.ev('code'), guest = M.client(srv); let gl = null; guest.on('room:lobby', l => { gl = l; }); guest.emit('room:join', { code: rc, name: 'เพื่อน' });
  for (let i = 0; i < 200 && !(pg.ev('lob && lob.players.length === 2')); i++) await sleep(10);
  ok(pg.appEl.innerHTML.includes('ผู้สับไพ่') && pg.appEl.innerHTML.includes('doShuffle()') && /<button onclick=begin\(\) disabled>/.test(pg.appEl.innerHTML), 'เจ้าของห้องเห็นปุ่มสับไพ่ และปุ่มเริ่มเกมถูกปิดไว้จนกว่าจะสับ');
  ok(gl && gl.shuffle.youShuffler === false && gl.shuffle.shuffler === pg.ev('nick'), 'ผู้เล่นคนอื่นไม่ได้รับสิทธิ์สับ');
  pg.ev('doShuffle()'); for (let i = 0; i < 200 && !pg.ev('lob.shuffle.ready'); i++) await sleep(10);
  ok(pg.appEl.innerHTML.includes('✅ สับไพ่แล้ว') && !/<button onclick=begin\(\) disabled>/.test(pg.appEl.innerHTML) && pg.appEl.innerHTML.includes('สับอีกครั้ง'), 'สับแล้ว: ขึ้น ✅ สับไพ่แล้ว ปุ่มเริ่มเกมใช้ได้ และสับซ้ำได้');
  await sleep(1500); ok(!pg.appEl.innerHTML.includes('class=shuf-anim'), 'แอนิเมชันสับไพ่หายไปเองหลังเล่นจบ');
  pg.ev('begin()'); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10); ok(pg.ev('S && S.hand.length >= 7'), 'กดเริ่มเกมหลังสับ → เข้าเกม');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
  process.exit(0);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message, e.stack.split('\n')[1] || ''); process.exit(1); });
