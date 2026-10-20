// ทดสอบแกนหลักของ Skin Studio: ตรวจแบบฟอร์ม · แก้ skins.json · แก้ id เซิร์ฟเวอร์ · commit ผ่าน GitHub จำลอง
const assert = require('assert'), fs = require('fs'), path = require('path');
const C = require('../app/src/main/assets/core.js');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const skinsText = fs.readFileSync(path.join(__dirname, 'fixtures/skins.json'), 'utf8'), commonText = fs.readFileSync(path.join(__dirname, 'fixtures/common.js'), 'utf8');
const cfg = { owner: 'o', repo: 'r', branch: 'main', token: 'tkn', skinDir: 'client/public/skin', commonPath: 'server/src/rules/common.js' };
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128, 7]).toString('base64');   // ไบนารีจำลอง
const form = (o) => Object.assign({ id: 'neon-room', name: 'ห้องนีออน', price: 300, colors: {}, css: '', ink: '#ffffff', file: { mime: 'image/webp', b64: PNG } }, o);

const mockGitHub = require('./mock-github');
const J = JSON.parse(skinsText);

console.log('\n[1] ตรวจแบบฟอร์ม + สร้างรายการ');
ok(C.serialize(J, skinsText) === skinsText, 'เขียน skins.json กลับด้วยรูปแบบเดิมเป๊ะ (ไม่มี diff ที่ไม่ต้องการ)');
ok(C.validate('backgrounds', form(), J.backgrounds).length === 0, 'พื้นหลังที่กรอกครบผ่านการตรวจ');
ok(C.validate('backgrounds', form({ id: 'sunset' }), J.backgrounds).some(e => e.includes('ซ้ำ')), 'id ซ้ำถูกปฏิเสธ');
ok(C.validate('backgrounds', form({ id: 'ห้อง' }), J.backgrounds).some(e => e.includes('id ต้องเป็น')), 'id ภาษาไทย/ตัวใหญ่ถูกปฏิเสธ');
ok(C.validate('backgrounds', form({ price: '12.5' }), []).length === 1 && C.validate('backgrounds', form({ price: -1 }), []).length === 1 && C.validate('backgrounds', form({ price: 0 }), []).length === 0, 'ราคาต้องเป็นจำนวนเต็ม ≥ 0 (0 = ฟรี)');
ok(C.validate('backgrounds', form({ file: null }), []).some(e => e.includes('รูป หรือ')) && C.validate('backgrounds', form({ file: null, css: 'linear-gradient(180deg,#000 0%,#fff 100%)' }), []).length === 0, 'พื้นหลังต้องมีรูปหรือ gradient');
ok(C.validate('backgrounds', form({ file: null, css: 'red;} body{display:none' }), []).length >= 1 && C.validate('backgrounds', form({ file: null, css: 'url(http://x)' }), []).length >= 1, 'CSS ที่แทรกโค้ด/ลิงก์ภายนอกถูกปฏิเสธ');
ok(C.validate('characters', form({ file: null }), []).some(e => e.includes('ต้องเลือกรูป')), 'ตัวละครต้องมีรูป');
ok(C.validate('backs', form({ file: null, colors: { b1: '#fff', b2: 'red' } }), []).some(e => e.includes('สี')), 'สีต้องเป็น hex');
ok(C.validate('tables', form({ file: { mime: 'application/pdf', b64: 'AA==' }, colors: { bg: '#000', bg2: '#111' } }), []).some(e => e.includes('WebP')), 'ไฟล์ที่ไม่ใช่รูปถูกปฏิเสธ');
const be = C.buildEntry('backgrounds', form()); ok(be.entry.asset === './skin/backgrounds/neon-room.webp' && be.file.rel === 'backgrounds/neon-room.webp' && be.entry.price === 300 && be.entry.ink === '#ffffff', 'พื้นหลัง: asset/path/ราคา ถูกต้อง');
const bb = C.buildEntry('backs', form({ id: 'neo', colors: { b1: '#112233', b2: '#445566' }, file: { mime: 'image/svg+xml', b64: 'PHN2Zy8+' } })); ok(bb.entry.asset === './skin/cards/backs/neo.svg' && bb.entry.b1 === '#112233', 'หลังไพ่: โฟลเดอร์ cards/backs และสีถูกต้อง');
const bt = C.buildEntry('themes', form({ id: 'ocean', name: 'ทะเล', file: null, colors: Object.fromEntries(C.KINDS.themes.colors.map(([k, , d]) => [k, d])) })); ok(bt.entry.n === 'ทะเล' && bt.entry.card && bt.entry.bg2 && !bt.file && !('asset' in bt.entry), 'ธีมสี: ใช้คีย์ n และชุดสีครบ ไม่มีรูป');

