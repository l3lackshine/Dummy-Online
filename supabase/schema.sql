-- Dummy Dummy — ฐานข้อมูลบัญชีผู้เล่น (Supabase / Postgres)  v2
-- วางทั้งไฟล์ใน SQL Editor แล้ว Run (รันซ้ำได้ ข้อมูลเดิมไม่หาย)
-- หลักการ: ผู้เล่น "อ่าน" ข้อมูลตัวเองได้ แต่ "เขียน" ได้เฉพาะผ่านฟังก์ชัน (RPC) ด้านล่าง
-- เวลาตัดวัน/สัปดาห์ = เที่ยงคืนเวลาไทย (Asia/Bangkok) สัปดาห์เริ่มวันจันทร์ — รีเซ็ตเควสต์อัตโนมัติ ไม่ต้องมี cron

-- ===== ตารางหลัก =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'ผู้เล่น',
  coins integer not null default 5000 check (coins >= 0),          -- เหรียญเดิมพันในเกม
  mcash integer not null default 0 check (mcash >= 0),              -- MCash (เหรียญเติมเงิน)
  owned jsonb not null default '["classic"]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  last_game text,                                                    -- เกมที่เล่นล่าสุด
  last_login_at timestamptz,                                         -- ล็อกอินล่าสุด
  login_streak integer not null default 0,                           -- รับรางวัลล็อกอินติดต่อกัน (วัน)
  best_streak integer not null default 0,
  total_login_days integer not null default 0,
  last_claim_date date,                                              -- วัน (เวลาไทย) ที่รับรางวัลล็อกอินล่าสุด
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles
  add column if not exists mcash integer not null default 0,
  add column if not exists last_game text,
  add column if not exists last_login_at timestamptz,
  add column if not exists login_streak integer not null default 0,
  add column if not exists best_streak integer not null default 0,
  add column if not exists total_login_days integer not null default 0,
  add column if not exists last_claim_date date,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.game_stats (          -- สถิติแยกตามเกม
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  plays integer not null default 0, wins integer not null default 0,
  losses integer not null default 0, draws integer not null default 0,
  coins_won bigint not null default 0,                  -- เหรียญสุทธิ (ได้ − เสีย)
  last_played_at timestamptz,
  primary key (user_id, game)
);
create table if not exists public.game_log (            -- ประวัติทุกตา (กันบันทึกซ้ำด้วย gid)
  user_id uuid not null references auth.users(id) on delete cascade,
  gid text not null, game text not null, result text not null, delta integer not null,
  at timestamptz not null default now(),
  primary key (user_id, gid)
);
create table if not exists public.purchases (           -- รายการที่ซื้อจากร้านค้า
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null, price integer not null, currency text not null default 'coins',
  created_at timestamptz not null default now(),
  unique (user_id, item_key)
);
create table if not exists public.shop_items (          -- ราคาสินค้า (ราคาจริงอยู่ที่ฐานข้อมูล ผู้เล่นแก้เองไม่ได้)
  item_key text primary key, kind text not null, item_id text not null, price integer not null check (price >= 0)
);
create table if not exists public.login_rewards (       -- รางวัลล็อกอินรายวัน วนรอบ 7 วัน
  day integer primary key check (day between 1 and 7), coins integer not null default 0, mcash integer not null default 0
);
create table if not exists public.quest_defs (          -- เควสต์ (daily = รีเซ็ตทุกวัน, weekly = รีเซ็ตทุกสัปดาห์)
  id text primary key,
  period text not null check (period in ('daily','weekly')),
  title text not null,
  metric text not null check (metric in ('play','win','login','coins_won')),
  game text,                                            -- null = นับทุกเกม
  target integer not null check (target > 0),
  reward_coins integer not null default 0, sort integer not null default 0
);
create table if not exists public.quest_progress (      -- ความคืบหน้า 1 แถวต่อ เควสต์ ต่อ รอบ (period_key = วันที่เริ่มรอบ)
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references public.quest_defs(id) on delete cascade,
  period_key date not null,
  progress integer not null default 0, claimed boolean not null default false,
  primary key (user_id, quest_id, period_key)
);

