\set ON_ERROR_STOP on
-- v9: ตั๋วพักร้อน · ภารกิจเร่ง · ภารกิจระยะยาว · กล่องเลือกของ
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$ begin
  begin execute sql; exception when others then raise notice 'ok  - % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (ควรผิดพลาด): %', msg; end $$;

-- ฤดูเริ่มมา 20 วัน เหลืออีก 3 วัน (ภารกิจเร่งเปิดแล้ว)
update public.bp_seasons set starts_at = now() - interval '20 days', ends_at = now() + interval '3 days' where id = 's1';
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000a9', '{"username":"gina","display_name":"จีน่า"}');
insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000b9', '{"username":"newbie9","display_name":"มือใหม่"}');
update public.profiles set created_at = now() - interval '60 days' where username = 'gina';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a9');

-- ===== ตั๋วพักร้อน =====
select pg_temp.ok(public._vac_tags('00000000-0000-0000-0000-0000000000a9', s) = 4, 'ไม่ได้เข้าเลยทั้งฤดู → ตั๋วพักร้อนเต็ม 4 ใบ (เพดาน)') from public.bp_seasons s where id = 's1';
insert into public.quest_bonus(user_id, period, period_key, coins, mcash, bp) values ('00000000-0000-0000-0000-0000000000a9', 'daily', public.game_day() - 2, 0, 0, 0);
select pg_temp.ok(public._vac_tags('00000000-0000-0000-0000-0000000000a9', s) = 1, 'รับโบนัสล่าสุดเมื่อ 2 วันก่อน → ขาด 1 วัน = 1 ใบ') from public.bp_seasons s where id = 's1';
select pg_temp.ok(public._vac_tags('00000000-0000-0000-0000-0000000000b9', s) = 0, 'สมัครวันนี้ → ไม่มีตั๋วพักร้อน') from public.bp_seasons s where id = 's1';
-- ทำเควสรายวันครบ แล้วรับโบนัส
insert into public.user_quests(user_id, quest_id, period_key) select '00000000-0000-0000-0000-0000000000a9', q.id, public.game_day() from public._pick_quests('daily', public.game_day()) q;
select coalesce((select exp from public.user_bp where user_id = '00000000-0000-0000-0000-0000000000a9' and season_id = 's1'), 0) as e0 \gset
do $t$ declare j jsonb; begin
  j := public.claim_quest_bonus('daily');
  perform pg_temp.ok((j->>'vacation_used')::boolean and (j->>'bp')::int = 2000 and (j->>'vacation_left')::int = 0, 'รับโบนัสรายวันมีตั๋ว → ใช้ 1 ใบ EXP ×2 = 2,000');
end $t$;
select pg_temp.ok((select exp from public.user_bp where user_id = '00000000-0000-0000-0000-0000000000a9' and season_id = 's1') = :e0 + 2000, 'EXP แบทเทิลพาสเพิ่ม 2,000');
select pg_temp.ok((public.get_bp()->'me'->>'vacation')::int = 0 and (public.get_bp()->'me'->>'daily_claimed')::boolean and (public.get_bp()->'me'->>'vacation_cap')::int = 4, 'get_bp: ตั๋วเหลือ 0 · รับโบนัสวันนี้แล้ว · เพดาน 4');
-- ขาดหลายวัน + ตั๋วค้าง 3 ใบ → ไม่เกิน 4
update public.user_bp set vac_tags = 3 where user_id = '00000000-0000-0000-0000-0000000000a9' and season_id = 's1';
update public.quest_bonus set period_key = period_key - 5 where user_id = '00000000-0000-0000-0000-0000000000a9' and period = 'daily';
select pg_temp.ok(public._vac_tags('00000000-0000-0000-0000-0000000000a9', s) = 4, 'ตั๋วค้าง 3 + ขาด 4 วัน → ไม่เกินเพดาน 4') from public.bp_seasons s where id = 's1';
-- ไม่มีตั๋ว → ได้ปกติ
update public.user_bp set vac_tags = 0 where user_id = '00000000-0000-0000-0000-0000000000a9' and season_id = 's1';
update public.quest_bonus set period_key = public.game_day() - 1 where user_id = '00000000-0000-0000-0000-0000000000a9' and period = 'daily' and period_key = public.game_day() - 5;
do $t$ declare j jsonb; begin
  j := public.claim_quest_bonus('daily');
  perform pg_temp.ok(not (j->>'vacation_used')::boolean and (j->>'bp')::int = 1000, 'เข้าเล่นทุกวัน (ไม่มีตั๋ว) → โบนัสรายวัน 1,000 ปกติ');
