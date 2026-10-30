// ตัวกรองชื่อ: คำหยาบ (ไทย/อังกฤษ/ตัวเลขแทนตัวอักษร/เว้นวรรคหลบ) · แอบอ้างทีมงาน · ชื่อปกติต้องผ่าน · สำเนาฝั่ง client ตรงกัน · เซิร์ฟเวอร์แทนชื่อหยาบด้วย "ผู้เล่น"
const assert = require('assert'), fs = require('fs'), path = require('path'), F = require('./src/namefilter');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const bad = ['ควย', 'ควยยยย', 'ค ว ย', 'ไอ้เหี้ย', 'สัส', 'อีดอก', 'fuck', 'F.U.C.K', 'fuuuck', 'sh1t', 'b!tch', 'N1gga', 'kuay'];
const staff = ['Admin', 'แอดมิน', 'GM_Tom', 'GM', 'Moderator1', 'ทีมงาน', 'Official_Dummy', 'ระบบ'];
const good = ['Arya_77', 'น้องมี่', 'ลุงหัว', 'ป้าน็อก', 'สมชาย', 'Sakura', 'หีบสมบัติ', 'สัดส่วนดี', 'cocktail', 'Rapee', 'gmail', 'modoo', 'Leo', 'HeeHee', 'ราชาน็อก', 'เซียนดัมมี่'];
ok(bad.every(n => /ไม่สุภาพ/.test(F.check(n) || '')), 'คำหยาบถูกกันทุกแบบ (' + bad.length + ' ชื่อ รวมเว้นวรรค/ตัวเลข/ตัวซ้ำ)');
ok(staff.every(n => /ทีมงาน/.test(F.check(n) || '')), 'ชื่อแอบอ้างทีมงานถูกกัน (' + staff.length + ' ชื่อ)');
const fp = good.filter(n => F.check(n)); ok(!fp.length, 'ชื่อปกติผ่านทั้งหมด' + (fp.length ? ' — ติด: ' + fp.join(', ') : ''));
ok(F.check('') && F.check('   ') && F.check('...'), 'ชื่อว่าง/มีแต่สัญลักษณ์ใช้ไม่ได้');
ok(F.clean('ควย', 'ผู้เล่น') === 'ผู้เล่น' && F.clean('สมชาย') === 'สมชาย' && F.clean('ชื่อยาวมากกกกกกกกกกกกกก').length === 14, 'clean(): ชื่อหยาบ → ค่าแทน · ชื่อปกติคงเดิม · ตัดที่ 14 ตัว');
ok(fs.readFileSync(path.join(__dirname, 'src/namefilter.js'), 'utf8') === fs.readFileSync(path.join(__dirname, '../client/public/namefilter.js'), 'utf8'), 'สำเนาฝั่ง client ตรงกับฝั่งเซิร์ฟเวอร์');
const sql = fs.readFileSync(path.join(__dirname, '../supabase/name_filter.sql'), 'utf8');
ok(['ควย', 'fuck', 'แอดมิน', 'หีบ'].every(w => sql.includes("'" + F.norm(w) + "'")), 'name_filter.sql สร้างจากรายการคำล่าสุด (รัน node scripts/gen-namefilter-sql.js)');
// เซิร์ฟเวอร์: ชื่อหยาบตอนสร้างห้อง → "ผู้เล่น"
const M = require('./test-mock-sio');
(async () => {
  const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 100000 }), c = M.client(srv); let lob = null; c.on('room:lobby', l => { lob = l; });
  await new Promise(r => setTimeout(r, 20)); c.emit('room:create', { name: 'f u c k', bots: true }); await new Promise(r => setTimeout(r, 60));
  const me = lob && lob.players.find(p => p.you); ok(me && me.name === 'ผู้เล่น', 'เซิร์ฟเวอร์แทนชื่อหยาบด้วย "ผู้เล่น" เมื่อเข้าห้อง');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`); process.exit(0);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
