\set ON_ERROR_STOP on
-- v18: หน้าแอดมินส่วนที่เหลือ — ก. ตั้งตู้กาชา
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;
-- น้ำหนักรวมของระดับในตู้ (หน่วย 0.0001%)
create or replace function pg_temp.tier(p_banner text, p_rarity text) returns bigint language sql as $$
  select coalesce(sum(gp.weight), 0) from public.gacha_pool gp join public.catalog_items ci using (kind, item_id)
  where gp.banner_id = p_banner and ci.rarity = p_rarity $$;
create or replace function pg_temp.w(p_banner text, p_item text) returns int language sql as $$
  select coalesce((select weight from public.gacha_pool where banner_id = p_banner and item_id = p_item), 0) $$;

insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000001801', '{"username":"gc_admin","display_name":"แอดมินตู้"}'),
  ('00000000-0000-0000-0000-000000001802', '{"username":"gc_player","display_name":"ผู้เล่นตู้"}');

-- ---------- สิทธิ์ ----------
select pg_temp.as_user('00000000-0000-0000-0000-000000001802');
select pg_temp.fails($$select public.admin_gacha_data()$$, '%เฉพาะแอดมิน%', 'คนทั่วไปเปิดข้อมูลตู้ไม่ได้');
select pg_temp.fails($$select public.admin_save_banner('{"name":"x"}')$$, '%เฉพาะแอดมิน%', 'คนทั่วไปสร้างตู้ไม่ได้');
select pg_temp.fails($$select public.admin_delete_banner('sakura-ace')$$, '%เฉพาะแอดมิน%', 'คนทั่วไปลบตู้ไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.admin_save_banner(jsonb)', 'execute'), 'anon เรียก admin_save_banner ไม่ได้');
select pg_temp.ok(not has_function_privilege('authenticated', 'public._gacha_admin_rebuild(text)', 'execute'), 'client เรียกตัวคำนวณน้ำหนักตรงไม่ได้');
select pg_temp.ok(not has_function_privilege('authenticated', 'public._gacha_rebuild_admin_pools()', 'execute'), 'client เรียกตัวคำนวณทุกตู้ตรงไม่ได้');

insert into public.admins(user_id) values ('00000000-0000-0000-0000-000000001801') on conflict do nothing;
select pg_temp.as_user('00000000-0000-0000-0000-000000001801');
create temp table gd as select public.admin_gacha_data() as j;
create temp table gd_file as select b from gd, jsonb_array_elements(j->'banners') b where b->>'id' in ('sakura-ace', 'sakuya-up', 'cosm-sakura');
select pg_temp.ok((select count(*) from gd_file) = 3, 'เห็นตู้จากไฟล์ครบ 3 ตู้');   -- ตู้ t1–t3 จากเทสเก่าก็อยู่ในรายการด้วย
select pg_temp.ok((select bool_and(not (b->>'admin_owned')::boolean) from gd_file), 'ตู้จากไฟล์ยังไม่ใช่ของแอดมิน');
select pg_temp.ok((select (b->'rates'->>'legendary')::int from gd, jsonb_array_elements(j->'banners') b where b->>'id' = 'sakuya-up') = 100,
  'อ่านโอกาส SSR ปัจจุบันของตู้จากไฟล์ได้ (1% = 100)');
select pg_temp.ok((select j->'tickets' from gd) = '["ticket-b", "ticket-r"]', 'รายชื่อตั๋วมาจาก economy.items');
select pg_temp.ok(not exists (select 1 from gd, jsonb_array_elements(j->'catalog') c where c->>'key' = 'characters:girl'), 'ของเริ่มต้นไม่อยู่ในตัวเลือก');

