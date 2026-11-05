-- v14_achievements.sql — ความสำเร็จ (achievements) + ฉายาพิเศษ
-- รันหลัง v13_profile_card.sql · รันซ้ำได้ ปลอดภัย · รายการความสำเร็จอยู่ใน achievements_seed.sql (สร้างจาก client/public/skin/achievements.json
--   ด้วย node scripts/gen-achievements-sql.js) — รันไฟล์นี้ก่อน แล้วค่อยรัน seed
-- หลักการ: ความคืบหน้าคำนวณตอนอ่านจากของที่บันทึกอยู่แล้ว (game_log · profiles · user_characters · rank_season) แบบเดียวกับเควส
--   ไม่ต้องมีตัวนับแยก ไม่เพี้ยน · กดรับทีละขั้นตามลำดับ · ได้ฉายา (user_titles 'ach:<id>' ขั้นสูงขึ้น = ชื่อใหม่ + times = ระดับเหรียญ 1-3)
-- ท่าพิเศษของแต่ละตา (ป๊อก 9 · ตอง · น็อกมืด ฯลฯ) เซิร์ฟเวอร์เกมส่งมาที่ record_game_feats หลัง record_game_result — นับเฉพาะตาที่เล่นหลังอัปเดตนี้

alter table public.game_log add column if not exists feats text[] not null default '{}';

create table if not exists public.achievement_defs (
  id       text primary key,
  grp      text not null,                      -- หมวดในหน้าจอ (general / ชื่อเกม)
  game_id  text,                               -- ผูกกับเกมเดียว · null = ทุกเกม
  metric   text not null check (metric in ('plays','wins','streak','chars_used','melds','feat','rules','login_days','chars_owned','stars5','rank_tier','level')),
  feat     text,                               -- ชื่อท่าพิเศษ (metric = feat)
  icon     text not null default '🏅',
  name     text not null,
  descr    text not null default '',
  sort     int  not null default 0,
  active   boolean not null default true
);
create table if not exists public.achievement_tiers (
  ach_id       text not null references public.achievement_defs(id) on delete cascade,
  tier         int  not null check (tier between 1 and 9),
  target       int  not null check (target > 0),
  title        text not null,                  -- ฉายาที่ได้เมื่อรับขั้นนี้
  level        int  not null default 1 check (level between 1 and 3),   -- สีเหรียญ 1 ทองแดง 2 เงิน 3 ทอง
  reward_coins int  not null default 0 check (reward_coins >= 0),
  reward_mcash int  not null default 0 check (reward_mcash >= 0),
  primary key (ach_id, tier)
);
-- ขั้นที่รับแล้ว (ไม่ผูก FK กับ achievement_tiers เพื่อให้ลงรายการใหม่ได้โดยประวัติการรับไม่หาย)
create table if not exists public.user_achievements (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ach_id     text not null,
  tier       int  not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, ach_id, tier)
);

alter table public.achievement_defs  enable row level security;
alter table public.achievement_tiers enable row level security;
alter table public.user_achievements enable row level security;
revoke all on public.achievement_defs, public.achievement_tiers, public.user_achievements from anon, authenticated;

-- ---------- ความคืบหน้า ----------
-- ชนะติดกันสูงสุด (เรียงตามเวลาที่เล่น) · p_game null = ทุกเกม
create or replace function public._ach_streak(u uuid, p_game text) returns int
language sql stable security definer set search_path = public as $$
  with g as (
    select result = 'win' as won, row_number() over (order by played_at, id) as rn
    from public.game_log where user_id = u and (p_game is null or game_id = p_game)
  ), runs as (
    select count(*) as n from (select rn - row_number() over (order by rn) as grp from g where won) w group by grp
  )
  select coalesce(max(n), 0)::int from runs $$;

create or replace function public._ach_progress(u uuid, d public.achievement_defs) returns int
language plpgsql stable security definer set search_path = public as $$
declare v bigint;
begin
  case d.metric
    when 'plays' then
      select count(*) into v from public.game_log where user_id = u and (d.game_id is null or game_id = d.game_id);
    when 'wins' then
      select count(*) into v from public.game_log where user_id = u and result = 'win' and (d.game_id is null or game_id = d.game_id);
    when 'streak' then
      v := public._ach_streak(u, d.game_id);
    when 'chars_used' then
      select count(distinct character_id) into v from public.game_log
      where user_id = u and character_id is not null and (d.game_id is null or game_id = d.game_id);
    when 'melds' then
      select coalesce(sum(melds), 0) into v from public.game_log where user_id = u and (d.game_id is null or game_id = d.game_id);
    when 'feat' then
      select count(*) into v from public.game_log
      where user_id = u and feats @> array[d.feat] and (d.game_id is null or game_id = d.game_id);
    when 'rules' then
      select count(distinct game_id) into v from public.game_log where user_id = u;
    when 'login_days' then
      select coalesce(total_login_days, 0) into v from public.profiles where id = u;
    when 'chars_owned' then
      select count(*) into v from public.user_characters where user_id = u;
    when 'stars5' then
      select count(*) into v from public.user_characters where user_id = u and stars >= 5;
    when 'rank_tier' then
      select coalesce(max(best_tier), 0) into v from public.rank_season where user_id = u;
    when 'level' then
      select public._level_of(player_exp) into v from public.profiles where id = u;
    else v := 0;
  end case;
  return least(coalesce(v, 0), 2000000000)::int;
