-- ตัวตรวจชื่อฝั่งฐานข้อมูล — สร้างจาก server/src/namefilter.js ด้วย scripts/gen-namefilter-sql.js (อย่าแก้มือ)
-- ใช้ใน update_profile และตอนสมัครสมาชิก · กันชื่อหยาบ/แอบอ้างทีมงานแม้จะยิง API ตรงโดยไม่ผ่านตัวเกม · รันซ้ำได้
create or replace function public._name_norm(p text) returns text language sql immutable as $$
  select regexp_replace(
           regexp_replace(
             translate(lower(normalize(coalesce(p, ''), NFC)), '0137489!@$|+5', 'oietabgiasits'),
             '[[:space:]._*~^''"`,:;(){}<>/\\?#%&=\[\]-]+|[\u200b-\u200f\u2060\ufeff]', '', 'g'),
           '(.)\1+', '\1', 'g')
$$;
create or replace function public._bad_name(p text) returns text language plpgsql immutable as $$
declare n text := public._name_norm(p); t text; w text;
begin
  if n = '' then return 'ชื่อต้องมีตัวอักษร'; end if;
  t := n;
  foreach w in array array['หีบ','สัดส่วน','หำหั่น','ร่านี้','cocktail','peacock','hancock','dickens','scunthorpe','shitake'] loop t := replace(t, w, '·'); end loop;
  foreach w in array array['ควย','เหี้ย','เหี่ย','เย็ด','เยด','หี','แตด','สัส','สัด','แม่ง','ส้นตีน','จัญไร','ระยำ','ชาติหมา','อีดอก','ดอกทอง','อีตัว','กะหรี่','กระหรี่','ร่าน','เงี่ยน','จิ๋ม','หำ','โคตรพ่อ','โคตรแม่','พ่อมึง','แม่มึง','อีเวร','ไอ้เวร','อีควาย','ไอ้ควาย','ไอ้สัตว์','อีสัตว์','ขายตัว','ข่มขืน','fuck','fuk','fck','shit','bitch','cunt','dick','cock','pusy','niger','niga','whore','slut','porn','ashole','fag','hitler','nazi','motherf','kuay'] loop if position(w in t) > 0 then return 'ชื่อนี้มีคำไม่สุภาพ ลองชื่ออื่นนะ'; end if; end loop;
  foreach w in array array['admin','แอดมิน','แอดมิ้น','gm','gamemaster','moderator','mod','ทีมงาน','ผู้ดูแล','oficial','suport','system','ระบ','dumyonline'] loop if n = w or (char_length(w) >= 4 and position(w in n) > 0) then return 'ชื่อนี้คล้ายทีมงาน ใช้ไม่ได้'; end if; end loop;
  if p ~* '^\s*(gm|mod)([[:space:]._-]|$)' then return 'ชื่อนี้คล้ายทีมงาน ใช้ไม่ได้'; end if;
  return null;
end $$;
