\set ON_ERROR_STOP on
-- v16: ประวัติการเล่น + สถิติแยกเกม (อ่านจาก game_log · ไม่นับตาซ้อม)
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;

insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000c01', '{"username":"hs_a","display_name":"เอ"}'),
  ('00000000-0000-0000-0000-000000000c02', '{"username":"hs_b","display_name":"บี"}');

-- ผู้เล่น A: ดัมมี่ 6 ตา (ชนะ ชนะ แพ้ ชนะ ชนะ ชนะ) + ตาซ้อม 1 ตา (ชนะ) · ป๊อกเด้ง 2 ตา (แพ้ ชนะ)
insert into public.game_log(user_id, gid, game_id, result, coin_delta, melds, knock, character_id, bots, practice, farm, played_at) values
  ('00000000-0000-0000-0000-000000000c01', 'd1', 'dummy',   'win',  100, 3, true,  'arya', false, false, null,    now() - interval '9 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'd2', 'dummy',   'win',  100, 2, false, 'arya', false, false, null,    now() - interval '8 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'd3', 'dummy',   'loss',  20, 1, false, 'mint', false, false, null,    now() - interval '7 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'd4', 'dummy',   'win',  100, 2, false, 'arya', true,  false, 'coins', now() - interval '6 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'd5', 'dummy',   'win',  100, 2, true,  'arya', false, false, null,    now() - interval '5 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'p0', 'dummy',   'win',    0, 0, false, 'mint', true,  true,  'coins', now() - interval '4 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'd6', 'dummy',   'win',  100, 4, false, 'mint', false, false, null,    now() - interval '3 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'k1', 'pokdeng', 'loss',  20, 0, false, 'mint', false, false, null,    now() - interval '2 hour'),
  ('00000000-0000-0000-0000-000000000c01', 'k2', 'pokdeng', 'win',   80, 0, false, 'mint', false, false, null,    now() - interval '1 hour');
-- ผู้เล่น B: 1 ตา (ต้องไม่ปนกับ A)
insert into public.game_log(user_id, gid, game_id, result, coin_delta, played_at) values
  ('00000000-0000-0000-0000-000000000c02', 'b1', 'dummy', 'win', 999, now());

select pg_temp.as_user('00000000-0000-0000-0000-000000000c01');

-- ประวัติ
select pg_temp.ok(jsonb_array_length(public.get_game_history()) = 8, 'ประวัติ 8 ตา (ไม่นับตาซ้อม · ไม่ปนของคนอื่น)');
select pg_temp.ok(public.get_game_history()->0->>'game' = 'pokdeng', 'ประวัติเรียงใหม่สุดก่อน');
select pg_temp.ok(jsonb_array_length(public.get_game_history(3)) = 3, 'จำกัดจำนวนตาได้');
select pg_temp.ok(jsonb_array_length(public.get_game_history(0)) = 1, 'จำนวนต่ำสุด 1 ตา');
select pg_temp.ok((select count(*) from jsonb_array_elements(public.get_game_history()) e where (e->>'bots')::boolean) = 1, 'ตามีบอทยังแสดงพร้อมป้าย');

-- สถิติ
create temp table st as select public.get_game_stats() as j;
create temp table dm as select e as g from st, jsonb_array_elements(j->'games') e where e->>'game' = 'dummy';
select pg_temp.ok((select (j->'total'->>'plays')::int from st) = 8, 'รวมทุกเกม 8 ตา');
select pg_temp.ok((select (j->'total'->>'wins')::int from st) = 6, 'รวมชนะ 6 ตา');
select pg_temp.ok((select (j->'total'->>'coins')::int from st) = 620, 'รวมเหรียญ 620');
select pg_temp.ok((select j->'games'->0->>'game' from st) = 'dummy', 'เกมที่เล่นมากสุดขึ้นก่อน');
select pg_temp.ok((select (g->>'plays')::int from dm) = 6, 'ดัมมี่ 6 ตา (ตัดตาซ้อม)');
select pg_temp.ok((select (g->>'wins')::int from dm) = 5, 'ดัมมี่ชนะ 5');
select pg_temp.ok((select (g->>'melds')::int from dm) = 14, 'ดัมมี่ชุดรวม 14');
select pg_temp.ok((select (g->>'knocks')::int from dm) = 2, 'ดัมมี่น็อก 2');
select pg_temp.ok((select (g->>'best_streak')::int from dm) = 3, 'ชนะติดกันสูงสุด 3 (ตาซ้อมไม่ต่อสถิติ)');
select pg_temp.ok((select (g->>'streak')::int from dm) = 3, 'ชนะติดกันตอนนี้ 3');
select pg_temp.ok((select g->>'character' from dm) = 'arya', 'ตัวละครที่ใช้บ่อยสุด');
select pg_temp.ok((select (e->>'streak')::int from st, jsonb_array_elements(j->'games') e where e->>'game' = 'pokdeng') = 1, 'ป๊อกเด้งชนะติดกันตอนนี้ 1');

-- ผู้เล่นใหม่ที่ยังไม่เคยเล่น
select pg_temp.as_user('00000000-0000-0000-0000-000000000c09');
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000c09', '{"username":"hs_new","display_name":"ใหม่"}');
select pg_temp.ok(public.get_game_history() = '[]'::jsonb, 'ยังไม่เคยเล่น = ประวัติว่าง');
select pg_temp.ok(public.get_game_stats()->'games' = '[]'::jsonb, 'ยังไม่เคยเล่น = สถิติว่าง');

-- สิทธิ์
select set_config('request.jwt.claim.sub', '', false);   -- ไม่ล็อกอิน
select pg_temp.fails($$select public.get_game_history()$$, '%เข้าสู่ระบบ%', 'ไม่ล็อกอินดูประวัติไม่ได้');
select pg_temp.fails($$select public.get_game_stats()$$, '%เข้าสู่ระบบ%', 'ไม่ล็อกอินดูสถิติไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.get_game_history(int)', 'execute'), 'anon เรียกประวัติไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.get_game_stats()', 'execute'), 'anon เรียกสถิติไม่ได้');
\echo '✓ test_v16 ผ่านทั้งหมด'
