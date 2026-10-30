\set ON_ERROR_STOP on
-- v6: เพดานเหรียญรายวัน · EXP/เลเวล · แต้มกิจกรรม/เพชรจากเควส · แบทเทิลพาส · อัปดาวใช้เหรียญ · เปลี่ยนชื่อเสียเหรียญ
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$ begin
  begin execute sql; exception when others then raise notice 'ok  - % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (ควรผิดพลาด): %', msg; end $$;

insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000d4', '{"username":"dave","display_name":"เดฟ"}');
-- ===== เพดานเหรียญรายวัน + EXP/เลเวล =====
set role service_role;
do $t$ declare j jsonb; i int; v_last jsonb; begin
  j := public.record_game_result('00000000-0000-0000-0000-0000000000d4', 'v6-1', 'dummy', 60, true, 3, false, null);
  perform pg_temp.ok((j->>'delta')::int = 60 and not (j->>'capped')::boolean, 'ได้ที่ 1 → 60 เหรียญเต็ม');
  perform pg_temp.ok((j->>'exp')::int = 30 and (j->>'level')::int = 1, 'EXP ที่ 1 = 30 · ยังเลเวล 1');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000d4', 'v6-2', 'dummy', 15, false, 0, false, null);
  perform pg_temp.ok((j->>'delta')::int = 15 and (j->>'result') = 'loss' and (j->>'exp')::int = 20, 'ที่ 4 → 15 เหรียญ + 20 EXP (แพ้ก็ได้)');
  perform pg_temp.ok((j->>'coins')::int = 5000 + 75, 'แพ้ไม่เสียเหรียญ');
  -- ไล่ให้ขึ้นเลเวล 2 (ต้อง 100 EXP: มี 50 → อีก 2 ตา)
  perform public.record_game_result('00000000-0000-0000-0000-0000000000d4', 'v6-3', 'dummy', 15, false, 0, false, null);
  j := public.record_game_result('00000000-0000-0000-0000-0000000000d4', 'v6-4', 'dummy', 60, true, 0, false, null);
  perform pg_temp.ok((j->>'level')::int = 2 and (j->>'level_up')::boolean and (j->>'level_mcash')::int = 5, 'ขึ้นเลเวล 2 ได้ 5 เพชร');
  perform pg_temp.ok((j->>'mcash')::int = 5, 'เพชรเข้ากระเป๋า');
  perform pg_temp.ok((j->>'bp')::int = 30, 'EXP แบทเทิลพาสจากเกม 30');
  -- เพดาน: ยัดให้ใกล้ 1500
  for i in 5..30 loop v_last := public.record_game_result('00000000-0000-0000-0000-0000000000d4', 'v6-' || i, 'dummy', 60, true, 0, false, null); end loop;
  perform pg_temp.ok((v_last->>'today_coins')::int <= 1500 + 5 * 26, 'เหรียญวันนี้ไม่เกินเพดานมาก');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000d4', 'v6-cap', 'dummy', 60, true, 0, false, null);
  perform pg_temp.ok((j->>'delta')::int = 5 and (j->>'capped')::boolean, 'เกินเพดาน 1,500/วัน → ได้ตาละ 5');
end $t$;
reset role;
select pg_temp.ok((select sum(bp_gain) from public.game_log where user_id = '00000000-0000-0000-0000-0000000000d4') = 300, 'EXP แบทเทิลพาสจากเกมมีเพดาน 300/วัน');
select pg_temp.ok((select raw_delta from public.game_log where gid = 'v6-cap') = 60, 'เก็บเหรียญก่อนตัดเพดานไว้ดู');
select pg_temp.ok((select player_exp from public.profiles where username = 'dave') > 100, 'player_exp สะสมในโปรไฟล์');

-- ===== เควส: แต้มกิจกรรม + โบนัสเพชร/EXP แบทเทิลพาส =====
-- ทำให้เควสรายวันทุกแบบสำเร็จ (ชนะ · เกิดไพ่ · น็อก · หลายเกม · เหรียญ)
insert into public.game_log(user_id, gid, game_id, result, coin_delta, melds, knock, played_at)
select '00000000-0000-0000-0000-0000000000d4', 'qv6-' || i, case when i % 2 = 0 then 'dummy' else 'pokdeng' end, 'win', 60, 6, true, now() from generate_series(1, 10) i;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
set role authenticated;
do $t$ declare j jsonb; q jsonb; m0 bigint; b jsonb; begin
  j := public.get_quests();
  perform pg_temp.ok((j->'daily'->>'points_max')::int = 100, 'แต้มกิจกรรมรายวันเต็ม 100 (4 เควส × 25)');
  perform pg_temp.ok((select bool_and((e->>'reward_bp')::int = 750 and (e->>'reward_mcash')::int = 5) from jsonb_array_elements(j->'weekly'->'quests') e), 'เควสรายสัปดาห์ให้ 5 เพชร + 750 EXP');
  perform pg_temp.ok((j->'daily'->'bonus'->>'mcash')::int = 5 and (j->'daily'->'bonus'->>'bp')::int = 1000, 'โบนัสรายวัน: 5 เพชร + 1000 EXP แบทเทิลพาส');
  select mcash into m0 from public.profiles;
  for q in select * from jsonb_array_elements(j->'daily'->'quests') loop
    if not (q->>'claimed')::boolean and (q->>'progress')::int >= (q->>'target')::int then perform public.claim_quest(q->>'id'); end if;
  end loop;
  j := public.get_quests();
  if (j->'daily'->'bonus'->>'ready')::boolean then
    b := public.claim_quest_bonus('daily');
    perform pg_temp.ok((b->>'mcash')::int = 5 and (b->>'bp')::int = 1000, 'รับโบนัสรายวันได้เพชร + EXP');
    perform pg_temp.ok((public.get_quests()->'daily'->>'points')::int = 100, 'แต้มกิจกรรมครบ 100');
  else raise exception 'FAIL: โบนัสรายวันควรรับได้หลังทำเควสครบ'; end if;
