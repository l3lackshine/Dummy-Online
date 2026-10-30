#!/usr/bin/env node
// สร้าง supabase/name_filter.sql จากรายการคำใน server/src/namefilter.js (ให้ฐานข้อมูลตรวจชื่อด้วยกติกาเดียวกับเกม)
// แก้รายการคำใน namefilter.js แล้วรัน: node scripts/gen-namefilter-sql.js → วางไฟล์ที่ได้ใน Supabase SQL Editor
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), FILE = path.join(ROOT, 'server/src/namefilter.js');
const F = require(FILE), src = fs.readFileSync(FILE, 'utf8');
const grab = k => Function('return ' + src.match(new RegExp('const ' + k + ' = (\\[[\\s\\S]*?\\]);'))[1])();
const uniq = a => [...new Set(a.map(F.norm).filter(Boolean))];
const arr = a => 'array[' + a.map(x => "'" + x.replace(/'/g, "''") + "'").join(',') + ']';
const sql = `-- ตัวตรวจชื่อฝั่งฐานข้อมูล — สร้างจาก server/src/namefilter.js ด้วย scripts/gen-namefilter-sql.js (อย่าแก้มือ)
-- ใช้ใน update_profile และตอนสมัครสมาชิก · กันชื่อหยาบ/แอบอ้างทีมงานแม้จะยิง API ตรงโดยไม่ผ่านตัวเกม · รันซ้ำได้
create or replace function public._name_norm(p text) returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             translate(lower(normalize(coalesce(p, ''), NFC)), '0137489!@$|+5', 'oietabgiasits'),
             '[[:space:]._*~^''"\`,:;(){}<>/\\\\?#%&=\\[\\]-]+|[\\u200b-\\u200f\\u2060\\ufeff]', '', 'g'),
           '(.)\\1+', '\\1', 'g')
$$;
create or replace function public._bad_name(p text) returns text language plpgsql immutable as $$
declare n text := public._name_norm(p); t text; w text;
begin
  if n = '' then return 'ชื่อต้องมีตัวอักษร'; end if;
  t := n;
  foreach w in array ${arr(uniq(grab('OK')))} loop t := replace(t, w, '·'); end loop;
  foreach w in array ${arr(uniq(grab('BAD')))} loop if position(w in t) > 0 then return 'ชื่อนี้มีคำไม่สุภาพ ลองชื่ออื่นนะ'; end if; end loop;
  foreach w in array ${arr(uniq(grab('STAFF')))} loop if n = w or (char_length(w) >= 4 and position(w in n) > 0) then return 'ชื่อนี้คล้ายทีมงาน ใช้ไม่ได้'; end if; end loop;
  if p ~* '^\\s*(gm|mod)([[:space:]._-]|$)' then return 'ชื่อนี้คล้ายทีมงาน ใช้ไม่ได้'; end if;
  return null;
end $$;
`;
const out = path.join(ROOT, 'supabase/name_filter.sql');
fs.writeFileSync(out, sql); console.log('✓ เขียน ' + path.relative(ROOT, out));
