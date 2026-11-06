\set ON_ERROR_STOP on
-- v17: อีเวนต์ + เควสเพิ่ม + ระบบแอดมิน
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;

insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000001701', '{"username":"ev_admin","display_name":"แอดมิน"}'),
  ('00000000-0000-0000-0000-000000001702', '{"username":"ev_player","display_name":"ผู้เล่น"}'),
  ('00000000-0000-0000-0000-000000001703', '{"username":"ev_other","display_name":"อีกคน"}');

-- ---------- สิทธิ์แอดมิน ----------
select pg_temp.as_user('00000000-0000-0000-0000-000000001701');
select pg_temp.ok(public.is_admin() = false, 'ยังไม่ใช่แอดมิน');
select pg_temp.fails($$select public.admin_overview()$$, '%เฉพาะแอดมิน%', 'คนทั่วไปเปิดหน้าแอดมินไม่ได้');
select pg_temp.fails($$select public.admin_save_event('{"name":"x","starts_at":"2026-01-01","ends_at":"2026-01-02"}')$$, '%เฉพาะแอดมิน%', 'คนทั่วไปสร้างอีเวนต์ไม่ได้');
insert into public.admins(user_id) values ('00000000-0000-0000-0000-000000001701');   -- แอดมินคนแรกตั้งผ่านฐานข้อมูล
select pg_temp.ok(public.is_admin() = true, 'ตั้งแอดมินคนแรกแล้ว');
select pg_temp.ok(jsonb_array_length(public.admin_overview()->'admins') = 1, 'รายชื่อแอดมิน 1 คน');

-- ---------- ตรวจข้อมูลที่แอดมินกรอก ----------
select pg_temp.fails($$select public.admin_save_event('{"name":"","starts_at":"2026-01-01","ends_at":"2026-01-02"}')$$, '%ใส่ชื่ออีเวนต์%', 'ชื่อห้ามว่าง');
select pg_temp.fails($$select public.admin_save_event('{"name":"x","starts_at":"2026-01-05","ends_at":"2026-01-02"}')$$, '%วันจบต้องหลังวันเริ่ม%', 'วันจบก่อนวันเริ่มไม่ได้');
select pg_temp.fails($$select public.admin_save_event('{"name":"x","starts_at":"ไม่ใช่วัน","ends_at":"2026-01-02"}')$$, '%ไม่ถูกต้อง%', 'วันที่ผิดรูปแบบ');
select pg_temp.fails($$select public.admin_save_event('{"name":"x","starts_at":"2026-01-01","ends_at":"2026-01-02","banner_url":"javascript:alert(1)"}')$$, '%https://%', 'ลิงก์รูปอันตรายไม่รับ');
select pg_temp.fails($$select public.admin_save_event('{"name":"x","starts_at":"2026-01-01","ends_at":"2026-01-02","banner_ids":["nope"]}')$$, '%ไม่มีตู้กาชา%', 'ตู้กาชาที่ไม่มีจริงผูกไม่ได้');
select pg_temp.fails($$select public.admin_save_event('{"id":"Bad Id!","name":"x","starts_at":"2026-01-01","ends_at":"2026-01-02"}')$$, '%a-z 0-9%', 'รหัสผิดรูปแบบ');

-- ---------- สร้างอีเวนต์ที่กำลังจัด + อีเวนต์ในอนาคต ----------
select public.admin_save_event(jsonb_build_object('id', 'ev_now', 'name', 'เทศกาลซากุระ', 'description', 'ทดสอบ',
  'banner_url', 'https://example.com/b.webp', 'starts_at', now() - interval '2 day', 'ends_at', now() + interval '5 day'));
select public.admin_save_event(jsonb_build_object('id', 'ev_later', 'name', 'ลอยกระทง', 'starts_at', now() + interval '10 day',
  'ends_at', now() + interval '20 day', 'banner_ids', jsonb_build_array('cosm-sakura')));
