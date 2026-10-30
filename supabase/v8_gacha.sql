-- ===================================================================================
-- v8 · ตั๋วสุ่มตัวละคร · ตู้ของแต่ง (สุ่มด้วยเหรียญ) · ร้านของแต่งหมุนเวียนรายสัปดาห์
-- ลำดับรัน: … → v7_stamina.sql → v7_config.sql → v8_gacha.sql → seed_catalog.sql → bp_seed.sql (รันซ้ำได้ ปลอดภัย)
-- - ตู้ตัวละคร (grp = 'char'): ใช้ตั๋ว (ticket) ก่อน ตั๋วไม่พอ → หักเพชรแทน (ticket_mcash ต่อใบ · ticket_mcash10 ต่อ 10 ใบ)
--   client ต้องส่ง p_currency = 'ticket' — ตัวเกมรุ่นเก่าที่ยังส่ง coins/mcash จะถูกปฏิเสธ (กันกดแล้วเสียเพชรโดยไม่รู้ตัว)
-- - ตู้ของแต่ง (grp = 'cosm'): สุ่มด้วยเหรียญ · ได้ของที่มีอยู่แล้ว → แปลงเป็นเหรียญตามราคาขายของระดับนั้นอัตโนมัติ
-- - ร้านรายสัปดาห์: ไม่มีตารางใหม่ — เลือกของจากตู้ของแต่งด้วย md5(ของ + สัปดาห์) · ซื้อได้เฉพาะของในรายการสัปดาห์นี้ที่ยังไม่มี
-- ===================================================================================

alter table public.gacha_banners add column if not exists ticket         text;
alter table public.gacha_banners add column if not exists ticket_mcash   int;
alter table public.gacha_banners add column if not exists ticket_mcash10 int;
alter table public.gacha_banners add column if not exists grp            text not null default 'char';

-- ---------- สุ่มกาชา (ลายเซ็นเดิม) ----------
create or replace function public.gacha_pull(p_banner text, p_count int, p_currency text default 'coins') returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); b public.gacha_banners; v_cost int := 0; v_bal bigint; v_since int; v_i int; v_force text[];
        pk record; v_have int; v_good boolean := false; v_res jsonb := '[]'::jsonb; v_coins bigint; v_mcash bigint; v_cur text;
        v_tk int := 0; v_use int := 0; v_buy int := 0; v_conv bigint := 0; v_sell int;
