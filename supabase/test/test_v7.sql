\set ON_ERROR_STOP on
-- v7: สตามิน่า · ชา · ฟาร์มกับบอท · โหมดซ้อม · เลเวลตัวละคร · ช่องชุดแต่ง · ไอเทมในแบทเทิลพาส
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$ begin
  begin execute sql; exception when others then raise notice 'ok  - % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (ควรผิดพลาด): %', msg; end $$;

select pg_temp.ok((select count(*) from pg_proc where proname = 'record_game_result') = 1, 'record_game_result มีแบบเดียว (ไม่มีตัวซ้ำให้ PostgREST สับสน)');
select pg_temp.ok(public._stamina_max(1) = 80 and public._stamina_max(5) = 80 and public._stamina_max(6) = 100 and public._stamina_max(56) = 300 and public._stamina_max(99) = 300,
  'สตามิน่าสูงสุด: เริ่ม 80 · +20 ทุก 5 เลเวล · ตัน 300 ที่เลเวล 56');

insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e5', '{"username":"erin","display_name":"เอริน"}');
-- ===== เล่นกับบอท: หักสตามิน่า + ฟาร์มเหรียญ =====
set role service_role;
do $t$ declare j jsonb; begin
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-1', 'dummy', 60, true, 0, false, null, true, 'coins', 1, 4);
  perform pg_temp.ok(not (j->>'practice')::boolean and (j->>'delta')::int = 120, 'บอท + ฟาร์มเหรียญ: ที่ 1 ได้ 60×2 = 120');
  perform pg_temp.ok((j->>'stamina')::int = 70 and (j->>'max')::int = 80, 'หักสตามิน่า 10 (80 → 70)');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-1', 'dummy', 60, true, 0, false, null, true, 'coins', 1, 4);
  perform pg_temp.ok((j->>'duplicate')::boolean, 'ส่งผลซ้ำ → ไม่จ่ายซ้ำ');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-2', 'dummy', 15, false, 0, false, null, true, 'exp', 1, 4);
  perform pg_temp.ok((j->>'delta')::int = 0 and (j->'items'->>'exp-m')::int = 1 and (j->'items'->>'exp-s')::int = 3, 'ฟาร์มคัมภีร์: ที่ 1 ได้ขั้นกลาง 1 + ขั้นต้น 3');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-3', 'dummy', 15, false, 0, false, null, true, 'exp', 4, 4);
  perform pg_temp.ok((j->'items'->>'exp-s')::int = 3 and (j->'items'->>'exp-m') is null, 'ฟาร์มคัมภีร์: ที่สุดท้ายได้ขั้นต้น 3');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-4', 'dummy', 15, false, 0, false, null, true, 'pexp', 2, 4);
  perform pg_temp.ok((j->>'delta')::int = 0 and (j->>'exp')::int = 20 + 120, 'ฟาร์ม EXP ผู้เล่น: ที่ 2 ได้ EXP 20 + โบนัส 120');
end $t$;
reset role;
select pg_temp.ok((select qty from public.inventory where user_id = '00000000-0000-0000-0000-0000000000e5' and kind = 'items' and item_id = 'exp-s') = 6, 'คัมภีร์เข้าคลัง (3 + 3)');
select pg_temp.ok((select stamina from public.profiles where username = 'erin') = 80, 'เล่นกับบอท 4 ตา แล้วตาที่ 4 ขึ้นเลเวล (ฟาร์ม EXP) → เติมสตามิน่าเต็ม 80');

-- ===== โหมดซ้อม: สตามิน่าไม่พอ → ไม่ได้อะไร ไม่นับเควส =====
update public.profiles set stamina = 5, stamina_at = now() where username = 'erin';
select (select count(*) from public.game_log where user_id = '00000000-0000-0000-0000-0000000000e5') as n0, (select coins from public.profiles where username = 'erin') as c0,
       (select player_exp from public.profiles where username = 'erin') as x0,
       public._quest_progress('00000000-0000-0000-0000-0000000000e5', q, public.game_day()) as q0 from public.quest_defs q where q.metric = 'play' and q.period = 'daily' limit 1 \gset
