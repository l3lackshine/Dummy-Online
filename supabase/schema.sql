-- =====================================================================
-- Dummy Online — ฐานข้อมูล Supabase (รันไฟล์นี้ทั้งไฟล์ใน SQL Editor ได้หลายครั้ง ปลอดภัย)
-- จากนั้นรัน seed_catalog.sql (รายการร้านค้า + ค่าตัวละคร)
--
-- หลักการ:
--  * ผู้เล่นอ่านข้อมูลของตัวเองได้ผ่าน RLS แต่ "เขียนตรง ๆ ไม่ได้" ทุกการเปลี่ยนค่าผ่านฟังก์ชัน (RPC)
--  * ฟังก์ชันที่ให้เหรียญจากผลเกม (record_game_result) เรียกได้เฉพาะเซิร์ฟเวอร์เกม (secret key / service_role)
--  * "วัน" ของเกมนับตามเวลาไทย (Asia/Bangkok) — รีเซ็ตเควสรายวันเที่ยงคืน รายสัปดาห์ทุกวันจันทร์
--    การรีเซ็ตไม่ต้องใช้ cron: เควสผูกกับ "คีย์ช่วงเวลา" (วันที่/วันจันทร์) ช่วงใหม่ = เริ่มนับใหม่เอง
-- =====================================================================

-- ---------- ตั้งค่ากลาง ----------
create table if not exists public.game_config (
  key   text primary key,
  value jsonb not null
);
insert into public.game_config(key, value) values
  ('timezone',        '"Asia/Bangkok"'),
  ('start_coins',     '5000'),
  ('start_mcash',     '0'),
  ('daily_quest_picks',  '3'),      -- เควสรายวันสุ่ม (นอกเหนือจากเควสประจำ always)
  ('weekly_quest_picks', '4'),
  ('daily_bonus_coins',  '100'),    -- โบนัสเมื่อรับครบทุกเควสของวัน
  ('weekly_bonus_coins', '500'),
  ('star_copies',     '[1,2,3,4]'),   -- จำนวนตัวซ้ำที่ใช้อัพดาว 1→2, 2→3, ... (ตัวละครกำหนดเองได้ใน character_defs)
  ('max_stars',       '5')
on conflict (key) do nothing;

create or replace function public._cfg(p_key text) returns jsonb
language sql stable set search_path = public as $$ select value from public.game_config where key = p_key $$;

