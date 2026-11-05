\set ON_ERROR_STOP on
-- v14: ความสำเร็จ (ความคืบหน้าจากบันทึกการเล่น · ท่าพิเศษ · ชนะติด · รับทีละขั้น · ฉายา + รางวัล · สิทธิ์)
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(q text, pat text, msg text) returns void language plpgsql as $$ begin
  begin execute q; exception when others then if sqlerrm like pat then raise notice 'ok  - %', msg; return; end if; raise exception 'FAIL: % (ผิดข้อความ: %)', msg, sqlerrm; end;
  raise exception 'FAIL: % (ไม่ error)', msg; end $$;
create or replace function pg_temp.ach(p_id text) returns jsonb language sql as $$
  select r from jsonb_array_elements(public.get_achievements()->'list') r where r->>'id' = p_id $$;
-- เล่นหนึ่งตา (แทน record_game_result ของเซิร์ฟเวอร์) · i = ลำดับเวลา
create or replace function pg_temp.play(u uuid, i int, p_game text, p_won boolean, p_melds int default 0, p_char text default 'boy') returns void language sql as $$
  insert into public.game_log(user_id, gid, game_id, result, melds, character_id, played_at)
  values (u, 'g' || i, p_game, case when p_won then 'win' else 'loss' end, p_melds, p_char, now() - interval '1 day' + i * interval '1 minute') $$;

insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000a01', '{"username":"ach_a","display_name":"เอ"}'),
  ('00000000-0000-0000-0000-000000000a02', '{"username":"ach_b","display_name":"บี"}');

-- รายการจาก achievements_seed.sql
select pg_temp.ok((select count(*) from public.achievement_defs where active) >= 40, 'ลงรายการความสำเร็จจาก seed แล้ว');
select pg_temp.ok((select reward_mcash from public.achievement_tiers where ach_id = 'dm-knock' and tier = 3) > 0
  and (select reward_mcash from public.achievement_tiers where ach_id = 'dm-knock' and tier = 1) = 0, 'เพชรเฉพาะขั้นทอง');

-- ดัมมี่ 3 ตา: ชนะ ชนะ แพ้ · ชนะ 3 ติด (ตา 4-6)
do $$ declare u uuid := '00000000-0000-0000-0000-000000000a01'; begin
  perform pg_temp.play(u, 1, 'dummy', true, 2);
  perform pg_temp.play(u, 2, 'dummy', true, 1, 'rina-01');
  perform pg_temp.play(u, 3, 'dummy', false, 0);
  perform pg_temp.play(u, 4, 'pokdeng', true);
  perform pg_temp.play(u, 5, 'pokdeng', true);
  perform pg_temp.play(u, 6, 'pokdeng', true);
end $$;
-- ท่าพิเศษจากเซิร์ฟเวอร์
select pg_temp.ok(public.record_game_feats('00000000-0000-0000-0000-000000000a01', 'g1', array['knock', 'head', 'knock', 'BAD!']) = 1, 'บันทึกท่าพิเศษลงแถวที่มีอยู่');
select pg_temp.ok((select feats from public.game_log where gid = 'g1' and user_id = '00000000-0000-0000-0000-000000000a01') = array['head', 'knock'], 'ท่าพิเศษไม่ซ้ำ + ตัดชื่อผิดรูปแบบทิ้ง');
select pg_temp.ok(public.record_game_feats('00000000-0000-0000-0000-000000000a01', 'nope', array['knock']) = 0, 'ไม่มีแถวบันทึก = ไม่ทำอะไร');
select public.record_game_feats('00000000-0000-0000-0000-000000000a01', 'g4', array['pok', 'pok9']);

select pg_temp.as_user('00000000-0000-0000-0000-000000000a01');
select pg_temp.ok(pg_temp.ach('dm-plays')->>'progress' = '3', 'นับตาที่เล่นดัมมี่ = 3');
select pg_temp.ok(pg_temp.ach('dm-wins')->>'progress' = '2', 'นับตาที่ชนะดัมมี่ = 2');
select pg_temp.ok(pg_temp.ach('dm-melds')->>'progress' = '3', 'รวมชุดที่เกิด = 3');
select pg_temp.ok(pg_temp.ach('dm-knock')->>'progress' = '1', 'ท่าพิเศษน็อก = 1');
select pg_temp.ok(pg_temp.ach('pd-pok9')->>'progress' = '1', 'ท่าพิเศษป๊อก 9 = 1');
select pg_temp.ok(pg_temp.ach('gen-plays')->>'progress' = '6' and pg_temp.ach('gen-rules')->>'progress' = '2', 'ความสำเร็จทั่วไปนับทุกเกม (6 ตา · 2 เกม)');
select pg_temp.ok(public._ach_streak('00000000-0000-0000-0000-000000000a01', null) = 3, 'ชนะติดกันสูงสุดทุกเกม = 3 (แพ้ตา 3 ตัดสาย)');
select pg_temp.ok(public._ach_streak('00000000-0000-0000-0000-000000000a01', 'dummy') = 2, 'ชนะติดเฉพาะดัมมี่ = 2');
select pg_temp.ok((public.get_achievements()->>'ready')::int >= 2, 'นับขั้นที่พร้อมรับ (จุดแดง)');

