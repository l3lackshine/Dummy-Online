#!/usr/bin/env node
/* pack-assets.js — แพ็กรูป/เสียงของตัวละครเป็นไฟล์เดียว เข้ารหัสทีละไฟล์ (AES-256-GCM)
   ใช้:   node scripts/pack-assets.js            สร้าง client/public/pack/{characters.pak, manifest.json, keys.js}
          node scripts/pack-assets.js --strip    เหมือนข้างบน + ย้ายไฟล์ต้นฉบับออกจากโฟลเดอร์ที่เว็บเสิร์ฟ (ไปไว้ assets-src/)
          node scripts/pack-assets.js --check    ตรวจอย่างเดียว ไม่เขียนไฟล์
   ต้นฉบับอ่านจาก assets-src/Character/** (ถ้ามี) และ client/public/Character/** · ไฟล์ *.config ไม่ถูกแพ็ก (เป็นข้อความเล็ก ๆ ที่เกมอ่านตรง)
   ใช้กุญแจเดิมได้โดยตั้ง PACK_KEY=<base64 32 ไบต์> (ก้อนที่ 2 จะส่งกุญแจจากเซิร์ฟเวอร์แทนการฝังใน keys.js)
   รูปแบบไฟล์: 'DMP1' | iv(12) | ความยาวดัชนี(u32) | ดัชนีที่เข้ารหัส | ข้อมูลไฟล์ (แต่ละไฟล์ = iv ของตัวเองในดัชนี + ciphertext+tag) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), PUB = path.join(ROOT, 'client/public'), SRC = path.join(ROOT, 'assets-src'), OUT = path.join(PUB, 'pack');
const CHECK = process.argv.includes('--check'), STRIP = process.argv.includes('--strip');
const PACK_ID = 'characters', ROOTS = ['Character'];
const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm' };
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
function walk(dir, base, out) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else { const ext = e.name.split('.').pop().toLowerCase(); if (MIME[ext]) out.set(path.relative(base, p).split(path.sep).join('/'), p); }
  }
}
const files = new Map(), served = [];
for (const r of ROOTS) { walk(path.join(PUB, r), PUB, files); walk(path.join(PUB, r), PUB, { set: (k, v) => served.push([k, v]) }); }
for (const r of ROOTS) walk(path.join(SRC, r), SRC, files); // assets-src มาก่อน (ทับ)
if (!files.size) { console.error('✗ ไม่พบไฟล์ให้แพ็ก (Character/<id>/Character.webp ...)'); process.exit(1); }

const key = process.env.PACK_KEY ? Buffer.from(process.env.PACK_KEY, 'base64') : crypto.randomBytes(32);
if (key.length !== 32) { console.error('✗ PACK_KEY ต้องเป็น base64 ของ 32 ไบต์'); process.exit(1); }
const enc = (buf, aad) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 }); c.setAAD(Buffer.from(aad)); const ct = Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]); return { iv, ct }; };
const names = [...files.keys()].sort(), index = { v: 1, id: PACK_ID, files: {} }, blobs = []; let off = 0;
for (const n of names) {
  const raw = fs.readFileSync(files.get(n)), { iv, ct } = enc(raw, n);
  index.files[n] = { o: off, l: ct.length, iv: iv.toString('base64'), t: MIME[n.split('.').pop().toLowerCase()], s: raw.length }; blobs.push(ct); off += ct.length;
}
const idx = enc(Buffer.from(JSON.stringify(index), 'utf8'), 'index'), len = Buffer.alloc(4); len.writeUInt32LE(idx.ct.length);
const pak = Buffer.concat([Buffer.from('DMP1'), idx.iv, len, idx.ct, ...blobs]);
const ver = crypto.createHash('sha256').update(pak).digest('hex').slice(0, 16);
const manifest = { id: PACK_ID, file: 'characters.pak', version: ver, bytes: pak.length, files: names.length, built: new Date().toISOString() };
// กุญแจฝังชั่วคราว (ก้อนที่ 1): แยกเป็น 2 ส่วน XOR กัน — แค่กันการเปิดดูผ่าน ๆ ก้อนที่ 2 จะเปลี่ยนเป็นส่งจากเซิร์ฟเวอร์ตามสิทธิ์ผู้เล่น
const mask = crypto.randomBytes(32), a = Buffer.from(key.map((b, i) => b ^ mask[i]));
const keysJs = `/* สร้างอัตโนมัติโดย scripts/pack-assets.js — อย่าแก้ */\nwindow.__PK = window.__PK || {}; window.__PK[${JSON.stringify(PACK_ID)}] = [${JSON.stringify(a.toString('base64'))}, ${JSON.stringify(mask.toString('base64'))}];\n`;
if (served.length) console.warn(`⚠ ยังมีไฟล์ต้นฉบับ ${served.length} ไฟล์ในโฟลเดอร์ที่เว็บเสิร์ฟ (ใคร ๆ ก็โหลดตรงได้) — ใช้ --strip เพื่อย้ายออกไป assets-src/`);
if (CHECK) { console.log(`✓ ตรวจผ่าน — จะแพ็ก ${names.length} ไฟล์`); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, manifest.file), pak); fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n'); fs.writeFileSync(path.join(OUT, 'keys.js'), keysJs);
if (STRIP) for (const [n, p] of served) { const dst = path.join(SRC, n); if (!fs.existsSync(dst)) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(p, dst); } fs.unlinkSync(p); }
console.log(`✓ แพ็ก ${names.length} ไฟล์ → ${rel(path.join(OUT, manifest.file))} (${(pak.length / 1048576).toFixed(2)} MB) เวอร์ชัน ${ver}${STRIP ? ` · ย้ายต้นฉบับ ${served.length} ไฟล์ไป assets-src/` : ''}`);