-- ---------- ตรวจค่าที่พัง ----------
create temp table base_ok as select jsonb_build_object(
  'id', 'bn_test', 'name', 'ตู้ทดสอบ', 'grp', 'char', 'pay', 'ticket', 'ticket', 'ticket-r', 'ticket_mcash', '30', 'ticket_mcash10', '270',
  'pity', '80', 'rates', jsonb_build_object('legendary', '1', 'epic', '9', 'rare', '90', 'common', '0'),
  'items', jsonb_build_array('characters:sakuya-ssr', 'characters:rina-01', 'characters:arya-01', 'characters:rena-01', 'characters:miyu-r', 'characters:yuna-r'),
  'rate_up', jsonb_build_array('characters:rina-01'), 'rate_up_mult', '3', 'image_url', 'https://example.com/bn.webp') as p;
create or replace function pg_temp.bad(patch jsonb, pat text, msg text) returns void language plpgsql as $$ begin
  perform pg_temp.fails(format('select public.admin_save_banner(%L::jsonb)', ((select p from base_ok) || patch)::text), pat, msg); end $$;
select pg_temp.bad('{"name":""}', '%ใส่ชื่อตู้%', 'ชื่อห้ามว่าง');
select pg_temp.bad('{"rates":{"legendary":"1","epic":"9","rare":"80"}}', '%รวมกันต้องเท่ากับ 100%% (ตอนนี้ 90.00 %%)%', 'โอกาสรวมไม่ถึง 100% ไม่รับ');
select pg_temp.bad('{"rates":{"legendary":"0.001","epic":"9","rare":"90.999"}}', '%ทศนิยมไม่เกิน 2%', 'ทศนิยมเกิน 2 ตำแหน่งไม่รับ');
select pg_temp.bad('{"rates":{"legendary":"-1","epic":"11","rare":"90"}}', '%ต้องเป็นตัวเลข%', 'โอกาสติดลบไม่รับ');
select pg_temp.bad('{"items":[]}', '%อย่างน้อย 1 ชิ้น%', 'ตู้ว่างไม่รับ');
select pg_temp.bad('{"items":["characters:girl"]}', '%ของเริ่มต้น%', 'ของเริ่มต้นใส่ตู้ไม่ได้');
select pg_temp.bad('{"items":["characters:nope"]}', '%ไม่มีของรหัส%', 'ของที่ไม่มีจริงไม่รับ');
select pg_temp.bad('{"items":["characters:rina-01","characters:miyu-r"]}', '%ระดับ SSR ตั้งโอกาสไว้แต่ยังไม่ได้เลือกของ%', 'ระดับที่มี % ต้องมีของ');
select pg_temp.bad('{"ticket":"tea-g"}', '%เลือกตั๋ว%', 'ไอเทมที่ไม่ใช่ตั๋วใช้เป็นตั๋วไม่ได้');
select pg_temp.bad('{"ticket_mcash":"0"}', '%เพชรแทนตั๋ว 1 ใบ ต้องอยู่ระหว่าง%', 'ราคาเพชร 0 ไม่รับ');
select pg_temp.bad('{"pay":"coins"}', '%อย่างน้อย 1 แบบ%', 'ตู้เหรียญต้องมีราคาอย่างน้อย 1 แบบ');
select pg_temp.bad('{"pay":"free"}', '%วิธีจ่าย%', 'วิธีจ่ายแปลก ๆ ไม่รับ');
select pg_temp.bad('{"pity":"301"}', '%การันตี SSR ต้องอยู่ระหว่าง 0 ถึง 300%', 'การันตีเกิน 300 ไม่รับ');
select pg_temp.bad('{"grp":"x"}', '%หมวดตู้%', 'หมวดตู้แปลก ๆ ไม่รับ');
select pg_temp.bad('{"rate_up_mult":"21"}', '%ตัวคูณเรทอัป%', 'ตัวคูณเรทอัปเกิน 20 ไม่รับ');
select pg_temp.bad('{"image_url":"javascript:alert(1)"}', '%https://%', 'ลิงก์รูปอันตรายไม่รับ');
select pg_temp.ok(not exists (select 1 from public.gacha_banners where id = 'bn_test'), 'ค่าที่พังไม่สร้างตู้ครึ่ง ๆ กลาง ๆ');

