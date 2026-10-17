// ทดสอบหน้าจอแอป (app.js) ใน sandbox แบบไม่มีเบราว์เซอร์: DOM จำลอง + GitHub จำลอง
// ไล่ใช้งานจริง: ตั้งค่า → ทดสอบเชื่อมต่อ → โหลดสกิน → เพิ่มสกิน → ตั้งราคา → อัปโหลด
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const mockGitHub = require('./mock-github');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const A = p => fs.readFileSync(path.join(__dirname, '../app/src/main/assets', p), 'utf8'), fx = p => fs.readFileSync(path.join(__dirname, 'fixtures', p), 'utf8');
const PNG = Buffer.from([137, 80, 78, 71, 1, 2, 3, 250, 251]).toString('base64');

function boot(gh) {
  const els = {}, listeners = {}, store = {};
  const el = id => els[id] || (els[id] = { innerHTML: '', style: {}, textContent: '', click() { el.clicked = true; } });
  const ctx = { document: { getElementById: el, addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, createElement: () => ({}) },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, fetch: gh.fetch, console, setTimeout, clearTimeout,
    atob, btoa, TextEncoder, TextDecoder };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(A('core.js'), ctx); vm.runInContext(A('app.js'), ctx);
  const fire = (type, e) => (listeners[type] || []).forEach(f => f(e));
  const click = (act, data) => ctx.__studio.act(act, data || {});
  const type = (attr, key, value) => fire('input', { target: { dataset: { [attr]: key }, value } });
  return { ctx, els, store, S: ctx.__studio, fire, click, type, html: () => els.app.innerHTML + els.sheet.innerHTML, flush: () => new Promise(r => setTimeout(r, 15)) };
}