-- วันที่ตามเวลาไทย + วันจันทร์ของสัปดาห์
create or replace function public.game_day(p_ts timestamptz default now()) returns date
language sql stable set search_path = public as $$
  select (p_ts at time zone coalesce(public._cfg('timezone') #>> '{}', 'Asia/Bangkok'))::date $$;
create or replace function public.game_week(p_ts timestamptz default now()) returns date
language sql stable set search_path = public as $$ select date_trunc('week', public.game_day(p_ts)::timestamp)::date $$;
create or replace function public._day_start(p_day date) returns timestamptz
language sql stable set search_path = public as $$
  select p_day::timestamp at time zone coalesce(public._cfg('timezone') #>> '{}', 'Asia/Bangkok') $$;

-- ---------- ผู้เล่น ----------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text not null,
  title           text not null default '',                       -- ฉายา
  coins           bigint not null default 5000 check (coins >= 0), -- เหรียญเดิมพันในเกม
  mcash           bigint not null default 0 check (mcash >= 0),    -- MCash: เหรียญที่ได้จากการเติมเงิน
  last_login_at   timestamptz,                                    -- วันเวลาล็อกอินล่าสุด
  last_login_day  date,                                           -- วัน (เวลาไทย) ที่ล็อกอินล่าสุด
  login_streak    int not null default 0,                         -- ล็อกอินติดต่อกันกี่วัน
  best_streak     int not null default 0,
  total_login_days int not null default 0,
  last_game       text,                                           -- เกมที่เล่นล่าสุด
  last_game_at    timestamptz,
  equipped        jsonb not null default '{}'::jsonb,             -- {"characters":"rina-01","backs":"...","tables":"...","backgrounds":"..."}
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- สถิติต่อเกม: แพ้/ชนะ/จำนวนครั้งที่เล่น
create table if not exists public.game_stats (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  game_id        text not null,
  plays          int not null default 0,
  wins           int not null default 0,
  losses         int not null default 0,
  draws          int not null default 0,
  coins_won      bigint not null default 0,
  coins_lost     bigint not null default 0,
  last_played_at timestamptz,
  primary key (user_id, game_id)
);

-- บันทึกทุกตาที่เล่นจบ (ใช้คำนวณเควส + กันบันทึกซ้ำด้วย gid)
create table if not exists public.game_log (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  gid        text not null,
  game_id    text not null,
  result     text not null check (result in ('win','loss','draw')),
  coin_delta int  not null default 0,
  bonus      int  not null default 0,
  melds      int  not null default 0,
  knock      boolean not null default false,
  character_id text,
  played_at  timestamptz not null default now(),
  unique (user_id, gid)
);
create index if not exists game_log_user_time on public.game_log(user_id, played_at);

-- สมุดบัญชีเหรียญ/MCash
create table if not exists public.wallet_ledger (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  currency      text not null check (currency in ('coins','mcash')),
  amount        bigint not null,
  balance_after bigint not null,
  reason        text not null,
  ref           text,
  created_at    timestamptz not null default now()
);
create index if not exists wallet_ledger_user on public.wallet_ledger(user_id, created_at desc);
create unique index if not exists wallet_ledger_topup_ref on public.wallet_ledger(ref) where reason = 'topup';

-- ---------- แคตตาล็อกของ / คลัง / กาชา ----------
-- ไม่มีร้านค้าแล้ว: ของทุกชิ้นได้จากการสุ่มกาชา · ของซ้ำ = ขายเป็นเหรียญ หรือ (ตัวละคร) เอาไปอัพดาว
drop table if exists public.shop_items cascade;         -- ของระบบเก่า (ร้านค้า) ถูกยกเลิก
drop function if exists public.buy_item(text, text, text);
create table if not exists public.catalog_items (
  kind        text not null,                  -- characters | backs | tables | backgrounds
  item_id     text not null,
  name        text not null default '',
  rarity      text not null default 'common' check (rarity in ('common','rare','epic','legendary')),
  is_default  boolean not null default false, -- ของเริ่มต้น: ทุกคนมีตั้งแต่แรก
  sell_coins  int,                            -- ราคารับซื้อตัวซ้ำ (ว่าง = ตามระดับความหายาก)
  active      boolean not null default true,
  primary key (kind, item_id)
);
create table if not exists public.rarity_config (
  rarity     text primary key,
  name       text not null,
  sell_coins int  not null default 0,
  sort       int  not null default 0
);
-- คลังของผู้เล่น: qty = จำนวนที่มี (ตัวแรก 1 + ตัวซ้ำ) — ตัวซ้ำ = qty − 1
create table if not exists public.inventory (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  item_id     text not null,
  qty         int  not null default 1 check (qty >= 0),
  acquired_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);
alter table public.inventory add column if not exists qty int not null default 1;   -- รองรับฐานข้อมูลที่สร้างจากเวอร์ชันเก่า
create table if not exists public.gacha_banners (
  id           text primary key,
  name         text not null,
  description  text not null default '',
  single_coins int, single_mcash int,         -- ราคาสุ่ม 1 ครั้ง (ว่าง = ไม่รับสกุลนั้น)
  ten_coins    int, ten_mcash    int,         -- ราคาสุ่ม 10 ครั้ง (การันตีระดับ rare ขึ้นไปอย่างน้อย 1 ชิ้น)
  pity         int not null default 0,        -- สุ่มไม่ได้ legendary ครบกี่ครั้งแล้วการันตี (0 = ปิด)
  sort         int not null default 0,
  active       boolean not null default true
);
create table if not exists public.gacha_pool (
  banner_id text not null references public.gacha_banners(id) on delete cascade,
  kind      text not null,
  item_id   text not null,
  weight    int  not null default 1 check (weight >= 0),   -- น้ำหนักโอกาส (โอกาส = weight ÷ ผลรวมทั้งตู้)
  primary key (banner_id, kind, item_id),
  foreign key (kind, item_id) references public.catalog_items(kind, item_id) on delete cascade
);
create table if not exists public.gacha_pity (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  banner_id text not null references public.gacha_banners(id) on delete cascade,
  since_top int  not null default 0,
  primary key (user_id, banner_id)
);
create table if not exists public.gacha_log (
  id        bigserial primary key,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  banner_id text not null,
  pulls     int  not null,
  currency  text not null,
  cost      int  not null,
  results   jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists gacha_log_user on public.gacha_log(user_id, created_at desc);

-- ---------- ตัวละคร + ดาว ----------
-- character_defs: จำนวนตัวซ้ำที่ใช้อัพดาว/จำนวนดาวสูงสุด/โบนัสเหรียญต่อดาว (สร้างจาก Skill Studio → character_defs.sql)
create table if not exists public.character_defs (
  id         text primary key,
  max_stars  int  not null default 5 check (max_stars between 1 and 10),
  star_costs int[],                 -- จำนวน "ตัวซ้ำ" ที่ใช้อัพดาว 1→2, 2→3, ... (ว่าง = ใช้ค่ากลาง game_config.star_copies)
  bonus_pct  int[]                  -- โบนัสเหรียญเมื่อชนะ (%) ตามดาว: index 1 = ดาว 1
);
create table if not exists public.user_characters (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  character_id text not null,
  stars        int  not null default 1 check (stars between 1 and 10),
  updated_at   timestamptz not null default now(),
  primary key (user_id, character_id)
);

-- ---------- รางวัลล็อกอิน ----------
-- รางวัลรายวัน วนรอบ 7 วัน (วันที่ N ของรอบ = ((streak-1) mod 7)+1)
create table if not exists public.login_rewards (
  day   int primary key check (day between 1 and 7),
  coins int not null default 0,
  mcash int not null default 0,
  label text not null default ''
);
-- โบนัสล็อกอินต่อเนื่อง: ได้เพิ่มเมื่อ streak ถึงวันนั้นพอดี
create table if not exists public.login_milestones (
  streak int primary key check (streak > 0),
  coins  int not null default 0,
  mcash  int not null default 0,
  label  text not null default ''
);
create table if not exists public.login_days (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  day         date not null,
  streak      int  not null,
  cycle_day   int  not null,
  login_at    timestamptz not null default now(),
  claimed_at  timestamptz,
  coins       int not null default 0,
  mcash       int not null default 0,
  bonus_coins int not null default 0,
  bonus_mcash int not null default 0,
  primary key (user_id, day)
);

-- ---------- เควส ----------
create table if not exists public.quest_defs (
  id            text primary key,
  period        text not null check (period in ('daily','weekly')),
  metric        text not null check (metric in ('login','play','win','coins','rules','days','melds','knock')),
  target        int  not null check (target > 0),
  reward_coins  int  not null default 0,
  reward_mcash  int  not null default 0,
  name          text not null,
  description   text not null default '',
  icon          text not null default '📜',
  game_id       text,                      -- ผูกกับเกมเดียว (เช่น dummy) · ว่าง = ทุกเกม
  always        boolean not null default false,  -- เควสประจำ ขึ้นทุกช่วง (นอกเหนือจากที่สุ่ม)
  active        boolean not null default true
);
-- เก็บเฉพาะ "รับรางวัลแล้ว" · ความคืบหน้าคำนวณจาก game_log/login_days ตอนอ่าน (ไม่เพี้ยน ไม่ต้อง cron รีเซ็ต)
create table if not exists public.user_quests (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  quest_id   text not null references public.quest_defs(id) on delete cascade,
  period_key date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_id, period_key)
);
create table if not exists public.quest_bonus (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  period     text not null check (period in ('daily','weekly')),
  period_key date not null,
  coins      int  not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (user_id, period, period_key)
);

-- ---------- สมัครสมาชิก → สร้าง profile อัตโนมัติ ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_user text; v_name text;
begin
  v_user := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if v_user !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from public.profiles where username = v_user) then
    v_user := 'u' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  v_name := left(trim(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', v_user), '[[:cntrl:]]', '', 'g')), 14);
  if v_name = '' then v_name := left(v_user, 14); end if;
  if public._bad_name(v_name) is not null then v_name := 'ผู้เล่น'; end if;  -- ชื่อหยาบ/แอบอ้างทีมงาน (ดู name_filter.sql)
  insert into public.profiles(id, username, display_name, coins, mcash)
  values (new.id, v_user, v_name,
          coalesce((public._cfg('start_coins') #>> '{}')::bigint, 5000),
          coalesce((public._cfg('start_mcash') #>> '{}')::bigint, 0))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ตัวช่วยภายใน (เรียกจากฟังก์ชันอื่นเท่านั้น) ----------
-- เพิ่ม/ลดเหรียญ · เหรียญไม่ติดลบ (ลดได้ไม่เกินที่มี) · บันทึกลงสมุดบัญชีตามจำนวนที่เปลี่ยนจริง
create or replace function public._wallet_add(p_user uuid, p_cur text, p_amount bigint, p_reason text, p_ref text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_old bigint; v_new bigint;
begin
  if p_cur = 'coins' then select coins into v_old from public.profiles where id = p_user for update;
  else select mcash into v_old from public.profiles where id = p_user for update; end if;
  if v_old is null then raise exception 'ไม่พบผู้เล่น'; end if;
  v_new := greatest(0, v_old + p_amount);
  if p_cur = 'coins' then update public.profiles set coins = v_new, updated_at = now() where id = p_user;
  else update public.profiles set mcash = v_new, updated_at = now() where id = p_user; end if;
  if v_new <> v_old then
    insert into public.wallet_ledger(user_id, currency, amount, balance_after, reason, ref)
    values (p_user, p_cur, v_new - v_old, v_new, p_reason, p_ref);
  end if;
  return v_new;
end $$;

create or replace function public._uid() returns uuid language plpgsql stable as $$
declare v uuid := auth.uid();
begin if v is null then raise exception 'กรุณาเข้าสู่ระบบ'; end if; return v; end $$;

-- จำนวนที่ผู้เล่นมีของชิ้นนี้: ของเริ่มต้นนับเป็น 1 เสมอ
create or replace function public._qty(p_user uuid, p_kind text, p_id text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select i.qty from public.inventory i where i.user_id = p_user and i.kind = p_kind and i.item_id = p_id),
                  case when exists (select 1 from public.catalog_items c where c.kind = p_kind and c.item_id = p_id and c.is_default) then 1 else 0 end) $$;
create or replace function public._owns(p_user uuid, p_kind text, p_id text) returns boolean
language sql stable security definer set search_path = public as $$ select public._qty(p_user, p_kind, p_id) >= 1 $$;

-- ---------- ล็อกอิน / streak ----------
-- เรียกทุกครั้งที่เปิดเกม: อัปเดตเวลาล็อกอินล่าสุด + จำนวนวันติดต่อกัน (วันละ 1 ครั้ง นับตามเวลาไทย)
create or replace function public.record_login() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); p public.profiles; v_today date := public.game_day(); v_streak int; v_new boolean := false;
begin
  select * into p from public.profiles where id = u for update;
  if not found then raise exception 'ไม่พบโปรไฟล์'; end if;
  if p.last_login_day is distinct from v_today then
    v_new := true;
    v_streak := case when p.last_login_day = v_today - 1 then p.login_streak + 1 else 1 end;
    update public.profiles set login_streak = v_streak, best_streak = greatest(best_streak, v_streak),
           total_login_days = total_login_days + 1, last_login_day = v_today, last_login_at = now(), updated_at = now() where id = u;
    insert into public.login_days(user_id, day, streak, cycle_day) values (u, v_today, v_streak, ((v_streak - 1) % 7) + 1)
    on conflict (user_id, day) do nothing;
  else
    update public.profiles set last_login_at = now() where id = u;
    v_streak := p.login_streak;
  end if;
  return jsonb_build_object('streak', v_streak, 'new_day', v_new, 'day', v_today);
end $$;

create or replace function public.claim_login_reward() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); d public.login_days; r public.login_rewards; m public.login_milestones; v_today date := public.game_day();
        v_c int := 0; v_m int := 0; v_bc int := 0; v_bm int := 0;
begin
  perform public.record_login();
  select * into d from public.login_days where user_id = u and day = v_today for update;
  if d.claimed_at is not null then raise exception 'วันนี้รับรางวัลล็อกอินไปแล้ว'; end if;
  select * into r from public.login_rewards where day = d.cycle_day;
  if found then v_c := r.coins; v_m := r.mcash; end if;
  select * into m from public.login_milestones where streak = d.streak;
  if found then v_bc := m.coins; v_bm := m.mcash; end if;
  if v_c + v_bc > 0 then perform public._wallet_add(u, 'coins', v_c + v_bc, 'login', v_today::text); end if;
  if v_m + v_bm > 0 then perform public._wallet_add(u, 'mcash', v_m + v_bm, 'login', v_today::text); end if;
  update public.login_days set claimed_at = now(), coins = v_c, mcash = v_m, bonus_coins = v_bc, bonus_mcash = v_bm where user_id = u and day = v_today;
  return jsonb_build_object('streak', d.streak, 'cycle_day', d.cycle_day, 'coins', v_c, 'mcash', v_m,
                            'bonus_coins', v_bc, 'bonus_mcash', v_bm, 'bonus_label', coalesce(m.label, ''));
end $$;

-- ---------- เควส ----------
-- เลือกเควสของช่วงนั้น: เควสประจำทั้งหมด + สุ่มคงที่ตามคีย์ช่วงเวลา (ทุกคนได้ชุดเดียวกัน)
-- ไม่ซ้ำตัวชี้วัด และมีเควสผูกเกมเดียวได้ไม่เกิน 1 อัน
create or replace function public._pick_quests(p_period text, p_key date) returns setof public.quest_defs
language plpgsql stable security definer set search_path = public as $$
declare q public.quest_defs; v_n int; v_got int := 0; v_metrics text[] := '{}'; v_game int := 0;
begin
  v_n := coalesce((public._cfg(case p_period when 'daily' then 'daily_quest_picks' else 'weekly_quest_picks' end) #>> '{}')::int, 3);
  for q in select * from public.quest_defs where period = p_period and active and always order by id loop
    return next q; v_metrics := v_metrics || q.metric;
  end loop;
  for q in select * from public.quest_defs where period = p_period and active and not always order by md5(p_key::text || ':' || id) loop
    exit when v_got >= v_n;
    continue when q.metric = any(v_metrics);
    if q.game_id is not null then continue when v_game >= 1; v_game := v_game + 1; end if;
    v_metrics := v_metrics || q.metric; v_got := v_got + 1; return next q;
  end loop;
end $$;

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
    where user_id = p_user and played_at >= v_from and played_at < v_to and (q.game_id is null or game_id = q.game_id);
  end if;
  return least(coalesce(v_val, 0), 2147483647)::int;
end $$;

create or replace function public._quest_block(p_user uuid, p_period text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_key date := case p_period when 'daily' then public.game_day() else public.game_week() end;
        v_list jsonb; v_bonus bigint; v_claimed boolean; v_all boolean;
begin
  select coalesce(jsonb_agg(x order by (x->>'reward_coins')::int), '[]') into v_list from (
    select jsonb_build_object('id', q.id, 'name', q.name, 'description', q.description, 'icon', q.icon, 'metric', q.metric,
      'target', q.target, 'progress', least(public._quest_progress(p_user, q, v_key), q.target),
      'reward_coins', q.reward_coins, 'reward_mcash', q.reward_mcash,
      'claimed', exists (select 1 from public.user_quests uq where uq.user_id = p_user and uq.quest_id = q.id and uq.period_key = v_key)) as x
    from public._pick_quests(p_period, v_key) q) s;
  v_all := coalesce((select bool_and((e->>'claimed')::boolean) from jsonb_array_elements(v_list) e), false);
  v_bonus := coalesce((public._cfg(p_period || '_bonus_coins') #>> '{}')::bigint, 0);
  v_claimed := exists (select 1 from public.quest_bonus where user_id = p_user and period = p_period and period_key = v_key);
  return jsonb_build_object('key', v_key, 'resets_at', public._day_start(v_key + case p_period when 'daily' then 1 else 7 end),
    'quests', v_list, 'bonus', jsonb_build_object('coins', v_bonus, 'ready', v_all and not v_claimed, 'claimed', v_claimed));
end $$;

create or replace function public.get_quests() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  perform public.record_login();  -- เควสล็อกอินนับทันทีเมื่อเปิดหน้าเควส
  return jsonb_build_object('daily', public._quest_block(u, 'daily'), 'weekly', public._quest_block(u, 'weekly'), 'now', now());
end $$;

create or replace function public.claim_quest(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); q public.quest_defs; v_key date;
begin
  select * into q from public.quest_defs where id = p_id and active;
  if not found then raise exception 'ไม่พบเควสนี้'; end if;
  v_key := case q.period when 'daily' then public.game_day() else public.game_week() end;
  if not exists (select 1 from public._pick_quests(q.period, v_key) x where x.id = q.id) then raise exception 'เควสนี้ไม่อยู่ในรอบนี้'; end if;
  perform 1 from public.profiles where id = u for update;  -- กันกดรัว
  if exists (select 1 from public.user_quests where user_id = u and quest_id = q.id and period_key = v_key) then raise exception 'รับรางวัลเควสนี้แล้ว'; end if;
  if public._quest_progress(u, q, v_key) < q.target then raise exception 'เควสยังไม่สำเร็จ'; end if;
  insert into public.user_quests(user_id, quest_id, period_key) values (u, q.id, v_key);
  if q.reward_coins > 0 then perform public._wallet_add(u, 'coins', q.reward_coins, 'quest', q.id || ':' || v_key); end if;
  if q.reward_mcash > 0 then perform public._wallet_add(u, 'mcash', q.reward_mcash, 'quest', q.id || ':' || v_key); end if;
  return jsonb_build_object('coins', q.reward_coins, 'mcash', q.reward_mcash);
end $$;

create or replace function public.claim_quest_bonus(p_period text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_key date; v_blk jsonb; v_amt bigint;
begin
  if p_period not in ('daily','weekly') then raise exception 'ช่วงเวลาไม่ถูกต้อง'; end if;
  v_key := case p_period when 'daily' then public.game_day() else public.game_week() end;
  perform 1 from public.profiles where id = u for update;
  v_blk := public._quest_block(u, p_period);
  if not (v_blk->'bonus'->>'ready')::boolean then raise exception 'ยังรับโบนัสไม่ได้'; end if;
  v_amt := (v_blk->'bonus'->>'coins')::bigint;
  insert into public.quest_bonus(user_id, period, period_key, coins) values (u, p_period, v_key, v_amt);
  if v_amt > 0 then perform public._wallet_add(u, 'coins', v_amt, 'quest_bonus', p_period || ':' || v_key); end if;
  return jsonb_build_object('coins', v_amt);
end $$;

-- ---------- ร้านค้า / โปรไฟล์ / ตัวละคร ----------
create or replace function public.set_equipped(p_kind text, p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  if p_kind !~ '^[a-z_]{1,20}$' or p_id !~ '^[A-Za-z0-9_.-]{1,60}$' then raise exception 'ข้อมูลไม่ถูกต้อง'; end if;
  if not public._owns(u, p_kind, p_id) then raise exception 'คุณยังไม่มีของชิ้นนี้'; end if;
  update public.profiles set equipped = equipped || jsonb_build_object(p_kind, p_id), updated_at = now() where id = u;
  return (select equipped from public.profiles where id = u);
end $$;

create or replace function public.update_profile(p_name text default null, p_title text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_name text; v_title text;
begin
  if p_name is not null then
    v_name := left(trim(regexp_replace(p_name, '[[:cntrl:]]', '', 'g')), 14);
    if v_name = '' then raise exception 'ชื่อห้ามว่าง'; end if;
    if public._bad_name(v_name) is not null then raise exception '%', public._bad_name(v_name); end if;
    update public.profiles set display_name = v_name, updated_at = now() where id = u;
  end if;
  if p_title is not null then
    v_title := left(trim(regexp_replace(p_title, '[[:cntrl:]]', '', 'g')), 16);
    if v_title <> '' and public._bad_name(v_title) is not null then raise exception 'ฉายา: %', public._bad_name(v_title); end if;
    update public.profiles set title = v_title, updated_at = now() where id = u;
  end if;
  return (select jsonb_build_object('display_name', display_name, 'title', title) from public.profiles where id = u);
end $$;

-- อัพดาวตัวละคร: ใช้ "ตัวซ้ำ" ของตัวละครตัวเดิม (ได้จากกาชา) — ไม่ใช้เหรียญ · ค่าความสามารถเพิ่มตามดาว (ตั้งใน skills.json ผ่าน Skill Studio)
create or replace function public.upgrade_star(p_char text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); d public.character_defs; v_stars int; v_max int; v_need int; v_costs jsonb; v_qty int;
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
  if v_qty - 1 < v_need then raise exception 'ต้องมีตัวซ้ำอีก % ตัว (มี % / ต้องใช้ %) — สุ่มกาชาเพื่อหาตัวซ้ำ', v_need - (v_qty - 1), v_qty - 1, v_need; end if;
  update public.inventory set qty = qty - v_need where user_id = u and kind = 'characters' and item_id = p_char;
  insert into public.user_characters(user_id, character_id, stars) values (u, p_char, v_stars + 1)
  on conflict (user_id, character_id) do update set stars = excluded.stars, updated_at = now();
  return jsonb_build_object('character', p_char, 'stars', v_stars + 1, 'used', v_need);
end $$;

-- ---------- กาชา ----------
create or replace function public._gacha_pick(p_banner text, p_force text[]) returns table(kind text, item_id text, rarity text, name text)
language plpgsql volatile security definer set search_path = public as $$
declare v_tot bigint; v_r double precision;
begin
  select coalesce(sum(gp.weight), 0) into v_tot from public.gacha_pool gp join public.catalog_items ci on ci.kind = gp.kind and ci.item_id = gp.item_id
   where gp.banner_id = p_banner and ci.active and gp.weight > 0 and (p_force is null or ci.rarity = any(p_force));
  if v_tot = 0 then return; end if;
  v_r := random() * v_tot;
  return query select t.kind, t.item_id, t.rarity, t.name from (
    select gp.kind, gp.item_id, ci.rarity, ci.name, sum(gp.weight) over (order by gp.kind, gp.item_id) as cum
    from public.gacha_pool gp join public.catalog_items ci on ci.kind = gp.kind and ci.item_id = gp.item_id
    where gp.banner_id = p_banner and ci.active and gp.weight > 0 and (p_force is null or ci.rarity = any(p_force))) t
  where t.cum > v_r order by t.cum limit 1;
end $$;

create or replace function public.gacha_pull(p_banner text, p_count int, p_currency text default 'coins') returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); b public.gacha_banners; v_cost int; v_bal bigint; v_since int; v_i int; v_force text[];
        pk record; v_have int; v_good boolean := false; v_res jsonb := '[]'::jsonb; v_coins bigint; v_mcash bigint; v_cur text;
begin
  if p_count not in (1, 10) then raise exception 'สุ่มได้ครั้งละ 1 หรือ 10 ครั้ง'; end if;
  if p_currency not in ('coins', 'mcash') then raise exception 'สกุลเงินไม่ถูกต้อง'; end if;
  v_cur := case p_currency when 'coins' then 'เหรียญ' else 'MCash' end;
  select * into b from public.gacha_banners where id = p_banner and active;
  if not found then raise exception 'ไม่พบตู้กาชานี้'; end if;
  v_cost := case when p_count = 1 then (case p_currency when 'coins' then b.single_coins else b.single_mcash end)
                 else (case p_currency when 'coins' then b.ten_coins else b.ten_mcash end) end;
  if v_cost is null or v_cost <= 0 then raise exception 'ตู้นี้ไม่รับชำระด้วย %', v_cur; end if;
  perform 1 from public.profiles where id = u for update;
  select case p_currency when 'coins' then coins else mcash end into v_bal from public.profiles where id = u;
  if v_bal < v_cost then raise exception '% ไม่พอ (ต้องใช้ %)', v_cur, v_cost; end if;
  if not exists (select 1 from public.gacha_pool gp join public.catalog_items ci using (kind, item_id) where gp.banner_id = p_banner and ci.active and gp.weight > 0) then
    raise exception 'ตู้กาชานี้ยังไม่มีของ'; end if;
  perform public._wallet_add(u, p_currency, -v_cost, 'gacha', p_banner || ':' || p_count);
  insert into public.gacha_pity(user_id, banner_id) values (u, p_banner) on conflict do nothing;
  select since_top into v_since from public.gacha_pity where user_id = u and banner_id = p_banner;
  for v_i in 1..p_count loop
    v_force := null;
    if b.pity > 0 and v_since + 1 >= b.pity and exists (select 1 from public._gacha_pick(p_banner, array['legendary'])) then v_force := array['legendary'];
    elsif p_count = 10 and v_i = 10 and not v_good and exists (select 1 from public._gacha_pick(p_banner, array['rare','epic','legendary'])) then v_force := array['rare','epic','legendary'];
    end if;
    select * into pk from public._gacha_pick(p_banner, v_force);
    v_have := public._qty(u, pk.kind, pk.item_id);
    insert into public.inventory(user_id, kind, item_id, qty) values (u, pk.kind, pk.item_id, v_have + 1)
    on conflict (user_id, kind, item_id) do update set qty = excluded.qty;
    if v_have = 0 and pk.kind = 'characters' then
      insert into public.user_characters(user_id, character_id) values (u, pk.item_id) on conflict do nothing;
    end if;
    if pk.rarity in ('rare', 'epic', 'legendary') then v_good := true; end if;
    v_since := case when pk.rarity = 'legendary' then 0 else v_since + 1 end;
    v_res := v_res || jsonb_build_array(jsonb_build_object('kind', pk.kind, 'item_id', pk.item_id, 'name', pk.name, 'rarity', pk.rarity, 'new', v_have = 0, 'qty', v_have + 1));
  end loop;
  update public.gacha_pity set since_top = v_since where user_id = u and banner_id = p_banner;
  insert into public.gacha_log(user_id, banner_id, pulls, currency, cost, results) values (u, p_banner, p_count, p_currency, v_cost, v_res);
  select coins, mcash into v_coins, v_mcash from public.profiles where id = u;
  return jsonb_build_object('results', v_res, 'coins', v_coins, 'mcash', v_mcash, 'since_top', v_since, 'cost', v_cost, 'currency', p_currency);
end $$;

-- ขายตัวซ้ำเป็นเหรียญ (เก็บไว้อย่างน้อย 1 ชิ้นเสมอ)
create or replace function public.sell_dupes(p_kind text, p_id text, p_qty int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); c public.catalog_items; v_have int; v_unit int; v_total bigint; v_coins bigint;
begin
  if p_qty is null or p_qty < 1 or p_qty > 1000 then raise exception 'จำนวนไม่ถูกต้อง'; end if;
  perform 1 from public.profiles where id = u for update;
  select * into c from public.catalog_items where kind = p_kind and item_id = p_id;
  if not found then raise exception 'ไม่พบของชิ้นนี้'; end if;
  v_have := public._qty(u, p_kind, p_id);
  if v_have - 1 < p_qty then raise exception 'ตัวซ้ำไม่พอ (มีตัวซ้ำ % ชิ้น)', greatest(v_have - 1, 0); end if;
  v_unit := coalesce(c.sell_coins, (select sell_coins from public.rarity_config where rarity = c.rarity), 0);
  v_total := v_unit::bigint * p_qty;
  update public.inventory set qty = qty - p_qty where user_id = u and kind = p_kind and item_id = p_id;
  v_coins := public._wallet_add(u, 'coins', v_total, 'sell', p_kind || ':' || p_id || 'x' || p_qty);
  return jsonb_build_object('sold', p_qty, 'coins_gained', v_total, 'coins', v_coins);
end $$;

-- ข้อมูลหน้ากาชา: ตู้ทั้งหมด ราคา อัตราการออก (โปร่งใส) และตัวนับการันตีของผู้เล่น
create or replace function public.get_gacha() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  return jsonb_build_object(
    'rarities', coalesce((select jsonb_object_agg(r.rarity, jsonb_build_object('name', r.name, 'sell_coins', r.sell_coins, 'sort', r.sort)) from public.rarity_config r), '{}'),
    'banners', coalesce((select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'pity', b.pity,
        'single', jsonb_build_object('coins', b.single_coins, 'mcash', b.single_mcash),
        'ten', jsonb_build_object('coins', b.ten_coins, 'mcash', b.ten_mcash),
        'since_top', coalesce((select since_top from public.gacha_pity p where p.user_id = u and p.banner_id = b.id), 0),
        'items', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'item_id', x.item_id, 'name', x.name, 'rarity', x.rarity,
                   'pct', round(x.weight * 100.0 / nullif(x.tot, 0), 3)) order by x.weight desc, x.name)
                 from (select gp.kind, gp.item_id, ci.name, ci.rarity, gp.weight, sum(gp.weight) over () tot
                       from public.gacha_pool gp join public.catalog_items ci using (kind, item_id) where gp.banner_id = b.id and ci.active and gp.weight > 0) x), '[]'))
      order by b.sort, b.id) from public.gacha_banners b where b.active), '[]'));
end $$;

-- ---------- ข้อมูลทั้งหมดของผู้เล่น (ครั้งเดียวจบ) ----------
create or replace function public.get_profile() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); p public.profiles; v_today date := public.game_day(); ld public.login_days;
begin
  select * into p from public.profiles where id = u;
  if not found then raise exception 'ไม่พบโปรไฟล์'; end if;
  select * into ld from public.login_days where user_id = u and day = v_today;
  return jsonb_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'title', p.title,
    'coins', p.coins, 'mcash', p.mcash, 'equipped', p.equipped,
    'last_login_at', p.last_login_at, 'login_streak', p.login_streak, 'best_streak', p.best_streak, 'total_login_days', p.total_login_days,
    'last_game', p.last_game, 'last_game_at', p.last_game_at, 'created_at', p.created_at,
    'stats', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id' order by g.plays desc) from public.game_stats g where g.user_id = u), '[]'),
    'inventory', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'item_id', i.item_id, 'qty', i.qty, 'acquired_at', i.acquired_at) order by i.acquired_at desc) from public.inventory i where i.user_id = u and i.qty >= 1), '[]'),
    'characters', coalesce((select jsonb_object_agg(c.character_id, c.stars) from public.user_characters c where c.user_id = u), '{}'),
    'login', jsonb_build_object(
      'today', v_today, 'streak', p.login_streak, 'claimed', coalesce(ld.claimed_at is not null, false),
      'cycle_day', coalesce(ld.cycle_day, ((p.login_streak) % 7) + 1),   -- ถ้ายังไม่ได้ record: วันถัดไปของรอบ
      'rewards', coalesce((select jsonb_agg(to_jsonb(r) order by r.day) from public.login_rewards r), '[]'),
      'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.streak) from public.login_milestones m), '[]'))
  );
end $$;

-- ---------- ฟังก์ชันสำหรับเซิร์ฟเวอร์เกมเท่านั้น (service_role) ----------
-- บันทึกผลหนึ่งตา: เหรียญ + สถิติต่อเกม + เกมล่าสุด · ซ้ำ (gid เดิม) = ไม่นับซ้ำ
create or replace function public.record_game_result(
  p_user uuid, p_gid text, p_game text, p_delta int, p_won boolean default false,
  p_melds int default 0, p_knock boolean default false, p_char text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_res text; v_bonus int := 0; v_pct int; v_stars int; d public.character_defs; v_id bigint; v_coins bigint; v_mcash bigint;
begin
  if p_gid is null or p_game is null or p_game !~ '^[a-z0-9_-]{1,30}$' then raise exception 'ข้อมูลผลเกมไม่ถูกต้อง'; end if;
  p_delta := greatest(-1000000, least(1000000, coalesce(p_delta, 0)));
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'ไม่พบผู้เล่น'; end if;
  v_res := case when p_won or p_delta > 0 then 'win' when p_delta < 0 then 'loss' else 'draw' end;
  if p_delta > 0 and p_char is not null and public._owns(p_user, 'characters', p_char) then
    select * into d from public.character_defs where id = p_char;
    select stars into v_stars from public.user_characters where user_id = p_user and character_id = p_char;
    v_stars := coalesce(v_stars, 1);
    if d.bonus_pct is not null and array_length(d.bonus_pct, 1) >= 1 then
      v_pct := d.bonus_pct[least(v_stars, array_length(d.bonus_pct, 1))];
      v_bonus := floor(p_delta * greatest(0, least(50, coalesce(v_pct, 0))) / 100.0)::int;
    end if;
  end if;
  insert into public.game_log(user_id, gid, game_id, result, coin_delta, bonus, melds, knock, character_id)
  values (p_user, p_gid, p_game, v_res, p_delta, v_bonus, greatest(0, least(100, coalesce(p_melds, 0))), coalesce(p_knock, false), p_char)
  on conflict (user_id, gid) do nothing returning id into v_id;
  if v_id is null then
    select coins, mcash into v_coins, v_mcash from public.profiles where id = p_user;
    return jsonb_build_object('duplicate', true, 'coins', v_coins, 'mcash', v_mcash);
  end if;
  insert into public.game_stats(user_id, game_id, plays, wins, losses, draws, coins_won, coins_lost, last_played_at)
  values (p_user, p_game, 1, (v_res = 'win')::int, (v_res = 'loss')::int, (v_res = 'draw')::int,
          greatest(p_delta + v_bonus, 0), greatest(-p_delta, 0), now())
  on conflict (user_id, game_id) do update set plays = game_stats.plays + 1, wins = game_stats.wins + excluded.wins,
    losses = game_stats.losses + excluded.losses, draws = game_stats.draws + excluded.draws,
    coins_won = game_stats.coins_won + excluded.coins_won, coins_lost = game_stats.coins_lost + excluded.coins_lost, last_played_at = now();
  v_coins := public._wallet_add(p_user, 'coins', p_delta + v_bonus, 'game:' || p_game, p_gid);
  update public.profiles set last_game = p_game, last_game_at = now() where id = p_user;
  select mcash into v_mcash from public.profiles where id = p_user;
  return jsonb_build_object('duplicate', false, 'result', v_res, 'delta', p_delta, 'bonus', v_bonus, 'coins', v_coins, 'mcash', v_mcash);
end $$;

create or replace function public.touch_last_game(p_user uuid, p_game text) returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_game = p_game, last_game_at = now() where id = p_user and p_game ~ '^[a-z0-9_-]{1,30}$' $$;

-- เติม MCash (เรียกจาก webhook ชำระเงิน/แอดมิน) · p_ref = เลขอ้างอิงการชำระเงิน เรียกซ้ำด้วยเลขเดิมไม่เพิ่มซ้ำ
create or replace function public.grant_mcash(p_user uuid, p_amount int, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_bal bigint;
begin
  if p_amount is null or p_amount <= 0 or p_ref is null or p_ref = '' then raise exception 'ข้อมูลการเติมเงินไม่ถูกต้อง'; end if;
  if exists (select 1 from public.wallet_ledger where reason = 'topup' and ref = p_ref) then
    select mcash into v_bal from public.profiles where id = p_user; return jsonb_build_object('duplicate', true, 'mcash', v_bal);
  end if;
  v_bal := public._wallet_add(p_user, 'mcash', p_amount, 'topup', p_ref);
  return jsonb_build_object('duplicate', false, 'mcash', v_bal);
end $$;

-- ---------- สิทธิ์ + RLS ----------
alter table public.game_config      enable row level security;
alter table public.profiles         enable row level security;
alter table public.game_stats       enable row level security;
alter table public.game_log         enable row level security;
alter table public.wallet_ledger    enable row level security;
alter table public.catalog_items    enable row level security;
alter table public.rarity_config    enable row level security;
alter table public.gacha_banners    enable row level security;
alter table public.gacha_pool       enable row level security;
alter table public.gacha_pity       enable row level security;
alter table public.gacha_log        enable row level security;
alter table public.inventory        enable row level security;
alter table public.character_defs   enable row level security;
alter table public.user_characters  enable row level security;
alter table public.login_rewards    enable row level security;
alter table public.login_milestones enable row level security;
alter table public.login_days       enable row level security;
alter table public.quest_defs       enable row level security;
alter table public.user_quests      enable row level security;
alter table public.quest_bonus      enable row level security;

do $$ declare t text; begin
  -- ตารางของผู้เล่น: อ่านได้เฉพาะแถวตัวเอง
  foreach t in array array['game_stats','game_log','wallet_ledger','inventory','user_characters','login_days','user_quests','quest_bonus','gacha_pity','gacha_log'] loop
    execute format('drop policy if exists "own read" on public.%I', t);
    execute format('create policy "own read" on public.%I for select to authenticated using (user_id = auth.uid())', t);
  end loop;
  -- ตารางตั้งค่า: อ่านได้ทุกคน
  foreach t in array array['game_config','catalog_items','rarity_config','gacha_banners','gacha_pool','character_defs','login_rewards','login_milestones','quest_defs'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
drop policy if exists "own read" on public.profiles;
create policy "own read" on public.profiles for select to authenticated using (id = auth.uid());

-- ห้ามเขียนตรงทุกตาราง (เขียนผ่านฟังก์ชันเท่านั้น)
revoke insert, update, delete, truncate on
  public.game_config, public.profiles, public.game_stats, public.game_log, public.wallet_ledger, public.catalog_items, public.rarity_config,
  public.gacha_banners, public.gacha_pool, public.gacha_pity, public.gacha_log, public.inventory, public.character_defs, public.user_characters, public.login_rewards, public.login_milestones, public.login_days,
  public.quest_defs, public.user_quests, public.quest_bonus from anon, authenticated;
revoke all on public.wallet_ledger, public.game_log, public.gacha_log, public.gacha_pity, public.inventory from anon;

-- ---------- ลบบัญชีผู้เล่น (Google Play บังคับ) ----------
-- ผู้เล่นลบบัญชีของตัวเองได้ทันที: ต้องพิมพ์ชื่อผู้ใช้ (username) ยืนยัน · ลบที่ auth.users แล้วข้อมูลทุกตาราง (โปรไฟล์ เหรียญ คลังของ ตัวละคร
-- สถิติ ประวัติเกม ประวัติกาชา เควส) หายตามด้วย on delete cascade · ย้อนกลับไม่ได้
create or replace function public.delete_my_account(p_confirm text) returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare u uuid := public._uid(); v_user text;
begin
  select username into v_user from public.profiles where id = u;
  if v_user is null then raise exception 'ไม่พบบัญชี'; end if;
  if lower(trim(coalesce(p_confirm, ''))) <> lower(v_user) then raise exception 'ชื่อผู้ใช้ที่พิมพ์ยืนยันไม่ตรงกับบัญชีนี้'; end if;
  delete from auth.users where id = u;
  return true;
end $$;

-- ฟังก์ชัน: ปิดทั้งหมดก่อน แล้วเปิดเฉพาะที่จำเป็น
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.game_day(timestamptz), public.game_week(timestamptz) to anon, authenticated;
grant execute on function
  public.record_login(), public.claim_login_reward(), public.get_quests(), public.claim_quest(text), public.claim_quest_bonus(text),
  public.gacha_pull(text, int, text), public.sell_dupes(text, text, int), public.get_gacha(),
  public.set_equipped(text, text), public.update_profile(text, text), public.upgrade_star(text),
  public.get_profile(), public.delete_my_account(text) to authenticated;
grant execute on function
  public.record_game_result(uuid, text, text, int, boolean, int, boolean, text),
  public.touch_last_game(uuid, text), public.grant_mcash(uuid, int, text) to service_role;

-- ---------- ข้อมูลเริ่มต้น (ปรับได้ภายหลัง) ----------
insert into public.login_rewards(day, coins, mcash, label) values
  (1, 100, 0, 'วันที่ 1'), (2, 150, 0, 'วันที่ 2'), (3, 200, 0, 'วันที่ 3'), (4, 250, 0, 'วันที่ 4'),
  (5, 300, 0, 'วันที่ 5'), (6, 400, 0, 'วันที่ 6'), (7, 500, 20, 'วันที่ 7 · รางวัลใหญ่')
on conflict (day) do nothing;
insert into public.login_milestones(streak, coins, mcash, label) values
  (3, 100, 0, 'ครบ 3 วันติด'), (7, 300, 10, 'ครบ 7 วันติด'), (14, 600, 20, 'ครบ 14 วันติด'),
  (30, 1500, 50, 'ครบ 30 วันติด'), (60, 3000, 100, 'ครบ 60 วันติด'), (100, 6000, 200, 'ครบ 100 วันติด')
on conflict (streak) do nothing;
insert into public.quest_defs(id, period, metric, target, reward_coins, name, description, icon, game_id, always) values
  ('d_login',   'daily',  'login', 1,   20,  'เช็คอินรายวัน', 'เข้าเกมวันนี้', '📅', null, true),
  ('d_play3',   'daily',  'play',  3,   50,  'วอร์มอัป', 'เล่นให้จบ 3 ตา', '🎴', null, false),
  ('d_play5',   'daily',  'play',  5,   100, 'นักเล่นตัวยง', 'เล่นให้จบ 5 ตา', '🎴', null, false),
  ('d_win1',    'daily',  'win',   1,   60,  'ชัยชนะแรก', 'ชนะ 1 ตา', '🏆', null, false),
  ('d_win2',    'daily',  'win',   2,   130, 'ชนะรัว', 'ชนะ 2 ตา', '🏆', null, false),
  ('d_coin100', 'daily',  'coins', 100, 80,  'หาเหรียญ', 'ได้เหรียญจากการชนะรวม 100 🪙', '🪙', null, false),
  ('d_rules2',  'daily',  'rules', 2,   90,  'ลองเกมใหม่', 'เล่น 2 เกมต่างชนิดกัน', '🎲', null, false),
  ('d_melds5',  'daily',  'melds', 5,   60,  'นักเกิดไพ่', 'เกิดไพ่ 5 ชุด (ดัมมี่)', '🃏', 'dummy', false),
  ('d_knock1',  'daily',  'knock', 1,   100, 'น็อกเอาท์', 'น็อกให้สำเร็จ 1 ครั้ง (ดัมมี่)', '👊', 'dummy', false),
  ('w_play20',  'weekly', 'play',  20,  300, 'มาราธอน', 'เล่นให้จบ 20 ตา', '🎴', null, false),
  ('w_win8',    'weekly', 'win',   8,   400, 'เจ้าโต๊ะ', 'ชนะ 8 ตา', '🏆', null, false),
  ('w_coin800', 'weekly', 'coins', 800, 400, 'เศรษฐีหน้าใหม่', 'ได้เหรียญจากการชนะรวม 800 🪙', '💰', null, false),
  ('w_rules3',  'weekly', 'rules', 3,   300, 'นักสำรวจ', 'เล่น 3 เกมต่างชนิดกัน', '🧭', null, false),
  ('w_days5',   'weekly', 'days',  5,   350, 'ขาประจำ', 'เล่นอย่างน้อย 5 วันในสัปดาห์นี้', '🔥', null, false),
  ('w_melds40', 'weekly', 'melds', 40,  300, 'เซียนเกิดไพ่', 'เกิดไพ่ 40 ชุด (ดัมมี่)', '🃏', 'dummy', false),
  ('w_knock3',  'weekly', 'knock', 3,   400, 'จอมน็อก', 'น็อกให้สำเร็จ 3 ครั้ง (ดัมมี่)', '👊', 'dummy', false)
on conflict (id) do nothing;
insert into public.rarity_config(rarity, name, sell_coins, sort) values
  ('common', 'ธรรมดา', 20, 1), ('rare', 'หายาก', 80, 2), ('epic', 'หายากมาก', 300, 3), ('legendary', 'ตำนาน', 1000, 4)
on conflict (rarity) do nothing;

-- ผู้ใช้ที่สมัครไว้ก่อนมีตารางนี้ (ไม่มี profile) → สร้างให้
insert into public.profiles(id, username, display_name, coins, mcash)
select u.id, 'u' || substr(replace(u.id::text, '-', ''), 1, 10),
       left(coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), 'ผู้เล่น'), 14),
       coalesce((public._cfg('start_coins') #>> '{}')::bigint, 5000), 0
from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;
