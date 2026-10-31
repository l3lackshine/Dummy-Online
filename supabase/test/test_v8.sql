\set ON_ERROR_STOP on
-- v8: ตั๋วสุ่มตัวละคร (ตั๋วก่อน แล้วเพชร) · ตู้ของแต่งด้วยเหรียญ (ซ้ำ → เหรียญ) · ร้านของแต่งรายสัปดาห์
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); end $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin
  if c is not true then raise exception 'FAIL: %', msg; end if; raise notice 'ok  - %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$ begin
  begin execute sql; exception when others then raise notice 'ok  - % (%)', msg, sqlerrm; return; end;
  raise exception 'FAIL (ควรผิดพลาด): %', msg; end $$;

select pg_temp.ok(not exists (select 1 from public.gacha_banners b where b.active and b.id in ('sakura-ace','sakuya-up','cosm-sakura') and
  (select sum(weight) from public.gacha_pool p where p.banner_id = b.id) <> 1000000), 'น้ำหนักทุกตู้รวมได้ 1,000,000 พอดี (อัตราที่แสดงตรงจริง)');
select pg_temp.ok((select count(*) from public.gacha_pool gp join public.catalog_items ci using (kind, item_id)
  where gp.banner_id = 'cosm-sakura' and gp.weight > 0 and (ci.is_default or ci.kind = 'characters')) = 0, 'ตู้ของแต่ง: ไม่มีของเริ่มต้น ไม่มีตัวละคร');
select pg_temp.ok((select count(*) from public.gacha_pool gp where gp.banner_id in ('sakura-ace','sakuya-up') and gp.weight > 0 and gp.kind <> 'characters' and not (gp.banner_id = 'sakuya-up' and gp.item_id like 'sakuya-%')) = 0, 'ตู้ตัวละคร: มีแต่ตัวละคร (ยกเว้นพื้นหลังพิเศษของตู้ซากุยะ)');
select pg_temp.ok((select count(*) from public.gacha_pool gp where gp.weight > 0 and (gp.kind, gp.item_id) in
  (('frames','sakura-gem'),('backs','sakura-01'),('tables','sakura-felt'))) = 0, 'ของพิเศษแบทเทิลพาสไม่อยู่ในตู้');

