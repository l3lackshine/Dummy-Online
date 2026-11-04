// ตัวช่วยเทส: หาไฟล์ JS ของหน้าเว็บจากชื่อไฟล์ (เช่น 'app.js') โดยอ่านพาธจริงจาก client/public/index.html
// ทำไม: ไฟล์หน้าเว็บอยู่ใน client/public/Code/<หมวด>/ — ถ้าย้ายหมวดภายหลัง เทสไม่ต้องแก้พาธตาม ขอแค่ index.html ถูก
// Public: pathOf(name) · read(names) — ต่อเนื้อหาไฟล์ตามลำดับที่ส่งมา คั่นด้วยบรรทัดว่าง
//   ชื่อ 'app.js' = แกนหน้าเกมที่แยกจาก app.js เดิม (ตั้งแต่ state.js ถึง boot.js ตามลำดับใน index.html)
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../client/public');
const INDEX_HTML = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

// ชื่อไฟล์ → พาธใน client/public ตามที่ index.html โหลดอยู่จริง
const SCRIPT_PATHS = {};
for (const match of INDEX_HTML.matchAll(/<script src="\.\/([^"]+\.js)"/g)) {
  SCRIPT_PATHS[path.basename(match[1])] = match[1];
}

function pathOf(name) {
  const relative = SCRIPT_PATHS[name];
  if (!relative) throw new Error('index.html ไม่ได้โหลดไฟล์ ' + name);
  return path.join(PUBLIC_DIR, relative);
}

// ไฟล์แกนหน้าเกม (แยกมาจาก app.js เดิม) เรียงตามลำดับที่ index.html โหลด
const SCRIPT_ORDER = [...INDEX_HTML.matchAll(/<script src="\.\/([^"]+\.js)"/g)].map(match => path.basename(match[1]));
const APP_PARTS = SCRIPT_ORDER.slice(SCRIPT_ORDER.indexOf('state.js'), SCRIPT_ORDER.indexOf('boot.js') + 1);

function expand(names) {
  return names.flatMap(name => (name === 'app.js' ? APP_PARTS : [name]));
}

function read(names) {
  return expand(names)
    .map(name => fs.readFileSync(pathOf(name), 'utf8'))
    .join('\n');
}

module.exports = { pathOf, read };
