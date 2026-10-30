-- ===================================================================================
-- v6 · ระบบ "เล่นแล้วได้ ไม่มีเสีย" + เลเวลผู้เล่น + แต้มกิจกรรม/เพชรจากเควส + แบทเทิลพาส
-- รันต่อจาก schema.sql (รันซ้ำได้ ปลอดภัย) แล้วตามด้วย v7_stamina.sql → v7_config.sql → bp_seed.sql · รัน v6 ซ้ำเมื่อไหร่ต้องรัน v7 ตามเสมอ
-- - เหรียญจากเกม: เซิร์ฟเวอร์ส่งเหรียญตามอันดับ (บวกเสมอ) · ฐานข้อมูลตัดเพดานรายวัน (เต็มจำนวนถึง daily_coin_cap แล้วตาละ over_cap_coins)
-- - EXP ผู้เล่นทุกตา · ขึ้นเลเวลได้เพชร (ทุก 10 เลเวลได้รางวัลใหญ่) — สูตรเดียวกับ economy.js
-- - เควสรายวันมีแต้มกิจกรรม (ข้อละ 25 รวม 100) · โบนัสครบ = เหรียญ + เพชร + EXP แบทเทิลพาส · เควสรายสัปดาห์ให้เพชร + EXP แบทเทิลพาส
-- - แบทเทิลพาส: ฤดู/รางวัล 3 สาย (ฟรี · เพชร · พรีเมียม) · ปลดสายเพิ่ม EXP สายละ % · เลยเลเวลสูงสุดได้รางวัลวน
-- - อัปดาวใช้เหรียญด้วย · เปลี่ยนชื่อครั้งแรกฟรี ครั้งต่อไปเสียเหรียญ
-- ===================================================================================

insert into public.game_config(key, value) values
  ('daily_coin_cap',   '1500'),          -- เหรียญจากเกมต่อวัน (เต็มจำนวน)
  ('over_cap_coins',   '5'),             -- เกินเพดานแล้วได้ตาละเท่านี้
  ('exp_play',         '20'),            -- EXP ผู้เล่นต่อตา
  ('exp_win',          '10'),            -- EXP เพิ่มเมื่อได้ที่ 1
  ('lv_gems',          '5'),             -- รางวัลขึ้นเลเวล
  ('lv10_gems',        '30'),            -- ทุก 10 เลเวล
  ('lv10_coins',       '1000'),
  ('daily_bonus_mcash','5'),             -- โบนัสครบเควสรายวัน (เพิ่มจากเหรียญเดิม)
  ('weekly_bonus_mcash','10'),
  ('star_coin_cost',   '[500,1000,2000,4000]'),   -- เหรียญที่ใช้อัปดาว 1→2, 2→3, ...
  ('rename_cost',      '500')            -- เปลี่ยนชื่อครั้งที่ 2 เป็นต้นไป
on conflict (key) do nothing;

-- ---------- คอลัมน์ใหม่ ----------
alter table public.profiles   add column if not exists player_exp   bigint not null default 0;
alter table public.profiles   add column if not exists name_changes int    not null default 0;
alter table public.quest_defs add column if not exists points       int    not null default 0;   -- แต้มกิจกรรม (เควสรายวัน)
alter table public.quest_defs add column if not exists reward_bp    int    not null default 0;   -- EXP แบทเทิลพาส
alter table public.quest_bonus add column if not exists mcash       int    not null default 0;
alter table public.quest_bonus add column if not exists bp          int    not null default 0;
alter table public.game_log   add column if not exists raw_delta    int    not null default 0;   -- เหรียญก่อนตัดเพดาน
alter table public.game_log   add column if not exists exp_gain     int    not null default 0;
alter table public.game_log   add column if not exists bp_gain      int    not null default 0;

-- เควส: รายวันข้อละ 25 แต้ม (4 ข้อ = 100) · รายสัปดาห์ข้อละ 5 เพชร + 750 EXP แบทเทิลพาส
update public.quest_defs set points = 25 where period = 'daily' and points = 0;
update public.quest_defs set reward_mcash = 5 where period = 'weekly' and reward_mcash = 0;
update public.quest_defs set reward_bp = 750 where period = 'weekly' and reward_bp = 0;
update public.quest_defs set description = replace(description, 'ได้เหรียญจากการชนะรวม', 'ได้เหรียญจากการเล่นรวม') where metric = 'coins';