-- ===== สิทธิ์ (RLS): อ่านของตัวเองได้อย่างเดียว =====
alter table public.profiles enable row level security;
alter table public.game_stats enable row level security;
alter table public.game_log enable row level security;
alter table public.purchases enable row level security;
alter table public.quest_progress enable row level security;
alter table public.shop_items enable row level security;
alter table public.login_rewards enable row level security;
alter table public.quest_defs enable row level security;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "stats_select_own" on public.game_stats;  create policy "stats_select_own" on public.game_stats for select using (auth.uid() = user_id);
drop policy if exists "log_select_own" on public.game_log;      create policy "log_select_own" on public.game_log for select using (auth.uid() = user_id);
drop policy if exists "buy_select_own" on public.purchases;     create policy "buy_select_own" on public.purchases for select using (auth.uid() = user_id);
drop policy if exists "qp_select_own" on public.quest_progress; create policy "qp_select_own" on public.quest_progress for select using (auth.uid() = user_id);
drop policy if exists "shop_read" on public.shop_items;         create policy "shop_read" on public.shop_items for select using (true);
drop policy if exists "rewards_read" on public.login_rewards;   create policy "rewards_read" on public.login_rewards for select using (true);
drop policy if exists "quests_read" on public.quest_defs;       create policy "quests_read" on public.quest_defs for select using (true);

-- ===== สร้างโปรไฟล์อัตโนมัติเมื่อสมัคร =====
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'name',''), 'ผู้เล่น'), 14))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ===== ตัวช่วยเวลาไทย =====
create or replace function public.bkk_today() returns date language sql stable as
$$ select (now() at time zone 'Asia/Bangkok')::date $$;
create or replace function public.bkk_week_start() returns date language sql stable as
$$ select date_trunc('week', now() at time zone 'Asia/Bangkok')::date $$;

-- ===== เพิ่มความคืบหน้าเควสต์ (ใช้ภายใน) =====
create or replace function public.quest_add(p_uid uuid, p_metric text, p_game text, p_amt integer)
returns void language plpgsql security definer set search_path = public as $$
declare q record; pk date;
begin
  for q in select * from public.quest_defs where metric = p_metric and (game is null or game = p_game) loop
    pk := case q.period when 'daily' then public.bkk_today() else public.bkk_week_start() end;
    insert into public.quest_progress (user_id, quest_id, period_key, progress)
    values (p_uid, q.id, pk, least(q.target, p_amt))
    on conflict (user_id, quest_id, period_key)
    do update set progress = least(q.target, public.quest_progress.progress + p_amt);
  end loop;
end $$;

-- ===== โหลดข้อมูลทั้งหมดของผู้เล่น (เรียกตอนล็อกอิน: p_login = true จะบันทึกเวลาล็อกอินล่าสุด) =====
create or replace function public.app_sync(p_login boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles; today date := public.bkk_today(); wk date := public.bkk_week_start();
        eff integer; cyc integer; claimed boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  if p_login then update public.profiles set last_login_at = now() where id = uid; end if;
  select * into p from public.profiles where id = uid;
  claimed := (p.last_claim_date = today);
  eff := case when p.last_claim_date is null then 0 when p.last_claim_date >= today - 1 then p.login_streak else 0 end;
  cyc := case when claimed then ((eff - 1) % 7) + 1 else (eff % 7) + 1 end;
  return jsonb_build_object(
    'profile', jsonb_build_object('name', p.name, 'coins', p.coins, 'mcash', p.mcash, 'owned', p.owned, 'equipped', p.equipped,
      'last_game', p.last_game, 'last_login_at', p.last_login_at, 'best_streak', p.best_streak,
      'total_login_days', p.total_login_days, 'created_at', p.created_at),
    'login', jsonb_build_object('today', today, 'claimed_today', claimed, 'streak', eff, 'cycle_day', cyc,
      'rewards', (select coalesce(jsonb_agg(to_jsonb(r) order by r.day), '[]'::jsonb) from public.login_rewards r)),
    'stats', (select coalesce(jsonb_agg(jsonb_build_object('game', g.game, 'plays', g.plays, 'wins', g.wins, 'losses', g.losses,
      'draws', g.draws, 'coins_won', g.coins_won, 'last_played_at', g.last_played_at) order by g.last_played_at desc), '[]'::jsonb)
      from public.game_stats g where g.user_id = uid),
    'quests', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'period', d.period, 'title', d.title, 'game', d.game,
      'target', d.target, 'reward_coins', d.reward_coins, 'progress', coalesce(qp.progress, 0), 'claimed', coalesce(qp.claimed, false))
      order by d.period, d.sort), '[]'::jsonb)
      from public.quest_defs d left join public.quest_progress qp
        on qp.user_id = uid and qp.quest_id = d.id and qp.period_key = (case d.period when 'daily' then today else wk end)),
    'purchases', (select coalesce(jsonb_agg(item_key), '[]'::jsonb) from public.purchases where user_id = uid));