select pg_temp.ok((select name from public.events where id = 'ev_now') = 'เทศกาลซากุระ', 'สร้างอีเวนต์แล้ว');
select public.admin_save_event(jsonb_build_object('id', 'ev_now', 'name', 'เทศกาลซากุระบาน', 'banner_url', '',
  'starts_at', now() - interval '2 day', 'ends_at', now() + interval '5 day'));
select pg_temp.ok((select name from public.events where id = 'ev_now') = 'เทศกาลซากุระบาน', 'แก้ชื่ออีเวนต์ได้ (id เดิม)');
select pg_temp.ok((select count(*) from public.admin_log where action = 'save_event') = 3, 'ทุกการแก้ไขลงบันทึกแอดมิน');

-- ---------- เควสอีเวนต์ ----------
select pg_temp.fails($$select public.admin_save_event_quest('{"event_id":"ev_now","metric":"fly","target":1,"name":"x"}')$$, '%ชนิดเควส%', 'ชนิดเควสแปลก ๆ ไม่รับ');
select pg_temp.fails($$select public.admin_save_event_quest('{"event_id":"ev_now","metric":"feat","target":1,"name":"x"}')$$, '%ชื่อท่า%', 'เควสท่าพิเศษต้องมีชื่อท่า');
select pg_temp.fails($$select public.admin_save_event_quest('{"event_id":"ev_now","metric":"play","target":1,"name":"x","reward_items":{"no-such":1}}')$$, '%ไม่มีไอเทม%', 'ไอเทมที่ไม่มีจริงไม่รับ');
select pg_temp.fails($$select public.admin_save_event_quest('{"event_id":"ev_now","metric":"play","target":1,"name":"x","reward_coins":"9999999"}')$$, '%เหรียญ ต้องอยู่ระหว่าง%', 'เหรียญเกินเพดานไม่รับ');
select pg_temp.fails($$select public.admin_save_event_quest('{"event_id":"nope","metric":"play","target":1,"name":"x"}')$$, '%ไม่พบอีเวนต์%', 'อีเวนต์ต้องมีจริง');
select public.admin_save_event_quest('{"id":"eq_play3","event_id":"ev_now","mode":"event","metric":"play","target":3,"name":"เล่นช่วงเทศกาล","reward_coins":100,"reward_mcash":5,"reward_bp":40,"reward_items":{"tea-g":2}}');
select public.admin_save_event_quest('{"id":"eq_daywin","event_id":"ev_now","mode":"daily","metric":"win","target":1,"name":"ชนะวันนี้","reward_coins":30}');
select public.admin_save_event_quest('{"id":"eq_dark","event_id":"ev_now","metric":"feat","feat":"knock_dark","game_id":"dummy","target":1,"name":"น็อกมืด","reward_mcash":10}');

-- ---------- ผู้เล่น ----------
-- ก่อนอีเวนต์ 1 ตา (ไม่นับ) · ในช่วงอีเวนต์: เมื่อวาน 2 ตา (ชนะ 1) · วันนี้ 1 ตาชนะ + น็อกมืด · ตาซ้อม 1 ตา (ไม่นับ)
insert into public.game_log(user_id, gid, game_id, result, coin_delta, feats, practice, played_at) values
  ('00000000-0000-0000-0000-000000001702', 'g0', 'dummy', 'win',  10, '{}', false, now() - interval '3 day'),
  ('00000000-0000-0000-0000-000000001702', 'g1', 'dummy', 'win',  10, '{}', false, public._day_start(public.game_day()) - interval '2 hour'),
  ('00000000-0000-0000-0000-000000001702', 'g2', 'dummy', 'loss', 10, '{}', false, public._day_start(public.game_day()) - interval '1 hour'),
  ('00000000-0000-0000-0000-000000001702', 'g3', 'dummy', 'win',  10, '{knock,knock_dark}', false, now() - interval '1 minute'),
  ('00000000-0000-0000-0000-000000001702', 'g4', 'dummy', 'win',   0, '{}', true, now());