end $t$;

-- ===== ภารกิจเร่ง =====
insert into public.game_log(user_id, gid, game_id, result, coin_delta, melds, knock, played_at)
  select '00000000-0000-0000-0000-0000000000a9', 'v9-' || g, 'dummy', case when g <= 5 then 'win' else 'loss' end, 50, 1, false, now() - interval '1 hour'
  from generate_series(1, 15) g;
insert into public.game_log(user_id, gid, game_id, result, coin_delta, melds, knock, played_at, practice)
  select '00000000-0000-0000-0000-0000000000a9', 'v9-p' || g, 'dummy', 'win', 0, 0, false, now() - interval '1 hour', true from generate_series(1, 10) g;
select pg_temp.ok((select (m->>'progress')::int from jsonb_array_elements(public.get_bp()->'missions'->'speedup'->'missions') m where m->>'id' = 's_win5') = 5, 'ภารกิจเร่ง: ชนะ 5 (โหมดซ้อมไม่นับ)');
do $t$ declare j jsonb; begin
  j := public.claim_bp_mission('speedup', 's_play15');
  perform pg_temp.ok((j->>'bp')::int = 2000, 'รับภารกิจเร่ง เล่น 15 ตา → 2,000 EXP');
end $t$;
select pg_temp.fails($$select public.claim_bp_mission('speedup', 's_play15')$$, 'รับภารกิจเร่งซ้ำไม่ได้');
select pg_temp.fails($$select public.claim_bp_mission('speedup', 's_days4')$$, 'ภารกิจยังไม่สำเร็จรับไม่ได้');
select pg_temp.fails($$select public.claim_bp_mission('speedup', 'nope')$$, 'ภารกิจที่ไม่มีอยู่รับไม่ได้');
update public.bp_seasons set ends_at = now() + interval '20 days' where id = 's1';
select pg_temp.ok(not (public.get_bp()->'missions'->'speedup'->>'open')::boolean, 'เหลือ 20 วัน → ภารกิจเร่งยังไม่เปิด');
select pg_temp.fails($$select public.claim_bp_mission('speedup', 's_win5')$$, 'ภารกิจเร่งยังไม่เปิด → รับไม่ได้');

-- ===== ภารกิจระยะยาว =====
select pg_temp.ok(jsonb_array_length(public.get_bp()->'missions'->'horizon') = 16, 'ภารกิจระยะยาว 16 ภารกิจ (รวมเรียนจบดัมมี่)');
do $t$ declare j jsonb; begin
  j := public.claim_bp_mission('horizon', 'h_play10');
  perform pg_temp.ok((j->>'bp')::int = 800, 'ภารกิจระยะยาว เล่น 10 ตา → 800 EXP');
end $t$;
select pg_temp.fails($$select public.claim_bp_mission('horizon', 'h_play10')$$, 'ภารกิจระยะยาวรับซ้ำไม่ได้');
select pg_temp.fails($$select public.claim_bp_mission('horizon', 'h_win100')$$, 'ภารกิจระยะยาวที่ยังไม่ถึงรับไม่ได้');
select pg_temp.ok((select horizon from public.profiles where username = 'gina') @> '["h_play10"]', 'บันทึกที่โปรไฟล์ (ถาวร ข้ามฤดู)');
-- ไม่มีฤดู → รับไม่ได้
update public.bp_seasons set ends_at = now() - interval '1 second' where id = 's1';
select pg_temp.fails($$select public.claim_bp_mission('horizon', 'h_win5')$$, 'ไม่มีฤดู → รับภารกิจระยะยาวไม่ได้ (รอฤดูใหม่)');
select pg_temp.ok((select (m->>'claimed')::boolean from jsonb_array_elements(public.get_bp()->'missions'->'horizon') m where m->>'id' = 'h_play10'), 'ไม่มีฤดูก็ยังเห็นภารกิจระยะยาวที่รับแล้ว');
update public.bp_seasons set ends_at = now() + interval '20 days' where id = 's1';

