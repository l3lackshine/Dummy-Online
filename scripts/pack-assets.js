#!/usr/bin/env node
/* pack-assets.js (ก้อนที่ 2) — แพ็กแอสเซ็ตตัวละครเป็นไฟล์เข้ารหัส แยกตามสิทธิ์
     pack/base.pak        ตัวละครฟรี (ราคา 0) + ภาพตัวอย่างลายน้ำของตัวละครที่ต้องซื้อ   → ใครก็ขอกุญแจได้
     pack/char-<id>.pak   ภาพเต็ม/เอฟเฟกต์/เสียงของตัวละครที่ต้องซื้อ 1 ตัว/1 แพ็ก        → ได้กุญแจเมื่อมีตัวละครนั้นในคลัง
   กุญแจ = HKDF(PACK_MASTER, ชื่อแพ็ก) — ไม่เก็บที่ไหน เซิร์ฟเวอร์ (Render) คำนวณได้เองจาก PACK_MASTER เดียวกัน
   ใช้:   PACK_MASTER=<ข้อความลับ ≥16 ตัวอักษร> node scripts/pack-assets.js [--strip] [--check]
          node scripts/pack-assets.js --dev     ทดสอบในเครื่อง (ใช้ master ทดสอบ ห้ามใช้จริง)
   ปกติรันอัตโนมัติด้วย GitHub Actions (.github/workflows/pack-assets.yml) ที่ใช้ Secret ชื่อ PACK_MASTER
   ต้นฉบับ: assets-src/Character/<id>/... (หรือ client/public/Character/<id>/...) · ภาพตัวอย่าง: assets-src/Character/<id>/Preview.webp
   ผลลัพธ์เหมือนเดิมทุกครั้งถ้าไฟล์ไม่เปลี่ยน (IV คำนวณจากเนื้อหา) จึงไม่เกิดไฟล์ใหม่ให้ commit โดยไม่จำเป็น
   รูปแบบไฟล์: 'DMP1' | iv(12) | ความยาวดัชนี(u32) | ดัชนีที่เข้ารหัส | ข้อมูลไฟล์ */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), PUB = path.join(ROOT, 'client/public'), SRC = path.join(ROOT, 'assets-src'), OUT = path.join(PUB, 'pack');
