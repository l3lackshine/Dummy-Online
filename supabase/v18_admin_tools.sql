-- v18_admin_tools.sql — หน้าแอดมินส่วนที่เหลือ (โรดแมพข้อ 11): ก. ตั้งตู้กาชา
-- รันหลัง v17_events_admin.sql · รันซ้ำได้ ปลอดภัย · แล้วรัน seed_catalog.sql ตามได้ตามปกติ
-- ตู้กาชามี "เจ้าของ" 2 แบบ:
--   ตู้จากไฟล์ (Assets/Shop/Gasha/<id>/Config.config → seed_catalog.sql) — admin_owned = false · seed แก้ทับได้เหมือนเดิม
--   ตู้ของแอดมิน (สร้าง หรือแก้ตู้จากไฟล์ในหน้าแอดมิน) — admin_owned = true · seed ข้ามตู้นี้ · ค่าตั้งอยู่ใน admin_cfg
-- โอกาสของตู้แอดมิน: แอดมินใส่ % ต่อระดับ (รวม 100%) + เลือกของในตู้ + ของเรทอัป
--   น้ำหนักในระดับเดียวกันแบ่งเท่ากัน · ของเรทอัปได้ส่วนแบ่ง × ตัวคูณ · ผลรวมของระดับเท่ากับ % ที่ใส่พอดี (ไม่เพี้ยนตามตัวคูณ)
-- Public (แอดมิน): admin_gacha_data() · admin_save_banner(p) · admin_delete_banner(id)
-- ใช้ภายใน: _gacha_admin_rebuild(id) · _gacha_rebuild_admin_pools() (seed_catalog.sql เรียกตัวหลังตอนท้าย)
-- Extend: ช่องใหม่ของตู้ = เพิ่มคอลัมน์ + อ่านใน admin_save_banner + ส่งใน admin_gacha_data / get_gacha

-- ================= ตาราง =================
alter table public.gacha_banners add column if not exists admin_owned boolean not null default false;
alter table public.gacha_banners add column if not exists admin_cfg   jsonb   not null default '{}';
alter table public.gacha_banners add column if not exists image_url   text    not null default '';

-- ================= ตู้กาชา: คำนวณน้ำหนัก =================
-- หน่วยโอกาสในฐานข้อมูล: 1 = 0.0001% (ผลรวมทั้งตู้ 1,000,000 = 100%) · admin_cfg.rates เก็บหน่วย 0.01% (รวม 10,000) เหมือน rarityWeights ในไฟล์
-- คำนวณใหม่ทั้งตู้ทุกครั้ง: ตั้งของเดิมเป็น 0 ก่อน (ไม่ลบแถว — เหมือน seed) แล้วใส่ค่าใหม่
create or replace function public._gacha_admin_rebuild(p_banner text) returns void
language plpgsql security definer set search_path = public as $$
declare v_cfg jsonb;
begin
  select admin_cfg into v_cfg from public.gacha_banners where id = p_banner and admin_owned;
  if v_cfg is null then return; end if;
  update public.gacha_pool set weight = 0 where banner_id = p_banner;
  insert into public.gacha_pool(banner_id, kind, item_id, weight)
  with chosen as (
    select split_part(x, ':', 1) as kind, split_part(x, ':', 2) as item_id
    from jsonb_array_elements_text(coalesce(v_cfg -> 'items', '[]')) x
  ), shares as (
    -- ส่วนแบ่งของแต่ละชิ้น: ปกติ 1 · เรทอัป = ตัวคูณ
    select c.kind, c.item_id, ci.rarity,
           case when coalesce(v_cfg -> 'rate_up', '[]') ? (c.kind || ':' || c.item_id)
                then greatest(1, coalesce((v_cfg ->> 'rate_up_mult')::int, 1)) else 1 end as share
    from chosen c join public.catalog_items ci on ci.kind = c.kind and ci.item_id = c.item_id
    where ci.active
  ), tiers as (
    select s.*, coalesce((v_cfg -> 'rates' ->> s.rarity)::bigint, 0) * 100 as tier_weight,
           sum(s.share) over (partition by s.rarity) as share_total,
           row_number() over (partition by s.rarity order by s.share desc, s.kind, s.item_id) as rn
    from shares s
  ), base as (
    select t.*, floor(t.tier_weight * t.share / t.share_total)::bigint as base_weight from tiers t
  ), spread as (
    -- เศษจากการหารแจกชิ้นละ 1 ให้ชิ้นแรก ๆ → ผลรวมของระดับเท่ากับ % ที่ตั้งพอดี
    select b.*, b.tier_weight - sum(b.base_weight) over (partition by b.rarity) as remainder from base b
  )
  select p_banner, s.kind, s.item_id, (s.base_weight + case when s.rn <= s.remainder then 1 else 0 end)::int
  from spread s where s.tier_weight > 0
  on conflict (banner_id, kind, item_id) do update set weight = excluded.weight;
