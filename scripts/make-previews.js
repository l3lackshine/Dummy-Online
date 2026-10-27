#!/usr/bin/env node
/* make-previews.js — สร้างภาพตัวอย่างเล็ก + ลายน้ำ (Preview.webp) ของตัวละครที่ต้องซื้อ ให้คนที่ยังไม่มีตัวละครเห็นในร้านค้า/กาชา
   ใช้: node scripts/make-previews.js [--force]     ต้องมีแพ็กเกจ sharp (GitHub Actions ติดตั้งให้เอง: npm i --no-save sharp)
   ข้ามตัวที่มี Preview.webp อยู่แล้ว (ใช้ --force เพื่อสร้างใหม่) */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PUB = path.join(ROOT, 'client/public'), SRC = path.join(ROOT, 'assets-src'), FORCE = process.argv.includes('--force');
let sharp; try { sharp = require('sharp'); } catch (e) { console.warn('⚠ ไม่พบ sharp — ข้ามการสร้างภาพตัวอย่าง (ติดตั้งด้วย npm i sharp)'); process.exit(0); }
const W = 300;
(async () => {
  const dir = path.join(PUB, 'Character'); let made = 0;
  for (const id of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    let price = 0; try { price = Number(JSON.parse(fs.readFileSync(path.join(dir, id, 'Character.config'), 'utf8')).price) || 0; } catch (e) {} if (price <= 0) continue;
    const out = path.join(SRC, 'Character', id, 'Preview.webp'); if (fs.existsSync(out) && !FORCE) continue;
    const src = ['webp', 'png', 'jpg', 'jpeg'].map(x => path.join(SRC, 'Character', id, 'Character.' + x)).concat(['webp', 'png', 'jpg', 'jpeg'].map(x => path.join(dir, id, 'Character.' + x))).find(fs.existsSync);
    if (!src) { console.warn(`⚠ ${id}: ไม่พบรูปต้นฉบับ`); continue; }
    const meta = await sharp(src).metadata(), h = Math.round(W * meta.height / meta.width);
    const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}"><g fill="#fff" fill-opacity=".35" font-family="sans-serif" font-size="22" font-weight="700" transform="rotate(-28 ${W / 2} ${h / 2})">${Array.from({ length: 9 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<text x="${c * 150 - 60}" y="${r * 70 - 40}">DUMMY ONLINE</text>`).join('')).join('')}</g></svg>`;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(src).resize(W).composite([{ input: Buffer.from(mark) }]).webp({ quality: 55 }).toFile(out); made++; console.log('✓ ' + path.relative(ROOT, out));
  }
  console.log(made ? `สร้างภาพตัวอย่าง ${made} ไฟล์` : 'ไม่มีภาพตัวอย่างที่ต้องสร้าง');
})().catch(e => { console.error(e); process.exit(1); });