begin
  if p_count not in (1, 10) then raise exception 'สุ่มได้ครั้งละ 1 หรือ 10 ครั้ง'; end if;
  select * into b from public.gacha_banners where id = p_banner and active;
  if not found then raise exception 'ไม่พบตู้กาชานี้'; end if;
  if not exists (select 1 from public.gacha_pool gp join public.catalog_items ci using (kind, item_id) where gp.banner_id = p_banner and ci.active and gp.weight > 0) then
    raise exception 'ตู้กาชานี้ยังไม่มีของ'; end if;
  perform 1 from public.profiles where id = u for update;
  if b.ticket is not null then
    -- ตู้ตัวละคร: ตั๋วก่อน แล้วเพชร
    if p_currency is distinct from 'ticket' then raise exception 'ตู้นี้ใช้ตั๋วสุ่มแล้ว — รีเฟรชหน้าเกมเพื่ออัปเดตก่อนสุ่ม'; end if;
    select qty into v_tk from public.inventory where user_id = u and kind = 'items' and item_id = b.ticket for update;
    v_tk := coalesce(v_tk, 0); v_use := least(v_tk, p_count); v_buy := p_count - v_use;
    if v_buy > 0 then
      if b.ticket_mcash is null then raise exception 'ตั๋วสุ่มไม่พอ (มี % ใบ)', v_tk; end if;
      v_cost := case when v_buy = 10 and b.ticket_mcash10 is not null then b.ticket_mcash10 else v_buy * b.ticket_mcash end;
      select mcash into v_bal from public.profiles where id = u;
      if v_bal < v_cost then raise exception 'ตั๋วไม่พอและเพชรไม่พอ (ต้องใช้ตั๋ว % ใบ + เพชร %)', v_use, v_cost; end if;
    end if;
    if v_use > 0 then update public.inventory set qty = qty - v_use where user_id = u and kind = 'items' and item_id = b.ticket; end if;
    if v_cost > 0 then perform public._wallet_add(u, 'mcash', -v_cost, 'gacha', p_banner || ':' || p_count); end if;
  else
    if p_currency not in ('coins', 'mcash') then raise exception 'สกุลเงินไม่ถูกต้อง'; end if;
    v_cur := case p_currency when 'coins' then 'เหรียญ' else 'เพชร' end;
    v_cost := case when p_count = 1 then (case p_currency when 'coins' then b.single_coins else b.single_mcash end)
                   else (case p_currency when 'coins' then b.ten_coins else b.ten_mcash end) end;
    if v_cost is null or v_cost <= 0 then raise exception 'ตู้นี้ไม่รับชำระด้วย%', v_cur; end if;
    select case p_currency when 'coins' then coins else mcash end into v_bal from public.profiles where id = u;
    if v_bal < v_cost then raise exception '%ไม่พอ (ต้องใช้ %)', v_cur, v_cost; end if;
    perform public._wallet_add(u, p_currency, -v_cost, 'gacha', p_banner || ':' || p_count);
  end if;
  insert into public.gacha_pity(user_id, banner_id) values (u, p_banner) on conflict do nothing;
  select since_top into v_since from public.gacha_pity where user_id = u and banner_id = p_banner;
  for v_i in 1..p_count loop
    v_force := null;
    if b.pity > 0 and v_since + 1 >= b.pity and exists (select 1 from public._gacha_pick(p_banner, array['legendary'])) then v_force := array['legendary'];
    elsif p_count = 10 and v_i = 10 and not v_good and exists (select 1 from public._gacha_pick(p_banner, array['rare','epic','legendary'])) then v_force := array['rare','epic','legendary'];
    end if;
    select * into pk from public._gacha_pick(p_banner, v_force);
    v_have := public._qty(u, pk.kind, pk.item_id);
    if b.grp = 'cosm' and pk.kind <> 'characters' and v_have >= 1 then
      -- ของแต่งซ้ำ → แปลงเป็นเหรียญ
      v_sell := coalesce((select c.sell_coins from public.catalog_items c where c.kind = pk.kind and c.item_id = pk.item_id), (select sell_coins from public.rarity_config where rarity = pk.rarity), 0);
      v_conv := v_conv + v_sell;
      v_res := v_res || jsonb_build_array(jsonb_build_object('kind', pk.kind, 'item_id', pk.item_id, 'name', pk.name, 'rarity', pk.rarity, 'new', false, 'qty', v_have, 'converted', v_sell));
    else
      insert into public.inventory(user_id, kind, item_id, qty) values (u, pk.kind, pk.item_id, v_have + 1)
      on conflict (user_id, kind, item_id) do update set qty = excluded.qty;
      if v_have = 0 and pk.kind = 'characters' then
        insert into public.user_characters(user_id, character_id) values (u, pk.item_id) on conflict do nothing;
      end if;
      v_res := v_res || jsonb_build_array(jsonb_build_object('kind', pk.kind, 'item_id', pk.item_id, 'name', pk.name, 'rarity', pk.rarity, 'new', v_have = 0, 'qty', v_have + 1));
    end if;
    if pk.rarity in ('rare', 'epic', 'legendary') then v_good := true; end if;
    v_since := case when pk.rarity = 'legendary' then 0 else v_since + 1 end;
  end loop;
  if v_conv > 0 then perform public._wallet_add(u, 'coins', v_conv, 'gacha_dupe', p_banner); end if;
  update public.gacha_pity set since_top = v_since where user_id = u and banner_id = p_banner;
  insert into public.gacha_log(user_id, banner_id, pulls, currency, cost, results)
  values (u, p_banner, p_count, case when b.ticket is not null then 'ticket:' || v_use else p_currency end, v_cost, v_res);
  select coins, mcash into v_coins, v_mcash from public.profiles where id = u;
  return jsonb_build_object('results', v_res, 'coins', v_coins, 'mcash', v_mcash, 'since_top', v_since, 'cost', v_cost, 'currency', p_currency,
    'tickets_used', v_use, 'mcash_used', case when b.ticket is not null then v_cost else 0 end, 'converted_coins', v_conv,
    'tickets_left', case when b.ticket is null then null else v_tk - v_use end);
end $$;

-- ---------- แลกตั๋วด้วยเพชร (ราคาเดียวกับตู้ที่ใช้ตั๋วนั้น) ----------
create or replace function public.buy_ticket(p_id text, p_qty int default 1) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_one int; v_ten int; v_cost int; v_have bigint; v_left int;
begin
  if p_qty not in (1, 10) then raise exception 'แลกได้ครั้งละ 1 หรือ 10 ใบ'; end if;
  select min(ticket_mcash), min(ticket_mcash10) into v_one, v_ten from public.gacha_banners where active and ticket = p_id;
  if v_one is null then raise exception 'ไม่มีตั๋วนี้ให้แลก'; end if;
  v_cost := case when p_qty = 10 then coalesce(v_ten, v_one * 10) else v_one end;
  select mcash into v_have from public.profiles where id = u for update;
  if v_have < v_cost then raise exception 'เพชรไม่พอ (มี % / ต้องใช้ %)', v_have, v_cost; end if;
  perform public._wallet_add(u, 'mcash', -v_cost, 'ticket', p_id || 'x' || p_qty);
  perform public._grant_qty(u, 'items', p_id, p_qty);
  select qty into v_left from public.inventory where user_id = u and kind = 'items' and item_id = p_id;
  return jsonb_build_object('ticket', p_id, 'bought', p_qty, 'cost', v_cost, 'qty', v_left, 'mcash', v_have - v_cost);