-- ---------- แบทเทิลพาส ----------
create table if not exists public.bp_seasons (
  id           text primary key,
  name         text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  level_exp    int  not null default 1000,
  max_level    int  not null default 50,
  gem_cost     int  not null default 300,
  premium_open boolean not null default false,       -- สายพรีเมียมยังไม่เปิด (ต้องมีระบบเติมเงินก่อน)
  cycle_coins  int  not null default 200,            -- รางวัลวนหลังเลเวลสูงสุด (ต่อเลเวล)
  exp_cfg      jsonb not null default '{}'::jsonb     -- dailyBonus · weeklyQuest · weeklyBonus · perGame · perGameDailyCap · tierBonusPct
);
create table if not exists public.bp_rewards (
  season_id text not null references public.bp_seasons(id) on delete cascade,
  level     int  not null,
  track     text not null check (track in ('free','gem','premium')),
  coins     int  not null default 0,
  mcash     int  not null default 0,
  item_kind text,
  item_id   text,
  preview   text,                                     -- ของที่ยังไม่ได้ทำ: แสดงชื่ออย่างเดียว
  primary key (season_id, level, track)
);
create table if not exists public.user_bp (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  season_id  text not null references public.bp_seasons(id) on delete cascade,
  exp        int  not null default 0,
  gem        boolean not null default false,
  premium    boolean not null default false,
  claimed    jsonb not null default '{"free":[],"gem":[],"premium":[]}'::jsonb,
  cycle_claimed int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);
alter table public.bp_seasons enable row level security;
alter table public.bp_rewards enable row level security;
alter table public.user_bp    enable row level security;
drop policy if exists "public read" on public.bp_seasons; create policy "public read" on public.bp_seasons for select to anon, authenticated using (true);
drop policy if exists "public read" on public.bp_rewards; create policy "public read" on public.bp_rewards for select to anon, authenticated using (true);
drop policy if exists "own read" on public.user_bp;      create policy "own read" on public.user_bp for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete, truncate on public.bp_seasons, public.bp_rewards, public.user_bp from anon, authenticated;

