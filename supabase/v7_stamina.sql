-- ===================================================================================
-- v7 · สตามิน่า + ชา · ฟาร์มของกับบอท · เลเวลตัวละคร + ช่องชุดแต่งประจำตัวละคร · ไอเทมในแบทเทิลพาส
-- ลำดับรัน: schema.sql → v6_progression.sql → v7_stamina.sql → v7_config.sql → bp_seed.sql (รันซ้ำได้ ปลอดภัย · bp_seed ใช้คอลัมน์ qty ที่ v7 สร้าง)
--   ถ้ารัน v6 ซ้ำภายหลัง ต้องรัน v7 ตามอีกครั้งเสมอ (v7 แทนที่ record_game_result ของ v6)
-- - เล่นกับบอท: หักสตามิน่าตอนจบตา (ตาละ economy.stamina.COST) แล้วได้ของตามโหมดฟาร์มที่เลือก (เหรียญ ×2 / คัมภีร์ตัวละคร / EXP ผู้เล่น)
--   สตามิน่าไม่พอ = โหมดซ้อม: ไม่ได้เหรียญ EXP แบทเทิลพาส และไม่นับเควส
-- - เล่นกับคน: ไม่ใช้สตามิน่า · เหรียญตามอันดับ มีเพดานรายวัน (นับเฉพาะเกมที่ไม่มีบอท)
-- - สตามิน่าฟื้น 1 ทุก REGEN_SEC วินาทีจนถึงสูงสุด (80 +20 ทุก 5 เลเวล ตันที่ 300) · ชาเติมเกินสูงสุดได้ (เกินแล้วหยุดฟื้น) · ขึ้นเลเวลเติมเต็ม
-- - ตัวเลขทั้งหมดอยู่ใน game_config.economy (สร้างจาก economy.js ด้วย scripts/gen-economy-sql.js → v7_config.sql)
-- ===================================================================================

insert into public.game_config(key, value) values
  ('economy', '{"stamina":{"COST":10,"REGEN_SEC":360,"BASE":80,"STEP":20,"EVERY":5,"CAP":300,"HOLD_MAX":999},"items":{},"farm":{"coins":{"mult":2}},"char":{"MAX":30,"BASE":100,"STEP":50,"COIN_PER_EXP":0.2,"SLOTS":{}}}')
on conflict (key) do nothing;   -- ค่าจริงมาจาก v7_config.sql

alter table public.profiles        add column if not exists stamina    int         not null default 80;
alter table public.profiles        add column if not exists stamina_at timestamptz not null default now();
alter table public.user_characters add column if not exists level      int         not null default 1;
alter table public.user_characters add column if not exists char_exp   int         not null default 0;
alter table public.user_characters add column if not exists loadout    jsonb       not null default '{}'::jsonb;   -- {"frames":"...","backs":"...","tables":"...","backgrounds":"..."}
alter table public.game_log        add column if not exists bots       boolean     not null default false;   -- ตานี้มีบอทร่วมโต๊ะ (ตัดสินตอนเริ่มเกม)
alter table public.game_log        add column if not exists practice   boolean     not null default false;   -- โหมดซ้อม (สตามิน่าไม่พอ) ไม่ได้รางวัล ไม่นับเควส
alter table public.game_log        add column if not exists farm       text;
alter table public.bp_rewards      add column if not exists qty        int         not null default 1;