console.log('\n[2] แก้ skins.json');
const addBg = { type: 'add', kind: 'backgrounds', entry: be.entry, file: be.file };
let r = C.applyOps(J, [addBg, { type: 'price', kind: 'tables', id: 'wood', price: 999 }, { type: 'name', kind: 'backs', id: 'gold', name: 'ทองใหม่' }]);
ok(!r.errors.length && r.json.backgrounds.at(-1).id === 'neon-room' && r.json.tables.find(x => x.id === 'wood').price === 999 && r.json.backs.find(x => x.id === 'gold').name === 'ทองใหม่' && J.tables.find(x => x.id === 'wood').price === 400, 'เพิ่ม/แก้ราคา/แก้ชื่อ ได้ และไม่แตะข้อมูลต้นฉบับ');
r = C.applyOps(J, [{ type: 'price', kind: 'tables', id: 'green-felt', price: 150 }]); ok(r.json.tables[0].price === 150, 'ตั้งราคาให้ของฟรี → ขึ้นร้านค้า (price > 0)');
r = C.applyOps(J, [{ type: 'price', kind: 'tables', id: 'wood', price: 0 }]); ok(r.json.tables.find(x => x.id === 'wood').price === 0, 'ตั้งราคา 0 → เป็นของฟรี');
r = C.applyOps(J, [{ type: 'remove', kind: 'backs', id: 'gold' }]); ok(!r.json.backs.some(x => x.id === 'gold') && r.removedAssets.includes('./skin/cards/backs/gold.svg'), 'ลบสกิน + รายงานไฟล์รูปที่ต้องลบ');
r = C.applyOps(J, [{ type: 'remove', kind: 'backs', id: 'gold', deleteAsset: false }]); ok(r.removedAssets.length === 0, 'เลือกไม่ลบไฟล์รูปได้');
r = C.applyOps(J, [{ type: 'price', kind: 'tables', id: 'nope', price: 5 }, addBg, addBg]); ok(r.errors.length === 2, 'แก้ของที่ไม่มี / เพิ่ม id ซ้ำ → รายงานข้อผิดพลาด');

console.log('\n[3] id ฝั่งเซิร์ฟเวอร์ (CHARS / BGS)');
let pp = C.patchIdList(commonText, 'BGS', 'neon-room', true); ok(pp.changed && /const BGS = \[[^\]]*'gold', 'neon-room'\];/.test(pp.text) && pp.text.includes("const CHARS = ['boy', 'girl'];") && pp.text.includes('module.exports'), 'เพิ่ม id ท้าย BGS โดยไม่แตะส่วนอื่นของไฟล์');
ok(!C.patchIdList(pp.text, 'BGS', 'neon-room', true).changed, 'เพิ่มซ้ำไม่เปลี่ยนไฟล์');
pp = C.patchIdList(pp.text, 'BGS', 'neon-room', false); ok(pp.changed && pp.text === commonText, 'ลบ id กลับได้ไฟล์เดิมเป๊ะ');
ok(C.patchIdList(commonText, 'CHARS', 'kid', true).text.includes("['boy', 'girl', 'kid']") && C.patchIdList('x', 'BGS', 'a', true).missing, 'เพิ่มใน CHARS ได้ · ไม่เจอรายการ → แจ้ง missing');

console.log('\n[4] แผนไฟล์ที่จะ commit');
let plan = C.buildPlan(cfg, skinsText, commonText, [addBg]); const paths = plan.files.map(f => f.path);
ok(!plan.errors.length && paths.includes('client/public/skin/skins.json') && paths.includes('client/public/skin/backgrounds/neon-room.webp') && paths.includes('server/src/rules/common.js') && plan.files.length === 3, 'พื้นหลังใหม่ → skins.json + รูป + common.js (BGS) ใน commit เดียว');
ok(Buffer.from(plan.files.find(f => f.path.endsWith('neon-room.webp')).b64, 'base64').equals(Buffer.from(PNG, 'base64')), 'ไบต์ของรูปไม่เพี้ยน');
plan = C.buildPlan(cfg, skinsText, commonText, [{ type: 'price', kind: 'tables', id: 'wood', price: 450 }]); ok(plan.files.length === 1 && plan.files[0].path.endsWith('skins.json'), 'แก้ราคาอย่างเดียว → แตะแค่ skins.json');
plan = C.buildPlan(cfg, skinsText, null, [addBg]); ok(plan.warnings.length === 1 && plan.files.length === 2, 'ไม่มี common.js → เตือนให้เพิ่ม id เอง แต่ยังอัปโหลดส่วนที่เหลือ');
plan = C.buildPlan(cfg, skinsText, commonText, [{ type: 'remove', kind: 'backgrounds', id: 'gold' }]); ok(plan.files.some(f => f.path === 'server/src/rules/common.js') && !/'gold'\]/.test(Buffer.from(plan.files.find(f => f.path.endsWith('common.js')).b64, 'base64').toString()), 'ลบพื้นหลัง → เอา id ออกจาก BGS ด้วย');
plan = C.buildPlan(cfg, '{bad json', commonText, [addBg]); ok(plan.errors.length === 1, 'skins.json บน GitHub เสีย → ไม่อัปโหลด');