-- ===== กล่องเลือกของ =====
select public._grant_qty('00000000-0000-0000-0000-0000000000a9', 'items', 'crate-s', 1);
select public._grant_qty('00000000-0000-0000-0000-0000000000a9', 'items', 'crate-sp', 1);
select public._grant_qty('00000000-0000-0000-0000-0000000000a9', 'items', 'crate-m', 6);
select public._grant_qty('00000000-0000-0000-0000-0000000000a9', 'items', 'crate-l', 1);
select (select coins from public.profiles where username = 'gina') as c0 \gset
select pg_temp.fails($$select public.open_crate('crate-s', 9)$$, 'เลือกตัวเลือกที่ไม่มีไม่ได้');
select pg_temp.fails($$select public.open_crate('tea-g', 0)$$, 'ไอเทมที่ไม่ใช่กล่องเปิดไม่ได้');
select pg_temp.ok(jsonb_array_length(public.crate_options('crate-s')) = 3, 'กล่องเล็ก 3 ตัวเลือก (เหรียญ · คัมภีร์ · ชา)');
select pg_temp.ok((public.crate_options('crate-sp')->0->>'qty')::int > (public.crate_options('crate-s')->0->>'qty')::int, 'กล่องหรูได้เหรียญมากกว่ากล่องเล็ก');
select pg_temp.ok(not exists (select 1 from jsonb_array_elements(public.crate_options('crate-m')) o join public.catalog_items c on c.kind = 'characters' and c.item_id = o->>'id' where c.rarity <> 'rare'), 'กล่องกลาง: มีแต่ตัวละคร Rare');
select pg_temp.ok(not exists (select 1 from jsonb_array_elements(public.crate_options('crate-l')) o join public.catalog_items c on c.kind = 'characters' and c.item_id = o->>'id' where c.rarity <> 'epic')
  and jsonb_array_length(public.crate_options('crate-l')) > 0, 'กล่องใหญ่: มีแต่ตัวละคร SR');
do $t$ declare j jsonb; begin
  j := public.open_crate('crate-s', 0);
  perform pg_temp.ok(j->'got'->>'kind' = 'coins' and (j->>'left')::int = 0, 'เปิดกล่องเล็ก เลือกเหรียญ');
end $t$;
select pg_temp.ok((select coins from public.profiles where username = 'gina') = :c0 + 800, 'ได้เหรียญ 800');
select pg_temp.fails($$select public.open_crate('crate-s', 0)$$, 'กล่องหมดแล้วเปิดไม่ได้');
-- เศษ Rare: ตัวที่ยังไม่มี · 5 กล่อง = 50 ชิ้น → ได้ตัวละคร
select o->>'id' as rc, (ord - 1) as rp from jsonb_array_elements(public.crate_options('crate-m')) with ordinality as t(o, ord)
  where not public._owns('00000000-0000-0000-0000-0000000000a9', 'characters', o->>'id') limit 1 \gset
select set_config('t.rp', :'rp', false);
do $t$ declare j jsonb; i int; begin
  for i in 1..4 loop j := public.open_crate('crate-m', current_setting('t.rp')::int); end loop;
  perform pg_temp.ok((j->>'shards')::int = 40 and (j->>'chars')::int = 0, 'เศษ Rare 40/50 ยังไม่ได้ตัว');
  j := public.open_crate('crate-m', current_setting('t.rp')::int);
  perform pg_temp.ok((j->>'chars')::int = 1 and (j->>'shards')::int = 0, 'ครบ 50 ชิ้น → ได้ตัวละคร เศษเหลือ 0');