-- ---------- สร้างตู้ใหม่ ----------
select public.admin_save_banner((select p from base_ok));
select pg_temp.ok((select admin_owned and active and ticket = 'ticket-r' and pity = 80 and image_url = 'https://example.com/bn.webp'
                   from public.gacha_banners where id = 'bn_test'), 'สร้างตู้แล้ว เป็นตู้ของแอดมิน');
select pg_temp.ok(pg_temp.tier('bn_test', 'legendary') = 10000 and pg_temp.tier('bn_test', 'epic') = 90000 and pg_temp.tier('bn_test', 'rare') = 900000,
  'น้ำหนักแต่ละระดับตรงกับ % ที่ตั้ง (1% · 9% · 90%)');
select pg_temp.ok(pg_temp.w('bn_test', 'rina-01') = 54000 and pg_temp.w('bn_test', 'arya-01') = 18000 and pg_temp.w('bn_test', 'rena-01') = 18000,
  'ของเรทอัป ×3 ได้ส่วนแบ่ง 3:1:1 โดยรวมระดับยังเท่าเดิม');
select pg_temp.ok(pg_temp.w('bn_test', 'leo-r') = 0, 'ของที่ไม่ได้เลือกไม่อยู่ในตู้');

-- ปัดเศษ: SR 0.01% แบ่ง 3 ชิ้น → 34/33/33 รวม 100 พอดี
select public.admin_save_banner((select p from base_ok) || '{"rates":{"legendary":"1","epic":"0.01","rare":"98.99"},"rate_up":[]}');
select pg_temp.ok(pg_temp.tier('bn_test', 'epic') = 100 and pg_temp.w('bn_test', 'arya-01') = 34, 'เศษจากการหารแจกให้ชิ้นแรก ผลรวมระดับตรงพอดี');
select pg_temp.ok((select sum(weight) from public.gacha_pool where banner_id = 'bn_test') = 1000000, 'ทั้งตู้รวม 100% พอดี');
select public.admin_save_banner((select p from base_ok));

-- ---------- ผู้เล่นเห็นและสุ่มได้ ----------
select pg_temp.as_user('00000000-0000-0000-0000-000000001802');
create temp table pg_view as select b from jsonb_array_elements(public.get_gacha()->'banners') b where b->>'id' = 'bn_test';
select pg_temp.ok((select b->>'image_url' from pg_view) = 'https://example.com/bn.webp', 'get_gacha ส่งลิงก์รูปแบนเนอร์');
select pg_temp.ok((select round(sum((i->>'pct')::numeric), 2) from pg_view, jsonb_array_elements(b->'items') i
                   where i->>'rarity' = 'legendary') = 1, 'หน้ากาชาเห็นโอกาส SSR 1%');
update public.profiles set mcash = 1000 where id = '00000000-0000-0000-0000-000000001802';
do $$ declare j jsonb; begin
  j := public.gacha_pull('bn_test', 10, 'ticket');
  perform pg_temp.ok(jsonb_array_length(j->'results') = 10 and (j->>'mcash_used')::int = 270, 'สุ่มตู้ของแอดมิน 10 ครั้งได้ ใช้เพชรตามราคาที่ตั้ง');
  perform pg_temp.ok(not exists (select 1 from jsonb_array_elements(j->'results') r where r->>'item_id' not in
    ('sakuya-ssr', 'rina-01', 'arya-01', 'rena-01', 'miyu-r', 'yuna-r')), 'ได้เฉพาะของที่เลือกไว้ในตู้');
end $$;