end $$;

-- ความสำเร็จ 1 อย่างของผู้เล่น: ความคืบหน้า · ขั้นที่รับแล้ว · ขั้นทั้งหมด
create or replace function public._ach_row(u uuid, d public.achievement_defs) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', d.id, 'group', d.grp, 'game', d.game_id, 'metric', d.metric, 'icon', d.icon, 'name', d.name, 'desc', d.descr,
    'progress', public._ach_progress(u, d),
    'claimed', coalesce((select max(tier) from public.user_achievements a where a.user_id = u and a.ach_id = d.id), 0),
    'tiers', coalesce((select jsonb_agg(jsonb_build_object('tier', t.tier, 'target', t.target, 'title', t.title, 'level', t.level,
                         'coins', t.reward_coins, 'mcash', t.reward_mcash) order by t.tier)
                       from public.achievement_tiers t where t.ach_id = d.id), '[]')) $$;

-- ---------- RPC ของ client ----------
create or replace function public.get_achievements() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public._uid(); v_list jsonb;
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  select coalesce(jsonb_agg(public._ach_row(u, d) order by d.sort, d.id), '[]') into v_list
  from public.achievement_defs d where d.active;
  -- ready = จำนวนขั้นที่ทำครบแล้วแต่ยังไม่กดรับ (ใช้ขึ้นจุดแดงที่ปุ่ม)
  return jsonb_build_object('list', v_list, 'ready', (
    select count(*) from jsonb_array_elements(v_list) r, jsonb_array_elements(r->'tiers') t
    where (t->>'tier')::int > (r->>'claimed')::int and (r->>'progress')::int >= (t->>'target')::int));
end $$;

-- รับขั้นถัดไปของความสำเร็จหนึ่ง (ต้องรับเรียงขั้น) → ฉายา + รางวัล
create or replace function public.claim_achievement(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); d public.achievement_defs; t public.achievement_tiers; v_done int; v_ref text;
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  select * into d from public.achievement_defs where id = p_id and active;
  if not found then raise exception 'ไม่พบความสำเร็จนี้'; end if;
  perform 1 from public.profiles where id = u for update;   -- กันกดรัว
  select coalesce(max(tier), 0) into v_done from public.user_achievements where user_id = u and ach_id = d.id;
  select * into t from public.achievement_tiers where ach_id = d.id and tier = v_done + 1;
  if not found then raise exception 'รับครบทุกขั้นแล้ว'; end if;
  if public._ach_progress(u, d) < t.target then raise exception 'ยังทำไม่ครบ'; end if;
  insert into public.user_achievements(user_id, ach_id, tier) values (u, d.id, t.tier);
  -- ฉายา: แถวเดียวต่อความสำเร็จ ขั้นสูงขึ้นทับชื่อ · times = ระดับเหรียญ (บัตรโปรไฟล์ใช้แสดงสีเหรียญ)
  insert into public.user_titles as x(user_id, title_id, name, times) values (u, 'ach:' || d.id, t.title, t.level)
  on conflict (user_id, title_id) do update set name = excluded.name, times = greatest(x.times, excluded.times), got_at = now();
  v_ref := d.id || ':' || t.tier;
  if t.reward_coins > 0 then perform public._wallet_add(u, 'coins', t.reward_coins, 'achievement', v_ref); end if;
  if t.reward_mcash > 0 then perform public._wallet_add(u, 'mcash', t.reward_mcash, 'achievement', v_ref); end if;
  return jsonb_build_object('id', d.id, 'tier', t.tier, 'title', t.title, 'level', t.level,
    'coins', t.reward_coins, 'mcash', t.reward_mcash, 'row', public._ach_row(u, d));
end $$;

-- ---------- RPC ของเซิร์ฟเวอร์เกม (secret key เท่านั้น) ----------
-- ท่าพิเศษของตาที่บันทึกไปแล้ว · ชื่อ a-z 0-9 _ ไม่เกิน 12 ชื่อ · ไม่มีแถว = ไม่ทำอะไร (เช่น บันทึกผลไม่สำเร็จ)
create or replace function public.record_game_feats(p_user uuid, p_gid text, p_feats text[]) returns int
language plpgsql security definer set search_path = public as $$
declare v_clean text[]; v_n int;
begin
  select coalesce(array_agg(distinct f), '{}') into v_clean
  from unnest(coalesce(p_feats, '{}')) f where f ~ '^[a-z0-9_]{1,24}$';
  if cardinality(v_clean) > 12 then v_clean := v_clean[1:12]; end if;
  update public.game_log set feats = v_clean where user_id = p_user and gid = p_gid;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._ach_streak(uuid, text), public._ach_progress(uuid, public.achievement_defs),
  public._ach_row(uuid, public.achievement_defs) from public, anon, authenticated;
revoke all on function public.get_achievements(), public.claim_achievement(text) from public, anon;
grant execute on function public.get_achievements(), public.claim_achievement(text) to authenticated;
revoke all on function public.record_game_feats(uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.record_game_feats(uuid, text, text[]) to service_role;