set role service_role;
do $t$ declare j jsonb; begin
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-p1', 'dummy', 60, true, 3, true, null, true, 'coins', 1, 4);
  perform pg_temp.ok((j->>'practice')::boolean and (j->>'delta')::int = 0 and (j->>'exp')::int = 0 and (j->>'bp')::int = 0, 'สตามิน่าไม่พอ → โหมดซ้อม ไม่ได้เหรียญ/EXP/แบทเทิลพาส');
  perform pg_temp.ok((j->>'stamina')::int = 5, 'โหมดซ้อมไม่หักสตามิน่า');
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-p1', 'dummy', 60, true, 3, true, null, true, 'coins', 1, 4);
  perform pg_temp.ok((j->>'duplicate')::boolean, 'โหมดซ้อมส่งซ้ำก็ถูกกันซ้ำ');
end $t$;
reset role;
select pg_temp.ok((select coins from public.profiles where username = 'erin') = :c0 and (select player_exp from public.profiles where username = 'erin') = :x0, 'เหรียญ/EXP ไม่เปลี่ยนจากโหมดซ้อม');
select pg_temp.ok(public._quest_progress('00000000-0000-0000-0000-0000000000e5', q, public.game_day()) = :q0, 'โหมดซ้อมไม่นับความคืบหน้าเควส')
  from public.quest_defs q where q.metric = 'play' and q.period = 'daily' limit 1;

-- ===== ฟื้นสตามิน่า =====
update public.profiles set stamina = 50, stamina_at = now() - interval '13 minutes' where username = 'erin';
select pg_temp.ok(public._stamina_sync('00000000-0000-0000-0000-0000000000e5') = 52, 'ผ่าน 13 นาที → ฟื้น 2 (ทุก 6 นาที)');
select pg_temp.ok((select stamina_at from public.profiles where username = 'erin') between now() - interval '61 seconds' and now() - interval '59 seconds', 'เศษ 1 นาทีเก็บไว้ (เวลาอ้างอิงเลื่อนไป 12 นาที)');
update public.profiles set stamina = 79, stamina_at = now() - interval '10 hours' where username = 'erin';
select pg_temp.ok(public._stamina_sync('00000000-0000-0000-0000-0000000000e5') = 80, 'ฟื้นไม่เกินสูงสุด (80)');
-- เต็มแล้วใช้: เวลาอ้างอิงต้องเริ่มใหม่ ไม่ใช่ฟื้นย้อนหลังทันที
update public.profiles set stamina = 80, stamina_at = now() - interval '5 hours' where username = 'erin';
select pg_temp.ok(public._stamina_spend('00000000-0000-0000-0000-0000000000e5', 10), 'เต็มแล้วใช้ 10 ได้');
select pg_temp.ok(public._stamina_sync('00000000-0000-0000-0000-0000000000e5') = 70, 'หลังใช้ตอนเต็ม ไม่ฟื้นย้อนหลัง (ยัง 70)');
select pg_temp.ok(not public._stamina_spend('00000000-0000-0000-0000-0000000000e5', 71), 'ใช้เกินที่มีไม่ได้');

-- ===== ชา: เติมเกินสูงสุดได้ (เกินแล้วหยุดฟื้น) =====
select public._grant_qty('00000000-0000-0000-0000-0000000000e5', 'items', 'tea-g', 2);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $t$ declare j jsonb; begin
  j := public.use_item('tea-g', 2);
  perform pg_temp.ok((j->>'stamina')::int = 190 and (j->>'left')::int = 0, 'ดื่มชาเขียว 2 ถ้วย: 70 + 120 = 190 (เกินสูงสุดได้)');
  perform pg_temp.fails($$select public.use_item('tea-g', 1)$$, 'ชาหมดแล้วใช้ไม่ได้');
  perform pg_temp.fails($$select public.use_item('exp-s', 1)$$, 'คัมภีร์ใช้เติมสตามิน่าไม่ได้');
  perform pg_temp.ok((public.get_stamina()->>'next_in') is null, 'เกินสูงสุดแล้วไม่ฟื้นต่อ');
  perform pg_temp.ok((public.get_profile()->'stamina'->>'stamina')::int = 190, 'โปรไฟล์ส่งสตามิน่ามาด้วย');