end $$;

-- seed_catalog.sql เรียกตอนท้าย: seed เขียนของในตู้จากไฟล์ทับไปแล้ว → คืนตู้ของแอดมินกลับเป็นค่าที่แอดมินตั้ง
create or replace function public._gacha_rebuild_admin_pools() returns void
language plpgsql security definer set search_path = public as $$
declare v_id text;
begin
  for v_id in select id from public.gacha_banners where admin_owned loop
    perform public._gacha_admin_rebuild(v_id);
  end loop;
end $$;

-- ================= ตู้กาชา: ตรวจค่าที่แอดมินกรอก =================
-- % ต่อระดับ → หน่วย 0.01% · ทศนิยมได้ 2 ตำแหน่ง · รวมต้องเท่ากับ 100% พอดี
create or replace function public._clean_rates(p_rates jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r record; v_text text; v_pct numeric; v_out jsonb := '{}'; v_total int := 0;
begin
  for r in select rarity, name from public.rarity_config order by sort loop
    v_text := trim(coalesce(p_rates ->> r.rarity, ''));
    if v_text = '' then v_text := '0'; end if;
    if v_text !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'โอกาส % ต้องเป็นตัวเลข 0–100 (ทศนิยมไม่เกิน 2 ตำแหน่ง)', r.name;
    end if;
    v_pct := v_text::numeric;
    if v_pct > 100 then raise exception 'โอกาส % เกิน 100%%', r.name; end if;
    v_out := v_out || jsonb_build_object(r.rarity, (v_pct * 100)::int);
    v_total := v_total + (v_pct * 100)::int;
  end loop;
  if v_total <> 10000 then
    raise exception 'โอกาสทุกระดับรวมกันต้องเท่ากับ 100%% (ตอนนี้ % %%)', round(v_total / 100.0, 2);
  end if;
  return v_out;
end $$;

-- ของในตู้: รายการ "ชนิด:รหัส" · ต้องมีในแคตตาล็อก เปิดใช้อยู่ และไม่ใช่ของเริ่มต้น (ทุกคนมีอยู่แล้ว)
create or replace function public._clean_pool_items(p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_key text; v_out jsonb := '[]';
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then return '[]'; end if;
  for v_key in select distinct x from jsonb_array_elements_text(p_items) x loop
    if not exists (select 1 from public.catalog_items ci
                   where ci.kind || ':' || ci.item_id = v_key and ci.active and not ci.is_default) then
      raise exception 'ไม่มีของรหัส % ในแคตตาล็อก (หรือเป็นของเริ่มต้น)', v_key;
    end if;
    v_out := v_out || to_jsonb(v_key);
  end loop;
  return v_out;
end $$;

-- ================= ตู้กาชา: ฝั่งแอดมิน =================
-- ข้อมูลหน้าแท็บตู้กาชา: ทุกตู้ (รวมที่ปิดอยู่) + โอกาสต่อระดับปัจจุบัน + ของในแคตตาล็อก + ตั๋ว
create or replace function public.admin_gacha_data() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return jsonb_build_object(
    'rarities', coalesce((select jsonb_agg(jsonb_build_object('rarity', r.rarity, 'name', r.name) order by r.sort desc)
                          from public.rarity_config r), '[]'),
    'tickets', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(public._eco() -> 'items') k where k like 'ticket-%'), '[]'),
    'catalog', coalesce((select jsonb_agg(jsonb_build_object('key', ci.kind || ':' || ci.item_id, 'kind', ci.kind, 'name', ci.name, 'rarity', ci.rarity)
                                          order by ci.kind, ci.rarity, ci.name)
                         from public.catalog_items ci where ci.active and not ci.is_default), '[]'),
    'banners', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'image_url', b.image_url, 'grp', b.grp, 'pity', b.pity,
        'sort', b.sort, 'active', b.active, 'admin_owned', b.admin_owned, 'admin_cfg', b.admin_cfg,
        'ticket', b.ticket, 'ticket_mcash', b.ticket_mcash, 'ticket_mcash10', b.ticket_mcash10,
        'single_coins', b.single_coins, 'single_mcash', b.single_mcash, 'ten_coins', b.ten_coins, 'ten_mcash', b.ten_mcash,
        'items', coalesce((select jsonb_agg(gp.kind || ':' || gp.item_id order by gp.kind, gp.item_id)
                           from public.gacha_pool gp where gp.banner_id = b.id and gp.weight > 0), '[]'),
        -- โอกาสต่อระดับตอนนี้ (หน่วย 0.01%) — ใช้เติมฟอร์มตอนแก้ตู้จากไฟล์ครั้งแรก
        'rates', coalesce((select jsonb_object_agg(x.rarity, x.units) from (
                   select ci.rarity, round(sum(gp.weight) * 10000.0 / nullif(sum(sum(gp.weight)) over (), 0))::int as units
                   from public.gacha_pool gp join public.catalog_items ci using (kind, item_id)
                   where gp.banner_id = b.id and gp.weight > 0 and ci.active group by ci.rarity) x), '{}'),
        'events', coalesce((select jsonb_agg(e.name order by e.starts_at) from public.events e where b.id = any(e.banner_ids)), '[]'))
      order by b.sort, b.id) from public.gacha_banners b), '[]'));