end $t$;
select pg_temp.ok(exists (select 1 from public.user_characters where user_id = '00000000-0000-0000-0000-0000000000a9' and character_id = :'rc'), 'ตัวละครเข้าบัญชี');
select public._grant_shards('00000000-0000-0000-0000-0000000000a9', :'rc', 45);
do $t$ declare j jsonb; begin
  j := public.open_crate('crate-m', current_setting('t.rp')::int);
  perform pg_temp.ok((j->>'chars')::int = 1 and (j->>'shards')::int = 5, 'มีตัวแล้ว ครบอีก 50 → ได้ตัวซ้ำ เศษเกินเก็บไว้ 5');
end $t$;
select pg_temp.ok((select qty from public.inventory where user_id = '00000000-0000-0000-0000-0000000000a9' and kind = 'characters' and item_id = :'rc') = 2, 'ตัวซ้ำ ×2 ไว้อัพดาว');

-- ===== ร้านประจำสัปดาห์: เศษ =====
select pg_temp.ok(jsonb_array_length(public.get_weekly_shop()->'shards') = 3, 'ร้านมีช่องเศษ 3 ช่อง');
select pg_temp.ok((select x->>'rarity' from jsonb_array_elements(public.get_weekly_shop()->'shards') x where x->>'slot' = 'sh-r') = 'rare'
  and (select (x->>'mcash')::int from jsonb_array_elements(public.get_weekly_shop()->'shards') x where x->>'slot' = 'sh-sg') = 200, 'ช่อง Rare (เหรียญ) · ช่อง SR (เพชร 200)');
update public.profiles set coins = 20000, mcash = 300 where username = 'gina';
do $t$ declare j jsonb; begin
  j := public.buy_weekly_shard('sh-s');
  perform pg_temp.ok((j->>'qty')::int = 5, 'ซื้อเศษ SR ×5 ด้วยเหรียญ');
  j := public.buy_weekly_shard('sh-sg');
  perform pg_temp.ok((j->>'qty')::int = 5, 'ซื้อเศษ SR ×5 ด้วยเพชร');
end $t$;
select pg_temp.ok((select coins from public.profiles where username = 'gina') = 10000 and (select mcash from public.profiles where username = 'gina') = 100, 'หักเหรียญ 10,000 และเพชร 200');
select pg_temp.fails($$select public.buy_weekly_shard('sh-s')$$, 'ช่องเดิมซื้อซ้ำในสัปดาห์เดียวไม่ได้');
select pg_temp.fails($$select public.buy_weekly_shard('nope')$$, 'ช่องที่ไม่มีซื้อไม่ได้');
update public.profiles set coins = 100 where username = 'gina';
select pg_temp.fails($$select public.buy_weekly_shard('sh-r')$$, 'เหรียญไม่พอซื้อไม่ได้');
-- สัปดาห์ใหม่ → ซื้อได้อีก
update public.profiles set coins = 20000, weekly_shards = jsonb_set(weekly_shards, '{week}', '"2000-01-03"') where username = 'gina';
select pg_temp.ok(not (select bool_or((x->>'bought')::boolean) from jsonb_array_elements(public.get_weekly_shop()->'shards') x), 'สัปดาห์ใหม่ช่องเศษกลับมาซื้อได้');
select pg_temp.ok((select count(*) from public.bp_rewards where season_id = 's1' and item_id = 'crate-l' and track = 'gem') = 1
  and not exists (select 1 from public.bp_rewards where season_id = 's1' and item_id = 'crate-l' and track <> 'gem'), 'กล่องใหญ่ (SR) มีเฉพาะสายเพชร');
-- คืนค่าฤดูให้เทสต์อื่น
update public.bp_seasons set starts_at = ('2026-10-30'::date)::timestamp at time zone 'Asia/Bangkok', ends_at = (('2026-10-30'::date)::timestamp at time zone 'Asia/Bangkok') + interval '30 days' where id = 's1';
\echo '✓ test_v9 ผ่านทั้งหมด'
