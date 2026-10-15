// ตรวจว่า inline handler ใน app.js ไม่ลืมวงเล็บ เช่น onclick=openPile (ต้องเป็น onclick=openPile()) — รัน: node scripts/check-handlers.js
const fs = require('fs'), src = fs.readFileSync(__dirname + '/../client/public/app.js', 'utf8');
const bad = [...src.matchAll(/\bon(?:click|change|input|keydown|keyup)=(?!["'`$])([A-Za-z_]\w*)(?=[\s>`'"])/g)].map(m => m[0]);
if (bad.length) { console.error('พบ handler ที่ไม่ได้เรียกฟังก์ชัน (ลืม ()):', bad); process.exit(1); }
console.log('handler ทุกจุดมีวงเล็บครบ');
