#!/usr/bin/env node
// เตรียมไฟล์สำหรับสร้างแอป Android (GitHub Actions เรียกให้เอง และรันในเครื่องก็ได้)
//   node mobile/prepare.js www      คัดลอก client/public → mobile/www, ตั้ง BACKEND_URL (จาก env), ใช้ socket.io ที่แพ็กในแอป
//   node mobile/prepare.js android  หลัง `npx cap add android`: ใส่ไอคอนแอป + เลขเวอร์ชัน (versionName จาก version.js, versionCode = GITHUB_RUN_NUMBER)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'client/public'), WWW = path.join(__dirname, 'www'), AND = path.join(__dirname, 'android');
const die = m => { console.error('✗ ' + m); process.exit(1); };
const read = p => fs.readFileSync(p, 'utf8');

function prepWww() {
  fs.rmSync(WWW, { recursive: true, force: true }); fs.cpSync(SRC, WWW, { recursive: true });
  const index = path.join(WWW, 'index.html'); if (!fs.existsSync(index)) die('ไม่พบ client/public/index.html');
  // 1) ที่อยู่เซิร์ฟเวอร์ — ตั้งผ่าน env BACKEND_URL (เช่น repo variable) ถ้าไม่ตั้งใช้ค่าใน client/public/config.js
  const be = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');
  if (be) { if (!/^https?:\/\//.test(be)) die('BACKEND_URL ต้องขึ้นต้นด้วย http:// หรือ https://'); fs.writeFileSync(path.join(WWW, 'config.js'), `window.DUMMY_CONFIG = {\n  BACKEND_URL: '${be}'\n};\n`); console.log('• BACKEND_URL =', be); }
  else console.log('• BACKEND_URL ใช้ค่าจาก client/public/config.js:', (read(path.join(WWW, 'config.js')).match(/BACKEND_URL:\s*'([^']*)'/) || [])[1] || '(ว่าง)');
  // 2) ใช้ socket.io-client ที่แพ็กมากับแอป (ไม่พึ่ง CDN)
  const sio = path.join(__dirname, 'node_modules/socket.io-client/dist/socket.io.min.js');
  if (fs.existsSync(sio)) {
    fs.copyFileSync(sio, path.join(WWW, 'socket.io.min.js')); let h = read(index);
    const n = h.replace(/src="https?:\/\/[^"]*socket\.io[^"]*\.js"/, 'src="./socket.io.min.js"');
    if (n === h) die('หา <script> ของ socket.io ใน index.html ไม่เจอ'); fs.writeFileSync(index, n); console.log('• ใช้ socket.io ที่แพ็กในแอป');
  } else console.log('• (ข้าม) ยังไม่ได้ npm install ใน mobile/ — ใช้ socket.io จาก CDN ตาม index.html');
  console.log('✓ เตรียม mobile/www แล้ว');
}
function prepAndroid() {
  if (!fs.existsSync(AND)) die('ยังไม่มีโปรเจกต์ Android — รัน `npx cap add android` ในโฟลเดอร์ mobile ก่อน');
  // ไอคอน (mipmap-*dpi + สีพื้นหลัง adaptive icon)
  const res = path.join(AND, 'app/src/main/res'); fs.cpSync(path.join(__dirname, 'res'), res, { recursive: true, force: true }); console.log('• ใส่ไอคอนแอปแล้ว');
  // เลขเวอร์ชัน
  const ver = (read(path.join(SRC, 'version.js')).match(/DUMMY_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1] || '1.0';
  const code = parseInt(process.env.GITHUB_RUN_NUMBER || process.env.VERSION_CODE || '1', 10) || 1;
  const gradle = path.join(AND, 'app/build.gradle'); let g = read(gradle);
  const g2 = g.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${ver.replace(/"/g, '')}"`);
  if (g2 === g) die('แก้ versionCode/versionName ใน build.gradle ไม่สำเร็จ (รูปแบบไฟล์เปลี่ยน?)'); fs.writeFileSync(gradle, g2);
  console.log(`• versionName "${ver}" · versionCode ${code}`); console.log('✓ เตรียมโปรเจกต์ Android แล้ว');
}
const mode = process.argv[2]; if (mode === 'www') prepWww(); else if (mode === 'android') prepAndroid(); else die('ใช้: node mobile/prepare.js www | android');
