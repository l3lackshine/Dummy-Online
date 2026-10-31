\set ON_ERROR_STOP on
-- v11: ตารางอันดับรายสัปดาห์ + แรงก์รายเดือน
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000d01', '{"username":"rk_a","display_name":"เอ"}'),
  ('00000000-0000-0000-0000-000000000d02', '{"username":"rk_b","display_name":"บี"}'),
  ('00000000-0000-0000-0000-000000000d03', '{"username":"rk_c","display_name":"ซี"}');
do $t$ declare j jsonb; a uuid := '00000000-0000-0000-0000-000000000d01'; b uuid := '00000000-0000-0000-0000-000000000d02'; c uuid := '00000000-0000-0000-0000-000000000d03'; begin
  j := public.record_rank(a, 'g1', 'dummy', 1, 1);
  perform pg_temp.ok(not (j->>'counted')::boolean and j->>'reason' = 'humans', 'คนจริงคนเดียว: ไม่นับ');
  j := public.record_rank(a, 'g1', 'hearts', 1, 4);
  perform pg_temp.ok(not (j->>'counted')::boolean, 'เกมที่ไม่อยู่ในตาราง: ไม่นับ');
  -- โต๊ะ 4 คน
  perform pg_temp.ok((public.record_rank(a, 'g2', 'dummy', 1, 4)->>'pts')::int = 30, '4 คน ที่ 1 +30');
  perform pg_temp.ok((public.record_rank(b, 'g2', 'dummy', 2, 4)->>'pts')::int = 15, '4 คน ที่ 2 +15');
  perform pg_temp.ok((public.record_rank(c, 'g2', 'dummy', 3, 4)->>'pts')::int = 5, '4 คน ที่ 3 +5');
  j := public.record_rank(a, 'g2', 'dummy', 1, 4);
  perform pg_temp.ok(not (j->>'counted')::boolean and j->>'reason' = 'duplicate', 'ตาเดิมส่งซ้ำ: ไม่นับซ้ำ');
  -- โต๊ะ 2 / 3 คน: ที่โหล่ได้ 0
  perform pg_temp.ok((public.record_rank(b, 'g3', 'dummy', 2, 2)->>'pts')::int = 0, '2 คน ที่ 2 (โหล่) +0');
  perform pg_temp.ok((public.record_rank(c, 'g4', 'dummy', 2, 3)->>'pts')::int = 15, '3 คน ที่ 2 +15');
  perform pg_temp.ok((public.record_rank(b, 'g4', 'dummy', 3, 3)->>'pts')::int = 0, '3 คน ที่ 3 (โหล่) +0');
  j := public.record_rank(a, 'g5', 'pokdeng', 1, 2);
  perform pg_temp.ok((j->>'week_points')::int = 30 and (j->>'rp')::int = 60, 'แต้มสัปดาห์แยกเกม · แต้มแรงก์รวมทุกเกม');
end $t$;
-- ตารางอันดับ
select pg_temp.as_user('00000000-0000-0000-0000-000000000d02');
do $t$ declare j jsonb; begin
  j := public.get_leaderboard('dummy');
  perform pg_temp.ok(jsonb_array_length(j->'top') = 3, 'ตารางดัมมี่มี 3 คน');
  perform pg_temp.ok(j->'top'->0->>'name' = 'เอ' and (j->'top'->0->>'points')::int = 30, 'อันดับ 1 = เอ 30 แต้ม');
  perform pg_temp.ok(j->'top'->1->>'name' = 'ซี' and (j->'top'->1->>'points')::int = 20, 'อันดับ 2 = ซี 20 แต้ม');
  perform pg_temp.ok((j->'me'->>'rank')::int = 3 and (j->'me'->>'plays')::int = 3, 'อันดับของฉัน (บี) = 3 เล่น 3 ตา');
  perform pg_temp.ok((j->'top'->2->>'me')::boolean, 'แถวของฉันถูกทำเครื่องหมาย');
  perform pg_temp.ok(jsonb_array_length(public.get_leaderboard('dummy', true)->'top') = 0, 'สัปดาห์ที่แล้ว: ว่าง');
  perform pg_temp.ok((public.get_rank()->>'pending')::int = 0, 'ยังไม่มีรางวัลค้าง (สัปดาห์ยังไม่จบ)');
  perform pg_temp.ok(jsonb_array_length(public.claim_rank_rewards()->'items') = 0, 'กดรับตอนนี้: ไม่ได้อะไร');