-- ---------- แก้ตู้จากไฟล์ = รับมาดูแล · seed ไม่แก้ทับ ----------
select pg_temp.as_user('00000000-0000-0000-0000-000000001801');
select public.admin_save_banner(jsonb_build_object('id', 'sakura-ace', 'name', 'ตู้ธรรมดา (แอดมิน)', 'grp', 'char', 'pay', 'ticket',
  'ticket', 'ticket-b', 'ticket_mcash', '25', 'rates', jsonb_build_object('legendary', '0.5', 'epic', '2', 'rare', '97.5'),
  'items', jsonb_build_array('characters:sakuya-ssr', 'characters:rina-01', 'characters:miyu-r')));
select pg_temp.ok((select admin_owned from public.gacha_banners where id = 'sakura-ace'), 'แก้ตู้จากไฟล์แล้วกลายเป็นตู้ของแอดมิน');
select pg_temp.ok(pg_temp.w('sakura-ace', 'arya-01') = 0, 'ของจากไฟล์ที่แอดมินไม่ได้เลือก ออกจากตู้');
update public.gacha_banners set name = 'ชื่อแอบแก้', ticket_mcash = 99 where id = 'sakuya-up';   -- ตู้จากไฟล์: seed ต้องแก้คืน

\ir ../seed_catalog.sql

select pg_temp.ok((select name = 'ตู้ธรรมดา (แอดมิน)' and ticket_mcash = 25 and active from public.gacha_banners where id = 'sakura-ace'),
  'รัน seed ซ้ำ: ค่าตั้งตู้ของแอดมินไม่ถูกทับ');
select pg_temp.ok(pg_temp.tier('sakura-ace', 'legendary') = 5000 and pg_temp.w('sakura-ace', 'arya-01') = 0,
  'รัน seed ซ้ำ: ของและโอกาสในตู้ของแอดมินคงเดิม');
select pg_temp.ok((select active from public.gacha_banners where id = 'bn_test') and pg_temp.w('bn_test', 'rina-01') = 54000,
  'รัน seed ซ้ำ: ตู้ที่แอดมินสร้างไม่ถูกปิด');
select pg_temp.ok((select name <> 'ชื่อแอบแก้' and ticket_mcash = 30 from public.gacha_banners where id = 'sakuya-up'),
  'รัน seed ซ้ำ: ตู้จากไฟล์ยังถูก seed แก้ตามไฟล์เหมือนเดิม');

-- ---------- ลบ ----------
select public.admin_save_event(jsonb_build_object('id', 'ev_gc', 'name', 'อีเวนต์ตู้', 'starts_at', now() - interval '1 day',
  'ends_at', now() + interval '1 day', 'banner_ids', jsonb_build_array('bn_test', 'cosm-sakura')));
select pg_temp.fails($$select public.admin_delete_banner('sakuya-up')$$, '%ลบไม่ได้%', 'ตู้จากไฟล์ลบไม่ได้');
select public.admin_delete_banner('bn_test');
select pg_temp.ok(not exists (select 1 from public.gacha_banners where id = 'bn_test'), 'ลบตู้ของแอดมินได้');
select pg_temp.ok((select banner_ids from public.events where id = 'ev_gc') = '{cosm-sakura}', 'ลบตู้แล้วถอดออกจากอีเวนต์ที่ผูกไว้');
select pg_temp.ok(not exists (select 1 from public.gacha_pity where banner_id = 'bn_test'), 'การันตีสะสมของตู้ที่ลบหายตาม');
select pg_temp.ok(exists (select 1 from public.gacha_log where banner_id = 'bn_test'), 'ประวัติการสุ่มยังอยู่');
select pg_temp.fails($$select public.admin_delete_banner('bn_test')$$, '%ไม่พบตู้%', 'ลบซ้ำไม่ได้');
select pg_temp.ok((select count(*) from public.admin_log where action in ('save_banner', 'delete_banner')) = 5, 'ทุกการแก้ตู้ลงบันทึกแอดมิน');
select public.admin_delete_event('ev_gc');