end $t$;
reset role;

-- ===== แบทเทิลพาส =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
set role authenticated;
do $t$ declare j jsonb; e0 int; c jsonb; m0 bigint; begin
  j := public.get_bp();
  perform pg_temp.ok((j->'season'->>'id') = 's1' and jsonb_array_length(j->'rewards') = 150, 'มีฤดู s1 · รางวัล 50 เลเวล × 3 สาย');
  perform pg_temp.ok(not (j->'season'->>'premium_open')::boolean, 'สายพรีเมียมยังล็อก');
  e0 := (j->'me'->>'exp')::int;
  perform pg_temp.ok(e0 >= 1300, 'EXP แบทเทิลพาสจากเกม + โบนัสเควส (' || e0 || ')');
  c := public.claim_bp();
  perform pg_temp.ok((c->>'levels')::int = e0 / 1000 and (c->>'coins')::int > 0, 'รับรางวัลสายฟรีตามเลเวลที่ถึง');
  perform pg_temp.fails($$select public.claim_bp()$$, 'รับซ้ำไม่ได้');
  perform pg_temp.fails($$select public.buy_bp_gem()$$, 'เพชรไม่พอปลดสายเพชร');
end $t$;
reset role;
-- ให้เพชรพอแล้วปลดสายเพชร → EXP เพิ่ม 3% · รับรางวัลสายเพชรย้อนหลังได้
update public.profiles set mcash = 1000 where username = 'dave';
set role authenticated;
do $t$ declare j jsonb; c jsonb; e1 int; add int; begin
  j := public.buy_bp_gem();
  perform pg_temp.ok((j->>'mcash')::int = 700, 'ปลดสายเพชร หัก 300 เพชร');
  perform pg_temp.fails($$select public.buy_bp_gem()$$, 'ปลดซ้ำไม่ได้');
  c := public.claim_bp();
  perform pg_temp.ok((c->>'levels')::int >= 1, 'รับรางวัลสายเพชรย้อนหลังของเลเวลที่ผ่านมาแล้ว');
end $t$;
reset role;
select pg_temp.ok(public._bp_add('00000000-0000-0000-0000-0000000000d4', 1000) = 1030, 'ปลดสายเพชรแล้ว EXP +3%');
-- เลยเลเวลสูงสุด → รางวัลวน
update public.user_bp set exp = 50 * 1000 + 2500 where user_id = '00000000-0000-0000-0000-0000000000d4';
set role authenticated;
do $t$ declare c jsonb; begin
  c := public.claim_bp();
  perform pg_temp.ok((c->>'cycles')::int = 2, 'เลยเลเวล 50 ไป 2 เลเวล → รางวัลวน 2 ครั้ง');
  perform pg_temp.ok(exists (select 1 from public.inventory where item_id = 'sakura-gem' and kind = 'frames'), 'ได้กรอบจากสายเพชรเลเวล 15');
end $t$;
reset role;

-- ===== เปลี่ยนชื่อ: ครั้งแรกฟรี ครั้งต่อไป 500 =====
update public.profiles set coins = 600, name_changes = 0 where username = 'dave';
set role authenticated;
do $t$ declare j jsonb; begin
  j := public.update_profile('เดฟใหม่', null);
  perform pg_temp.ok((j->>'cost')::int = 0 and (j->>'coins')::int = 600, 'เปลี่ยนชื่อครั้งแรกฟรี');
  j := public.update_profile('เดฟใหม่', null);
  perform pg_temp.ok((j->>'cost')::int = 0, 'ชื่อเดิมไม่คิดเงิน');
  j := public.update_profile('เดฟสอง', null);
  perform pg_temp.ok((j->>'cost')::int = 500 and (j->>'coins')::int = 100, 'ครั้งที่ 2 เสีย 500');
  perform pg_temp.fails($$select public.update_profile('เดฟสาม', null)$$, 'เหรียญไม่พอเปลี่ยนชื่อ');
  j := public.update_profile(null, 'ฉายาใหม่');
  perform pg_temp.ok((j->>'title') = 'ฉายาใหม่' and (j->>'coins')::int = 100, 'แก้ฉายาฟรี');
end $t$;
reset role;
select pg_temp.ok(public._level_of(0) = 1 and public._level_of(100) = 2 and public._level_of(5000) = 17, 'สูตรเลเวลตรงกับ economy.js');
\echo 'test_v6 ผ่านทั้งหมด'