select pg_temp.as_user('00000000-0000-0000-0000-000000001702');
create temp table ev as select public.get_events() as j;
select pg_temp.ok((select jsonb_array_length(j->'events') from ev) = 1, 'เห็นเฉพาะอีเวนต์ที่กำลังจัด');
create temp table eq as select e as q from ev, jsonb_array_elements(j->'events'->0->'quests') e;
select pg_temp.ok((select (q->>'progress')::int from eq where q->>'id' = 'eq_play3') = 3, 'นับเฉพาะตาในช่วงอีเวนต์ ไม่นับตาซ้อม');
select pg_temp.ok((select (q->>'progress')::int from eq where q->>'id' = 'eq_daywin') = 1, 'เควสรายวันนับเฉพาะวันนี้');
select pg_temp.ok((select (q->>'progress')::int from eq where q->>'id' = 'eq_dark') = 1, 'นับท่าพิเศษ');
select pg_temp.ok(public.is_admin() = false, 'ผู้เล่นทั่วไปไม่ใช่แอดมิน');
select pg_temp.fails($$select public.admin_delete_event('ev_now')$$, '%เฉพาะแอดมิน%', 'ผู้เล่นลบอีเวนต์ไม่ได้');

create temp table before as select coins, mcash from public.profiles where id = '00000000-0000-0000-0000-000000001702';
select public.claim_event_quest('eq_play3');
select pg_temp.ok((select coins from public.profiles where id = '00000000-0000-0000-0000-000000001702') = (select coins + 100 from before), 'ได้เหรียญ');
select pg_temp.ok((select mcash from public.profiles where id = '00000000-0000-0000-0000-000000001702') = (select mcash + 5 from before), 'ได้เพชร');
select pg_temp.ok((select qty from public.inventory where user_id = '00000000-0000-0000-0000-000000001702' and kind = 'items' and item_id = 'tea-g') = 2, 'ได้ไอเทม');
select pg_temp.fails($$select public.claim_event_quest('eq_play3')$$, '%รับรางวัลเควสนี้แล้ว%', 'รับซ้ำไม่ได้');
select pg_temp.ok((select (q->>'claimed')::boolean from jsonb_array_elements(public.get_events()->'events'->0->'quests') q where q->>'id' = 'eq_play3'), 'ขึ้นว่ารับแล้ว');
select public.claim_event_quest('eq_daywin');
select pg_temp.ok((select period_key from public.user_event_quests where quest_id = 'eq_daywin') = public.game_day(), 'เควสรายวันจำวันที่รับ');

select pg_temp.as_user('00000000-0000-0000-0000-000000001703');
select pg_temp.fails($$select public.claim_event_quest('eq_play3')$$, '%ยังไม่สำเร็จ%', 'ยังไม่ครบรับไม่ได้');

-- ---------- ตู้กาชาที่ผูกกับอีเวนต์ในอนาคต = ปิดจนถึงช่วงอีเวนต์ ----------
select pg_temp.ok(not exists (select 1 from jsonb_array_elements(public.get_gacha()->'banners') b where b->>'id' = 'cosm-sakura'), 'ตู้อีเวนต์ซ่อนก่อนถึงช่วง');
select pg_temp.ok(exists (select 1 from jsonb_array_elements(public.get_gacha()->'banners') b where b->>'id' = 'sakura-ace'), 'ตู้ปกติยังขึ้น');
select pg_temp.fails($$select public.gacha_pull('cosm-sakura', 1, 'coins')$$, '%เปิดเฉพาะช่วงอีเวนต์%', 'สุ่มตู้อีเวนต์นอกช่วงไม่ได้');
select pg_temp.as_user('00000000-0000-0000-0000-000000001701');
select public.admin_save_event(jsonb_build_object('id', 'ev_later', 'name', 'ลอยกระทง', 'starts_at', now() - interval '1 hour',
  'ends_at', now() + interval '20 day', 'banner_ids', jsonb_build_array('cosm-sakura')));