-- ================= ข. จดหมายแจกของ =================
insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000001803', '{"username":"ml_old","display_name":"คนเก่า"}');
update public.profiles set created_at = now() - interval '10 day'
where id in ('00000000-0000-0000-0000-000000001802', '00000000-0000-0000-0000-000000001803');

select pg_temp.as_user('00000000-0000-0000-0000-000000001802');
select pg_temp.fails($$select public.admin_send_mail('{"title":"x"}')$$, '%เฉพาะแอดมิน%', 'คนทั่วไปส่งจดหมายไม่ได้');
select pg_temp.fails($$select public.admin_list_mail()$$, '%เฉพาะแอดมิน%', 'คนทั่วไปดูจดหมายที่ส่งไม่ได้');
select pg_temp.ok(not has_function_privilege('authenticated', 'public._mail_grant(uuid, public.mails)', 'execute'), 'client เรียกตัวให้รางวัลจดหมายตรงไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.get_mail()', 'execute'), 'ไม่ล็อกอินอ่านจดหมายไม่ได้');

select pg_temp.as_user('00000000-0000-0000-0000-000000001801');
select pg_temp.fails($$select public.admin_send_mail('{"title":""}')$$, '%ใส่หัวข้อ%', 'หัวข้อห้ามว่าง');
select pg_temp.fails($$select public.admin_send_mail('{"title":"x","to":"nobody_here"}')$$, '%ไม่พบผู้เล่น%', 'ผู้รับต้องมีจริง');
select pg_temp.fails($$select public.admin_send_mail('{"title":"x","reward_mcash":"100001"}')$$, '%เพชร ต้องอยู่ระหว่าง%', 'เพชรเกินเพดานไม่รับ');
select pg_temp.fails($$select public.admin_send_mail('{"title":"x","reward_items":{"no-such":1}}')$$, '%ไม่มีไอเทม%', 'ไอเทมที่ไม่มีจริงไม่รับ');
select pg_temp.fails($$select public.admin_send_mail('{"title":"x","days":"0"}')$$, '%อายุจดหมาย%', 'อายุจดหมาย 0 วันไม่รับ');

create temp table mid(name text, id bigint);
insert into mid select 'one', (public.admin_send_mail('{"to":"GC_PLAYER","title":"ชดเชยปัญหา","body":"ขออภัย","reward_coins":500,"reward_items":{"ticket-b":2}}')->>'id')::bigint;
insert into mid select 'all', (public.admin_send_mail('{"title":"ฉลองเปิดเกม","reward_mcash":50,"reward_items":{"ticket-b":1},"days":7}')->>'id')::bigint;
insert into mid select 'new', (public.admin_send_mail('{"title":"ของขวัญคนใหม่","reward_coins":100,"include_new":true}')->>'id')::bigint;
insert into mid select 'note', (public.admin_send_mail('{"title":"ประกาศ","body":"ปิดปรับปรุงพรุ่งนี้"}')->>'id')::bigint;
insert into mid select 'gone', (public.admin_send_mail('{"to":"gc_player","title":"หมดอายุแล้ว","reward_coins":999}')->>'id')::bigint;
update public.mails set expires_at = now() - interval '1 minute' where id = (select id from mid where name = 'gone');
select pg_temp.ok((select count(*) from public.admin_log where action = 'send_mail') = 5, 'ส่งจดหมายลงบันทึกแอดมิน');
select pg_temp.ok((select count(*) from jsonb_array_elements(public.admin_list_mail()) m where m->>'to' = 'gc_player') = 2, 'แอดมินเห็นผู้รับรายคน');

-- ผู้เล่นที่มีบัญชีก่อนส่ง
select pg_temp.as_user('00000000-0000-0000-0000-000000001802');
create temp table box1 as select public.get_mail() as j;
select pg_temp.ok((select jsonb_array_length(j->'mails') from box1) = 4 and (select (j->>'unclaimed')::int from box1) = 4,
  'เห็นจดหมายถึงตัวเอง + ส่งทุกคน 3 ฉบับ (ไม่เห็นฉบับหมดอายุ)');