-- ---------- ตัวช่วย ----------
create or replace function public._cfg_int(p_key text, p_def int) returns int
language sql stable set search_path = public as $$ select coalesce((public._cfg(p_key) #>> '{}')::int, p_def) $$;

-- exp สะสม → เลเวล: เลเวลถัดไปต้องใช้ 100 + 25×(เลเวล−1) (ต้องตรงกับ Economy.levelOf ใน economy.js — เทสต์ตรวจให้)
create or replace function public._level_of(p_exp bigint) returns int
language plpgsql immutable as $$
declare lv int := 1; left_ bigint := greatest(0, coalesce(p_exp, 0)); base int := 100; step int := 25;
begin
  while left_ >= base + step * (lv - 1) and lv < 999 loop left_ := left_ - (base + step * (lv - 1)); lv := lv + 1; end loop;
  return lv;
end $$;

-- ให้ของ 1 ชิ้นเข้าคลัง (ตัวละครใหม่ → สร้างแถวดาว)
create or replace function public._grant_item(p_user uuid, p_kind text, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare v_have int := public._qty(p_user, p_kind, p_id);
begin
  insert into public.inventory(user_id, kind, item_id, qty) values (p_user, p_kind, p_id, v_have + 1)
  on conflict (user_id, kind, item_id) do update set qty = excluded.qty;
  if v_have = 0 and p_kind = 'characters' then insert into public.user_characters(user_id, character_id) values (p_user, p_id) on conflict do nothing; end if;
end $$;

-- ฤดูที่เปิดอยู่ตอนนี้ (ไม่มี = null)
create or replace function public._bp_season() returns public.bp_seasons
language sql stable security definer set search_path = public as $$
  select * from public.bp_seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1 $$;

-- เพิ่ม EXP แบทเทิลพาส (คิดโบนัสสายที่ปลดแล้ว) · คืนค่าที่เพิ่มจริง
create or replace function public._bp_add(p_user uuid, p_exp int) returns int
language plpgsql security definer set search_path = public as $$
declare s public.bp_seasons := public._bp_season(); ub public.user_bp; v_pct int; v_add int;
begin
  if s.id is null or coalesce(p_exp, 0) <= 0 then return 0; end if;
  insert into public.user_bp(user_id, season_id) values (p_user, s.id) on conflict do nothing;
  select * into ub from public.user_bp where user_id = p_user and season_id = s.id for update;
  v_pct := coalesce((s.exp_cfg ->> 'tierBonusPct')::int, 3) * ((ub.gem)::int + (ub.premium)::int);
  v_add := p_exp + floor(p_exp * v_pct / 100.0)::int;
  update public.user_bp set exp = exp + v_add, updated_at = now() where user_id = p_user and season_id = s.id;
  return v_add;
end $$;

-- ---------- ผลเกม (เรียกโดยเซิร์ฟเวอร์เกมเท่านั้น) ----------
-- p_delta = เหรียญตามอันดับที่เซิร์ฟเวอร์คำนวณ (ไม่ติดลบ) · ตัดเพดานรายวัน · EXP ผู้เล่น/เลเวล · EXP แบทเทิลพาส (มีเพดานรายวัน)
create or replace function public.record_game_result(
  p_user uuid, p_gid text, p_game text, p_delta int, p_won boolean default false,
  p_melds int default 0, p_knock boolean default false, p_char text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_res text; v_id bigint; v_coins bigint; v_mcash bigint; v_today_coins bigint; v_today_games int; v_from timestamptz := public._day_start(public.game_day());
        v_cap int := public._cfg_int('daily_coin_cap', 1500); v_over int := public._cfg_int('over_cap_coins', 5); v_paid int; v_capped boolean := false;
        v_exp int; v_old_exp bigint; v_old_lv int; v_new_lv int; v_lv int; v_lv_c int := 0; v_lv_m int := 0;
        s public.bp_seasons := public._bp_season(); v_bp int := 0; v_bp_per int; v_bp_cap int;
begin
  if p_gid is null or p_game is null or p_game !~ '^[a-z0-9_-]{1,30}$' then raise exception 'ข้อมูลผลเกมไม่ถูกต้อง'; end if;
  p_delta := greatest(0, least(10000, coalesce(p_delta, 0)));      -- ไม่มีการเสียเหรียญจากการเล่นแล้ว
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'ไม่พบผู้เล่น'; end if;
  if exists (select 1 from public.game_log where user_id = p_user and gid = p_gid) then
    select coins, mcash into v_coins, v_mcash from public.profiles where id = p_user;
    return jsonb_build_object('duplicate', true, 'coins', v_coins, 'mcash', v_mcash);
  end if;
  -- เพดานเหรียญรายวัน
  select coalesce(sum(coin_delta), 0), count(*) into v_today_coins, v_today_games from public.game_log where user_id = p_user and played_at >= v_from;
  if v_today_coins >= v_cap then v_paid := least(p_delta, v_over); v_capped := true;
  else v_paid := least(p_delta, greatest(v_cap - v_today_coins, v_over)); v_capped := v_paid < p_delta; end if;
  v_res := case when p_won then 'win' else 'loss' end;   -- ได้ที่ 1 = ชนะ
  -- EXP ผู้เล่น
  v_exp := public._cfg_int('exp_play', 20) + case when p_won then public._cfg_int('exp_win', 10) else 0 end;
  select player_exp into v_old_exp from public.profiles where id = p_user;
  v_old_lv := public._level_of(v_old_exp); v_new_lv := public._level_of(v_old_exp + v_exp);
  update public.profiles set player_exp = player_exp + v_exp, last_game = p_game, last_game_at = now() where id = p_user;
  if v_new_lv > v_old_lv then
    for v_lv in (v_old_lv + 1)..v_new_lv loop
      if v_lv % 10 = 0 then v_lv_m := v_lv_m + public._cfg_int('lv10_gems', 30); v_lv_c := v_lv_c + public._cfg_int('lv10_coins', 1000);
      else v_lv_m := v_lv_m + public._cfg_int('lv_gems', 5); end if;
    end loop;
  end if;
  -- EXP แบทเทิลพาสจากการเล่น (มีเพดานต่อวัน)
  if s.id is not null then
    v_bp_per := coalesce((s.exp_cfg ->> 'perGame')::int, 30); v_bp_cap := coalesce((s.exp_cfg ->> 'perGameDailyCap')::int, 300);
    if (v_today_games + 1) * v_bp_per <= v_bp_cap then v_bp := public._bp_add(p_user, v_bp_per); end if;
  end if;
  insert into public.game_log(user_id, gid, game_id, result, coin_delta, bonus, melds, knock, character_id, raw_delta, exp_gain, bp_gain)
  values (p_user, p_gid, p_game, v_res, v_paid, 0, greatest(0, least(100, coalesce(p_melds, 0))), coalesce(p_knock, false), p_char, p_delta, v_exp, v_bp)
  on conflict (user_id, gid) do nothing returning id into v_id;
  if v_id is null then
    select coins, mcash into v_coins, v_mcash from public.profiles where id = p_user;
    return jsonb_build_object('duplicate', true, 'coins', v_coins, 'mcash', v_mcash);
  end if;
  insert into public.game_stats(user_id, game_id, plays, wins, losses, draws, coins_won, coins_lost, last_played_at)
  values (p_user, p_game, 1, (v_res = 'win')::int, (v_res = 'loss')::int, 0, v_paid, 0, now())
  on conflict (user_id, game_id) do update set plays = game_stats.plays + 1, wins = game_stats.wins + excluded.wins,
    losses = game_stats.losses + excluded.losses, coins_won = game_stats.coins_won + excluded.coins_won, last_played_at = now();
  v_coins := public._wallet_add(p_user, 'coins', v_paid + v_lv_c, 'game:' || p_game, p_gid);
  if v_lv_m > 0 then perform public._wallet_add(p_user, 'mcash', v_lv_m, 'level', 'lv' || v_new_lv); end if;
  select mcash into v_mcash from public.profiles where id = p_user;
  return jsonb_build_object('duplicate', false, 'result', v_res, 'delta', v_paid, 'raw', p_delta, 'capped', v_capped, 'bonus', 0,
    'coins', v_coins, 'mcash', v_mcash, 'exp', v_exp, 'player_exp', v_old_exp + v_exp, 'level', v_new_lv,
    'level_up', v_new_lv > v_old_lv, 'level_coins', v_lv_c, 'level_mcash', v_lv_m, 'bp', v_bp,
    'today_coins', v_today_coins + v_paid, 'cap', v_cap);
end $$;

-- ---------- เควส: แต้มกิจกรรม + เพชร + EXP แบทเทิลพาส ----------
create or replace function public._quest_block(p_user uuid, p_period text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_key date := case p_period when 'daily' then public.game_day() else public.game_week() end;
        v_list jsonb; v_bonus bigint; v_bm int; v_bp int; v_claimed boolean; v_all boolean; s public.bp_seasons := public._bp_season(); v_pts int; v_pts_max int;
begin
  select coalesce(jsonb_agg(x order by (x->>'reward_coins')::int), '[]') into v_list from (
    select jsonb_build_object('id', q.id, 'name', q.name, 'description', q.description, 'icon', q.icon, 'metric', q.metric,
      'target', q.target, 'progress', least(public._quest_progress(p_user, q, v_key), q.target),
      'reward_coins', q.reward_coins, 'reward_mcash', q.reward_mcash, 'points', q.points,
      'reward_bp', case when s.id is null then 0 else q.reward_bp end,
      'claimed', exists (select 1 from public.user_quests uq where uq.user_id = p_user and uq.quest_id = q.id and uq.period_key = v_key)) as x
    from public._pick_quests(p_period, v_key) q) s0;
  v_all := coalesce((select bool_and((e->>'claimed')::boolean) from jsonb_array_elements(v_list) e), false);
  v_pts := coalesce((select sum((e->>'points')::int) filter (where (e->>'claimed')::boolean) from jsonb_array_elements(v_list) e), 0);
  v_pts_max := coalesce((select sum((e->>'points')::int) from jsonb_array_elements(v_list) e), 0);
  v_bonus := coalesce((public._cfg(p_period || '_bonus_coins') #>> '{}')::bigint, 0);
  v_bm := public._cfg_int(p_period || '_bonus_mcash', 0);
  v_bp := case when s.id is null then 0 else coalesce((s.exp_cfg ->> case p_period when 'daily' then 'dailyBonus' else 'weeklyBonus' end)::int, 0) end;
  v_claimed := exists (select 1 from public.quest_bonus where user_id = p_user and period = p_period and period_key = v_key);
  return jsonb_build_object('key', v_key, 'resets_at', public._day_start(v_key + case p_period when 'daily' then 1 else 7 end),
    'quests', v_list, 'points', v_pts, 'points_max', v_pts_max,
    'bonus', jsonb_build_object('coins', v_bonus, 'mcash', v_bm, 'bp', v_bp, 'ready', v_all and not v_claimed, 'claimed', v_claimed));
end $$;

create or replace function public.claim_quest(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); q public.quest_defs; v_key date; v_bp int := 0;
begin
  select * into q from public.quest_defs where id = p_id and active;
  if not found then raise exception 'ไม่พบเควสนี้'; end if;
  v_key := case q.period when 'daily' then public.game_day() else public.game_week() end;
  if not exists (select 1 from public._pick_quests(q.period, v_key) x where x.id = q.id) then raise exception 'เควสนี้ไม่อยู่ในรอบนี้'; end if;
  perform 1 from public.profiles where id = u for update;
  if exists (select 1 from public.user_quests where user_id = u and quest_id = q.id and period_key = v_key) then raise exception 'รับรางวัลเควสนี้แล้ว'; end if;
  if public._quest_progress(u, q, v_key) < q.target then raise exception 'เควสยังไม่สำเร็จ'; end if;
  insert into public.user_quests(user_id, quest_id, period_key) values (u, q.id, v_key);
  if q.reward_coins > 0 then perform public._wallet_add(u, 'coins', q.reward_coins, 'quest', q.id || ':' || v_key); end if;
  if q.reward_mcash > 0 then perform public._wallet_add(u, 'mcash', q.reward_mcash, 'quest', q.id || ':' || v_key); end if;
  if q.reward_bp > 0 then v_bp := public._bp_add(u, q.reward_bp); end if;
  return jsonb_build_object('coins', q.reward_coins, 'mcash', q.reward_mcash, 'points', q.points, 'bp', v_bp);
end $$;

create or replace function public.claim_quest_bonus(p_period text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_key date; v_blk jsonb; v_amt bigint; v_m int; v_bp int := 0;
begin
  if p_period not in ('daily','weekly') then raise exception 'ช่วงเวลาไม่ถูกต้อง'; end if;
  v_key := case p_period when 'daily' then public.game_day() else public.game_week() end;
  perform 1 from public.profiles where id = u for update;
  v_blk := public._quest_block(u, p_period);
  if not (v_blk->'bonus'->>'ready')::boolean then raise exception 'ยังรับโบนัสไม่ได้'; end if;
  v_amt := (v_blk->'bonus'->>'coins')::bigint; v_m := (v_blk->'bonus'->>'mcash')::int;
  if v_amt > 0 then perform public._wallet_add(u, 'coins', v_amt, 'quest_bonus', p_period || ':' || v_key); end if;
  if v_m > 0 then perform public._wallet_add(u, 'mcash', v_m, 'quest_bonus', p_period || ':' || v_key); end if;
  v_bp := public._bp_add(u, (v_blk->'bonus'->>'bp')::int);
  insert into public.quest_bonus(user_id, period, period_key, coins, mcash, bp) values (u, p_period, v_key, v_amt, v_m, v_bp);
  return jsonb_build_object('coins', v_amt, 'mcash', v_m, 'bp', v_bp);
end $$;

-- ---------- แบทเทิลพาส: ดู / รับรางวัล / ปลดสายเพชร ----------
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
      'item_kind', r.item_kind, 'item_id', r.item_id, 'preview', r.preview) order by r.level, r.track) from public.bp_rewards r where r.season_id = s.id), '[]'),
    'me', jsonb_build_object('exp', ub.exp, 'gem', ub.gem, 'premium', ub.premium, 'claimed', ub.claimed, 'cycle_claimed', ub.cycle_claimed),
    'now', now());
end $$;

-- รับรางวัลทุกเลเวลที่ถึงแล้วของสายที่ปลด (กดครั้งเดียวรับหมด) + รางวัลวนหลังเลเวลสูงสุด
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
      perform public._grant_item(u, r.item_kind, r.item_id); v_items := v_items || jsonb_build_object('kind', r.item_kind, 'id', r.item_id);
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

create or replace function public.buy_bp_gem() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); s public.bp_seasons := public._bp_season(); ub public.user_bp; v_have bigint;
begin
  if s.id is null then raise exception 'ตอนนี้ไม่มีฤดูแบทเทิลพาส'; end if;
  insert into public.user_bp(user_id, season_id) values (u, s.id) on conflict do nothing;
  select * into ub from public.user_bp where user_id = u and season_id = s.id for update;
  if ub.gem then raise exception 'ปลดสายเพชรของฤดูนี้แล้ว'; end if;
  select mcash into v_have from public.profiles where id = u for update;
  if v_have < s.gem_cost then raise exception 'เพชรไม่พอ (มี % / ต้องใช้ %)', v_have, s.gem_cost; end if;
  perform public._wallet_add(u, 'mcash', -s.gem_cost, 'bp_gem', s.id);
  update public.user_bp set gem = true, updated_at = now() where user_id = u and season_id = s.id;
  return jsonb_build_object('gem', true, 'mcash', v_have - s.gem_cost);
end $$;

-- ---------- อัปดาวใช้เหรียญด้วย ----------
create or replace function public.upgrade_star(p_char text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); d public.character_defs; v_stars int; v_max int; v_need int; v_costs jsonb; v_qty int; v_coin int; v_have bigint;
begin
  if p_char !~ '^[A-Za-z0-9_.-]{1,60}$' then raise exception 'ตัวละครไม่ถูกต้อง'; end if;
  perform 1 from public.profiles where id = u for update;
  v_qty := public._qty(u, 'characters', p_char);
  if v_qty < 1 then raise exception 'คุณยังไม่มีตัวละครนี้'; end if;
  select * into d from public.character_defs where id = p_char;
  v_max := coalesce(d.max_stars, (public._cfg('max_stars') #>> '{}')::int, 5);
  select stars into v_stars from public.user_characters where user_id = u and character_id = p_char;
  v_stars := coalesce(v_stars, 1);
  if v_stars >= v_max then raise exception 'ตัวละครนี้ดาวเต็มแล้ว'; end if;
  if d.star_costs is not null and array_length(d.star_costs, 1) >= v_stars then v_need := d.star_costs[v_stars];
  else
    v_costs := public._cfg('star_copies');
    v_need := coalesce((v_costs ->> (v_stars - 1))::int, (v_costs ->> (jsonb_array_length(v_costs) - 1))::int, 1);
  end if;
  v_need := greatest(1, v_need);
  v_costs := public._cfg('star_coin_cost');
  v_coin := coalesce((v_costs ->> (v_stars - 1))::int, (v_costs ->> (jsonb_array_length(v_costs) - 1))::int, 0);
  if v_qty - 1 < v_need then raise exception 'ต้องมีตัวซ้ำอีก % ตัว (มี % / ต้องใช้ %) — สุ่มกาชาเพื่อหาตัวซ้ำ', v_need - (v_qty - 1), v_qty - 1, v_need; end if;
  select coins into v_have from public.profiles where id = u;
  if v_have < v_coin then raise exception 'เหรียญไม่พอ (มี % / ต้องใช้ %)', v_have, v_coin; end if;
  update public.inventory set qty = qty - v_need where user_id = u and kind = 'characters' and item_id = p_char;
  if v_coin > 0 then perform public._wallet_add(u, 'coins', -v_coin, 'star', p_char || ':' || (v_stars + 1)); end if;
  insert into public.user_characters(user_id, character_id, stars) values (u, p_char, v_stars + 1)
  on conflict (user_id, character_id) do update set stars = excluded.stars, updated_at = now();
  return jsonb_build_object('character', p_char, 'stars', v_stars + 1, 'used', v_need, 'coins_used', v_coin);
end $$;

-- ---------- เปลี่ยนชื่อ: ครั้งแรกฟรี ครั้งต่อไปเสียเหรียญ (ฉายาแก้ฟรี) ----------
create or replace function public.update_profile(p_name text default null, p_title text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_name text; v_title text; p public.profiles; v_cost int := 0;
begin
  select * into p from public.profiles where id = u for update;
  if p_name is not null then
    v_name := left(trim(regexp_replace(p_name, '[[:cntrl:]]', '', 'g')), 14);
    if v_name = '' then raise exception 'ชื่อห้ามว่าง'; end if;
    if public._bad_name(v_name) is not null then raise exception '%', public._bad_name(v_name); end if;
    if v_name <> p.display_name then
      if p.name_changes >= 1 then v_cost := public._cfg_int('rename_cost', 500); end if;
      if p.coins < v_cost then raise exception 'เหรียญไม่พอเปลี่ยนชื่อ (ต้องใช้ %)', v_cost; end if;
      if v_cost > 0 then perform public._wallet_add(u, 'coins', -v_cost, 'rename', v_name); end if;
      update public.profiles set display_name = v_name, name_changes = name_changes + 1, updated_at = now() where id = u;
    end if;
  end if;
  if p_title is not null then
    v_title := left(trim(regexp_replace(p_title, '[[:cntrl:]]', '', 'g')), 16);
    if v_title <> '' and public._bad_name(v_title) is not null then raise exception 'ฉายา: %', public._bad_name(v_title); end if;
    update public.profiles set title = v_title, updated_at = now() where id = u;
  end if;
  return (select jsonb_build_object('display_name', display_name, 'title', title, 'coins', coins, 'name_changes', name_changes, 'cost', v_cost) from public.profiles where id = u);
end $$;

-- ---------- โปรไฟล์: เพิ่มเลเวล + ค่าเปลี่ยนชื่อ ----------
create or replace function public.get_profile() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); p public.profiles; v_today date := public.game_day(); ld public.login_days; v_today_coins bigint;
begin
  select * into p from public.profiles where id = u;
  if not found then raise exception 'ไม่พบโปรไฟล์'; end if;
  select * into ld from public.login_days where user_id = u and day = v_today;
  select coalesce(sum(coin_delta), 0) into v_today_coins from public.game_log where user_id = u and played_at >= public._day_start(v_today);
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'title', p.title,
    'coins', p.coins, 'mcash', p.mcash, 'equipped', p.equipped,
    'player_exp', p.player_exp, 'level', public._level_of(p.player_exp), 'name_changes', p.name_changes, 'rename_cost', public._cfg_int('rename_cost', 500),
    'today_coins', v_today_coins, 'daily_coin_cap', public._cfg_int('daily_coin_cap', 1500), 'star_coin_cost', public._cfg('star_coin_cost'),
    'last_login_at', p.last_login_at, 'login_streak', p.login_streak, 'best_streak', p.best_streak, 'total_login_days', p.total_login_days,
    'last_game', p.last_game, 'last_game_at', p.last_game_at, 'created_at', p.created_at,
    'stats', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id' order by g.plays desc) from public.game_stats g where g.user_id = u), '[]'),
    'inventory', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'item_id', i.item_id, 'qty', i.qty, 'acquired_at', i.acquired_at) order by i.acquired_at desc) from public.inventory i where i.user_id = u and i.qty >= 1), '[]'),
    'characters', coalesce((select jsonb_object_agg(c.character_id, c.stars) from public.user_characters c where c.user_id = u), '{}'),
    'login', jsonb_build_object(
      'today', v_today, 'streak', p.login_streak, 'claimed', coalesce(ld.claimed_at is not null, false),
      'cycle_day', coalesce(ld.cycle_day, ((p.login_streak) % 7) + 1),
      'rewards', coalesce((select jsonb_agg(to_jsonb(r) order by r.day) from public.login_rewards r), '[]'),
      'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.streak) from public.login_milestones m), '[]'))
  );
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._cfg_int(text, int), public._level_of(bigint), public._grant_item(uuid, text, text), public._bp_season(), public._bp_add(uuid, int) from public, anon, authenticated;
revoke all on function public.get_bp(), public.claim_bp(), public.buy_bp_gem() from public, anon;
grant execute on function public.get_bp(), public.claim_bp(), public.buy_bp_gem() to authenticated;
grant execute on function public.record_game_result(uuid, text, text, int, boolean, int, boolean, text) to service_role;