-- ---------- ค่าจาก game_config.economy ----------
create or replace function public._eco() returns jsonb
language sql stable set search_path = public as $$ select coalesce(public._cfg('economy'), '{}'::jsonb) $$;
create or replace function public._eco_num(p_path text[], p_def numeric) returns numeric
language sql stable set search_path = public as $$ select coalesce((public._eco() #>> p_path)::numeric, p_def) $$;

-- ---------- สตามิน่า ----------
create or replace function public._stamina_max(p_level int) returns int
language sql stable set search_path = public as $$
  select least(public._eco_num('{stamina,CAP}', 300)::int,
    public._eco_num('{stamina,BASE}', 80)::int + public._eco_num('{stamina,STEP}', 20)::int * ((greatest(1, coalesce(p_level, 1)) - 1) / greatest(1, public._eco_num('{stamina,EVERY}', 5)::int))) $$;

-- นับการฟื้นจนถึงตอนนี้แล้วเขียนลงแถว (ล็อกแถวผู้เล่น) · คืนสตามิน่าปัจจุบัน
-- ต่ำกว่าสูงสุด: +1 ทุก REGEN_SEC (เศษเวลาเก็บไว้ในเวลาอ้างอิง) · ถึง/เกินสูงสุด: ไม่ฟื้น เวลาอ้างอิง = ตอนนี้
create or replace function public._stamina_sync(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_st int; v_at timestamptz; v_exp bigint; v_max int; v_reg int := greatest(1, public._eco_num('{stamina,REGEN_SEC}', 360)::int); v_t bigint; v_new int;
begin
  select stamina, stamina_at, player_exp into v_st, v_at, v_exp from public.profiles where id = p_user for update;
  if not found then raise exception 'ไม่พบผู้เล่น'; end if;
  v_max := public._stamina_max(public._level_of(v_exp));
  if v_st >= v_max then
    update public.profiles set stamina_at = now() where id = p_user;
    return v_st;
  end if;
  v_t := floor(extract(epoch from (now() - v_at)) / v_reg);
  if v_t <= 0 then return v_st; end if;
  v_new := least(v_max::bigint, v_st + v_t)::int;
  if v_new >= v_max then update public.profiles set stamina = v_new, stamina_at = now() where id = p_user;
  else update public.profiles set stamina = v_new, stamina_at = v_at + make_interval(secs => v_t * v_reg) where id = p_user; end if;
  return v_new;
end $$;

-- ใช้สตามิน่า (สำเร็จ = true) · ไม่พอ = false ไม่หักอะไร
create or replace function public._stamina_spend(p_user uuid, p_n int) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_cur int := public._stamina_sync(p_user);
begin
  if v_cur < p_n then return false; end if;
  update public.profiles set stamina = stamina - p_n where id = p_user;
  return true;
end $$;

create or replace function public._stamina_info(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_cur int := public._stamina_sync(p_user); v_at timestamptz; v_exp bigint; v_max int; v_reg int := greatest(1, public._eco_num('{stamina,REGEN_SEC}', 360)::int);
begin
  select stamina_at, player_exp into v_at, v_exp from public.profiles where id = p_user;
  v_max := public._stamina_max(public._level_of(v_exp));
  return jsonb_build_object('stamina', v_cur, 'max', v_max, 'regen_sec', v_reg, 'cost', public._eco_num('{stamina,COST}', 10)::int,
    'next_in', case when v_cur >= v_max then null else greatest(0, ceil(v_reg - extract(epoch from (now() - v_at))))::int end,
    'full_in', case when v_cur >= v_max then 0 else greatest(0, ceil((v_max - v_cur) * v_reg - extract(epoch from (now() - v_at))))::int end);
end $$;

create or replace function public.get_stamina() returns jsonb
language plpgsql security definer set search_path = public as $$ begin return public._stamina_info(public._uid()); end $$;

-- ---------- ไอเทม ----------
create or replace function public._grant_qty(p_user uuid, p_kind text, p_id text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_qty, 0) <= 0 then return; end if;
  if p_kind <> 'items' then perform public._grant_item(p_user, p_kind, p_id); return; end if;
  insert into public.inventory(user_id, kind, item_id, qty) values (p_user, 'items', p_id, p_qty)
  on conflict (user_id, kind, item_id) do update set qty = public.inventory.qty + excluded.qty;
end $$;

-- ใช้ชาเติมสตามิน่า (เติมเกินสูงสุดได้ถึง HOLD_MAX)
create or replace function public.use_item(p_id text, p_qty int default 1) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_eff int; v_have int; v_hold int := public._eco_num('{stamina,HOLD_MAX}', 999)::int;
begin
  if p_id is null or p_id !~ '^[a-z0-9-]{1,30}$' or coalesce(p_qty, 0) < 1 or p_qty > 99 then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
  v_eff := coalesce((public._eco() #>> array['items', p_id, 'stamina'])::int, 0);
  if v_eff <= 0 then raise exception 'ไอเทมนี้ใช้ตรงนี้ไม่ได้'; end if;
  select qty into v_have from public.inventory where user_id = u and kind = 'items' and item_id = p_id for update;
  if coalesce(v_have, 0) < p_qty then raise exception 'มีไม่พอ (มี % ชิ้น)', coalesce(v_have, 0); end if;
  if public._stamina_sync(u) + v_eff * p_qty > v_hold then raise exception 'สตามิน่าเก็บได้ไม่เกิน %', v_hold; end if;
  update public.inventory set qty = qty - p_qty where user_id = u and kind = 'items' and item_id = p_id;
  update public.profiles set stamina = stamina + v_eff * p_qty where id = u;
  return public._stamina_info(u) || jsonb_build_object('used', p_qty, 'added', v_eff * p_qty, 'left', v_have - p_qty);
end $$;

-- ---------- ผลเกม (เรียกโดยเซิร์ฟเวอร์เกมเท่านั้น) ----------
-- p_bots = ตานี้มีบอท (เซิร์ฟเวอร์ตัดสินตอนเริ่มเกม) · p_farm = โหมดฟาร์ม · p_rank/p_seats = อันดับ/จำนวนที่นั่ง
drop function if exists public.record_game_result(uuid, text, text, int, boolean, int, boolean, text);
create or replace function public.record_game_result(
  p_user uuid, p_gid text, p_game text, p_delta int, p_won boolean default false,
  p_melds int default 0, p_knock boolean default false, p_char text default null,
  p_bots boolean default false, p_farm text default null, p_rank int default null, p_seats int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_res text; v_id bigint; v_coins bigint; v_mcash bigint; v_today_coins bigint; v_today_games int; v_from timestamptz := public._day_start(public.game_day());
        v_cap int := public._cfg_int('daily_coin_cap', 1500); v_over int := public._cfg_int('over_cap_coins', 5); v_paid int := 0; v_capped boolean := false;
        v_exp int; v_old_exp bigint; v_old_lv int; v_new_lv int; v_lv int; v_lv_c int := 0; v_lv_m int := 0;
        s public.bp_seasons := public._bp_season(); v_bp int := 0; v_bp_per int; v_bp_cap int;
        v_bots boolean := coalesce(p_bots, false); v_farm text; v_seats int; v_rank int; v_tier int; v_items jsonb := '{}'; k text; n text; v_pexp int := 0;
begin
  if p_gid is null or p_game is null or p_game !~ '^[a-z0-9_-]{1,30}$' then raise exception 'ข้อมูลผลเกมไม่ถูกต้อง'; end if;
  p_delta := greatest(0, least(10000, coalesce(p_delta, 0)));      -- ไม่มีการเสียเหรียญจากการเล่น
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'ไม่พบผู้เล่น'; end if;
  if exists (select 1 from public.game_log where user_id = p_user and gid = p_gid) then
    select coins, mcash into v_coins, v_mcash from public.profiles where id = p_user;
    return jsonb_build_object('duplicate', true, 'coins', v_coins, 'mcash', v_mcash);
  end if;
  v_res := case when p_won then 'win' else 'loss' end;   -- ได้ที่ 1 = ชนะ
  perform public._stamina_sync(p_user);
  if v_bots then
    v_farm := case when p_farm in ('exp', 'pexp') then p_farm else 'coins' end;
    -- สตามิน่าไม่พอ → โหมดซ้อม: บันทึกไว้ (กันจ่ายซ้ำ) แต่ไม่ได้อะไรเลย และไม่นับเควส
    if not public._stamina_spend(p_user, public._eco_num('{stamina,COST}', 10)::int) then
      insert into public.game_log(user_id, gid, game_id, result, coin_delta, bonus, melds, knock, character_id, raw_delta, exp_gain, bp_gain, bots, practice, farm)
      values (p_user, p_gid, p_game, v_res, 0, 0, 0, false, p_char, 0, 0, 0, true, true, v_farm)
      on conflict (user_id, gid) do nothing returning id into v_id;
      select coins, mcash, player_exp into v_coins, v_mcash, v_old_exp from public.profiles where id = p_user;
      return jsonb_build_object('duplicate', v_id is null, 'practice', true, 'bots', true, 'farm', v_farm, 'result', v_res, 'delta', 0, 'raw', 0, 'capped', false,
        'coins', v_coins, 'mcash', v_mcash, 'exp', 0, 'player_exp', v_old_exp, 'level', public._level_of(v_old_exp), 'level_up', false,
        'level_coins', 0, 'level_mcash', 0, 'bp', 0, 'items', '{}'::jsonb) || public._stamina_info(p_user);
    end if;
    v_seats := greatest(2, least(8, coalesce(p_seats, 4))); v_rank := greatest(1, least(v_seats, coalesce(p_rank, case when p_won then 1 else v_seats end)));
    v_tier := case when v_rank <= 1 then 0 when v_rank >= v_seats then 3 when v_rank = 2 then 1 else 2 end;
    if v_farm = 'coins' then v_paid := least(20000, p_delta * public._eco_num('{farm,coins,mult}', 2))::int;
    elsif v_farm = 'pexp' then v_pexp := coalesce((public._eco() #>> array['farm', 'pexp', 'bonus', v_tier::text])::int, 0);
    else
      v_items := coalesce(public._eco() #> array['farm', v_farm, 'tiers', v_tier::text], '{}'::jsonb);
    end if;
    select count(*) filter (where not practice) into v_today_games from public.game_log where user_id = p_user and played_at >= v_from;
    v_today_coins := 0;
  else
    -- เล่นกับคน: เพดานเหรียญรายวัน (นับเฉพาะเกมที่ไม่มีบอท)
    select coalesce(sum(coin_delta) filter (where not bots), 0), count(*) filter (where not practice) into v_today_coins, v_today_games
      from public.game_log where user_id = p_user and played_at >= v_from;
    if v_today_coins >= v_cap then v_paid := least(p_delta, v_over); v_capped := true;
    else v_paid := least(p_delta, greatest(v_cap - v_today_coins, v_over)); v_capped := v_paid < p_delta; end if;
  end if;
  -- EXP ผู้เล่น · ขึ้นเลเวล = เพชร/เหรียญ + เติมสตามิน่าเต็ม
  v_exp := public._cfg_int('exp_play', 20) + case when p_won then public._cfg_int('exp_win', 10) else 0 end + v_pexp;   -- + โหมดฟาร์ม EXP ผู้เล่น
  select player_exp into v_old_exp from public.profiles where id = p_user;
  v_old_lv := public._level_of(v_old_exp); v_new_lv := public._level_of(v_old_exp + v_exp);
  update public.profiles set player_exp = player_exp + v_exp, last_game = p_game, last_game_at = now() where id = p_user;
  if v_new_lv > v_old_lv then
    for v_lv in (v_old_lv + 1)..v_new_lv loop
      if v_lv % 10 = 0 then v_lv_m := v_lv_m + public._cfg_int('lv10_gems', 30); v_lv_c := v_lv_c + public._cfg_int('lv10_coins', 1000);
      else v_lv_m := v_lv_m + public._cfg_int('lv_gems', 5); end if;
    end loop;
    update public.profiles set stamina = greatest(stamina, public._stamina_max(v_new_lv)), stamina_at = now() where id = p_user;
  end if;
  -- EXP แบทเทิลพาสจากการเล่น (มีเพดานต่อวัน · โหมดซ้อมไม่นับ)
  if s.id is not null then
    v_bp_per := coalesce((s.exp_cfg ->> 'perGame')::int, 30); v_bp_cap := coalesce((s.exp_cfg ->> 'perGameDailyCap')::int, 300);
    if (v_today_games + 1) * v_bp_per <= v_bp_cap then v_bp := public._bp_add(p_user, v_bp_per); end if;
  end if;
  insert into public.game_log(user_id, gid, game_id, result, coin_delta, bonus, melds, knock, character_id, raw_delta, exp_gain, bp_gain, bots, practice, farm)
  values (p_user, p_gid, p_game, v_res, v_paid, 0, greatest(0, least(100, coalesce(p_melds, 0))), coalesce(p_knock, false), p_char, p_delta, v_exp, v_bp, v_bots, false, v_farm)
  on conflict (user_id, gid) do nothing returning id into v_id;
  if v_id is null then
    select coins, mcash into v_coins, v_mcash from public.profiles where id = p_user;
    return jsonb_build_object('duplicate', true, 'coins', v_coins, 'mcash', v_mcash);
  end if;
  for k, n in select * from jsonb_each_text(v_items) loop perform public._grant_qty(p_user, 'items', k, n::int); end loop;
  insert into public.game_stats(user_id, game_id, plays, wins, losses, draws, coins_won, coins_lost, last_played_at)
  values (p_user, p_game, 1, (v_res = 'win')::int, (v_res = 'loss')::int, 0, v_paid, 0, now())
  on conflict (user_id, game_id) do update set plays = game_stats.plays + 1, wins = game_stats.wins + excluded.wins,
    losses = game_stats.losses + excluded.losses, coins_won = game_stats.coins_won + excluded.coins_won, last_played_at = now();
  v_coins := public._wallet_add(p_user, 'coins', v_paid + v_lv_c, 'game:' || p_game, p_gid);
  if v_lv_m > 0 then perform public._wallet_add(p_user, 'mcash', v_lv_m, 'level', 'lv' || v_new_lv); end if;
  select mcash into v_mcash from public.profiles where id = p_user;
  return jsonb_build_object('duplicate', false, 'practice', false, 'bots', v_bots, 'farm', v_farm, 'items', v_items,
    'result', v_res, 'delta', v_paid, 'raw', p_delta, 'capped', v_capped, 'bonus', 0,
    'coins', v_coins, 'mcash', v_mcash, 'exp', v_exp, 'player_exp', v_old_exp + v_exp, 'level', v_new_lv,
    'level_up', v_new_lv > v_old_lv, 'level_coins', v_lv_c, 'level_mcash', v_lv_m, 'bp', v_bp,
    'today_coins', v_today_coins + case when v_bots then 0 else v_paid end, 'cap', v_cap) || public._stamina_info(p_user);
end $$;

-- ---------- เควส: ไม่นับเกมโหมดซ้อม ----------
create or replace function public._quest_progress(p_user uuid, q public.quest_defs, p_key date) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_from timestamptz := public._day_start(p_key); v_to timestamptz;
        v_val bigint := 0;
begin
  v_to := public._day_start(p_key + case q.period when 'daily' then 1 else 7 end);
  if q.metric = 'login' then
    select count(*) into v_val from public.login_days where user_id = p_user and day >= p_key and day < (p_key + case q.period when 'daily' then 1 else 7 end);
  else
    select case q.metric
      when 'play'  then count(*)
      when 'win'   then count(*) filter (where result = 'win')
      when 'coins' then coalesce(sum(greatest(coin_delta + bonus, 0)), 0)
      when 'rules' then count(distinct game_id)
      when 'days'  then count(distinct public.game_day(played_at))
      when 'melds' then coalesce(sum(melds), 0)
      when 'knock' then count(*) filter (where knock)
      else 0 end
    into v_val from public.game_log
    where user_id = p_user and played_at >= v_from and played_at < v_to and not practice and (q.game_id is null or game_id = q.game_id);
  end if;
  return least(coalesce(v_val, 0), 2147483647)::int;
end $$;

-- ---------- แบทเทิลพาส: รางวัลมีจำนวน (qty) ----------
create or replace function public.get_bp() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); s public.bp_seasons := public._bp_season(); ub public.user_bp;
begin
  if s.id is null then return jsonb_build_object('season', null); end if;
  insert into public.user_bp(user_id, season_id) values (u, s.id) on conflict do nothing;
  select * into ub from public.user_bp where user_id = u and season_id = s.id;
  return jsonb_build_object(
    'season', jsonb_build_object('id', s.id, 'name', s.name, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'level_exp', s.level_exp,
      'max_level', s.max_level, 'gem_cost', s.gem_cost, 'premium_open', s.premium_open, 'cycle_coins', s.cycle_coins, 'exp_cfg', s.exp_cfg),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object('level', r.level, 'track', r.track, 'coins', r.coins, 'mcash', r.mcash,
      'item_kind', r.item_kind, 'item_id', r.item_id, 'qty', r.qty, 'preview', r.preview) order by r.level, r.track) from public.bp_rewards r where r.season_id = s.id), '[]'),
    'me', jsonb_build_object('exp', ub.exp, 'gem', ub.gem, 'premium', ub.premium, 'claimed', ub.claimed, 'cycle_claimed', ub.cycle_claimed),
    'now', now());
end $$;

create or replace function public.claim_bp() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); s public.bp_seasons := public._bp_season(); ub public.user_bp; r public.bp_rewards;
        v_lv int; v_c bigint := 0; v_m bigint := 0; v_items jsonb := '[]'; v_claimed jsonb; v_cycle int; v_cyc_new int := 0; v_n int := 0;
begin
  if s.id is null then raise exception 'ตอนนี้ไม่มีฤดูแบทเทิลพาส'; end if;
  insert into public.user_bp(user_id, season_id) values (u, s.id) on conflict do nothing;
  select * into ub from public.user_bp where user_id = u and season_id = s.id for update;
  v_lv := least(s.max_level, ub.exp / s.level_exp); v_claimed := ub.claimed;
  for r in select * from public.bp_rewards where season_id = s.id and level <= v_lv order by level, track loop
    continue when r.track = 'gem' and not ub.gem;
    continue when r.track = 'premium' and not (ub.premium and s.premium_open);
    continue when coalesce(v_claimed -> r.track, '[]') @> to_jsonb(r.level);
    v_claimed := jsonb_set(v_claimed, array[r.track], coalesce(v_claimed -> r.track, '[]') || to_jsonb(r.level));
    v_c := v_c + r.coins; v_m := v_m + r.mcash; v_n := v_n + 1;
    if r.item_kind is not null and r.item_id is not null and r.preview is null then
      perform public._grant_qty(u, r.item_kind, r.item_id, greatest(1, r.qty));
      v_items := v_items || jsonb_build_object('kind', r.item_kind, 'id', r.item_id, 'qty', greatest(1, r.qty));
    end if;
  end loop;
  v_cycle := greatest(0, (ub.exp - s.max_level * s.level_exp) / s.level_exp);
  if v_cycle > ub.cycle_claimed then v_cyc_new := v_cycle - ub.cycle_claimed; v_c := v_c + v_cyc_new * s.cycle_coins; end if;
  if v_n = 0 and v_cyc_new = 0 then raise exception 'ยังไม่มีรางวัลให้รับ'; end if;
  update public.user_bp set claimed = v_claimed, cycle_claimed = greatest(cycle_claimed, v_cycle), updated_at = now() where user_id = u and season_id = s.id;
  if v_c > 0 then perform public._wallet_add(u, 'coins', v_c, 'bp', s.id); end if;
  if v_m > 0 then perform public._wallet_add(u, 'mcash', v_m, 'bp', s.id); end if;
  return jsonb_build_object('coins', v_c, 'mcash', v_m, 'items', v_items, 'levels', v_n, 'cycles', v_cyc_new);
end $$;

-- ---------- เลเวลตัวละคร ----------
create or replace function public._char_need(p_lv int) returns int
language sql stable set search_path = public as $$ select public._eco_num('{char,BASE}', 100)::int + public._eco_num('{char,STEP}', 50)::int * (p_lv - 1) $$;
create or replace function public._char_max_exp() returns int
language sql stable set search_path = public as $$ select coalesce(sum(public._char_need(l)), 0)::int from generate_series(1, public._eco_num('{char,MAX}', 30)::int - 1) l $$;
create or replace function public._char_level_of(p_exp int) returns int
language plpgsql stable set search_path = public as $$
declare lv int := 1; left_ int := greatest(0, coalesce(p_exp, 0)); mx int := public._eco_num('{char,MAX}', 30)::int;
begin
  while lv < mx and left_ >= public._char_need(lv) loop left_ := left_ - public._char_need(lv); lv := lv + 1; end loop;
  return lv;
end $$;

-- ใช้คัมภีร์อัปเลเวลตัวละคร: p_books = {"exp-s": 3, "exp-m": 1} · เสียเหรียญตาม EXP ที่ใช้จริง (เกินเลเวลสูงสุดไม่คิดเงิน แต่คัมภีร์ถูกใช้)
create or replace function public.char_level_up(p_char text, p_books jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); uc public.user_characters; v_max int := public._char_max_exp(); v_add int := 0; v_use int; v_cost int; v_have int; v_coins bigint;
        k text; v text; v_n int; v_eff int; v_old int;
begin
  if p_char is null or p_char !~ '^[A-Za-z0-9_.-]{1,60}$' or jsonb_typeof(coalesce(p_books, 'null')) <> 'object' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
  if not public._owns(u, 'characters', p_char) then raise exception 'คุณยังไม่มีตัวละครนี้'; end if;
  insert into public.user_characters(user_id, character_id) values (u, p_char) on conflict do nothing;
  select * into uc from public.user_characters where user_id = u and character_id = p_char for update;
  if uc.char_exp >= v_max then raise exception 'ตัวละครนี้เลเวลสูงสุดแล้ว'; end if;
  for k, v in select * from jsonb_each_text(p_books) loop
    v_n := case when v ~ '^\d{1,3}$' then v::int else -1 end;
    if v_n < 0 then raise exception 'จำนวนไม่ถูกต้อง'; end if;
    continue when v_n = 0;
    v_eff := coalesce((public._eco() #>> array['items', k, 'charExp'])::int, 0);
    if v_eff <= 0 then raise exception 'ไอเทมนี้ใช้อัปเลเวลไม่ได้'; end if;
    select qty into v_have from public.inventory where user_id = u and kind = 'items' and item_id = k for update;
    if coalesce(v_have, 0) < v_n then raise exception 'คัมภีร์ไม่พอ (มี % เล่ม)', coalesce(v_have, 0); end if;
    v_add := v_add + v_eff * v_n;
  end loop;
  if v_add <= 0 then raise exception 'เลือกคัมภีร์ก่อน'; end if;
  v_use := least(v_add, v_max - uc.char_exp);
  v_cost := floor(v_use * public._eco_num('{char,COIN_PER_EXP}', 0.2))::int;
  select coins into v_coins from public.profiles where id = u for update;
  if v_coins < v_cost then raise exception 'เหรียญไม่พอ (ต้องใช้ %)', v_cost; end if;
  for k, v in select * from jsonb_each_text(p_books) loop
    if v::int > 0 then update public.inventory set qty = qty - v::int where user_id = u and kind = 'items' and item_id = k; end if;
  end loop;
  if v_cost > 0 then v_coins := public._wallet_add(u, 'coins', -v_cost, 'char_lv', p_char); end if;
  v_old := uc.level;
  update public.user_characters set char_exp = uc.char_exp + v_use, level = public._char_level_of(uc.char_exp + v_use), updated_at = now()
    where user_id = u and character_id = p_char returning * into uc;
  return jsonb_build_object('character', p_char, 'level', uc.level, 'old_level', v_old, 'exp', uc.char_exp, 'added', v_use, 'cost', v_cost, 'coins', v_coins);
end $$;

-- ช่องชุดแต่งประจำตัวละคร (ปลดตามเลเวลตัวละคร) · p_id ว่าง = ถอดออก
create or replace function public.set_char_slot(p_char text, p_kind text, p_id text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); uc public.user_characters; v_need int;
begin
  if p_char is null or p_char !~ '^[A-Za-z0-9_.-]{1,60}$' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
  v_need := (public._eco() #>> array['char', 'SLOTS', coalesce(p_kind, '')])::int;
  if v_need is null then raise exception 'ไม่มีช่องนี้'; end if;
  if not public._owns(u, 'characters', p_char) then raise exception 'คุณยังไม่มีตัวละครนี้'; end if;
  insert into public.user_characters(user_id, character_id) values (u, p_char) on conflict do nothing;
  select * into uc from public.user_characters where user_id = u and character_id = p_char for update;
  if uc.level < v_need then raise exception 'ช่องนี้ปลดที่เลเวลตัวละคร %', v_need; end if;
  if coalesce(p_id, '') = '' then
    update public.user_characters set loadout = loadout - p_kind, updated_at = now() where user_id = u and character_id = p_char returning * into uc;
  else
    if p_id !~ '^[A-Za-z0-9_.-]{1,60}$' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
    if not public._owns(u, p_kind, p_id) then raise exception 'คุณยังไม่มีของชิ้นนี้'; end if;
    update public.user_characters set loadout = loadout || jsonb_build_object(p_kind, p_id), updated_at = now() where user_id = u and character_id = p_char returning * into uc;
  end if;
  return jsonb_build_object('character', p_char, 'loadout', uc.loadout);
end $$;

-- ---------- โปรไฟล์: สตามิน่า + เลเวล/ชุดแต่งตัวละคร ----------
create or replace function public.get_profile() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); p public.profiles; v_today date := public.game_day(); ld public.login_days; v_today_coins bigint; v_st jsonb;
begin
  perform 1 from public.profiles where id = u;
  if not found then raise exception 'ไม่พบโปรไฟล์'; end if;
  v_st := public._stamina_info(u);
  select * into p from public.profiles where id = u;
  select * into ld from public.login_days where user_id = u and day = v_today;
  select coalesce(sum(coin_delta) filter (where not bots), 0) into v_today_coins from public.game_log where user_id = u and played_at >= public._day_start(v_today);
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'title', p.title,
    'coins', p.coins, 'mcash', p.mcash, 'equipped', p.equipped,
    'player_exp', p.player_exp, 'level', public._level_of(p.player_exp), 'name_changes', p.name_changes, 'rename_cost', public._cfg_int('rename_cost', 500),
    'today_coins', v_today_coins, 'daily_coin_cap', public._cfg_int('daily_coin_cap', 1500), 'star_coin_cost', public._cfg('star_coin_cost'),
    'stamina', v_st,
    'last_login_at', p.last_login_at, 'login_streak', p.login_streak, 'best_streak', p.best_streak, 'total_login_days', p.total_login_days,
    'last_game', p.last_game, 'last_game_at', p.last_game_at, 'created_at', p.created_at,
    'stats', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id' order by g.plays desc) from public.game_stats g where g.user_id = u), '[]'),
    'inventory', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'item_id', i.item_id, 'qty', i.qty, 'acquired_at', i.acquired_at) order by i.acquired_at desc) from public.inventory i where i.user_id = u and i.qty >= 1), '[]'),
    'characters', coalesce((select jsonb_object_agg(c.character_id, c.stars) from public.user_characters c where c.user_id = u), '{}'),
    'char_prog', coalesce((select jsonb_object_agg(c.character_id, jsonb_build_object('level', c.level, 'exp', c.char_exp, 'loadout', c.loadout)) from public.user_characters c where c.user_id = u), '{}'),
    'login', jsonb_build_object(
      'today', v_today, 'streak', p.login_streak, 'claimed', coalesce(ld.claimed_at is not null, false),
      'cycle_day', coalesce(ld.cycle_day, ((p.login_streak) % 7) + 1),
      'rewards', coalesce((select jsonb_agg(to_jsonb(r) order by r.day) from public.login_rewards r), '[]'),
      'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.streak) from public.login_milestones m), '[]'))
  );
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._eco(), public._eco_num(text[], numeric), public._stamina_max(int), public._stamina_sync(uuid), public._stamina_spend(uuid, int),
  public._stamina_info(uuid), public._grant_qty(uuid, text, text, int), public._char_need(int), public._char_max_exp(), public._char_level_of(int) from public, anon, authenticated;
revoke all on function public.record_game_result(uuid, text, text, int, boolean, int, boolean, text, boolean, text, int, int) from public, anon, authenticated;
grant execute on function public.record_game_result(uuid, text, text, int, boolean, int, boolean, text, boolean, text, int, int) to service_role;
revoke all on function public.get_stamina(), public.use_item(text, int), public.char_level_up(text, jsonb), public.set_char_slot(text, text, text) from public, anon;
grant execute on function public.get_stamina(), public.use_item(text, int), public.char_level_up(text, jsonb), public.set_char_slot(text, text, text), public.get_profile() to authenticated;