end $t$;
reset role;
update public.profiles set stamina_at = now() - interval '2 hours' where username = 'erin';
select pg_temp.ok(public._stamina_sync('00000000-0000-0000-0000-0000000000e5') = 190, 'ค้างเกินสูงสุด 2 ชม. ก็ไม่ฟื้นเพิ่ม');

-- ===== ขึ้นเลเวลเติมสตามิน่าเต็ม (เลเวล 6 สูงสุดเพิ่มเป็น 100) =====
-- เลเวล 6 ต้องใช้ EXP สะสม 100 + 125 + 150 + 175 + 200 = 750 · ตั้งไว้ 740 แล้วเล่น 1 ตา (+30)
update public.profiles set stamina = 3, stamina_at = now(), player_exp = 740 where username = 'erin';
set role service_role;
do $t$ declare j jsonb; begin
  j := public.record_game_result('00000000-0000-0000-0000-0000000000e5', 'v7-lv', 'pokdeng', 60, true, 0, false, null);
  perform pg_temp.ok((j->>'level')::int = 6 and (j->>'level_up')::boolean, 'เล่นกับคน → ขึ้นเลเวล 6');
  perform pg_temp.ok((j->>'stamina')::int = 100 and (j->>'max')::int = 100, 'ขึ้นเลเวล → สตามิน่าเต็ม 100 (สูงสุดใหม่)');
  perform pg_temp.ok(not (j->>'bots')::boolean and (j->>'delta')::int = 60, 'เล่นกับคนไม่ใช้สตามิน่า ได้เหรียญตามอันดับ');
end $t$;
reset role;
-- เพดานเหรียญรายวันนับเฉพาะเกมกับคน: เหรียญจากบอทวันนี้ (120) ไม่ทำให้เกมกับคนโดนตัด
select pg_temp.ok((select sum(coin_delta) filter (where bots) from public.game_log where user_id = '00000000-0000-0000-0000-0000000000e5') = 120, 'มีเหรียญจากบอทวันนี้ 120');