const A = process.argv, CHECK = A.includes('--check'), STRIP = A.includes('--strip'), DEV = A.includes('--dev');
const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm' };
const rel = p => path.relative(ROOT, p).split(path.sep).join('/'), ext = n => n.split('.').pop().toLowerCase();
const master = process.env.PACK_MASTER || (DEV ? 'DEV-ONLY-MASTER-DO-NOT-USE-IN-PRODUCTION' : '');
if (!master || master.length < 16) { console.error('✗ ต้องตั้ง PACK_MASTER (ข้อความลับยาว ≥16 ตัวอักษร) หรือใช้ --dev เพื่อทดสอบ'); process.exit(1); }
if (DEV && !process.env.PACK_MASTER) console.warn('⚠ โหมด --dev: ใช้ master ทดสอบ — แพ็กนี้ห้ามนำไปใช้จริง');
const keyOf = id => Buffer.from(crypto.hkdfSync('sha256', Buffer.from(master, 'utf8'), Buffer.from('dummy-pack-v1'), Buffer.from(id), 32)); // ต้องตรงกับ server/src/packkeys.js
// ---- สำรวจไฟล์ ----
function walk(dir, base, cb) { if (!fs.existsSync(dir)) return; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, base, cb); else if (MIME[ext(e.name)]) cb(path.relative(base, p).split(path.sep).join('/'), p); } }
const files = new Map(), served = [];
walk(path.join(PUB, 'Character'), PUB, (n, p) => { files.set(n, p); served.push([n, p]); });
walk(path.join(SRC, 'Character'), SRC, (n, p) => files.set(n, p)); // assets-src ทับ
const chars = new Set([...files.keys()].map(n => n.split('/')[1]).filter(Boolean));
const priceOf = id => { try { return Number(JSON.parse(fs.readFileSync(path.join(PUB, 'Character', id, 'Character.config'), 'utf8')).price) || 0; } catch (e) { return 0; } };
// ---- จัดกลุ่มเป็นแพ็ก ----
const packs = new Map(); const add = (pid, meta, name, p) => { if (!packs.has(pid)) packs.set(pid, { id: pid, ...meta, files: new Map() }); packs.get(pid).files.set(name, p); };
const warns = [];
for (const id of [...chars].sort()) {
  const paid = priceOf(id) > 0, mine = [...files.keys()].filter(n => n.startsWith(`Character/${id}/`));
  for (const n of mine) {
    const base = n.split('/').pop();
    if (/^Preview\.(webp|png|jpe?g)$/i.test(base)) { if (paid) add('base', { tier: 'public' }, `Preview/${id}.webp`, files.get(n)); continue; } // ภาพตัวอย่างอยู่แพ็กฟรีเสมอ
    paid ? add('char-' + id, { tier: 'owner', kind: 'characters', item: id }, n, files.get(n)) : add('base', { tier: 'public' }, n, files.get(n));
  }
  if (paid && !mine.some(n => /\/Preview\./i.test(n))) warns.push(`ตัวละคร ${id} ไม่มี Preview.webp — คนที่ยังไม่มีตัวละครจะเห็นภาพว่าง (สร้างด้วย node scripts/make-previews.js)`);
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) { console.error(`✗ id ตัวละคร "${id}" ใช้ได้เฉพาะ a-z 0-9 _ - (ตัวเล็ก)`); process.exit(1); }
}
if (!packs.size) { console.error('✗ ไม่พบไฟล์ให้แพ็ก'); process.exit(1); }
// ---- เข้ารหัส ----
const sha = b => crypto.createHash('sha256').update(b).digest();
function enc(key, buf, aad) { const iv = crypto.createHmac('sha256', key).update(Buffer.concat([Buffer.from('iv|' + aad + '|'), sha(buf)])).digest().subarray(0, 12), c = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 }); c.setAAD(Buffer.from(aad)); return { iv, ct: Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]) }; }
const manifest = { v: 2, packs: [] }, outputs = [];
for (const pk of [...packs.values()].sort((a, b) => (a.id === 'base' ? -1 : b.id === 'base' ? 1 : a.id.localeCompare(b.id)))) {
  const key = keyOf(pk.id), names = [...pk.files.keys()].sort(), index = { v: 1, id: pk.id, files: {} }, blobs = []; let off = 0;
  for (const n of names) { const raw = fs.readFileSync(pk.files.get(n)), { iv, ct } = enc(key, raw, n); index.files[n] = { o: off, l: ct.length, iv: iv.toString('base64'), t: MIME[ext(n)], s: raw.length }; blobs.push(ct); off += ct.length; }
  const idx = enc(key, Buffer.from(JSON.stringify(index)), 'index'), len = Buffer.alloc(4); len.writeUInt32LE(idx.ct.length);
  const pak = Buffer.concat([Buffer.from('DMP1'), idx.iv, len, idx.ct, ...blobs]), file = pk.id + '.pak';
  const m = { id: pk.id, file, tier: pk.tier, version: sha(pak).toString('hex').slice(0, 16), bytes: pak.length, files: names.length }; if (pk.kind) { m.kind = pk.kind; m.item = pk.item; }
  manifest.packs.push(m); outputs.push([file, pak]);
}
if (served.length) console.warn(`⚠ ยังมีไฟล์ต้นฉบับ ${served.length} ไฟล์ในโฟลเดอร์ที่เว็บเสิร์ฟ (โหลดตรงได้) — ใช้ --strip เพื่อย้ายออกไป assets-src/`);
warns.forEach(w => console.warn('⚠ ' + w));
if (CHECK) { console.log(`✓ ตรวจผ่าน — ${manifest.packs.length} แพ็ก: ` + manifest.packs.map(p => `${p.id}(${p.files})`).join(', ')); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/\.pak$|^keys\.js$/.test(f) && !outputs.some(([n]) => n === f)) fs.unlinkSync(path.join(OUT, f)); // ลบแพ็กเก่าที่ไม่ใช้แล้ว (รวม keys.js ของก้อนที่ 1)
for (const [f, b] of outputs) fs.writeFileSync(path.join(OUT, f), b);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
if (STRIP) for (const [n, p] of served) { const dst = path.join(SRC, n); if (!fs.existsSync(dst)) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(p, dst); } fs.unlinkSync(p); }
console.log('✓ แพ็กเสร็จ:\n' + manifest.packs.map(p => `   ${p.file.padEnd(22)} ${(p.bytes / 1024).toFixed(0).padStart(6)} KB  ${p.tier === 'owner' ? 'ต้องมีตัวละคร ' + p.item : 'ฟรี'}`).join('\n') + (STRIP ? `\n   ย้ายต้นฉบับ ${served.length} ไฟล์ไป assets-src/` : ''));
