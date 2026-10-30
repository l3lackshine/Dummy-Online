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

insert into public.catalog_items(kind,item_id,name,rarity,is_default) values
  ('characters','boy','boy','common',true), ('characters','rina','rina','legendary',false),
  ('backs','gold','gold','epic',false), ('backs','plain','plain','common',true)
  on conflict (kind,item_id) do update set rarity=excluded.rarity, is_default=excluded.is_default, active=true;
insert into public.character_defs(id,max_stars,star_costs,bonus_pct) values ('rina',3,'{1,2}','{0,10,20}') on conflict (id) do update set max_stars=3, star_costs='{1,2}', bonus_pct='{0,10,20}';
-- ตู้ทดสอบ: t1 = rina ล้วน, t2 = pity 3 (boy ธรรมดาเกือบทั้งหมด + rina นิดเดียว), t3 = สำหรับเช็คการันตี 10 ครั้ง (boy + gold)
insert into public.gacha_banners(id,name,single_coins,ten_coins,pity) values ('t1','t1',100,900,0), ('t2','t2',10,90,3), ('t3','t3',10,90,0)
  on conflict (id) do update set single_coins=excluded.single_coins, ten_coins=excluded.ten_coins, pity=excluded.pity, single_mcash=null, ten_mcash=null, active=true;
insert into public.gacha_pool(banner_id,kind,item_id,weight) values
  ('t1','characters','rina',1), ('t2','characters','boy',1000000), ('t2','characters','rina',1), ('t3','characters','boy',1000000), ('t3','backs','gold',1)
  on conflict (banner_id,kind,item_id) do update set weight=excluded.weight;

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

-- ไม่มีร้านค้าแล้ว
select pg_temp.fails($$select public.buy_item('backs','gold')$$, 'ไม่มี buy_item แล้ว');
select pg_temp.ok(to_regclass('public.shop_items') is null, 'ตาราง shop_items ถูกลบ');
select pg_temp.fails($$update public.inventory set qty = 99$$, 'แก้จำนวนของเองไม่ได้');
select pg_temp.fails($$select public.set_equipped('backs','nothave')$$, 'ใส่ของที่ไม่มีไม่ได้');
select pg_temp.ok((public.set_equipped('backs','plain')->>'backs') = 'plain', 'ใส่ของเริ่มต้นได้');
select pg_temp.fails($$select public.set_equipped('characters','rina')$$, 'ใส่ตัวละครที่ยังไม่ได้สุ่มไม่ได้');

-- กาชา
select pg_temp.fails($$select public.gacha_pull('t1',3)$$, 'สุ่มได้แค่ 1 หรือ 10');
select pg_temp.fails($$select public.gacha_pull('nope',1)$$, 'ไม่มีตู้');
select pg_temp.fails($$select public.gacha_pull('t1',1,'mcash')$$, 'ตู้ไม่รับ MCash');
select pg_temp.fails($$select public.gacha_pull('t1',1,'gems')$$, 'สกุลเงินผิด');
select pg_temp.fails($$select public.upgrade_star('rina')$$, 'อัพดาวตัวละครที่ไม่มีไม่ได้');
do $t$ declare j jsonb; begin
  j := public.gacha_pull('t1',1);
  perform pg_temp.ok((j->'results'->0->>'item_id') = 'rina' and (j->'results'->0->>'new')::boolean, 'สุ่มได้ rina ครั้งแรก = NEW');
  perform pg_temp.ok((j->>'coins')::int = 5000, 'หักเหรียญค่าสุ่ม 100');
  perform pg_temp.ok((select qty from public.inventory where kind='characters' and item_id='rina') = 1, 'มี rina 1 ชิ้น');
  perform pg_temp.fails($$select public.sell_dupes('characters','rina',1)$$, 'ขายตัวเดียวที่มีไม่ได้ (ต้องเก็บไว้ 1)');
  perform pg_temp.fails($$select public.upgrade_star('rina')$$, 'ไม่มีตัวซ้ำ อัพดาวไม่ได้');
  j := public.gacha_pull('t1',1);
  perform pg_temp.ok(not (j->'results'->0->>'new')::boolean and (j->'results'->0->>'qty')::int = 2, 'ได้ซ้ำ → qty 2');
  j := public.upgrade_star('rina');
  perform pg_temp.ok((j->>'stars')::int = 2 and (j->>'used')::int = 1 and (j->>'coins_used')::int = 500, 'อัพดาว 1→2 ใช้ตัวซ้ำ 1 + 500 เหรียญ');
  perform pg_temp.ok((select qty from public.inventory where item_id='rina') = 1, 'ตัวซ้ำถูกใช้แล้ว เหลือ 1');
  perform pg_temp.fails($$select public.upgrade_star('rina')$$, 'ดาว 2→3 ต้อง 2 ตัวซ้ำ แต่ยังไม่มี');
  perform public.gacha_pull('t1',10);   -- +10 → qty 11
  perform pg_temp.ok((select qty from public.inventory where item_id='rina') = 11, 'สุ่ม 10 ครั้ง → qty 11');
  j := public.upgrade_star('rina');
  perform pg_temp.ok((j->>'stars')::int = 3, 'อัพดาว 2→3');
  perform pg_temp.fails($$select public.upgrade_star('rina')$$, 'ดาวเต็มแล้ว');
  perform pg_temp.ok((select qty from public.inventory where item_id='rina') = 9, 'ใช้ตัวซ้ำ 2 เหลือ 9');
  perform pg_temp.ok((public.get_profile()->'characters'->>'rina')::int = 3, 'ดาว rina = 3');
  j := public.sell_dupes('characters','rina',8);
  perform pg_temp.ok((j->>'coins_gained')::int = 8000, 'ขายตัวซ้ำ 8 ชิ้น legendary = 8000');
  perform pg_temp.fails($$select public.sell_dupes('characters','rina',1)$$, 'เหลือ 1 ขายไม่ได้');
  perform pg_temp.fails($$select public.sell_dupes('characters','nope',1)$$, 'ขายของที่ไม่มี');
  perform pg_temp.fails($$select public.sell_dupes('characters','rina',0)$$, 'จำนวนต้อง ≥ 1');
  perform pg_temp.ok((select coins from public.profiles) = 5100 - 100 - 100 - 900 - 500 - 1000 + 8000, 'เหรียญหลังสุ่ม/อัปดาว/ขายถูก');
  perform pg_temp.ok((public.set_equipped('characters','rina')->>'characters') = 'rina', 'ใส่ตัวละครที่สุ่มได้');
  perform pg_temp.ok((select count(*) from public.gacha_log) = 3, 'บันทึกประวัติสุ่ม');
  perform pg_temp.ok(jsonb_array_length(public.get_gacha()->'banners') >= 3, 'get_gacha คืนตู้');
  perform pg_temp.ok((select sum((i->>'pct')::numeric) from jsonb_array_elements((select b->'items' from jsonb_array_elements(public.get_gacha()->'banners') b where b->>'id'='t2')) i) between 99.9 and 100.1, 'อัตราการออกรวม 100%');