create temp table before_m as select coins, mcash from public.profiles where id = '00000000-0000-0000-0000-000000001802';
select public.claim_mail((select id from mid where name = 'one'));
select pg_temp.ok((select coins from public.profiles where id = '00000000-0000-0000-0000-000000001802') = (select coins + 500 from before_m), 'รับจดหมาย: ได้เหรียญ');
select pg_temp.ok(public._qty('00000000-0000-0000-0000-000000001802', 'items', 'ticket-b') >= 2, 'รับจดหมาย: ได้ไอเทม');
select pg_temp.fails(format('select public.claim_mail(%s)', (select id from mid where name = 'one')), '%รับจดหมายนี้แล้ว%', 'รับซ้ำไม่ได้');
select pg_temp.fails(format('select public.claim_mail(%s)', (select id from mid where name = 'gone')), '%หมดอายุ%', 'จดหมายหมดอายุรับไม่ได้');
do $$ declare j jsonb; begin
  j := public.claim_all_mail();
  perform pg_temp.ok((j->>'count')::int = 3 and (j->>'mcash')::int = 50 and (j->>'coins')::int = 100 and (j->'items'->>'ticket-b')::int = 1,
    'รับทั้งหมด: 3 ฉบับที่เหลือ ยอดรวมถูก (ฉบับไม่มีของก็นับว่ารับแล้ว)');
end $$;
select pg_temp.ok((select mcash from public.profiles where id = '00000000-0000-0000-0000-000000001802') = (select mcash + 50 from before_m), 'รับทั้งหมด: ได้เพชร');
select pg_temp.ok((public.get_mail()->>'unclaimed')::int = 0, 'รับครบแล้วไม่มีจุดแดง');
select pg_temp.ok((public.claim_all_mail()->>'count')::int = 0, 'กดรับทั้งหมดซ้ำได้ของ 0 ฉบับ');

-- ผู้เล่นคนอื่นที่มีบัญชีก่อนส่ง: ไม่เห็นจดหมายรายคนของคนอื่น
select pg_temp.as_user('00000000-0000-0000-0000-000000001803');
select pg_temp.ok((public.get_mail()->>'unclaimed')::int = 3, 'คนอื่นเห็นเฉพาะจดหมายส่งทุกคน');
select pg_temp.fails(format('select public.claim_mail(%s)', (select id from mid where name = 'one')), '%ไม่พบจดหมาย%', 'รับจดหมายของคนอื่นไม่ได้');

-- ผู้เล่นที่สมัครหลังส่ง: เห็นเฉพาะฉบับที่เลือก "รวมคนใหม่"
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000001804', '{"username":"ml_new","display_name":"คนใหม่"}');
update public.profiles set created_at = now() + interval '1 second' where id = '00000000-0000-0000-0000-000000001804';
select pg_temp.as_user('00000000-0000-0000-0000-000000001804');
select pg_temp.ok((select jsonb_agg(m->>'title') from jsonb_array_elements(public.get_mail()->'mails') m) = '["ของขวัญคนใหม่"]',
  'คนสมัครหลังส่งเห็นเฉพาะฉบับที่รวมคนใหม่');

-- ถอนจดหมาย
select pg_temp.as_user('00000000-0000-0000-0000-000000001801');
select public.admin_delete_mail((select id from mid where name = 'all'));
select pg_temp.as_user('00000000-0000-0000-0000-000000001803');
select pg_temp.ok((public.get_mail()->>'unclaimed')::int = 2, 'ถอนจดหมายแล้ว คนที่ยังไม่รับไม่เห็นอีก');
select pg_temp.ok((select mcash from public.profiles where id = '00000000-0000-0000-0000-000000001802') = (select mcash + 50 from before_m), 'ของที่รับไปแล้วไม่ถูกดึงคืน');