end $$;

-- ---------- ข้อมูลหน้ากาชา (เพิ่ม: ตั๋ว · กลุ่มตู้ · ตั๋วที่มี) ----------
create or replace function public.get_gacha() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  return jsonb_build_object(
    'rarities', coalesce((select jsonb_object_agg(r.rarity, jsonb_build_object('name', r.name, 'sell_coins', r.sell_coins, 'sort', r.sort)) from public.rarity_config r), '{}'),
    'tickets', coalesce((select jsonb_object_agg(i.item_id, i.qty) from public.inventory i where i.user_id = u and i.kind = 'items' and i.item_id like 'ticket-%'), '{}'),
    'banners', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'pity', b.pity, 'grp', b.grp,
        'ticket', b.ticket, 'ticket_mcash', b.ticket_mcash, 'ticket_mcash10', b.ticket_mcash10,
        'single', jsonb_build_object('coins', b.single_coins, 'mcash', b.single_mcash),
        'ten', jsonb_build_object('coins', b.ten_coins, 'mcash', b.ten_mcash),
        'since_top', coalesce((select since_top from public.gacha_pity p where p.user_id = u and p.banner_id = b.id), 0),
        'items', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'item_id', x.item_id, 'name', x.name, 'rarity', x.rarity,
                   'pct', round(x.weight * 100.0 / nullif(x.tot, 0), 3)) order by x.weight desc, x.name)
                 from (select gp.kind, gp.item_id, ci.name, ci.rarity, gp.weight, sum(gp.weight) over () tot
                       from public.gacha_pool gp join public.catalog_items ci using (kind, item_id) where gp.banner_id = b.id and ci.active and gp.weight > 0) x), '[]'))
      order by b.sort, b.id) from public.gacha_banners b where b.active), '[]'));
end $$;

-- ---------- ร้านของแต่งรายสัปดาห์ ----------
create or replace function public._weekly_list(p_week date) returns table(kind text, item_id text, name text, rarity text, price int)
language sql stable security definer set search_path = public as $$
  select gp.kind, gp.item_id, ci.name, ci.rarity, coalesce((public._cfg('weekly_shop') -> 'price' ->> ci.rarity)::int, 2000)
  from public.gacha_pool gp join public.catalog_items ci using (kind, item_id)
  where gp.banner_id = coalesce(public._cfg('weekly_shop') ->> 'banner', 'cosm-sakura') and gp.weight > 0 and ci.active and not ci.is_default
  order by md5(gp.kind || ':' || gp.item_id || ':' || p_week::text)
  limit coalesce((public._cfg('weekly_shop') ->> 'slots')::int, 6) $$;

create or replace function public.get_weekly_shop() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_week date := public.game_week();
begin
  return jsonb_build_object('week', v_week, 'resets_at', public._day_start(v_week + 7),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', w.kind, 'item_id', w.item_id, 'name', w.name, 'rarity', w.rarity, 'price', w.price,
      'owned', public._owns(u, w.kind, w.item_id))) from public._weekly_list(v_week) w), '[]'));
end $$;

create or replace function public.buy_weekly(p_kind text, p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); w record; v_coins bigint;
begin
  select * into w from public._weekly_list(public.game_week()) x where x.kind = p_kind and x.item_id = p_id;
  if not found then raise exception 'ของชิ้นนี้ไม่ได้ขายในสัปดาห์นี้'; end if;
  perform 1 from public.profiles where id = u for update;
  if public._owns(u, p_kind, p_id) then raise exception 'มีของชิ้นนี้แล้ว'; end if;
  select coins into v_coins from public.profiles where id = u;
  if v_coins < w.price then raise exception 'เหรียญไม่พอ (ต้องใช้ %)', w.price; end if;
  v_coins := public._wallet_add(u, 'coins', -w.price, 'weekly_shop', p_kind || ':' || p_id);
  perform public._grant_item(u, p_kind, p_id);
  return jsonb_build_object('kind', p_kind, 'item_id', p_id, 'price', w.price, 'coins', v_coins);
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._weekly_list(date) from public, anon, authenticated;
revoke all on function public.buy_ticket(text, int), public.get_weekly_shop(), public.buy_weekly(text, text) from public, anon;
grant execute on function public.buy_ticket(text, int), public.get_weekly_shop(), public.buy_weekly(text, text), public.gacha_pull(text, int, text), public.get_gacha() to authenticated;