console.log('\n[5] อัปโหลดขึ้น GitHub (จำลอง)');
(async () => {
  let gh = mockGitHub({ 'client/public/skin/skins.json': skinsText, 'server/src/rules/common.js': commonText, 'README.md': 'hello', 'client/public/skin/cards/backs/gold.svg': '<svg/>' });
  const logs = []; const out = await C.pushChanges(cfg, [addBg, { type: 'price', kind: 'tables', id: 'wood', price: 500 }], C.defaultMessage([addBg]), gh.fetch, m => logs.push(m));
  const head = JSON.parse(gh.read('client/public/skin/skins.json').toString());
  ok(gh.commits.get(gh.head()).message.startsWith('skin-studio: เพิ่มสกิน 1') && gh.commits.get(gh.head()).parents.length === 1 && out.commit.sha === gh.head(), 'commit เดียว มีข้อความและ parent ถูกต้อง');
  ok(head.backgrounds.some(x => x.id === 'neon-room' && x.price === 300) && head.tables.find(x => x.id === 'wood').price === 500, 'skins.json บน GitHub มีสกินใหม่และราคาใหม่');
  ok(gh.read('client/public/skin/backgrounds/neon-room.webp').equals(Buffer.from(PNG, 'base64')) && gh.read('README.md').toString() === 'hello' && gh.read('server/src/rules/common.js').toString().includes("'neon-room'"), 'รูปไบนารีขึ้นครบ ไฟล์อื่นไม่ถูกแตะ common.js มี id ใหม่');
  ok(logs.length >= 3 && out.files.length === 3, 'รายงานความคืบหน้า + รายชื่อไฟล์');
  await C.pushChanges(cfg, [{ type: 'remove', kind: 'backs', id: 'gold' }], 'x', gh.fetch);
  ok(gh.read('client/public/skin/cards/backs/gold.svg') === null && !JSON.parse(gh.read('client/public/skin/skins.json').toString()).backs.some(x => x.id === 'gold'), 'ลบสกินแล้วไฟล์รูปหายจาก repo ด้วย');
  // งานของคนอื่นที่ push ไปก่อน ต้องไม่ถูกทับ (ดึงไฟล์ล่าสุดทุกครั้ง)
  const other = JSON.parse(gh.read('client/public/skin/skins.json').toString()); other.tables.push({ id: 'from-pc', name: 'จากคอม', price: 10, asset: '', bg: '#000', bg2: '#111' });
  const h2 = mockGitHub({ 'client/public/skin/skins.json': C.serialize(other, skinsText), 'server/src/rules/common.js': commonText });
  await C.pushChanges(cfg, [{ type: 'price', kind: 'tables', id: 'wood', price: 77 }], 'x', h2.fetch);
  const merged = JSON.parse(h2.read('client/public/skin/skins.json').toString()); ok(merged.tables.some(x => x.id === 'from-pc') && merged.tables.find(x => x.id === 'wood').price === 77, 'แก้บนข้อมูลล่าสุดของ GitHub ไม่ทับงานที่ push จากเครื่องอื่น');
  // ข้อผิดพลาด
  const bad = mockGitHub({ 'client/public/skin/skins.json': skinsText }); await assert.rejects(() => C.pushChanges(Object.assign({}, cfg, { token: 'wrong' }), [addBg], 'x', bad.fetch), /โทเคนไม่ถูกต้อง/); ok(true, 'โทเคนผิด → ข้อความภาษาไทยชัดเจน');
  await assert.rejects(() => C.pushChanges(Object.assign({}, cfg, { skinDir: 'nope/skin' }), [addBg], 'x', bad.fetch), /ไม่พบ nope\/skin\/skins.json/); ok(true, 'โฟลเดอร์สกินผิด → บอกให้ตรวจการตั้งค่า');
  const cf = mockGitHub({ 'client/public/skin/skins.json': skinsText, 'server/src/rules/common.js': commonText }); cf.forceConflict = true; await assert.rejects(() => C.pushChanges(cfg, [addBg], 'x', cf.fetch), /ข้อมูลชนกัน/); ok(true, 'มีคน push ระหว่างอัปโหลด → แจ้งให้ลองใหม่ (ไม่ทับ)');
  await assert.rejects(() => C.pushChanges(cfg, [addBg, addBg], 'x', gh.fetch), /มีอยู่แล้ว/); ok(true, 'รายการซ้ำถูกจับก่อน commit');
  const c = await C.makeGH(cfg, mockGitHub({ a: 'b' }).fetch).check(); ok(c.name === 'o/r' && c.canPush, 'ทดสอบการเชื่อมต่อ repo/branch');
  console.log('\nผ่านทั้งหมด ' + passed + ' รายการ');
})().catch(e => { console.error('ล้มเหลว:', e && e.stack || e); process.exit(1); });
