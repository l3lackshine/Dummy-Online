-- ===================================================================================
-- v9 · แบทเทิลพาสส่วนเสริม (แบบ Endfield): ตั๋วพักร้อน · ภารกิจเร่ง · ภารกิจระยะยาว · กล่องเลือกของ
-- ลำดับรัน: … → v8_gacha.sql → v9_bp_extra.sql → seed_catalog.sql → v7_config.sql → bp_seed.sql (รันซ้ำได้ ปลอดภัย)
-- - ตั๋วพักร้อน: วันที่ไม่ได้รับโบนัสรายวัน (ในฤดู) ได้ 1 ใบ สะสมสูงสุดตาม exp_cfg.vacation.cap (4)
--   รับโบนัสรายวันแล้วใช้อัตโนมัติ 1 ใบ → EXP แบทเทิลพาสจากโบนัสรายวัน ×2 · วันที่รับล่าสุดดูจาก quest_bonus (ไม่มีตารางใหม่)
-- - ภารกิจเร่ง: exp_cfg.speedup = {days, missions[]} เปิด N วันสุดท้ายของฤดู · นับจากตาที่เล่นในช่วงนั้น · รับได้ครั้งเดียวต่อฤดู
-- - ภารกิจระยะยาว: game_config.bp_horizon = missions[] ถาวร ไม่รีเซ็ตข้ามฤดู · นับตลอดอายุบัญชี · EXP เข้าฤดูปัจจุบัน
-- - กล่องเลือกของ: ไอเทม items:crate-* · ตัวเลือกอยู่ที่ game_config.economy.items.<id>.crate (ของตายตัว)
--   หรือ .shards = {rarity, qty} (เลือกเศษตัวละครระดับนั้น 1 ตัว) · เปิดแล้วเลือก 1 อย่าง
-- - เศษตัวละคร: inventory kind 'shards' item_id = ตัวละคร · ครบ 50 ชิ้น → ได้ตัวละครนั้นทันที (มีแล้ว = ตัวซ้ำไว้อัพดาว)
-- - ร้านประจำสัปดาห์ขายเศษ: game_config.weekly_shop.shards = ช่อง [{slot, rarity, qty, coins|mcash}] สุ่มตัวละครทุกสัปดาห์ ช่องละ 1 ครั้ง/สัปดาห์
-- ===================================================================================

alter table public.user_bp  add column if not exists vac_tags      int   not null default 0;
alter table public.user_bp  add column if not exists speed_claimed jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists horizon       jsonb not null default '[]'::jsonb;   -- ภารกิจระยะยาวที่รับแล้ว (ถาวร)
alter table public.profiles add column if not exists weekly_shards jsonb not null default '{}'::jsonb;   -- {"week": "...", "bought": ["sh-r", ...]} ร้านเศษประจำสัปดาห์

-- ---------- ตัวนับสำหรับภารกิจ (ช่วงเวลาใดก็ได้) ----------
create or replace function public._bp_metric(p_user uuid, p_metric text, p_game text, p_from timestamptz, p_to timestamptz) returns int
language plpgsql stable security definer set search_path = public as $$
declare v bigint := 0;
begin
  if p_metric = 'login' then
    select count(*) into v from public.login_days where user_id = p_user and day >= public.game_day(p_from) and day < public.game_day(p_to) + 1;
  elsif p_metric = 'charlv' then
    select coalesce(max(level), 0) into v from public.user_characters where user_id = p_user;
  elsif p_metric = 'chars' then
    select count(*) into v from public.user_characters where user_id = p_user;
  else
    select case p_metric
      when 'play'  then count(*)
      when 'win'   then count(*) filter (where result = 'win')
      when 'coins' then coalesce(sum(greatest(coin_delta + bonus, 0)), 0)
      when 'rules' then count(distinct game_id)
      when 'days'  then count(distinct public.game_day(played_at))
      when 'melds' then coalesce(sum(melds), 0)
      when 'knock' then count(*) filter (where knock)
      else 0 end
    into v from public.game_log
    where user_id = p_user and played_at >= p_from and played_at < p_to and not practice and (p_game is null or game_id = p_game);
  end if;
  return least(coalesce(v, 0), 2147483647)::int;
end $$;

