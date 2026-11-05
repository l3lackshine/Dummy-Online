\set ON_ERROR_STOP on
-- v13: บัตรโปรไฟล์ (ข้อความแนะนำตัว · ตู้โชว์ · เหรียญฉายา · ธีม · ตัวละครเด่น · ดูของคนอื่น)
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;
insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000f01', '{"username":"pc_a","display_name":"เอ"}'),
  ('00000000-0000-0000-0000-000000000f02', '{"username":"pc_b","display_name":"บี"}');
insert into public.user_characters(user_id, character_id, stars) values ('00000000-0000-0000-0000-000000000f01', 'rina-01', 3);
insert into public.user_titles(user_id, title_id, name) values ('00000000-0000-0000-0000-000000000f01', 'champ-dummy', 'แชมป์ดัมมี่');
select pg_temp.as_user('00000000-0000-0000-0000-000000000f01');
-- ค่าเริ่มต้น
select pg_temp.ok((public.get_profile_card()->>'mine')::boolean and public.get_profile_card()->>'theme' = 'sakura', 'บัตรของตัวเอง: mine + ธีมเริ่มต้น sakura');
select pg_temp.ok(public.get_profile_card()->'counts'->>'titles' = '1', 'นับฉายาได้ 1');
-- ข้อความแนะนำตัว
select pg_temp.ok(public.set_profile_card(p_bio => '  สวัสดี ชอบดัมมี่  ')->>'bio' = 'สวัสดี ชอบดัมมี่', 'บันทึกข้อความแนะนำตัว (ตัดช่องว่าง)');
select pg_temp.ok(char_length(public.set_profile_card(p_bio => repeat('ก', 80))->>'bio') = 60, 'ข้อความยาวเกิน ตัดเหลือ 60');
-- ตู้โชว์
select pg_temp.ok(jsonb_array_length(public.set_profile_card(p_showcase => array['rina-01', 'boy'])->'showcase') = 2, 'ตู้โชว์: ตัวที่มี + ตัวฟรีเริ่มต้น');
select pg_temp.ok(public.get_profile_card()->'showcase'->0->>'stars' = '3', 'ตู้โชว์ส่งดาวของตัวละคร');
select pg_temp.fails($$select public.set_profile_card(p_showcase => array['sakuya-ssr'])$$, '%ยังไม่มีตัวละคร%', 'ใส่ตัวที่ไม่มีไม่ได้');
select pg_temp.fails($$select public.set_profile_card(p_showcase => array['boy', 'boy'])$$, '%ซ้ำ%', 'ใส่ตัวซ้ำไม่ได้');
select pg_temp.fails($$select public.set_profile_card(p_showcase => array['a','b','c','d','e'])$$, '%ไม่เกิน 4%', 'เกิน 4 ช่องไม่ได้');
-- เหรียญฉายา
select pg_temp.ok(public.set_profile_card(p_pinned => array['champ-dummy'])->'medals'->0->>'name' = 'แชมป์ดัมมี่', 'ปักเหรียญฉายาที่มี');
select pg_temp.fails($$select public.set_profile_card(p_pinned => array['nope'])$$, '%ยังไม่มีฉายา%', 'ปักฉายาที่ไม่มีไม่ได้');
-- ธีม / ตัวละครเด่น
select pg_temp.ok(public.set_profile_card(p_theme => 'night')->>'theme' = 'night', 'เปลี่ยนธีมเป็น night');
select pg_temp.fails($$select public.set_profile_card(p_theme => 'gold')$$, '%ไม่มีธีม%', 'ธีมที่ไม่มีไม่ได้');
select pg_temp.ok(public.set_profile_card(p_featured => 'rina-01')->>'featured' = 'rina-01', 'ตั้งตัวละครเด่น');
select pg_temp.fails($$select public.set_profile_card(p_featured => 'sakuya-ssr')$$, '%ยังไม่มีตัวละคร%', 'ตัวละครเด่นต้องมีจริง');
-- คนอื่นเปิดดู
select pg_temp.as_user('00000000-0000-0000-0000-000000000f02');
select pg_temp.ok(not (public.get_profile_card(' PC_A ')->>'mine')::boolean and public.get_profile_card('pc_a')->>'bio' = repeat('ก', 60), 'บีดูบัตรของเอได้ (ไม่สนตัวพิมพ์)');
select pg_temp.ok(public.get_profile_card('pc_a') ? 'coins' is false and public.get_profile_card('pc_a') ? 'mcash' is false, 'บัตรคนอื่นไม่มีเหรียญ/เพชร');
select pg_temp.fails($$select public.get_profile_card('nobody_x')$$, '%ไม่พบผู้เล่น%', 'ชื่อที่ไม่มี: ไม่พบผู้เล่น');
-- สิทธิ์
select pg_temp.ok(not has_function_privilege('authenticated', 'public._profile_card(uuid)', 'execute'), 'ผู้เล่นเรียก _profile_card ตรง ๆ ไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.get_profile_card(text)', 'execute'), 'คนไม่ล็อกอินดูบัตรไม่ได้');
\echo '✓ test_v13 ผ่านทั้งหมด'