end $$;

-- ===== รับรางวัลล็อกอินรายวัน =====
create or replace function public.claim_login() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles; today date := public.bkk_today(); ns integer; v_day integer; rc integer; rm integer; bal integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into p from public.profiles where id = uid for update;
  if p.last_claim_date = today then return jsonb_build_object('ok', false, 'error', 'already'); end if;
  ns := case when p.last_claim_date = today - 1 then p.login_streak + 1 else 1 end;   -- ขาดวัน = เริ่มนับ 1 ใหม่
  v_day := ((ns - 1) % 7) + 1;
  select coins, mcash into rc, rm from public.login_rewards where day = v_day;
  update public.profiles set coins = coins + coalesce(rc, 0), mcash = mcash + coalesce(rm, 0), login_streak = ns,
    best_streak = greatest(best_streak, ns), total_login_days = total_login_days + 1, last_claim_date = today
  where id = uid returning coins into bal;
  perform public.quest_add(uid, 'login', null, 1);
  return jsonb_build_object('ok', true, 'day', v_day, 'streak', ns, 'coins', coalesce(rc, 0), 'mcash', coalesce(rm, 0), 'balance', bal);
end $$;

-- ===== บันทึกผลจบเกม (กันซ้ำด้วย gid) =====
create or replace function public.record_game(p_game text, p_gid text, p_result text, p_delta integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d integer; n integer; bal integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_result not in ('win', 'lose', 'draw') or p_game !~ '^[a-z0-9_-]{1,32}$' or coalesce(length(p_gid), 0) not between 1 and 64 then
    return jsonb_build_object('ok', false, 'error', 'bad_args');
  end if;
  d := greatest(-50000, least(50000, coalesce(p_delta, 0)));
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  insert into public.game_log (user_id, gid, game, result, delta) values (uid, p_gid, p_game, p_result, d) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then
    select coins into bal from public.profiles where id = uid;
    return jsonb_build_object('ok', true, 'dup', true, 'coins', bal);
  end if;
  update public.profiles set coins = greatest(0, coins + d), last_game = p_game where id = uid returning coins into bal;
  insert into public.game_stats (user_id, game, plays, wins, losses, draws, coins_won, last_played_at)
  values (uid, p_game, 1, (p_result = 'win')::int, (p_result = 'lose')::int, (p_result = 'draw')::int, d, now())
  on conflict (user_id, game) do update set plays = public.game_stats.plays + 1,
    wins = public.game_stats.wins + excluded.wins, losses = public.game_stats.losses + excluded.losses,
    draws = public.game_stats.draws + excluded.draws, coins_won = public.game_stats.coins_won + d, last_played_at = now();
  perform public.quest_add(uid, 'play', p_game, 1);
  if p_result = 'win' then perform public.quest_add(uid, 'win', p_game, 1); end if;
  if d > 0 then perform public.quest_add(uid, 'coins_won', p_game, d); end if;
  return jsonb_build_object('ok', true, 'coins', bal);
end $$;

-- ===== รับรางวัลเควสต์ =====
create or replace function public.claim_quest(p_quest text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q public.quest_defs; qp public.quest_progress; pk date; bal integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into q from public.quest_defs where id = p_quest;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  pk := case q.period when 'daily' then public.bkk_today() else public.bkk_week_start() end;
  select * into qp from public.quest_progress where user_id = uid and quest_id = q.id and period_key = pk for update;
  if not found or qp.progress < q.target then return jsonb_build_object('ok', false, 'error', 'not_ready'); end if;
  if qp.claimed then return jsonb_build_object('ok', false, 'error', 'claimed'); end if;
  update public.quest_progress set claimed = true where user_id = uid and quest_id = q.id and period_key = pk;
  update public.profiles set coins = coins + q.reward_coins where id = uid returning coins into bal;
  return jsonb_build_object('ok', true, 'reward', q.reward_coins, 'coins', bal);
end $$;

-- ===== ซื้อของในร้านค้า (ตรวจราคา/เหรียญ/ซ้ำ ที่ฐานข้อมูล) =====
create or replace function public.buy_item(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); it public.shop_items; pr public.profiles; bal integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into it from public.shop_items where item_key = p_key;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown'); end if;
  if exists (select 1 from public.purchases where user_id = uid and item_key = p_key) then
    return jsonb_build_object('ok', false, 'error', 'owned');
  end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into pr from public.profiles where id = uid for update;
  if pr.coins < it.price then return jsonb_build_object('ok', false, 'error', 'poor'); end if;
  update public.profiles set coins = coins - it.price,
    owned = case when owned @> to_jsonb(p_key) then owned else owned || to_jsonb(p_key) end
  where id = uid returning coins into bal;
  insert into public.purchases (user_id, item_key, price) values (uid, p_key, it.price);
  return jsonb_build_object('ok', true, 'coins', bal);
end $$;

-- ===== ตั้งชื่อ / สกินที่ใช้อยู่ =====
create or replace function public.set_profile(p_name text, p_equipped jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  update public.profiles set
    name = case when length(btrim(coalesce(p_name, ''))) between 1 and 14 then btrim(p_name) else name end,
    equipped = case when p_equipped is not null and jsonb_typeof(p_equipped) = 'object' and length(p_equipped::text) < 2000 then p_equipped else equipped end,
    updated_at = now()
  where id = uid;
  return jsonb_build_object('ok', true);
end $$;

-- ===== สิทธิ์เรียกฟังก์ชัน =====
revoke all on function public.quest_add(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.app_sync(boolean), public.claim_login(), public.record_game(text, text, text, integer),
  public.claim_quest(text), public.buy_item(text), public.set_profile(text, jsonb) from public, anon;
grant execute on function public.app_sync(boolean), public.claim_login(), public.record_game(text, text, text, integer),
  public.claim_quest(text), public.buy_item(text), public.set_profile(text, jsonb) to authenticated;

-- ===== ข้อมูลตั้งต้น (แก้ตัวเลขรางวัล/เควสต์ได้ที่นี่ แล้วรันซ้ำ) =====
insert into public.login_rewards (day, coins, mcash) values
  (1, 100, 0), (2, 150, 0), (3, 200, 0), (4, 300, 0), (5, 400, 0), (6, 500, 0), (7, 1000, 5)
on conflict (day) do update set coins = excluded.coins, mcash = excluded.mcash;

insert into public.quest_defs (id, period, title, metric, game, target, reward_coins, sort) values
  ('d_play3',  'daily',  'เล่นครบ 3 ตา',            'play',      null,      3,    100, 1),
  ('d_win1',   'daily',  'ชนะ 1 ตา',                'win',       null,      1,    150, 2),
  ('d_dummy2', 'daily',  'เล่นดัมมี่ 2 ตา',          'play',      'dummy',   2,    120, 3),
  ('d_play8',  'daily',  'เล่นครบ 8 ตา',            'play',      null,      8,    300, 4),
  ('w_login5', 'weekly', 'ล็อกอินรับรางวัล 5 วัน',    'login',     null,      5,    800, 1),
  ('w_play30', 'weekly', 'เล่นครบ 30 ตา',            'play',      null,     30,   1000, 2),
  ('w_win10',  'weekly', 'ชนะ 10 ตา',                'win',       null,     10,   1500, 3),
  ('w_coins3k','weekly', 'ได้เหรียญจากการชนะ 3,000',  'coins_won', null,   3000,   1200, 4)
on conflict (id) do update set period = excluded.period, title = excluded.title, metric = excluded.metric,
  game = excluded.game, target = excluded.target, reward_coins = excluded.reward_coins, sort = excluded.sort;

insert into public.shop_items (item_key, kind, item_id, price) values
  ('characters:rina-01','characters','rina-01',1500),
  ('characters:arya-01','characters','arya-01',1500),
  ('characters:rena-01','characters','rena-01',1500),
  ('backs:classic-red','backs','classic-red',100),
  ('backs:midnight','backs','midnight',200),
  ('backs:paw-pink','backs','paw-pink',300),
  ('backs:gold','backs','gold',700),
  ('backs:sakura-01','backs','sakura-01',700),
  ('tables:sakura-felt','tables','sakura-felt',250),
  ('tables:navy-felt','tables','navy-felt',250),
  ('tables:wood','tables','wood',400),
  ('tables:table-sakura02','tables','table-sakura02',100),
  ('tables:table-sakura01','tables','table-sakura01',100),
  ('backgrounds:room-night','backgrounds','room-night',250),
  ('backgrounds:room-day','backgrounds','room-day',250),
  ('backgrounds:room-sakura','backgrounds','room-sakura',250),
  ('backgrounds:sunset','backgrounds','sunset',150),
  ('backgrounds:sakura','backgrounds','sakura',150),
  ('backgrounds:night','backgrounds','night',150),
  ('backgrounds:forest','backgrounds','forest',150),
  ('backgrounds:gold','backgrounds','gold',300)
on conflict (item_key) do update set price = excluded.price;