-- ---------- ตั๋วพักร้อน: จำนวนตั๋วถ้ารับโบนัสรายวันตอนนี้ (ยังไม่หัก) ----------
create or replace function public._vac_tags(p_user uuid, s public.bp_seasons) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_cap int := coalesce((s.exp_cfg #>> '{vacation,cap}')::int, 0); v_have int; v_today date := public.game_day(); v_base date; v_miss int;
begin
  if s.id is null or v_cap <= 0 then return 0; end if;
  select coalesce(vac_tags, 0) into v_have from public.user_bp where user_id = p_user and season_id = s.id;
  -- วันอ้างอิง = วันล่าสุดที่รับโบนัสรายวัน · ไม่ก่อนวันเริ่มฤดู และไม่ก่อนวันสมัคร (คนใหม่ไม่ได้ตั๋วฟรี)
  select greatest(coalesce((select max(period_key) from public.quest_bonus where user_id = p_user and period = 'daily'), '-infinity'::date),
                  public.game_day(s.starts_at) - 1,
                  (select public.game_day(created_at) - 1 from public.profiles where id = p_user)) into v_base;
  v_miss := greatest(0, v_today - v_base - 1);
  return least(v_cap, coalesce(v_have, 0) + v_miss);
end $$;

-- ---------- รับโบนัสรายวัน/รายสัปดาห์ (ลายเซ็นเดิม) + ใช้ตั๋วพักร้อน ----------
create or replace function public.claim_quest_bonus(p_period text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_key date; v_blk jsonb; v_amt bigint; v_m int; v_bp int := 0; v_base int;
        s public.bp_seasons := public._bp_season(); v_tags int := 0; v_used boolean := false;
begin
  if p_period not in ('daily','weekly') then raise exception 'ช่วงเวลาไม่ถูกต้อง'; end if;
  v_key := case p_period when 'daily' then public.game_day() else public.game_week() end;
  perform 1 from public.profiles where id = u for update;
  v_blk := public._quest_block(u, p_period);
  if not (v_blk->'bonus'->>'ready')::boolean then raise exception 'ยังรับโบนัสไม่ได้'; end if;
  v_amt := (v_blk->'bonus'->>'coins')::bigint; v_m := (v_blk->'bonus'->>'mcash')::int; v_base := (v_blk->'bonus'->>'bp')::int;
  if v_amt > 0 then perform public._wallet_add(u, 'coins', v_amt, 'quest_bonus', p_period || ':' || v_key); end if;
  if v_m > 0 then perform public._wallet_add(u, 'mcash', v_m, 'quest_bonus', p_period || ':' || v_key); end if;
  if p_period = 'daily' and s.id is not null then
    insert into public.user_bp(user_id, season_id) values (u, s.id) on conflict do nothing;
    perform 1 from public.user_bp where user_id = u and season_id = s.id for update;
    v_tags := public._vac_tags(u, s);
    if v_tags > 0 and v_base > 0 then v_used := true; v_tags := v_tags - 1; end if;
    update public.user_bp set vac_tags = v_tags where user_id = u and season_id = s.id;
  end if;
  v_bp := public._bp_add(u, v_base * case when v_used then 2 else 1 end);
  insert into public.quest_bonus(user_id, period, period_key, coins, mcash, bp) values (u, p_period, v_key, v_amt, v_m, v_bp);
  return jsonb_build_object('coins', v_amt, 'mcash', v_m, 'bp', v_bp, 'vacation_used', v_used, 'vacation_left', v_tags);
end $$;

-- ---------- รายการภารกิจเร่ง / ระยะยาว พร้อมความคืบหน้า ----------
create or replace function public._bp_missions(p_user uuid, s public.bp_seasons) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_days int := coalesce((s.exp_cfg #>> '{speedup,days}')::int, 7); v_open timestamptz; v_sc jsonb; v_hc jsonb;
begin
  select coalesce(horizon, '[]') into v_hc from public.profiles where id = p_user;
  if s.id is not null then
    v_open := s.ends_at - make_interval(days => v_days);
    select coalesce(speed_claimed, '[]') into v_sc from public.user_bp where user_id = p_user and season_id = s.id;
  end if;
  return jsonb_build_object(
    'speedup', case when s.id is null then null else jsonb_build_object('opens_at', v_open, 'open', now() >= v_open,
      'missions', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'desc', m->>'desc', 'icon', m->>'icon',
          'target', (m->>'target')::int, 'bp', (m->>'bp')::int, 'claimed', coalesce(v_sc, '[]') @> to_jsonb(m->>'id'),
          'progress', case when now() < v_open then 0 else least((m->>'target')::int, public._bp_metric(p_user, m->>'metric', m->>'game', v_open, s.ends_at)) end)
          order by o) from jsonb_array_elements(coalesce(s.exp_cfg #> '{speedup,missions}', '[]')) with ordinality as t(m, o)), '[]')) end,
    'horizon', coalesce((select jsonb_agg(jsonb_build_object('id', m->>'id', 'name', m->>'name', 'desc', m->>'desc', 'icon', m->>'icon',
          'target', (m->>'target')::int, 'bp', (m->>'bp')::int, 'claimed', v_hc @> to_jsonb(m->>'id'),
          'progress', least((m->>'target')::int, public._bp_metric(p_user, m->>'metric', m->>'game', '-infinity', 'infinity')))
          order by o) from jsonb_array_elements(coalesce(public._cfg('bp_horizon'), '[]')) with ordinality as t(m, o)), '[]'));
end $$;

-- ---------- ข้อมูลแบทเทิลพาส (เพิ่ม: ตั๋วพักร้อน · ภารกิจ) ----------
create or replace function public.get_bp() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); s public.bp_seasons := public._bp_season(); ub public.user_bp;
begin
  if s.id is null then return jsonb_build_object('season', null, 'missions', public._bp_missions(u, s)); end if;
  insert into public.user_bp(user_id, season_id) values (u, s.id) on conflict do nothing;
  select * into ub from public.user_bp where user_id = u and season_id = s.id;
  return jsonb_build_object(
    'season', jsonb_build_object('id', s.id, 'name', s.name, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'level_exp', s.level_exp,
      'max_level', s.max_level, 'gem_cost', s.gem_cost, 'premium_open', s.premium_open, 'cycle_coins', s.cycle_coins, 'exp_cfg', s.exp_cfg - 'speedup'),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('level', r.level, 'track', r.track, 'coins', r.coins, 'mcash', r.mcash,
      'item_kind', r.item_kind, 'item_id', r.item_id, 'qty', r.qty, 'preview', r.preview) order by r.level, r.track) from public.bp_rewards r where r.season_id = s.id), '[]'),
    'me', jsonb_build_object('exp', ub.exp, 'gem', ub.gem, 'premium', ub.premium, 'claimed', ub.claimed, 'cycle_claimed', ub.cycle_claimed,
      'vacation', public._vac_tags(u, s), 'vacation_cap', coalesce((s.exp_cfg #>> '{vacation,cap}')::int, 0),
      'daily_claimed', exists (select 1 from public.quest_bonus where user_id = u and period = 'daily' and period_key = public.game_day())),
    'missions', public._bp_missions(u, s),
    'now', now());
end $$;

-- ---------- รับรางวัลภารกิจ: p_kind = 'speedup' | 'horizon' ----------
create or replace function public.claim_bp_mission(p_kind text, p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); s public.bp_seasons := public._bp_season(); v_ms jsonb; m jsonb; v_bp int;
begin
  if s.id is null then raise exception 'ตอนนี้ไม่มีฤดูแบทเทิลพาส — รอฤดูใหม่แล้วค่อยรับ'; end if;
  if p_kind not in ('speedup', 'horizon') then raise exception 'ประเภทภารกิจไม่ถูกต้อง'; end if;
  perform 1 from public.profiles where id = u for update;
  insert into public.user_bp(user_id, season_id) values (u, s.id) on conflict do nothing;
  perform 1 from public.user_bp where user_id = u and season_id = s.id for update;
  v_ms := public._bp_missions(u, s);
  select x into m from jsonb_array_elements(case p_kind when 'speedup' then v_ms #> '{speedup,missions}' else v_ms -> 'horizon' end) x where x->>'id' = p_id;
  if m is null then raise exception 'ไม่พบภารกิจนี้'; end if;
  if p_kind = 'speedup' and not (v_ms #>> '{speedup,open}')::boolean then raise exception 'ภารกิจเร่งยังไม่เปิด'; end if;
  if (m->>'claimed')::boolean then raise exception 'รับรางวัลภารกิจนี้แล้ว'; end if;
  if (m->>'progress')::int < (m->>'target')::int then raise exception 'ภารกิจยังไม่สำเร็จ (% / %)', m->>'progress', m->>'target'; end if;
  if p_kind = 'speedup' then
    update public.user_bp set speed_claimed = speed_claimed || to_jsonb(p_id), updated_at = now() where user_id = u and season_id = s.id;
  else
    update public.profiles set horizon = horizon || to_jsonb(p_id) where id = u;
  end if;
  v_bp := public._bp_add(u, (m->>'bp')::int);
  return jsonb_build_object('kind', p_kind, 'id', p_id, 'bp', v_bp);
end $$;

-- ---------- เศษตัวละคร: ครบ 50 ชิ้น → ได้ตัวละคร (มีแล้ว = ตัวซ้ำไว้อัพดาว) · คืนจำนวนตัวที่ได้ ----------
create or replace function public._grant_shards(p_user uuid, p_char text, p_n int) returns int
language plpgsql security definer set search_path = public as $$
declare v_need int := 50; v_have int; v_got int := 0;
begin
  if coalesce(p_n, 0) <= 0 then return 0; end if;
  if not exists (select 1 from public.catalog_items where kind = 'characters' and item_id = p_char) then raise exception 'ไม่พบตัวละครนี้'; end if;
  insert into public.inventory(user_id, kind, item_id, qty) values (p_user, 'shards', p_char, p_n)
  on conflict (user_id, kind, item_id) do update set qty = public.inventory.qty + excluded.qty
  returning qty into v_have;
  while v_have >= v_need loop
    v_have := v_have - v_need; v_got := v_got + 1;
    perform public._grant_item(p_user, 'characters', p_char);
  end loop;
  update public.inventory set qty = v_have where user_id = p_user and kind = 'shards' and item_id = p_char;
  return v_got;
end $$;

-- ตัวละครที่เลือกเศษได้ตามระดับ (เรียงตาม id · ลำดับนี้คือหมายเลขตัวเลือกของกล่อง)
create or replace function public._shard_chars(p_rarity text) returns table(item_id text, name text)
language sql stable security definer set search_path = public as $$
  select item_id, name from public.catalog_items where kind = 'characters' and active and not is_default and rarity = p_rarity order by item_id $$;

-- ตัวเลือกของกล่อง (ให้หน้าจอแสดง) · [{kind, id, name, qty}]
create or replace function public.crate_options(p_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_it jsonb := public._eco() #> array['items', p_id];
begin
  if v_it is null then raise exception 'ไม่พบกล่องนี้'; end if;
  if v_it ? 'shards' then
    return coalesce((select jsonb_agg(jsonb_build_object('kind', 'shards', 'id', c.item_id, 'name', c.name, 'qty', (v_it #>> '{shards,qty}')::int,
      'have', public._qty(public._uid(), 'shards', c.item_id), 'owned', public._owns(public._uid(), 'characters', c.item_id)))
      from public._shard_chars(v_it #>> '{shards,rarity}') c), '[]');
  end if;
  return coalesce(v_it -> 'crate', '[]');
end $$;

-- ---------- เปิดกล่องเลือกของ ----------
create or replace function public.open_crate(p_id text, p_pick int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_opts jsonb; o jsonb; v_have int; v_coins bigint; v_chars int := 0;
begin
  if p_id is null or p_id !~ '^crate-[a-z0-9-]{1,24}$' then raise exception 'ไอเทมนี้ไม่ใช่กล่องเลือกของ'; end if;
  v_opts := public.crate_options(p_id);
  if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) = 0 then raise exception 'ไอเทมนี้ไม่ใช่กล่องเลือกของ'; end if;
  if p_pick is null or p_pick < 0 or p_pick >= jsonb_array_length(v_opts) then raise exception 'ตัวเลือกไม่ถูกต้อง'; end if;
  perform 1 from public.profiles where id = u for update;
  select qty into v_have from public.inventory where user_id = u and kind = 'items' and item_id = p_id for update;
  if coalesce(v_have, 0) < 1 then raise exception 'ไม่มีกล่องนี้'; end if;
  o := (v_opts -> p_pick) - 'have' - 'owned';
  update public.inventory set qty = qty - 1 where user_id = u and kind = 'items' and item_id = p_id;
  if o->>'kind' = 'coins' then
    perform public._wallet_add(u, 'coins', (o->>'qty')::int, 'crate', p_id);
  elsif o->>'kind' = 'mcash' then
    perform public._wallet_add(u, 'mcash', (o->>'qty')::int, 'crate', p_id);
  elsif o->>'kind' = 'shards' then
    v_chars := public._grant_shards(u, o->>'id', (o->>'qty')::int);
  else
    perform public._grant_qty(u, o->>'kind', o->>'id', greatest(1, (o->>'qty')::int));
  end if;
  select coins into v_coins from public.profiles where id = u;
  return jsonb_build_object('crate', p_id, 'got', o, 'left', v_have - 1, 'coins', v_coins, 'chars', v_chars,
    'shards', case when o->>'kind' = 'shards' then public._qty(u, 'shards', o->>'id') else null end);
end $$;

-- ---------- ร้านประจำสัปดาห์: ช่องเศษตัวละคร ----------
create or replace function public._weekly_shards(p_week date) returns table(slot text, item_id text, name text, rarity text, qty int, coins int, mcash int)
language sql stable security definer set search_path = public as $$
  select sl->>'slot', c.item_id, c.name, sl->>'rarity', coalesce((sl->>'qty')::int, 5), (sl->>'coins')::int, (sl->>'mcash')::int
  from jsonb_array_elements(coalesce(public._cfg('weekly_shop') -> 'shards', '[]')) with ordinality as t(sl, o)
  cross join lateral (select x.item_id, x.name from public._shard_chars(sl->>'rarity') x order by md5(x.item_id || ':' || (sl->>'slot') || ':' || p_week::text) limit 1) c
  order by o $$;

create or replace function public.get_weekly_shop() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_week date := public.game_week(); v_wb jsonb;
begin
  select weekly_shards into v_wb from public.profiles where id = u;
  if coalesce(v_wb->>'week', '') <> v_week::text then v_wb := '{"bought":[]}'; end if;
  return jsonb_build_object('week', v_week, 'resets_at', public._day_start(v_week + 7),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', w.kind, 'item_id', w.item_id, 'name', w.name, 'rarity', w.rarity, 'price', w.price,
      'owned', public._owns(u, w.kind, w.item_id))) from public._weekly_list(v_week) w), '[]'),
    'shards', coalesce((select jsonb_agg(jsonb_build_object('slot', x.slot, 'item_id', x.item_id, 'name', x.name, 'rarity', x.rarity, 'qty', x.qty,
      'coins', x.coins, 'mcash', x.mcash, 'have', public._qty(u, 'shards', x.item_id), 'bought', coalesce(v_wb->'bought', '[]') @> to_jsonb(x.slot)))
      from public._weekly_shards(v_week) x), '[]'));
end $$;

create or replace function public.buy_weekly_shard(p_slot text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_week date := public.game_week(); x record; v_wb jsonb; v_bal bigint; v_chars int;
begin
  select * into x from public._weekly_shards(v_week) w where w.slot = p_slot;
  if not found then raise exception 'ไม่มีช่องนี้ในร้านสัปดาห์นี้'; end if;
  select weekly_shards into v_wb from public.profiles where id = u for update;
  if coalesce(v_wb->>'week', '') <> v_week::text then v_wb := jsonb_build_object('week', v_week::text, 'bought', '[]'::jsonb); end if;
  if v_wb->'bought' @> to_jsonb(p_slot) then raise exception 'ซื้อช่องนี้ไปแล้วในสัปดาห์นี้'; end if;
  if x.mcash is not null then
    select mcash into v_bal from public.profiles where id = u;
    if v_bal < x.mcash then raise exception 'เพชรไม่พอ (ต้องใช้ %)', x.mcash; end if;
    perform public._wallet_add(u, 'mcash', -x.mcash, 'weekly_shard', p_slot || ':' || x.item_id);
  else
    select coins into v_bal from public.profiles where id = u;
    if v_bal < coalesce(x.coins, 0) then raise exception 'เหรียญไม่พอ (ต้องใช้ %)', x.coins; end if;
    perform public._wallet_add(u, 'coins', -coalesce(x.coins, 0), 'weekly_shard', p_slot || ':' || x.item_id);
  end if;
  update public.profiles set weekly_shards = jsonb_set(v_wb, '{bought}', (v_wb->'bought') || to_jsonb(p_slot)) where id = u;
  v_chars := public._grant_shards(u, x.item_id, x.qty);
  return jsonb_build_object('slot', p_slot, 'item_id', x.item_id, 'qty', x.qty, 'shards', public._qty(u, 'shards', x.item_id), 'chars', v_chars);
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._bp_metric(uuid, text, text, timestamptz, timestamptz), public._vac_tags(uuid, public.bp_seasons), public._bp_missions(uuid, public.bp_seasons),
  public._grant_shards(uuid, text, int), public._shard_chars(text), public._weekly_shards(date) from public, anon, authenticated;
revoke all on function public.claim_bp_mission(text, text), public.open_crate(text, int), public.crate_options(text), public.buy_weekly_shard(text) from public, anon;
grant execute on function public.claim_bp_mission(text, text), public.open_crate(text, int), public.crate_options(text), public.buy_weekly_shard(text),
  public.get_bp(), public.claim_quest_bonus(text), public.get_weekly_shop() to authenticated;
