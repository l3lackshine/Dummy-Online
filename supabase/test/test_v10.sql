\set ON_ERROR_STOP on
-- v10: บทสอนเล่น
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
select pg_temp.ok((select count(*) from public.profiles where not tutorial_seen) > 0, 'รัน v10 ซ้ำไม่ทับผู้เล่นที่สมัครหลังอัปเดต (ตั้งว่าเห็นแล้วเฉพาะตอนเพิ่มคอลัมน์ครั้งแรก)');
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000c10', '{"username":"tina","display_name":"ทีน่า"}');
select pg_temp.as_user('00000000-0000-0000-0000-000000000c10');
select pg_temp.ok(not (public.get_tutorial()->>'seen')::boolean and not (public.get_tutorial()->>'claimed')::boolean, 'ผู้เล่นใหม่: ยังไม่เห็นบทสอน → เด้งบทสอน');
select pg_temp.ok((select (m->>'progress')::int from jsonb_array_elements(public.get_bp()->'missions'->'horizon') m where m->>'id' = 'h_tutorial') = 0, 'ภารกิจเรียนจบดัมมี่ ยังไม่สำเร็จ');
do $t$ declare j jsonb; begin
  j := public.finish_tutorial(false);
  perform pg_temp.ok((j->>'first')::boolean and jsonb_array_length(j->'reward') = 2, 'จบบทสอนครั้งแรก: ได้รางวัล 2 อย่าง');
  j := public.finish_tutorial(true);
  perform pg_temp.ok(not (j->>'first')::boolean and jsonb_array_length(j->'reward') = 0, 'เล่น/ข้ามซ้ำ: ไม่ได้รางวัลซ้ำ');
end $t$;
select pg_temp.ok((select qty from public.inventory where user_id = '00000000-0000-0000-0000-000000000c10' and kind = 'items' and item_id = 'ticket-b') = 1
  and (select qty from public.inventory where user_id = '00000000-0000-0000-0000-000000000c10' and kind = 'items' and item_id = 'tea-g') = 1, 'ได้ตั๋วฟ้า 1 + ชาเขียว 1');
select pg_temp.ok((public.get_tutorial()->>'seen')::boolean, 'บันทึกว่าเห็นบทสอนแล้ว (ไม่เด้งอีก)');
select pg_temp.ok((select (m->>'progress')::int from jsonb_array_elements(public.get_bp()->'missions'->'horizon') m where m->>'id' = 'h_tutorial') = 1, 'ภารกิจเรียนจบดัมมี่ สำเร็จ');
select pg_temp.ok((public.claim_bp_mission('horizon', 'h_tutorial')->>'bp')::int = 800, 'รับ 800 EXP แบทเทิลพาส');
-- ข้ามตั้งแต่แรกก็ได้รางวัล
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000c11', '{"username":"skipper","display_name":"ข้าม"}');
select pg_temp.as_user('00000000-0000-0000-0000-000000000c11');
select pg_temp.ok((public.finish_tutorial(true)->>'first')::boolean, 'กดข้ามครั้งแรก: ได้รางวัลเหมือนกัน');
\echo '✓ test_v10 ผ่านทั้งหมด'
