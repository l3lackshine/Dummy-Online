\set ON_ERROR_STOP on
-- v12: เพื่อน
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;
insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000e01', '{"username":"fr_a","display_name":"แอน"}'),
  ('00000000-0000-0000-0000-000000000e02', '{"username":"fr_b","display_name":"บีม"}'),
  ('00000000-0000-0000-0000-000000000e03', '{"username":"fr_c","display_name":"ซัน"}');
select pg_temp.as_user('00000000-0000-0000-0000-000000000e01');
select pg_temp.fails($$select public.friend_request('fr_a')$$, '%ตัวเอง%', 'เพิ่มตัวเองไม่ได้');
select pg_temp.fails($$select public.friend_request('nobody_x')$$, '%ไม่พบผู้เล่น%', 'ชื่อผู้ใช้ที่ไม่มี: แจ้งไม่พบ');
select pg_temp.ok(public.friend_request(' FR_B ')->>'status' = 'sent', 'ส่งคำขอถึงบีม (ไม่สนตัวพิมพ์/ช่องว่าง)');
select pg_temp.ok(public.friend_request('fr_b')->>'status' = 'sent', 'ส่งซ้ำ: ยังเป็นคำขอเดิม');
select pg_temp.ok(jsonb_array_length(public.get_friends()->'outgoing') = 1 and jsonb_array_length(public.get_friends()->'friends') = 0, 'แอน: คำขอส่งออก 1');
select pg_temp.as_user('00000000-0000-0000-0000-000000000e02');
select pg_temp.ok(public.get_friends()->'incoming'->0->>'username' = 'fr_a', 'บีม: เห็นคำขอเข้าจากแอน');
select pg_temp.ok(public.friend_respond('fr_a', true)->>'status' = 'accepted', 'บีมตอบรับ');
select pg_temp.ok(public.get_friends()->'friends'->0->>'name' = 'แอน' and jsonb_array_length(public.get_friends()->'incoming') = 0, 'บีม: แอนอยู่ในรายชื่อเพื่อน');
select pg_temp.fails($$select public.friend_respond('fr_a', true)$$, '%ไม่มีคำขอ%', 'ตอบรับซ้ำไม่ได้');
select pg_temp.as_user('00000000-0000-0000-0000-000000000e01');
select pg_temp.ok(public.get_friends()->'friends'->0->>'username' = 'fr_b', 'แอน: บีมเป็นเพื่อนแล้ว');
select pg_temp.ok(public.friend_request('fr_b')->>'status' = 'already', 'ขอซ้ำตอนเป็นเพื่อนแล้ว: already');
-- ขอกันทั้งสองฝ่าย = เป็นเพื่อนทันที
select pg_temp.as_user('00000000-0000-0000-0000-000000000e03');
select pg_temp.ok(public.friend_request('fr_a')->>'status' = 'sent', 'ซันขอแอน');
select pg_temp.as_user('00000000-0000-0000-0000-000000000e01');
select pg_temp.ok(public.friend_request('fr_c')->>'status' = 'accepted', 'แอนขอซันกลับ → เป็นเพื่อนทันที');
select pg_temp.ok(jsonb_array_length(public.friend_ids('00000000-0000-0000-0000-000000000e01')) = 2, 'friend_ids (เซิร์ฟเวอร์เกม): แอนมีเพื่อน 2');
-- ปฏิเสธ / ลบ
select pg_temp.ok(public.friend_remove('fr_c')->>'status' = 'removed', 'แอนลบซัน');
select pg_temp.ok(jsonb_array_length(public.get_friends()->'friends') = 1, 'เหลือเพื่อน 1');
select pg_temp.as_user('00000000-0000-0000-0000-000000000e03');
select pg_temp.ok(jsonb_array_length(public.get_friends()->'friends') = 0, 'ฝั่งซัน: ไม่มีแอนแล้ว');
select pg_temp.ok(public.friend_request('fr_b')->>'status' = 'sent', 'ซันขอบีม');
select pg_temp.as_user('00000000-0000-0000-0000-000000000e02');
select pg_temp.ok(public.friend_respond('fr_c', false)->>'status' = 'declined', 'บีมปฏิเสธซัน');
select pg_temp.ok(jsonb_array_length(public.get_friends()->'incoming') = 0, 'คำขอของซันหายไป');
-- เพดานเพื่อน
update public.game_config set value = '{"max": 1, "max_out": 50}' where key = 'friends';
select pg_temp.as_user('00000000-0000-0000-0000-000000000e02');
select pg_temp.fails($$select public.friend_request('fr_c')$$, '%เต็มแล้ว%', 'เพื่อนเต็ม (ตั้งเพดาน 1): ขอเพิ่มไม่ได้');
update public.game_config set value = '{"max": 100, "max_out": 50}' where key = 'friends';
-- สิทธิ์
select pg_temp.ok(not has_function_privilege('authenticated', 'public.friend_ids(uuid)', 'execute'), 'ผู้เล่นเรียก friend_ids ของคนอื่นไม่ได้');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.friendships', 'select'), 'ผู้เล่นอ่านตารางเพื่อนตรง ๆ ไม่ได้');
\echo '✓ test_v12 ผ่านทั้งหมด'