insert into auth.users(id, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000f8', '{"username":"fern","display_name":"เฟิร์น"}');
update public.profiles set mcash = 1000, coins = 20000 where username = 'fern';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f8');

-- ===== ตู้ตัวละคร =====
select pg_temp.fails($$select public.gacha_pull('sakura-ace', 1, 'coins')$$, 'ตัวเกมรุ่นเก่าส่งเหรียญมาตู้ตั๋ว → ปฏิเสธ');
select pg_temp.fails($$select public.gacha_pull('sakura-ace', 1, 'mcash')$$, 'ส่งเพชรตรงๆ มาตู้ตั๋ว → ปฏิเสธ');
select pg_temp.ok((select mcash from public.profiles where username = 'fern') = 1000, 'ถูกปฏิเสธแล้วไม่เสียเพชร');
select public._grant_qty('00000000-0000-0000-0000-0000000000f8', 'items', 'ticket-b', 3);
do $t$ declare j jsonb; begin
  j := public.gacha_pull('sakura-ace', 1, 'ticket');
  perform pg_temp.ok((j->>'tickets_used')::int = 1 and (j->>'mcash_used')::int = 0 and (j->>'tickets_left')::int = 2 and jsonb_array_length(j->'results') = 1, 'สุ่ม 1: ใช้ตั๋ว 1 ใบ ไม่เสียเพชร');
  j := public.gacha_pull('sakura-ace', 10, 'ticket');
  perform pg_temp.ok((j->>'tickets_used')::int = 2 and (j->>'mcash_used')::int = 8 * 30 and (j->>'mcash')::int = 1000 - 240 and (j->>'tickets_left')::int = 0,
    'สุ่ม 10 มีตั๋ว 2: ใช้ตั๋ว 2 + เพชร 8×30 = 240');
  j := public.gacha_pull('sakura-ace', 10, 'ticket');
  perform pg_temp.ok((j->>'tickets_used')::int = 0 and (j->>'mcash_used')::int = 270, 'ตั๋วหมด สุ่ม 10: ใช้เพชรราคา 10 ครั้ง 270');
  perform pg_temp.ok(not exists (select 1 from jsonb_array_elements(j->'results') r where r->>'kind' <> 'characters'), 'ได้แต่ตัวละคร');
end $t$;
select pg_temp.ok((select qty from public.inventory where user_id = '00000000-0000-0000-0000-0000000000f8' and kind = 'items' and item_id = 'ticket-b') = 0, 'ตั๋วในคลังเหลือ 0');
update public.profiles set mcash = 100 where username = 'fern';
select pg_temp.fails($$select public.gacha_pull('sakuya-up', 10, 'ticket')$$, 'ไม่มีตั๋วและเพชรไม่พอ → สุ่มไม่ได้');
select pg_temp.ok((select mcash from public.profiles where username = 'fern') = 100, 'สุ่มไม่สำเร็จไม่เสียเพชร');

-- ===== แลกตั๋ว =====
update public.profiles set mcash = 1000 where username = 'fern';
do $t$ declare j jsonb; begin
  j := public.buy_ticket('ticket-r', 10);
  perform pg_temp.ok((j->>'cost')::int = 270 and (j->>'qty')::int = 10 and (j->>'mcash')::int = 730, 'แลกตั๋วแดง 10 ใบ = เพชร 270');
  j := public.buy_ticket('ticket-b', 1);
  perform pg_temp.ok((j->>'cost')::int = 30 and (j->>'qty')::int = 1, 'แลกตั๋วฟ้า 1 ใบ = เพชร 30');
  j := public.gacha_pull('sakuya-up', 10, 'ticket');
  perform pg_temp.ok((j->>'tickets_used')::int = 10 and (j->>'mcash_used')::int = 0, 'สุ่ม 10 ด้วยตั๋วแดง 10 ใบ ไม่เสียเพชร');
end $t$;
select pg_temp.fails($$select public.buy_ticket('tea-g', 1)$$, 'แลกไอเทมที่ไม่ใช่ตั๋วไม่ได้');
select pg_temp.fails($$select public.buy_ticket('ticket-r', 5)$$, 'แลกได้ทีละ 1 หรือ 10 ใบ');
select pg_temp.ok((public.get_gacha()->'tickets'->>'ticket-b')::int = 1, 'get_gacha แสดงตั๋วที่มี');
select pg_temp.ok((select b->>'ticket' from jsonb_array_elements(public.get_gacha()->'banners') b where b->>'id' = 'sakuya-up') = 'ticket-r', 'get_gacha แสดงตั๋วของตู้');

-- ===== ตู้ของแต่ง (เหรียญ) =====
select pg_temp.fails($$select public.gacha_pull('cosm-sakura', 1, 'ticket')$$, 'ตู้ของแต่งไม่รับตั๋ว');
select pg_temp.fails($$select public.gacha_pull('cosm-sakura', 1, 'mcash')$$, 'ตู้ของแต่งไม่รับเพชร');
do $t$ declare j jsonb; c0 bigint; begin
  select coins into c0 from public.profiles where username = 'fern';
  j := public.gacha_pull('cosm-sakura', 1, 'coins');
  perform pg_temp.ok((j->>'coins')::bigint = c0 - 500 and (j->'results'->0->>'new')::boolean, 'สุ่มของแต่ง 1 = 500 เหรียญ ได้ของใหม่');
end $t$;
-- ให้มีของในตู้ครบทุกชิ้น → สุ่ม 10 ต้องแปลงเป็นเหรียญทั้งหมด
insert into public.inventory(user_id, kind, item_id, qty)
  select '00000000-0000-0000-0000-0000000000f8', kind, item_id, 1 from public.gacha_pool where banner_id = 'cosm-sakura' and weight > 0
  on conflict (user_id, kind, item_id) do nothing;
select count(*) as inv0 from public.inventory where user_id = '00000000-0000-0000-0000-0000000000f8' \gset
do $t$ declare j jsonb; c0 bigint; v_sum bigint; begin
  select coins into c0 from public.profiles where username = 'fern';
  j := public.gacha_pull('cosm-sakura', 10, 'coins');
  select sum((r->>'converted')::int) into v_sum from jsonb_array_elements(j->'results') r;
  perform pg_temp.ok(not exists (select 1 from jsonb_array_elements(j->'results') r where (r->>'new')::boolean or r->>'converted' is null), 'มีครบแล้ว → ทุกชิ้นถูกแปลง');
  perform pg_temp.ok(v_sum > 0 and (j->>'converted_coins')::bigint = v_sum and (j->>'coins')::bigint = c0 - 4500 + v_sum, 'ได้เหรียญคืนตามราคาขาย: ' || v_sum);
end $t$;
select pg_temp.ok(not exists (select 1 from public.inventory i join public.gacha_pool g on g.kind = i.kind and g.item_id = i.item_id and g.banner_id = 'cosm-sakura'
  where i.user_id = '00000000-0000-0000-0000-0000000000f8' and i.qty > 1), 'ของแต่งซ้ำไม่กองในคลัง (qty ยัง 1)');

-- ===== ร้านรายสัปดาห์ =====
select pg_temp.ok(jsonb_array_length(public.get_weekly_shop()->'items') = 6, 'ร้านรายสัปดาห์มี 6 ชิ้น');
select pg_temp.ok((select array_agg(item_id order by item_id) from public._weekly_list(public.game_week())) =
                  (select array_agg(item_id order by item_id) from public._weekly_list(public.game_week())), 'รายการสัปดาห์เดียวกันคงที่');
select pg_temp.ok((select array_agg(kind || item_id) from public._weekly_list(public.game_week())) is distinct from
                  (select array_agg(kind || item_id) from public._weekly_list(public.game_week() + 7)), 'สัปดาห์หน้าเปลี่ยนรายการ');
select pg_temp.fails($$select public.buy_weekly('backs', 'classic')$$, 'ซื้อของที่ไม่ได้ขายสัปดาห์นี้ไม่ได้');
select pg_temp.fails($$select public.buy_weekly(w.kind, w.item_id) from public._weekly_list(public.game_week()) w limit 1$$, 'มีแล้วซื้อซ้ำไม่ได้');
delete from public.inventory i using public._weekly_list(public.game_week()) w where i.user_id = '00000000-0000-0000-0000-0000000000f8' and i.kind = w.kind and i.item_id = w.item_id;
do $t$ declare j jsonb; w record; c0 bigint; begin
  select * into w from public._weekly_list(public.game_week()) limit 1;
  select coins into c0 from public.profiles where username = 'fern';
  j := public.buy_weekly(w.kind, w.item_id);
  perform pg_temp.ok((j->>'coins')::bigint = c0 - w.price and public._owns('00000000-0000-0000-0000-0000000000f8', w.kind, w.item_id), 'ซื้อจากร้านรายสัปดาห์: หักเหรียญ ' || w.price || ' ได้ของ');
  perform pg_temp.ok((select (x->>'owned')::boolean from jsonb_array_elements(public.get_weekly_shop()->'items') x where x->>'item_id' = w.item_id and x->>'kind' = w.kind), 'ร้านแสดงว่ามีแล้ว');
end $t$;
update public.profiles set coins = 0 where username = 'fern';
select w.kind as wk, w.item_id as wi from public._weekly_list(public.game_week()) w offset 1 limit 1 \gset
select pg_temp.ok(not public._owns('00000000-0000-0000-0000-0000000000f8', :'wk', :'wi'), 'ชิ้นที่ 2 ยังไม่มี');
select pg_temp.fails(format('select public.buy_weekly(%L, %L)', :'wk', :'wi'), 'เหรียญไม่พอซื้อไม่ได้');
\echo '✓ test_v8 ผ่านทั้งหมด'
