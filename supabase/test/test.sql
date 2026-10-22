\set ON_ERROR_STOP on
-- helper: เป็นผู้เล่นคนนี้ / เป็นเซิร์ฟเวอร์
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if not c then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$ begin
  begin execute sql; exception when others then raise notice 'ok  - % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (ควรผิดพลาด): %', msg; end $$;

insert into auth.users(id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', '{"username":"alice","display_name":"อลิซ"}'),
  ('00000000-0000-0000-0000-0000000000b2', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-0000000000c3', '{"username":"x"}');   -- ชื่อผิดรูปแบบ → ใช้ชื่อสำรอง
select pg_temp.ok((select count(*) from public.profiles) = 3, 'trigger สร้าง profile ให้ทุกคน');
select pg_temp.ok((select coins from public.profiles where username='alice') = 5000, 'เริ่มต้น 5000 เหรียญ');
select pg_temp.ok((select display_name from public.profiles where username='alice') = 'อลิซ', 'display_name จาก metadata');
select pg_temp.ok((select username from public.profiles where id='00000000-0000-0000-0000-0000000000c3') like 'u%', 'username ผิดรูปแบบ → สำรอง');

insert into public.shop_items(kind,item_id,name,price_coins,price_mcash) values
  ('characters','boy','boy',0,0), ('characters','rina','rina',1500,0), ('characters','vip','vip',0,50),
  ('backs','gold','gold',700,0)
  on conflict (kind,item_id) do update set price_coins=excluded.price_coins, price_mcash=excluded.price_mcash;
insert into public.character_defs(id,max_stars,star_costs,bonus_pct) values ('rina',3,'{100,200}','{0,10,20}') on conflict (id) do update set max_stars=3, star_costs='{100,200}', bonus_pct='{0,10,20}';

-- ===== ผู้เล่น alice =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;

-- เขียนตรงไม่ได้
select pg_temp.fails($$update public.profiles set coins = 999999 where username='alice'$$, 'อัปเดต coins ตรง ๆ ไม่ได้');
select pg_temp.fails($$insert into public.inventory values (auth.uid(),'characters','rina','coins',0,now())$$, 'ใส่ของเองไม่ได้');
select pg_temp.fails($$select public.record_game_result(auth.uid(),'g1','dummy',1000,true,0,false,null)$$, 'ผู้เล่นเรียก record_game_result ไม่ได้');
select pg_temp.fails($$select public.grant_mcash(auth.uid(),100,'x')$$, 'ผู้เล่นเติม MCash เองไม่ได้');
select pg_temp.ok((select count(*) from public.profiles) = 1, 'RLS: เห็นเฉพาะโปรไฟล์ตัวเอง');

-- ล็อกอิน
select pg_temp.ok((public.record_login()->>'streak')::int = 1, 'ล็อกอินวันแรก streak=1');
select pg_temp.ok((public.record_login()->>'new_day')::boolean = false, 'ล็อกอินซ้ำวันเดียวกันไม่เพิ่ม streak');
select pg_temp.ok((public.claim_login_reward()->>'coins')::int = 100, 'รับรางวัลล็อกอินวันที่ 1 = 100');
select pg_temp.fails($$select public.claim_login_reward()$$, 'รับรางวัลล็อกอินซ้ำในวันเดียวกันไม่ได้');
select pg_temp.ok((select coins from public.profiles) = 5100, 'เหรียญเพิ่มจากรางวัลล็อกอิน');

-- ซื้อของ
select pg_temp.ok((public.buy_item('backs','gold')->>'paid')::int = 700, 'ซื้อหลังไพ่ 700');
select pg_temp.fails($$select public.buy_item('backs','gold')$$, 'ซื้อซ้ำไม่ได้');
select pg_temp.fails($$select public.buy_item('characters','vip','mcash')$$, 'MCash ไม่พอ');
select pg_temp.fails($$select public.buy_item('characters','vip','coins')$$, 'ไอเท็ม MCash อย่างเดียวซื้อด้วยเหรียญไม่ได้');
select pg_temp.fails($$select public.buy_item('characters','nope')$$, 'ไม่มีสินค้า');
select pg_temp.fails($$select public.set_equipped('backs','nothave')$$, 'ใส่ของที่ไม่มีไม่ได้');

select pg_temp.ok((public.set_equipped('backs','gold')->>'backs') = 'gold', 'ใส่หลังไพ่ที่ซื้อแล้ว');
select pg_temp.ok((public.set_equipped('characters','boy')->>'characters') = 'boy', 'ใส่ตัวละครฟรี');
select pg_temp.fails($$select public.set_equipped('characters','rina')$$, 'ใส่ตัวละครที่ยังไม่ซื้อไม่ได้');

-- อัพดาว
select pg_temp.fails($$select public.upgrade_star('rina')$$, 'อัพดาวตัวละครที่ไม่มีไม่ได้');
select pg_temp.ok((public.upgrade_star('boy')->>'cost')::int = 500, 'อัพดาว boy 1→2 ใช้ค่ากลาง 500');
select pg_temp.ok((public.upgrade_star('boy')->>'cost')::int = 1000, 'อัพดาว boy 2→3 = 1000');
select pg_temp.ok((public.get_profile()->'characters'->>'boy')::int = 3, 'ดาว boy = 3');
select pg_temp.ok((select coins from public.profiles) = 5100-700-1500, 'หักเหรียญค่าดาวถูก');

reset role;
-- ===== เซิร์ฟเวอร์บันทึกผลเกม (service_role) =====
set role service_role;
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g1','dummy',200,true,6,true,'boy')->>'result') = 'win', 'บันทึกผลชนะ');
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g1','dummy',200,true,6,true,'boy')->>'duplicate')::boolean, 'gid ซ้ำไม่นับซ้ำ');
select public.record_game_result('00000000-0000-0000-0000-0000000000a1','g2','dummy',-50,false,0,false,'boy');
select public.record_game_result('00000000-0000-0000-0000-0000000000a1','g3','pokdeng',0,false,0,false,null);
reset role;
select pg_temp.ok((select plays||'/'||wins||'/'||losses from public.game_stats where game_id='dummy') = '2/1/1', 'สถิติดัมมี่ 2 เล่น 1 ชนะ 1 แพ้');
select pg_temp.ok((select draws from public.game_stats where game_id='pokdeng') = 1, 'เสมอนับ draw');
select pg_temp.ok((select last_game from public.profiles where username='alice') = 'pokdeng', 'เกมล่าสุด');
select pg_temp.ok((select coins from public.profiles where username='alice') = 5100-700-1500+200-50, 'เหรียญหลังผลเกมถูก');

-- โบนัสเหรียญตามดาว: rina ดาว 1 → 0%, ดาว 2 → 10%
insert into public.inventory(user_id,kind,item_id) values ('00000000-0000-0000-0000-0000000000a1','characters','rina');
insert into public.user_characters(user_id,character_id,stars) values ('00000000-0000-0000-0000-0000000000a1','rina',2);
set role service_role;
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g4','dummy',100,true,0,false,'rina')->>'bonus')::int = 10, 'โบนัสเหรียญ 10% ที่ดาว 2');
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g5','dummy',-100,false,0,false,'rina')->>'bonus')::int = 0, 'แพ้ไม่มีโบนัส');
reset role;

-- เหรียญไม่ติดลบ
set role service_role;
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000b2','b1','dummy',-99999,false,0,false,null)->>'coins')::int = 0, 'แพ้เกินที่มี → 0 ไม่ติดลบ');
select pg_temp.ok((public.grant_mcash('00000000-0000-0000-0000-0000000000b2',100,'pay-1')->>'mcash')::int = 100, 'เติม MCash 100');
select pg_temp.ok((public.grant_mcash('00000000-0000-0000-0000-0000000000b2',100,'pay-1')->>'duplicate')::boolean, 'เติมซ้ำเลขอ้างอิงเดิมไม่เพิ่ม');
reset role;
select pg_temp.ok((select mcash from public.profiles where username='bob') = 100, 'MCash = 100');

-- ===== เควส (alice) =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $t$ declare j jsonb; q jsonb; n int := 0; begin
  j := public.get_quests();
  perform pg_temp.ok(jsonb_array_length(j->'daily'->'quests') = 4, 'เควสรายวัน = ประจำ 1 + สุ่ม 3');
  perform pg_temp.ok(jsonb_array_length(j->'weekly'->'quests') = 4, 'เควสรายสัปดาห์ 4');
  perform pg_temp.ok((select count(distinct e->>'metric') from jsonb_array_elements(j->'daily'->'quests') e) = 4, 'ตัวชี้วัดไม่ซ้ำ');
  -- เช็คอินสำเร็จแล้ว (login) → รับได้
  perform pg_temp.ok((public.claim_quest('d_login')->>'coins')::int = 20, 'รับเควสเช็คอิน');
  perform pg_temp.fails($$select public.claim_quest('d_login')$$, 'รับเควสซ้ำไม่ได้');
  perform pg_temp.fails($$select public.claim_quest_bonus('daily')$$, 'โบนัสครบทุกเควสยังรับไม่ได้');
end $t$;
reset role;
-- ผู้เล่นใหม่ (ยังไม่เคยเล่น) รับเควสที่ยังไม่สำเร็จไม่ได้
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
set role authenticated;
do $t$ declare q jsonb; n int := 0; begin
  for q in select * from jsonb_array_elements(public.get_quests()->'daily'->'quests') loop
    if q->>'metric' <> 'login' then
      begin perform public.claim_quest(q->>'id'); raise exception 'FAIL รับเควสที่ยังไม่สำเร็จได้'; exception when others then
        if sqlerrm like 'FAIL%' then raise; end if; n := n + 1; end;
    end if;
  end loop;
  perform pg_temp.ok(n = 3, 'รับเควสที่ยังไม่สำเร็จไม่ได้ (' || n || ' อัน)');
end $t$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');

-- เล่นเยอะ ๆ ให้เควสรายวันสำเร็จทั้งหมด แล้วรับโบนัส
insert into public.game_log(user_id,gid,game_id,result,coin_delta,melds,knock,played_at)
select '00000000-0000-0000-0000-0000000000a1','q'||i, case when i%2=0 then 'dummy' else 'pokdeng' end, 'win', 200, 6, true, now() from generate_series(1,10) i;
set role authenticated;
do $t$ declare j jsonb; q jsonb; begin
  j := public.get_quests();
  for q in select * from jsonb_array_elements(j->'daily'->'quests') loop
    if not (q->>'claimed')::boolean then perform public.claim_quest(q->>'id'); end if;
  end loop;
  perform pg_temp.ok((public.claim_quest_bonus('daily')->>'coins')::int = 100, 'รับโบนัสครบทุกเควสรายวัน');
  perform pg_temp.fails($$select public.claim_quest_bonus('daily')$$, 'รับโบนัสซ้ำไม่ได้');
  j := public.get_quests();
  perform pg_temp.ok((j->'daily'->'bonus'->>'claimed')::boolean, 'สถานะโบนัสรับแล้ว');
end $t$;
reset role;

-- ===== รีเซ็ตเควสเมื่อข้ามวัน/สัปดาห์: ย้ายข้อมูลทุกอย่างไป "เมื่อวาน" =====
update public.game_log set played_at = played_at - interval '8 days' where user_id='00000000-0000-0000-0000-0000000000a1';
update public.login_days set day = day - 8 where user_id='00000000-0000-0000-0000-0000000000a1';
update public.user_quests set period_key = period_key - 8 where user_id='00000000-0000-0000-0000-0000000000a1';
update public.quest_bonus set period_key = period_key - 8 where user_id='00000000-0000-0000-0000-0000000000a1';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $t$ declare j jsonb; begin
  j := public.get_quests();
  perform pg_temp.ok((select bool_and((e->>'claimed')::boolean = false and (e->>'metric' = 'login' or (e->>'progress')::int = 0)) from jsonb_array_elements(j->'daily'->'quests') e), 'ข้ามวัน: เควสรายวันรีเซ็ต (ความคืบหน้า 0 / ยังไม่รับ)');
  perform pg_temp.ok((select bool_and((e->>'claimed')::boolean = false and (e->>'progress')::int = 0) from jsonb_array_elements(j->'weekly'->'quests') e where e->>'metric' <> 'login'), 'ข้ามสัปดาห์: เควสรายสัปดาห์รีเซ็ต');
  perform pg_temp.ok(not (j->'daily'->'bonus'->>'claimed')::boolean, 'โบนัสรีเซ็ต');
end $t$;
reset role;

-- ===== streak ต่อเนื่อง / ขาด =====
update public.profiles set last_login_day = public.game_day() - 1, login_streak = 6 where username='bob';
delete from public.login_days where user_id='00000000-0000-0000-0000-0000000000b2';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
select pg_temp.ok((public.record_login()->>'streak')::int = 7, 'ล็อกอินติดกัน streak 6→7');
do $t$ declare r jsonb; begin
  r := public.claim_login_reward();
  perform pg_temp.ok((r->>'cycle_day')::int = 7 and (r->>'mcash')::int = 20 and (r->>'bonus_coins')::int = 300 and (r->>'bonus_mcash')::int = 10, 'วันที่ 7: รางวัลใหญ่ + โบนัส streak 7 วัน');
end $t$;
reset role;
update public.profiles set last_login_day = public.game_day() - 3 where username='bob';
delete from public.login_days where user_id='00000000-0000-0000-0000-0000000000b2';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
select pg_temp.ok((public.record_login()->>'streak')::int = 1, 'ขาดไป 3 วัน streak กลับเป็น 1');
select pg_temp.ok((select best_streak from public.profiles) = 7, 'best_streak เก็บสูงสุด');
select pg_temp.ok((public.get_profile()->'login'->>'cycle_day')::int = 1, 'get_profile: วันที่ 1 ของรอบใหม่');
reset role;

-- ledger รวมกับยอดเหรียญต้องตรงกัน (ไม่นับเงินเริ่มต้น)
select pg_temp.ok((select sum(amount) from public.wallet_ledger where user_id='00000000-0000-0000-0000-0000000000a1' and currency='coins') + 5000 = (select coins from public.profiles where username='alice'), 'ledger ตรงกับยอดเหรียญ (alice)');
\echo ALL SQL TESTS PASSED