end $t$;
-- จำลองสัปดาห์ที่แล้ว: บี ที่ 1 ดัมมี่ เล่น 12 ตา · เอ ที่ 2 · 10 คนแต้มน้อยกว่าไม่เกี่ยว
reset role;
update public.weekly_scores set week = public.game_week() - 7 where game_id = 'dummy';
update public.weekly_scores set points = 99, plays = 12 where game_id = 'dummy' and user_id = '00000000-0000-0000-0000-000000000d02';
do $t$ declare j jsonb; m0 bigint; c0 bigint; m1 bigint; c1 bigint; begin
  select mcash, coins into m0, c0 from public.profiles where id = '00000000-0000-0000-0000-000000000d02';
  perform pg_temp.as_user('00000000-0000-0000-0000-000000000d02');
  perform pg_temp.ok((public.get_rank()->>'pending')::int = 1, 'สัปดาห์จบ: มีรางวัลค้าง 1');
  perform pg_temp.ok(public.get_leaderboard('dummy', true)->'top'->0->>'name' = 'บี', 'ผลสุดท้ายสัปดาห์ที่แล้ว: บี ที่ 1');
  j := public.claim_rank_rewards();
  select mcash, coins into m1, c1 from public.profiles where id = '00000000-0000-0000-0000-000000000d02';
  perform pg_temp.ok((j->>'mcash')::int = 100 and m1 - m0 = 100, 'ที่ 1: +100 เพชร');
  perform pg_temp.ok((j->>'coins')::int = 300 and c1 - c0 = 300, 'เล่นครบ 10 ตา: +300 เหรียญปลอบใจ');
  perform pg_temp.ok(j->'items'->0->>'title' = 'แชมป์ดัมมี่', 'ได้ฉายา แชมป์ดัมมี่');
  perform pg_temp.ok(jsonb_array_length(public.claim_rank_rewards()->'items') = 0, 'รับซ้ำไม่ได้');
  perform pg_temp.ok((public.set_badge('champ-dummy')->>'name') = 'แชมป์ดัมมี่', 'ติดฉายาพิเศษได้');
  perform pg_temp.ok(public.get_leaderboard('dummy', true)->'top'->0->>'badge' = 'แชมป์ดัมมี่', 'ตารางอันดับแสดงฉายาที่ติด');
  begin perform public.set_badge('champ-pokdeng'); perform pg_temp.ok(false, 'ติดฉายาที่ไม่มี ต้องไม่ได้');
  exception when others then perform pg_temp.ok(sqlerrm like '%ยังไม่มีฉายา%', 'ติดฉายาที่ไม่มี: ถูกปฏิเสธ'); end;
  perform pg_temp.as_user('00000000-0000-0000-0000-000000000d01');
  j := public.claim_rank_rewards();
  perform pg_temp.ok((j->>'mcash')::int = 50 and (j->>'coins')::int = 0, 'เอ ที่ 2: +50 เพชร ไม่ได้เหรียญปลอบใจ (เล่นไม่ครบ 10)');
end $t$;
-- แรงก์รายเดือน: ตก 1 ขั้นต่อเดือน
reset role;
update public.rank_season set rp = 1200, month = (public.game_month() - interval '1 month')::date where user_id = '00000000-0000-0000-0000-000000000d03';
select pg_temp.as_user('00000000-0000-0000-0000-000000000d03');
select pg_temp.ok(public.get_rank()->>'tier_name' = 'Gold' and (public.get_rank()->>'rp')::int = 500, 'ขึ้นเดือนใหม่: Platinum 1200 → Gold 500');
select pg_temp.ok((public.record_rank('00000000-0000-0000-0000-000000000d03', 'g9', 'eekae', 1, 2)->>'rp')::int = 530, 'เล่นต่อจากแต้มที่ตกแล้ว');
reset role;
update public.rank_season set rp = 3500, month = (public.game_month() - interval '3 month')::date where user_id = '00000000-0000-0000-0000-000000000d03';
select pg_temp.ok(public.get_rank()->>'tier_name' = 'Gold', 'หาย 3 เดือน: Master → Gold (ตก 3 ขั้น)');
select pg_temp.ok(public._tier_of(0) = 0 and public._tier_of(199) = 0 and public._tier_of(200) = 1 and public._tier_of(99999) = 5, 'เกณฑ์ขั้นแรงก์');
-- สิทธิ์
select pg_temp.ok(not has_function_privilege('authenticated', 'public.record_rank(uuid, text, text, int, int)', 'execute'), 'ผู้เล่นเรียก record_rank เองไม่ได้');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.weekly_scores', 'update'), 'ผู้เล่นแก้ตารางแต้มตรง ๆ ไม่ได้');
\echo '✓ test_v11 ผ่านทั้งหมด'