-- ===== เลเวลตัวละคร + ช่องชุดแต่ง =====
update public.profiles set coins = 1000 where username = 'erin';
select public._grant_qty('00000000-0000-0000-0000-0000000000e5', 'items', 'exp-l', 1);
select public._grant_item('00000000-0000-0000-0000-0000000000e5', 'frames', 'sakura-gem');
select pg_temp.ok(public._char_level_of(0) = 1 and public._char_level_of(100) = 2 and public._char_level_of(250) = 3 and public._char_level_of(999999) = 30, 'สูตรเลเวลตัวละคร: 100 + 50×(เลเวล−1) · ตัน 30');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $t$ declare j jsonb; begin
  perform pg_temp.fails($$select public.char_level_up('boy', '{}'::jsonb)$$, 'ไม่เลือกคัมภีร์ = อัปไม่ได้');
  perform pg_temp.fails($$select public.char_level_up('boy', '{"exp-s": 99}'::jsonb)$$, 'คัมภีร์ไม่พอ');
  perform pg_temp.fails($$select public.char_level_up('sakuya-ssr', '{"exp-s": 1}'::jsonb)$$, 'ตัวละครที่ไม่มี อัปไม่ได้');
  j := public.char_level_up('boy', '{"exp-s": 2}'::jsonb);
  perform pg_temp.ok((j->>'level')::int = 2 and (j->>'exp')::int = 200 and (j->>'cost')::int = 40 and (j->>'coins')::int = 960, 'ตัวละครฟรี (boy) อัปได้: 200 EXP → เลเวล 2 · เสีย 40 เหรียญ');
  perform pg_temp.fails($$select public.set_char_slot('boy', 'frames', 'sakura-gem')$$, 'ช่องกรอบยังไม่ปลด (ต้องเลเวล 5)');
  j := public.char_level_up('boy', '{"exp-l": 1}'::jsonb);
  perform pg_temp.ok((j->>'level')::int = 9 and (j->>'old_level')::int = 2 and (j->>'cost')::int = 400, 'ใช้คัมภีร์ขั้นสูง (2,000 EXP) → เลเวล 9 · เสีย 400 เหรียญ');
  j := public.set_char_slot('boy', 'frames', 'sakura-gem');
  perform pg_temp.ok(j->'loadout'->>'frames' = 'sakura-gem', 'เลเวล 5 ขึ้นไป ใส่กรอบในชุดของตัวละครได้');
  perform pg_temp.fails($$select public.set_char_slot('boy', 'backs', 'sakura-01')$$, 'ช่องหลังไพ่ยังไม่ปลด (ต้องเลเวล 10)');
  perform pg_temp.fails($$select public.set_char_slot('boy', 'frames', 'no-such-frame')$$, 'ใส่ของที่ไม่มีไม่ได้');
  perform pg_temp.fails($$select public.set_char_slot('boy', 'hats', 'x')$$, 'ไม่มีช่องชนิดนี้');
  j := public.set_char_slot('boy', 'frames', null);
  perform pg_temp.ok(not (j->'loadout' ? 'frames'), 'ถอดของออกจากช่องได้');
  perform pg_temp.ok((public.get_profile()->'char_prog'->'boy'->>'level')::int = 9, 'โปรไฟล์ส่งเลเวลตัวละครมาด้วย');
end $t$;
reset role;
select pg_temp.ok((select coalesce(sum(qty), 0) from public.inventory where user_id = '00000000-0000-0000-0000-0000000000e5' and kind = 'items' and item_id = 'exp-l') = 0, 'คัมภีร์ที่ใช้ถูกหักออกจากคลัง');

-- ===== แบทเทิลพาส: รางวัลไอเทมมีจำนวน =====
select pg_temp.ok(exists (select 1 from public.bp_rewards where season_id = 's1' and item_kind = 'items' and qty > 1), 'ฤดู 1 มีไอเทมหลายชิ้นต่อช่อง');
update public.user_bp set exp = 2000, claimed = '{}'::jsonb where user_id = '00000000-0000-0000-0000-0000000000e5';
insert into public.user_bp(user_id, season_id, exp) values ('00000000-0000-0000-0000-0000000000e5', 's1', 2000) on conflict (user_id, season_id) do update set exp = 2000, claimed = '{}'::jsonb;
select (select coalesce(qty, 0) from public.inventory where user_id = '00000000-0000-0000-0000-0000000000e5' and kind = 'items' and item_id = 'exp-s') as b0 \gset
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $t$ declare c jsonb; begin
  c := public.claim_bp();
  perform pg_temp.ok(jsonb_array_length(c->'items') >= 1 and (c->'items'->0->>'qty')::int >= 1, 'รับรางวัลแบทเทิลพาสได้ไอเทมพร้อมจำนวน');
  perform pg_temp.ok((public.get_bp()->'rewards'->0) ? 'qty', 'get_bp ส่งจำนวนของมาด้วย');
end $t$;
reset role;
select pg_temp.ok((select qty from public.inventory where user_id = '00000000-0000-0000-0000-0000000000e5' and kind = 'items' and item_id = 'exp-s') > :b0, 'ไอเทมจากแบทเทิลพาสเข้าคลังตามจำนวน');
\echo 'test_v7 ผ่านทั้งหมด'