end $t$;
select set_config('t.coins', (select coins::text from public.profiles), false);

-- การันตี: pity 3 → ครั้งที่ 3 ต้องได้ legendary (ตั้งตัวนับเป็น 2 แล้วสุ่มครั้งต่อไป)
reset role;
insert into public.gacha_pity(user_id,banner_id,since_top) values ('00000000-0000-0000-0000-0000000000a1','t2',2) on conflict (user_id,banner_id) do update set since_top=2;
set role authenticated;
do $t$ declare j jsonb; begin
  j := public.gacha_pull('t2',1);
  perform pg_temp.ok((j->'results'->0->>'rarity') = 'legendary' and (j->>'since_top')::int = 0, 'pity: ได้ legendary แน่นอน และรีเซ็ตตัวนับ');
  j := public.gacha_pull('t3',10);
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(j->'results') r where r->>'rarity' in ('rare','epic','legendary')), 'สุ่ม 10 ครั้งการันตี rare ขึ้นไป');
  perform pg_temp.ok(jsonb_array_length(j->'results') = 10, 'ได้ 10 ชิ้น');
end $t$;
select set_config('t.coins', (select coins::text from public.profiles), false);

reset role;
-- ===== เซิร์ฟเวอร์บันทึกผลเกม (service_role) =====
set role service_role;
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g1','dummy',200,true,6,true,'boy')->>'result') = 'win', 'บันทึกผลชนะ');
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g1','dummy',200,true,6,true,'boy')->>'duplicate')::boolean, 'gid ซ้ำไม่นับซ้ำ');
select public.record_game_result('00000000-0000-0000-0000-0000000000a1','g2','dummy',-50,false,0,false,'boy');
select public.record_game_result('00000000-0000-0000-0000-0000000000a1','g3','pokdeng',0,false,0,false,null);
reset role;
select pg_temp.ok((select plays||'/'||wins||'/'||losses from public.game_stats where game_id='dummy') = '2/1/1', 'สถิติดัมมี่ 2 เล่น 1 ชนะ 1 แพ้');
select pg_temp.ok((select losses from public.game_stats where game_id='pokdeng') = 1, 'ไม่ได้ที่ 1 นับเป็นแพ้');
select pg_temp.ok((select last_game from public.profiles where username='alice') = 'pokdeng', 'เกมล่าสุด');
select pg_temp.ok((select coins from public.profiles where username='alice') = current_setting('t.coins')::bigint+200, 'เหรียญหลังผลเกมถูก (แพ้ไม่เสียเหรียญ)');

-- โบนัสเหรียญตามดาว: rina ดาว 1 → 0%, ดาว 2 → 10%
update public.user_characters set stars=2 where user_id='00000000-0000-0000-0000-0000000000a1' and character_id='rina';
set role service_role;
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g4','dummy',100,true,0,false,'rina')->>'bonus')::int = 0, 'ไม่มีโบนัสเหรียญตามดาวแล้ว');
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000a1','g5','dummy',-100,false,0,false,'rina')->>'bonus')::int = 0, 'แพ้ไม่มีโบนัส');
reset role;

-- เหรียญไม่ติดลบ
set role service_role;
select pg_temp.ok((public.record_game_result('00000000-0000-0000-0000-0000000000b2','b1','dummy',-99999,false,0,false,null)->>'delta')::int = 0, 'ส่งค่าติดลบมา → ไม่หักเหรียญ (ไม่มีการเสียจากการเล่น)');
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