end $$;

-- บันทึกตู้ (ไม่มี id หรือ id ใหม่ = สร้าง · id เดิม = แก้ · ตู้จากไฟล์ที่ถูกแก้จะกลายเป็นตู้ของแอดมิน)
-- p: id name description image_url grp pay('ticket'|'coins') ticket ticket_mcash ticket_mcash10
--    single_coins ten_coins single_mcash ten_mcash pity sort active rates{rarity:%} items[] rate_up[] rate_up_mult
create or replace function public.admin_save_banner(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_id text; v_name text; v_grp text; v_pay text; v_ticket text;
        v_rates jsonb; v_items jsonb; v_rate_up jsonb; v_rarity text; v_cfg jsonb;
        v_tk1 int; v_tk10 int; v_c1 int; v_c10 int; v_m1 int; v_m10 int;
begin
  v_id := public._clean_id(p ->> 'id', 'bn_');
  v_name := public._clean_text(p ->> 'name', 40);
  if v_name = '' then raise exception 'ใส่ชื่อตู้'; end if;
  v_grp := coalesce(nullif(trim(p ->> 'grp'), ''), 'char');
  if v_grp not in ('char', 'cosm') then raise exception 'หมวดตู้ต้องเป็น char หรือ cosm'; end if;

  -- ราคา: ตู้ตั๋ว (ขาดตั๋วหักเพชร) หรือ ตู้เหรียญ/เพชร · ราคาที่ใส่ต้องมากกว่า 0 · เว้นว่าง = ไม่รับ
  v_pay := coalesce(nullif(trim(p ->> 'pay'), ''), 'ticket');
  if v_pay = 'ticket' then
    v_ticket := trim(coalesce(p ->> 'ticket', ''));
    if v_ticket !~ '^ticket-' or not (public._eco() -> 'items') ? v_ticket then raise exception 'เลือกตั๋วที่ใช้สุ่ม'; end if;
    v_tk1 := public._clean_int(p ->> 'ticket_mcash', 'เพชรแทนตั๋ว 1 ใบ', 1, 100000, null);
    v_tk10 := public._clean_int(p ->> 'ticket_mcash10', 'เพชรแทนตั๋ว 10 ใบ', 1, 1000000, null);
  elsif v_pay = 'coins' then
    v_c1 := public._clean_int(p ->> 'single_coins', 'ราคาเหรียญสุ่ม 1 ครั้ง', 1, 10000000, null);
    v_c10 := public._clean_int(p ->> 'ten_coins', 'ราคาเหรียญสุ่ม 10 ครั้ง', 1, 100000000, null);
    v_m1 := public._clean_int(p ->> 'single_mcash', 'ราคาเพชรสุ่ม 1 ครั้ง', 1, 100000, null);
    v_m10 := public._clean_int(p ->> 'ten_mcash', 'ราคาเพชรสุ่ม 10 ครั้ง', 1, 1000000, null);
    if coalesce(v_c1, v_c10, v_m1, v_m10) is null then raise exception 'ตั้งราคาอย่างน้อย 1 แบบ'; end if;
  else
    raise exception 'วิธีจ่ายต้องเป็น ticket หรือ coins';
  end if;

  -- โอกาส + ของในตู้: ระดับที่ตั้ง % ไว้ต้องมีของอย่างน้อย 1 ชิ้น (ไม่งั้น % ของระดับนั้นหายไปเฉย ๆ)
  v_rates := public._clean_rates(p -> 'rates');
  v_items := public._clean_pool_items(p -> 'items');
  if jsonb_array_length(v_items) = 0 then raise exception 'เลือกของในตู้อย่างน้อย 1 ชิ้น'; end if;
  for v_rarity in select key from jsonb_each_text(v_rates) where value::int > 0 loop
    if not exists (select 1 from jsonb_array_elements_text(v_items) x join public.catalog_items ci on ci.kind || ':' || ci.item_id = x
                   where ci.rarity = v_rarity) then
      raise exception 'ระดับ % ตั้งโอกาสไว้แต่ยังไม่ได้เลือกของระดับนี้', (select name from public.rarity_config where rarity = v_rarity);
    end if;
  end loop;
  select coalesce(jsonb_agg(x), '[]') into v_rate_up
  from jsonb_array_elements_text(coalesce(public._clean_pool_items(p -> 'rate_up'), '[]')) x where v_items ? x;
  v_cfg := jsonb_build_object('rates', v_rates, 'items', v_items, 'rate_up', v_rate_up,
                              'rate_up_mult', public._clean_int(p ->> 'rate_up_mult', 'ตัวคูณเรทอัป', 1, 20, 1));

  insert into public.gacha_banners(id, name, description, image_url, grp, ticket, ticket_mcash, ticket_mcash10,
                                   single_coins, ten_coins, single_mcash, ten_mcash, pity, sort, active, admin_owned, admin_cfg)
  values (v_id, v_name, public._clean_text(p ->> 'description', 300), public._clean_url(p ->> 'image_url'), v_grp,
          case when v_pay = 'ticket' then v_ticket end, v_tk1, v_tk10, v_c1, v_c10, v_m1, v_m10,
          public._clean_int(p ->> 'pity', 'การันตี SSR', 0, 300, 0), public._clean_int(p ->> 'sort', 'ลำดับ', -999, 999, 0),
          coalesce((p ->> 'active')::boolean, true), true, v_cfg)
  on conflict (id) do update set name = excluded.name, description = excluded.description, image_url = excluded.image_url,
    grp = excluded.grp, ticket = excluded.ticket, ticket_mcash = excluded.ticket_mcash, ticket_mcash10 = excluded.ticket_mcash10,
    single_coins = excluded.single_coins, ten_coins = excluded.ten_coins, single_mcash = excluded.single_mcash,
    ten_mcash = excluded.ten_mcash, pity = excluded.pity, sort = excluded.sort, active = excluded.active,
    admin_owned = true, admin_cfg = excluded.admin_cfg;
  perform public._gacha_admin_rebuild(v_id);
  perform public._admin_log(a, 'save_banner', v_id, p);
  return (select to_jsonb(b) from public.gacha_banners b where b.id = v_id);
end $$;

-- ลบได้เฉพาะตู้ของแอดมิน (ตู้จากไฟล์ seed จะสร้างกลับมาเอง — ให้ปิดใช้แทน) · ถอดออกจากอีเวนต์ที่ผูกไว้ด้วย
-- การันตีสะสมของผู้เล่นในตู้นี้หายไปด้วย (gacha_pity ลบตาม) · ประวัติการสุ่ม (gacha_log) ยังอยู่
create or replace function public.admin_delete_banner(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_row jsonb;
begin
  if exists (select 1 from public.gacha_banners where id = p_id and not admin_owned) then
    raise exception 'ตู้นี้มาจากไฟล์ของเกม ลบไม่ได้ — ปิดใช้แทน';
  end if;
  update public.events set banner_ids = array_remove(banner_ids, p_id) where p_id = any(banner_ids);
  delete from public.gacha_banners where id = p_id returning to_jsonb(gacha_banners.*) into v_row;
  if v_row is null then raise exception 'ไม่พบตู้นี้'; end if;
  perform public._admin_log(a, 'delete_banner', p_id, v_row);
  return jsonb_build_object('deleted', p_id);
end $$;

-- ================= ตู้กาชา: ฝั่งผู้เล่น =================
-- คัดลอกจาก v17_events_admin.sql ทั้งฟังก์ชัน ต่างกันแค่บรรทัดที่มีป้าย "v18" (ส่งลิงก์รูปแบนเนอร์) — แก้ get_gacha ในอนาคต ให้เริ่มจากไฟล์นี้
create or replace function public.get_gacha() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  return jsonb_build_object(
    'rarities', coalesce((select jsonb_object_agg(r.rarity, jsonb_build_object('name', r.name, 'sell_coins', r.sell_coins, 'sort', r.sort)) from public.rarity_config r), '{}'),
    'tickets', coalesce((select jsonb_object_agg(i.item_id, i.qty) from public.inventory i where i.user_id = u and i.kind = 'items' and i.item_id like 'ticket-%'), '{}'),
    'banners', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'pity', b.pity, 'grp', b.grp,
        'image_url', b.image_url,   -- v18: ลิงก์รูปแบนเนอร์จากหน้าแอดมิน (ว่าง = ใช้รูปในไฟล์ของเกม)
        'ticket', b.ticket, 'ticket_mcash', b.ticket_mcash, 'ticket_mcash10', b.ticket_mcash10,
        'single', jsonb_build_object('coins', b.single_coins, 'mcash', b.single_mcash),
        'ten', jsonb_build_object('coins', b.ten_coins, 'mcash', b.ten_mcash),
        'since_top', coalesce((select since_top from public.gacha_pity p where p.user_id = u and p.banner_id = b.id), 0),
        'items', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'item_id', x.item_id, 'name', x.name, 'rarity', x.rarity,
                   'pct', round(x.weight * 100.0 / nullif(x.tot, 0), 3)) order by x.weight desc, x.name)
                 from (select gp.kind, gp.item_id, ci.name, ci.rarity, gp.weight, sum(gp.weight) over () tot
                       from public.gacha_pool gp join public.catalog_items ci using (kind, item_id) where gp.banner_id = b.id and ci.active and gp.weight > 0) x), '[]'))
      order by b.sort, b.id) from public.gacha_banners b where b.active and public._banner_open(b.id)), '[]'));   -- v17: ตู้อีเวนต์ขึ้นเฉพาะช่วงอีเวนต์
end $$;

-- ================= สิทธิ์ =================
revoke all on function
  public._gacha_admin_rebuild(text), public._gacha_rebuild_admin_pools(), public._clean_rates(jsonb), public._clean_pool_items(jsonb)
from public, anon, authenticated;
revoke all on function
  public.admin_gacha_data(), public.admin_save_banner(jsonb), public.admin_delete_banner(text)
from public, anon;
grant execute on function
  public.admin_gacha_data(), public.admin_save_banner(jsonb), public.admin_delete_banner(text)
to authenticated;