-- รับรางวัล (จำยอดเหรียญ/เพชรก่อนรับไว้เทียบ)
create temp table before_claim as select coins, mcash from public.profiles where id = '00000000-0000-0000-0000-000000000a01';
select pg_temp.ok(public.claim_achievement('dm-knock')->>'title' = 'น็อกครั้งแรก', 'รับขั้น 1 ได้ฉายา');
select pg_temp.ok((select name from public.user_titles where user_id = '00000000-0000-0000-0000-000000000a01' and title_id = 'ach:dm-knock') = 'น็อกครั้งแรก', 'ฉายาลง user_titles (ปักบนบัตรได้)');
select pg_temp.ok((select coins from public.profiles where id = '00000000-0000-0000-0000-000000000a01') - (select coins from before_claim)
  = (select reward_coins from public.achievement_tiers where ach_id = 'dm-knock' and tier = 1), 'ได้เหรียญตามขั้น');
select pg_temp.ok(pg_temp.ach('dm-knock')->>'claimed' = '1', 'ขั้นที่รับแล้ว = 1');
select pg_temp.fails($$select public.claim_achievement('dm-knock')$$, '%ยังทำไม่ครบ%', 'ขั้น 2 ยังไม่ครบ รับไม่ได้');
select pg_temp.fails($$select public.claim_achievement('dm-dark')$$, '%ยังทำไม่ครบ%', 'ยังไม่เคยน็อกมืด รับไม่ได้');
select pg_temp.fails($$select public.claim_achievement('nope')$$, '%ไม่พบ%', 'ความสำเร็จที่ไม่มี');
-- ขั้นสูงขึ้นทับชื่อฉายาเดิม + ระดับเหรียญ
update public.achievement_tiers set target = 1 where ach_id = 'dm-knock' and tier in (2, 3);
select public.claim_achievement('dm-knock');
select pg_temp.ok(public.claim_achievement('dm-knock')->>'level' = '3', 'รับครบ 3 ขั้น (ขั้นทอง)');
select pg_temp.ok((select times from public.user_titles where user_id = '00000000-0000-0000-0000-000000000a01' and title_id = 'ach:dm-knock') = 3
  and (select count(*) from public.user_titles where user_id = '00000000-0000-0000-0000-000000000a01' and title_id like 'ach:dm-knock') = 1, 'ฉายาแถวเดียว ขั้นทอง times = 3');
select pg_temp.ok((select mcash from public.profiles where id = '00000000-0000-0000-0000-000000000a01') - (select mcash from before_claim)
  = (select reward_mcash from public.achievement_tiers where ach_id = 'dm-knock' and tier = 3), 'ขั้นทองได้เพชร');
select pg_temp.fails($$select public.claim_achievement('dm-knock')$$, '%ครบทุกขั้น%', 'รับครบแล้วรับซ้ำไม่ได้');

-- คนอื่นไม่เห็นความคืบหน้าของเรา
select pg_temp.as_user('00000000-0000-0000-0000-000000000a02');
select pg_temp.ok(pg_temp.ach('dm-plays')->>'progress' = '0' and pg_temp.ach('dm-knock')->>'claimed' = '0', 'บีเริ่มจาก 0');

-- สิทธิ์
select pg_temp.ok(not has_function_privilege('authenticated', 'public.record_game_feats(uuid, text, text[])', 'execute'), 'ผู้เล่นบันทึกท่าพิเศษเองไม่ได้');
select pg_temp.ok(not has_function_privilege('anon', 'public.get_achievements()', 'execute'), 'คนไม่ล็อกอินดูความสำเร็จไม่ได้');
select pg_temp.ok(not has_function_privilege('authenticated', 'public._ach_progress(uuid, public.achievement_defs)', 'execute'), 'ผู้เล่นเรียก _ach_progress ตรง ๆ ไม่ได้');
\echo '✓ test_v14 ผ่านทั้งหมด'
