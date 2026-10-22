'use strict';
// โหลดไฟล์ server/.env (เฉพาะตอนรันจริงด้วย `npm start` — ผ่าน node -r ./src/env.js) ไม่ทับค่า env ที่ตั้งไว้แล้ว
// บน Render ให้ตั้งค่าที่ Environment แทนไฟล์นี้
const fs = require('fs'), path = require('path');
function load(file = path.join(__dirname, '..', '.env')) {
  let txt; try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { return false; }
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2]; if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
  return true;
}
if (require.main !== module) load();
module.exports = { load };
