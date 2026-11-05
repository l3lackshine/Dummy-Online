\set ON_ERROR_STOP on
-- v15: ฉายาใต้ชื่อเลือกได้เฉพาะที่ปลดล็อกแล้ว
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000b01', '{"username":"tt_a","display_name":"ที"}');
insert into public.user_titles(user_id, title_id, name, times) values ('00000000-0000-0000-0000-000000000b01', 'ach:dm-knock', 'นักน็อก', 2);
select pg_temp.as_user('00000000-0000-0000-0000-000000000b01');
select pg_temp.ok(public.set_title('ach:dm-knock')->>'title' = 'นักน็อก', 'ตั้งฉายาที่ปลดล็อกแล้ว');
select pg_temp.ok((select title from public.profiles where id = '00000000-0000-0000-0000-000000000b01') = 'นักน็อก', 'ฉายาลงโปรไฟล์');
select pg_temp.fails($$select public.set_title('champ-x')$$, '%ยังไม่ได้ปลดล็อก%', 'ฉายาที่ยังไม่มีตั้งไม่ได้');
select pg_temp.fails($$select public.update_profile(null, 'ราชาพิมพ์เอง')$$, '%เฉพาะฉายาที่ปลดล็อก%', 'พิมพ์ฉายาเองผ่าน update_profile ไม่ได้');
select pg_temp.ok(public.update_profile(null, 'นักน็อก')->>'title' = 'นักน็อก', 'update_profile ด้วยชื่อฉายาที่มีจริงได้');
select pg_temp.ok(public.set_title('')->>'title' = '', 'ถอดฉายา (ค่าว่าง)');
select pg_temp.ok(not has_function_privilege('anon', 'public.set_title(text)', 'execute'), 'คนไม่ล็อกอินตั้งฉายาไม่ได้');
\echo '✓ test_v15 ผ่านทั้งหมด'