select pg_temp.ok(exists (select 1 from jsonb_array_elements(public.get_gacha()->'banners') b where b->>'id' = 'cosm-sakura'), 'ถึงช่วงอีเวนต์ ตู้ขึ้น');

-- ---------- เควสปกติ: เพิ่ม/แก้/ลบ + ชนิดท่าพิเศษ ----------
select public.admin_save_quest('{"id":"d_dark","period":"daily","metric":"feat","feat":"knock_dark","game_id":"dummy","target":1,"name":"น็อกมืดวันนี้","reward_coins":120,"always":true}');
select pg_temp.ok((select points from public.quest_defs where id = 'd_dark') = 25, 'เควสรายวันใหม่ได้แต้มกิจกรรมตามเดิม');
select pg_temp.as_user('00000000-0000-0000-0000-000000001702');
select pg_temp.ok((select (q->>'progress')::int from jsonb_array_elements(public.get_quests()->'daily'->'quests') q where q->>'id' = 'd_dark') = 1, 'เควสปกติชนิดท่าพิเศษนับได้');
select pg_temp.ok((select (q->>'progress')::int from jsonb_array_elements(public.get_quests()->'daily'->'quests') q where q->>'id' = 'd_login') = 1, 'เควสเดิม (ล็อกอิน) ยังนับเหมือนเดิม');
select pg_temp.as_user('00000000-0000-0000-0000-000000001701');
select public.admin_save_quest('{"id":"d_dark","period":"daily","metric":"feat","feat":"knock_dark","target":2,"name":"น็อกมืด 2 ครั้ง","reward_coins":200}');
select pg_temp.ok((select target from public.quest_defs where id = 'd_dark') = 2, 'แก้เควสปกติได้');
select public.admin_delete_quest('d_dark');
select pg_temp.ok(not exists (select 1 from public.quest_defs where id = 'd_dark'), 'ลบเควสปกติได้');

-- ---------- จัดการแอดมิน + ลบ ----------
select public.admin_add_admin('EV_OTHER');
select pg_temp.ok(public._is_admin('00000000-0000-0000-0000-000000001703'), 'เพิ่มแอดมินด้วยชื่อผู้ใช้ (ไม่สนตัวพิมพ์)');
select pg_temp.fails($$select public.admin_remove_admin('ev_admin')$$, '%ถอดสิทธิ์ตัวเองไม่ได้%', 'ถอดตัวเองไม่ได้');
select public.admin_remove_admin('ev_other');
select pg_temp.ok(not public._is_admin('00000000-0000-0000-0000-000000001703'), 'ถอดแอดมินคนอื่นได้');
select public.admin_delete_event_quest('eq_dark');
select pg_temp.ok(not exists (select 1 from public.event_quests where id = 'eq_dark'), 'ลบเควสอีเวนต์ได้');
select public.admin_delete_event('ev_now');
select pg_temp.ok(not exists (select 1 from public.event_quests where event_id = 'ev_now'), 'ลบอีเวนต์แล้วเควสหายตาม');
select pg_temp.ok(not exists (select 1 from public.user_event_quests where quest_id = 'eq_play3'), 'ลบอีเวนต์แล้วประวัติรับรางวัลหายตาม');

-- ---------- ตารางห้ามอ่าน/เขียนตรง ----------
select pg_temp.ok(not has_table_privilege('authenticated', 'public.admins', 'insert'), 'เพิ่มแอดมินตรงจาก client ไม่ได้');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.events', 'update'), 'แก้อีเวนต์ตรงจาก client ไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.get_events()', 'execute'), 'anon เรียกอีเวนต์ไม่ได้');
select pg_temp.ok(not has_function_privilege('authenticated', 'public._window_progress(uuid, text, text, text, timestamptz, timestamptz)', 'execute'), 'ตัวช่วยภายในเรียกจาก client ไม่ได้');
\echo '✓ test_v17 ผ่านทั้งหมด'
