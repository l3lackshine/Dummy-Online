// รัน client/public/app.js ตัวจริงใน sandbox (DOM/localStorage จำลอง) ต่อกับ src/index.js: โฮมเพจ → เล่นคนเดียว → รีเฟรชหน้า → เชื่อมต่อกลับ → จ่ายเหรียญครั้งเดียว
const vm = require('vm'), fs = require('fs'), path = require('path'), assert = require('assert'), M = require('./test-mock-sio');
const SRC = ['economy.js', 'progress.js'].map(f => fs.readFileSync(path.join(__dirname, '../client/public/' + f), 'utf8')).join('\n') + '\n' + fs.readFileSync(path.join(__dirname, '../client/public/gamegx.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../client/public/app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../client/public/games.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 10, EMPTY_ROOM_TTL_MS: 60000, RATE_PER_SEC: 5000 });
const store = {}; // localStorage ที่ "คงอยู่ข้ามการรีเฟรช"
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
function openPage() { // = เปิด/รีเฟรชหน้าเว็บหนึ่งครั้ง
  const appEl = { innerHTML: '' }, socks = [];
  const g = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: { getElementById: id => (id === 'app' ? appEl : null), querySelector: () => null, documentElement: { style: { setProperty() {}, removeProperty() {} }, dataset: {} }, body: { appendChild() {} } },
    fetch: u => (String(u).includes('skins.json') ? Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(__dirname, '../client/public/skin/skins.json'), 'utf8'))) }) : Promise.resolve({ ok: false })), requestAnimationFrame: () => 0, confirm: () => true, console, setTimeout, clearTimeout, JSON, Math, Set, Array, Number, String, Object, Date, Promise, Error };
  g.window = g; g.addEventListener = () => {}; g.DUMMY_CONFIG = { BACKEND_URL: 'http://fake', DEAL_MS: 1 }; g.DUMMY_VERSION = '7.0.0-test';
  g.io = () => { const c = M.client(srv); socks.push(c); return c; };
  const ctx = vm.createContext(g); vm.runInContext(SRC, ctx, { filename: 'app.js' });
  return { ctx, appEl, socks, ev: code => vm.runInContext(code, ctx) };
}
(async () => {
  console.log('\n[A] เปิดหน้าแรก + เล่นคนเดียว');
  let pg = openPage(); await sleep(30); ok(pg.appEl.innerHTML.includes('class=ver>v7.0.0-test') && pg.appEl.innerHTML.includes('goPlay()') && pg.appEl.innerHTML.includes('sign-shop.webp') && pg.appEl.innerHTML.includes('sign-profile.webp'), 'หน้าแรกแสดงป้ายเล่นเกม/ร้านค้า/โปรไฟล์');
  pg.ev('goPlay()'); await sleep(30); ok(pg.ev('screen') === 'games' && ['dummy', 'pokdeng', 'gaogae', 'somsip', 'eekae'].every(id => pg.appEl.innerHTML.includes("chooseGame('" + id + "')")), 'กดเล่นเกม → หน้าเลือกเกม มีครบ 5 เกม (ดัมมี่ ป๊อกเด้ง เก้าเก ผสมสิบ อีแก่)');
  pg.ev("chooseGame('dummy')"); ok(pg.ev('screen') === 'play' && ['solo()', "openCreate('room')", 'toggleJoin()'].every(f => pg.appEl.innerHTML.includes(f)), 'เลือกเกมแล้ว → หน้าเล่นเกมมีป้ายเล่นคนเดียว/สร้างห้อง/เข้าห้อง');
  pg.ev("go('shop')"); ok(pg.appEl.innerHTML.includes('buyItem(') && !pg.appEl.innerHTML.includes('equip('), 'หน้าร้านค้ามีแต่ของที่ขาย');
  pg.ev("go('profile')"); ok(['characters', 'backs', 'tables', 'backgrounds'].every(k => pg.appEl.innerHTML.includes("equip('" + k + "'")), 'หน้าโปรไฟล์เลือกตัวละคร/หลังไพ่/โต๊ะ/พื้นหลังได้');
  pg.ev('goPlay()'); pg.ev("chooseGame('dummy')"); pg.ev('solo()'); await sleep(40);
  ok(pg.ev('screen') === 'create' && ["go('games')", 'setOpt(', 'startCreate()', 'name=', 'เกมที่เลือก', 'การนับชิป'].every(t => t === 'name=' || pg.appEl.innerHTML.includes(t)), 'เล่นคนเดียว → หน้าเลือกไพ่/ตั้งค่า (มีรายการกฎจากเซิร์ฟเวอร์ ตัวเลือกเดิมพัน และสรุปการนับเหรียญ)');
  ok(pg.appEl.innerHTML.includes('ดัมมี่') && !pg.appEl.innerHTML.includes("setOpt('stake'") && pg.appEl.innerHTML.includes('20 ชิป'), 'หน้าตั้งค่าแสดงกฎ ดัมมี่ ไม่มีช่องเดิมพันแล้ว (ชิปในโต๊ะใช้จัดอันดับ 20 ชิป)');
  pg.ev('startCreate()'); for (let i = 0; i < 200 && !pg.ev('lob'); i++) await sleep(10);
  ok(!pg.ev('S') && pg.appEl.innerHTML.includes('class="deckbox') && !pg.appEl.innerHTML.includes('doShuffle()') && /<button class=blue onclick=begin\(\) >/.test(pg.appEl.innerHTML), 'ห้องเล่นกับบอท: เข้าที่โต๊ะ มีกองไพ่กลางโต๊ะ ไม่มีปุ่มสับ (เซิร์ฟเวอร์สับให้) และปุ่มเริ่มกดได้ทันที');
  ok(pg.ev('lob.options.stake') === 20 && pg.ev('lob.rule.id') === 'dummy' && !pg.appEl.innerHTML.includes('ตัวละ'), 'ห้องใช้ชิปมาตรฐาน 20 และไม่แสดงเดิมพันที่โต๊ะ');
  pg.ev('begin()'); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10);
  ok(pg.ev('deal') !== null && pg.ev('S.stake') === 20, 'เริ่มเกม: เข้าสู่ช่วงแจกไพ่ (deal) ชิปมาตรฐาน 20');
  ok(pg.appEl.innerHTML.includes('กำลังแจกไพ่') && pg.ev('S.P.every(p => p.n_cards === 7)') && pg.appEl.innerHTML.includes('data-pc=0>0<'), 'ระหว่างแจก: โต๊ะแสดงผู้เล่นมี 0 ใบ ไม่โชว์ไพ่ก่อนแจก');
  for (let i = 0; i < 300 && pg.ev('deal'); i++) await sleep(10);
  ok(pg.ev('deal') === null && pg.ev('S && S.my === 0 && S.hand.length >= 7') && pg.appEl.innerHTML.includes('class=hand') && !pg.appEl.innerHTML.includes('กำลังแจกไพ่'), 'แจกครบแล้ว: หน้าจอเกมแสดงไพ่ในมือ');
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
  ok(pg.ev('S.over') && pg.appEl.innerHTML.includes('class="ov rsv"') && !pg.appEl.innerHTML.includes('rs-shuf'), 'เกมจบ: แสดงหน้าสรุปผล (ไม่มีแท็บสับไพ่แล้ว)');
  const coin1 = Number(store.dummyCoins), g = pg.ev('Progress.forGame(S)'), dlt = g.delta + (g.level_coins || 0);
  ok(g.rank >= 1 && g.delta >= 15 && coin1 === coin0 + dlt, `ได้เหรียญตามอันดับ ไม่มีเสีย (ที่ ${g.rank}: ${coin0} +${dlt} → ${coin1})`);
  ok(pg.appEl.innerHTML.includes('รางวัลตานี้') && pg.appEl.innerHTML.includes('+' + g.delta + ' 🪙') && pg.appEl.innerHTML.includes('รายการชิป') && pg.appEl.innerHTML.includes('class=pg-lv'), 'หน้าสรุปแสดงรางวัลตามอันดับ + EXP + รายการชิป');
  for (let k = 0; k < 3; k++) { pg.socks.forEach(s => s.close()); await sleep(40); pg = openPage(); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10); await sleep(30); }
  ok(Number(store.dummyCoins) === coin1, 'รีเฟรช 3 ครั้งหลังเกมจบ เหรียญไม่ถูกหัก/เพิ่มซ้ำ (จ่ายครั้งเดียวต่อเกม)');
  console.log('\n[D] กดออกจากห้อง → ล้าง session ไม่ย้อนกลับ');
  pg.ev('leave()'); await sleep(40); ok(!store.dummySession && pg.ev('screen') === 'home', 'ออกจากห้องแล้วกลับหน้าแรก ไม่มี session ค้าง');
  pg.socks.forEach(s => s.close()); pg = openPage(); await sleep(60); ok(pg.ev('S') === null && pg.appEl.innerHTML.includes('goPlay()'), 'เปิดหน้าใหม่หลังออกห้อง ไม่ถูกดึงกลับเข้าเกมเก่า');
  console.log('\n[E] ห้องออนไลน์ 2 คน: เพื่อนกดพร้อม → เจ้าของห้องเริ่มเกมได้ (ไม่มีขั้นตอนสับไพ่)');
  pg.socks.forEach(s => s.close()); pg = openPage(); pg.ev('goPlay()'); pg.ev("openCreate('room')"); await sleep(30); pg.ev('startCreate()'); for (let i = 0; i < 200 && !pg.ev('code'); i++) await sleep(10);
  const rc = pg.ev('code'), guest = M.client(srv); let gl = null; guest.on('room:lobby', l => { gl = l; }); guest.emit('room:join', { code: rc, name: 'เพื่อน' });
  for (let i = 0; i < 200 && !(pg.ev('lob && lob.players.length === 2')); i++) await sleep(10);
  ok(pg.appEl.innerHTML.includes('class="deckbox') && !pg.appEl.innerHTML.includes('doShuffle()') && /<button class=blue onclick=begin\(\) disabled>/.test(pg.appEl.innerHTML) && pg.appEl.innerHTML.includes('class=arena'), 'เจ้าของห้องอยู่ที่โต๊ะ: ไม่มีปุ่มสับไพ่ และปุ่มเริ่มเกมถูกปิดไว้จนกว่าเพื่อนจะกดพร้อม');
  ok(gl && gl.options.stake === 20 && gl.rule.id === 'dummy', 'เพื่อนที่เข้าห้องได้กฎของห้องในล็อบบี้');
  ok(gl && gl.shuffle.needed === false && gl.allReady === false && gl.waitingFor.join() === 'เพื่อน', 'ล็อบบี้บอกว่ารอ "เพื่อน" กดพร้อม');
  guest.emit('game:ready', { ready: true }); for (let i = 0; i < 200 && !pg.ev('lob.allReady'); i++) await sleep(10);
  ok(pg.appEl.innerHTML.includes('✅ พร้อมเริ่ม') && !/<button class=blue onclick=begin\(\) disabled>/.test(pg.appEl.innerHTML), 'เพื่อนกดพร้อม: ขึ้น ✅ พร้อมเริ่ม และปุ่มเริ่มเกมใช้ได้');
  pg.ev('begin()'); for (let i = 0; i < 200 && !pg.ev('S'); i++) await sleep(10); ok(pg.ev('S && S.hand.length >= 7'), 'กดเริ่มเกม → เข้าเกม');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
  process.exit(0);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message, e.stack.split('\n')[1] || ''); process.exit(1); });
