// ตรวจว่า inline handler ในโค้ดหน้าเว็บไม่ลืมวงเล็บ เช่น onclick=openPile (ต้องเป็น onclick=openPile())
// ตรวจทุกไฟล์ใน client/public/Code/<หมวด>/*.js · รัน: node scripts/check-handlers.js
const fs = require('fs');
const path = require('path');

const CODE_DIR = path.join(__dirname, '../client/public/Code');
const HANDLER_WITHOUT_CALL = /\bon(?:click|change|input|keydown|keyup)=(?!["'`$])([A-Za-z_]\w*)(?=[\s>`'"])/g;

const problems = [];
for (const category of fs.readdirSync(CODE_DIR)) {
  const dir = path.join(CODE_DIR, category);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const match of source.matchAll(HANDLER_WITHOUT_CALL)) problems.push(category + '/' + file + ': ' + match[0]);
  }
}
if (problems.length) {
  console.error('พบ handler ที่ไม่ได้เรียกฟังก์ชัน (ลืม ()):', problems);
  process.exit(1);
}
console.log('handler ทุกจุดมีวงเล็บครบ');