(async () => {
  const gh = mockGitHub({ 'client/public/skin/skins.json': fx('skins.json'), 'server/src/rules/common.js': fx('common.js') });
  const a = boot(gh); await a.flush();
  console.log('\n[1] เริ่มใช้งานครั้งแรก + ตั้งค่า');
  ok(a.html().includes('ยังไม่มีข้อมูลสกิน') && a.html().includes('Skin Studio'), 'ยังไม่ตั้งค่า → บอกให้ไปตั้งค่า');
  a.click('tab', { tab: 'settings' }); ok(a.html().includes('Fine-grained') && a.html().includes('Contents: Read and write'), 'หน้าตั้งค่ามีวิธีสร้างโทเคน');
  a.type('cfg', 'owner', 'o'); a.type('cfg', 'repo', 'r'); a.type('cfg', 'token', 'tkn');
  ok(JSON.parse(a.store['ss.cfg']).repo === 'r' && a.S.st.cfg.branch === 'main' && a.S.st.cfg.skinDir === 'client/public/skin', 'บันทึกค่าตั้งค่าลงเครื่อง ค่าเริ่มต้นตรงกับโปรเจกต์');
  await a.click('check'); ok(a.S.st.note.startsWith('✅ เชื่อมต่อ o/r'), 'ทดสอบการเชื่อมต่อผ่าน');
  await a.click('load'); ok(a.S.st.skins && a.S.st.skins.backgrounds.length === 9 && a.store['ss.skins'], 'โหลด skins.json จาก GitHub และแคชไว้');

  console.log('\n[2] ร้านค้า');
  a.click('tab', { tab: 'shop' }); ok(a.html().includes('sunset') && a.html().includes('ขายในร้าน') && a.html().includes('ฟรี · ไม่ขึ้นร้านค้า') && a.html().includes('ตั้งราคา &gt; 0'), 'แสดงรายการพร้อมราคา แยกของฟรี/ขายในร้าน');
  a.click('kind', { kind: 'tables' }); ok(a.html().includes('wood') && a.html().includes('🪙 400'), 'สลับหมวดโต๊ะ เห็นราคา 400');

  console.log('\n[3] เพิ่มสกิน');
  a.click('tab', { tab: 'add' }); a.click('addkind', { kind: 'backgrounds' });
  a.click('additem'); ok(a.html().includes('class=err') && a.html().includes('ใส่ชื่อสกิน') && a.S.st.ops.length === 0, 'กรอกไม่ครบ → แสดงข้อผิดพลาด ไม่เพิ่ม');
  a.type('f', 'name', 'ห้องนีออน'); a.type('f', 'id', 'neon-room'); a.type('f', 'price', '300'); a.S.st.form.file = { mime: 'image/webp', b64: PNG, size: 9 };
  a.click('additem'); ok(a.S.st.ops.length === 1 && a.S.st.ops[0].entry.price === 300 && a.S.st.ops[0].file.rel === 'backgrounds/neon-room.webp', 'เพิ่มพื้นหลังเข้ารายการ (ชื่อไทย id อังกฤษ ราคา 300 มีรูป)');
  a.click('addkind', { kind: 'backs' }); a.type('f', 'name', 'หลังไพ่ม่วง'); a.type('f', 'id', 'purple'); a.type('f', 'price', '120'); a.type('c', 'b1', '#6b2fb3'); a.click('additem');
  ok(a.S.st.ops.length === 2 && a.S.st.ops[1].entry.b1 === '#6b2fb3' && a.S.st.ops[1].entry.asset === '', 'เพิ่มหลังไพ่แบบใช้สีอย่างเดียว (ไม่มีรูป)');
  a.click('addkind', { kind: 'backgrounds' }); a.type('f', 'name', 'ซ้ำ'); a.type('f', 'id', 'sunset'); a.type('f', 'price', '10'); a.type('f', 'css', 'linear-gradient(#000,#fff)'); a.click('additem'); ok(a.html().includes('ซ้ำกับสกินที่มีอยู่แล้ว') && a.S.st.ops.length === 2, 'id ซ้ำกับของเดิมถูกจับ');
  a.click('kind', { kind: 'backgrounds' }); a.click('tab', { tab: 'shop' }); ok(a.html().includes('neon-room') && a.html().includes('ใหม่') && a.html().includes('🪙 300'), 'ร้านค้าแสดงสกินใหม่พร้อมป้ายใหม่ก่อนอัปโหลด');
  ok(a.html().includes('data:image/webp;base64,' + PNG), 'แสดงตัวอย่างรูปที่เลือกไว้ (ยังไม่ได้อัปโหลด)');

  console.log('\n[4] ตั้งราคา/แก้ชื่อ/ลบ');
  a.click('kind', { kind: 'tables' }); a.click('price', { id: 'wood' }); ok(a.html().includes('ตั้งราคา: โต๊ะ') || a.html().includes('💰 ตั้งราคา'), 'เปิดหน้าตั้งราคา');
  a.fire('input', { target: { dataset: { sheet: 'val' }, value: '555' } }); a.click('sheetok'); ok(a.S.st.ops.at(-1).type === 'price' && a.S.st.ops.at(-1).price === 555 && a.html().includes('🪙 555'), 'ตั้งราคาโต๊ะไม้ 555 → แสดงทันที');
  a.click('price', { id: 'green-felt' }); a.click('sheetpreset', { v: '150' }); a.click('sheetok'); ok(a.html().includes('🪙 150'), 'ของฟรี ตั้งราคา → ขึ้นร้านค้า');
  a.click('price', { id: 'wood' }); a.fire('input', { target: { dataset: { sheet: 'val' }, value: '-5' } }); a.click('sheetok'); ok(a.S.st.sheet && a.S.st.ops.at(-1).price === 150 || a.S.st.ops.length === 4, 'ราคาติดลบถูกปฏิเสธ'); a.click('sheetx');
  a.click('rename', { id: 'navy-felt' }); a.fire('input', { target: { dataset: { sheet: 'val' }, value: '<b>กรมท่า</b>' } }); a.click('sheetok'); ok(a.html().includes('&lt;b&gt;กรมท่า&lt;/b&gt;') && !a.html().includes('<b>กรมท่า</b>'), 'ชื่อที่มีแท็ก HTML ถูก escape (ไม่ฉีดโค้ด)');
  const before = a.S.st.ops.length; a.click('kind', { kind: 'backgrounds' }); a.click('remove', { id: 'neon-room' }); a.click('sheetok'); ok(a.S.st.ops.length === before - 1 && !a.S.work().backgrounds.some(x => x.id === 'neon-room'), 'ลบสกินที่ยังไม่อัปโหลด = ยกเลิกรายการเพิ่ม');
  a.click('tab', { tab: 'add' }); a.click('addkind', { kind: 'backgrounds' }); a.type('f', 'name', 'ห้องนีออน'); a.type('f', 'id', 'neon-room'); a.type('f', 'price', '300'); a.S.st.form.file = { mime: 'image/webp', b64: PNG, size: 9 }; a.click('additem');

  console.log('\n[5] อัปโหลดขึ้น GitHub');
  a.click('tab', { tab: 'push' }); ok(a.html().includes('รายการที่รออัปโหลด') && a.html().includes('neon-room') === false && a.html().includes('ห้องนีออน') && a.html().includes('🚀 อัปโหลดขึ้น GitHub') && a.html().includes('class=bd') , 'แท็บอัปโหลดแสดงรายการที่ค้างและจำนวนบนปุ่มเมนู');
  const n = a.S.st.ops.length; await a.click('push'); await a.flush();
  const head = JSON.parse(gh.read('client/public/skin/skins.json').toString());
  ok(a.S.st.result.ok && a.S.st.ops.length === 0 && /ดู commit บน GitHub/.test(a.html()), 'อัปโหลดสำเร็จ (' + n + ' รายการ) มีลิงก์ commit และล้างรายการค้าง');
  ok(head.backgrounds.some(x => x.id === 'neon-room') && head.backs.some(x => x.id === 'purple' && x.price === 120) && head.tables.find(x => x.id === 'wood').price === 555 && head.tables.find(x => x.id === 'green-felt').price === 150, 'GitHub มีสกินใหม่/ราคาใหม่ครบ');
  ok(gh.read('client/public/skin/backgrounds/neon-room.webp').equals(Buffer.from(PNG, 'base64')) && gh.read('server/src/rules/common.js').toString().includes("'neon-room'"), 'รูปไบนารีและ id เซิร์ฟเวอร์ขึ้นครบ');
  ok(a.S.st.skins.backgrounds.some(x => x.id === 'neon-room'), 'โหลดข้อมูลล่าสุดกลับมาหลังอัปโหลด');
  const commits = [...gh.commits.values()].length; ok(commits === 2, 'ใช้ commit เดียวสำหรับทุกอย่าง');

  console.log('\n[6] ข้อผิดพลาด + ปุ่มย้อนกลับ');
  a.click('tab', { tab: 'settings' }); a.type('cfg', 'token', 'wrong'); a.click('tab', { tab: 'add' }); a.click('addkind', { kind: 'tables' }); a.type('f', 'name', 'โต๊ะทดสอบ'); a.type('f', 'id', 'test-table'); a.type('f', 'price', '5'); a.click('additem');
  a.click('tab', { tab: 'push' }); await a.click('push'); await a.flush(); ok(a.S.st.result && !a.S.st.result.ok && /โทเคนไม่ถูกต้อง/.test(a.html()) && a.S.st.ops.length === 1, 'โทเคนผิด → แจ้งภาษาไทย และรายการยังอยู่ ไม่หาย');
  ok(a.ctx.window.__back() === true && a.S.st.tab === 'shop' && a.ctx.window.__back() === false, 'ปุ่มย้อนกลับ: กลับร้านค้าก่อน แล้วค่อยออกจากแอป');
  a.click('kind', { kind: 'tables' }); a.click('price', { id: 'wood' }); ok(a.S.st.sheet && a.ctx.window.__back() === true && !a.S.st.sheet, 'ปุ่มย้อนกลับปิดหน้าต่างย่อย');
  const b = boot(mockGitHub({ x: 'y' })); await b.flush(); b.S.st.cfg = Object.assign({}, b.S.st.cfg, { owner: 'o', repo: 'r', token: 'tkn' }); b.S.st.skins = JSON.parse(fx('skins.json')); b.click('tab', { tab: 'push' });
  ok(b.html().includes('ยังไม่มีการเปลี่ยนแปลง') && /data-act=push\s+disabled/.test(b.html()), 'ไม่มีรายการ → ปุ่มอัปโหลดกดไม่ได้');
  console.log('\nผ่านทั้งหมด ' + passed + ' รายการ');
})().catch(e => { console.error('ล้มเหลว:', e && e.stack || e); process.exit(1); });
