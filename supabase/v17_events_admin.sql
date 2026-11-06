-- v17_events_admin.sql — อีเวนต์ตามเทศกาล + เควสเพิ่ม + ระบบแอดมิน (โรดแมพข้อ 10 + ส่วนแรกของข้อ 11)
-- รันหลัง v16_history.sql · รันซ้ำได้ ปลอดภัย
-- แอดมิน: ตาราง admins · ทุกฟังก์ชัน admin_* ตรวจสิทธิ์ในฐานข้อมูลเอง (client ปลอมเป็นแอดมินไม่ได้) · ทุกการแก้ไขลง admin_log
-- อีเวนต์: ชื่อ · คำอธิบาย · ลิงก์รูปแบนเนอร์ · วันเริ่ม–จบ · ตู้กาชาที่ผูก (ผูกแล้ว = ตู้นั้นเปิดเฉพาะช่วงอีเวนต์) · เควสอีเวนต์
--   เควสอีเวนต์ 2 แบบ: 'event' นับตลอดช่วงอีเวนต์ รับครั้งเดียว · 'daily' รีเซ็ตทุกวันระหว่างอีเวนต์
--   รางวัล: เหรียญ · เพชร · EXP แบทเทิลพาส · ไอเทม (id ต้องมีใน economy.items)
-- เควสปกติ (quest_defs): เพิ่มชนิด 'feat' (ท่าพิเศษ) + คอลัมน์ feat · แอดมินเพิ่ม/แก้/ลบได้จากหน้าแอดมิน
-- Public (ผู้เล่น): get_events() · claim_event_quest(id) · is_admin()
-- Public (แอดมิน): admin_overview() · admin_save_event(p) · admin_delete_event(id) · admin_save_event_quest(p) · admin_delete_event_quest(id)
--                  admin_save_quest(p) · admin_delete_quest(id) · admin_add_admin(username) · admin_remove_admin(username)
-- Extend: ชนิดเควสใหม่ = เพิ่มชื่อใน _quest_metric_ok() แล้วเพิ่มบรรทัดใน _window_progress() (ใช้ทั้งเควสปกติและเควสอีเวนต์)

-- ================= ตาราง =================
create table if not exists public.admins (
  user_id  uuid primary key references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  added_at timestamptz not null default now()
);

create table if not exists public.admin_log (
  id        bigserial primary key,
  admin_id  uuid,
  action    text not null,
  target    text,
  detail    jsonb not null default '{}',
  at        timestamptz not null default now()
);
create index if not exists admin_log_time on public.admin_log(at desc);

create table if not exists public.events (
  id          text primary key,
  name        text not null,
  description text not null default '',
  banner_url  text not null default '',
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  banner_ids  text[] not null default '{}',    -- ตู้กาชาที่เปิดเฉพาะช่วงอีเวนต์นี้
  active      boolean not null default true,   -- ปิด = ซ่อนอีเวนต์ทันที (ไม่ต้องลบ)
  sort        int not null default 0,
  updated_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.event_quests (
  id            text primary key,
  event_id      text not null references public.events(id) on delete cascade,
  mode          text not null default 'event' check (mode in ('event', 'daily')),
  metric        text not null,
  feat          text,                           -- ใช้เมื่อ metric = 'feat' (ชื่อท่าพิเศษ เช่น knock_dark)
  game_id       text,                           -- ว่าง = ทุกเกม
  target        int  not null check (target > 0),
  reward_coins  int  not null default 0,
  reward_mcash  int  not null default 0,
  reward_bp     int  not null default 0,
  reward_items  jsonb not null default '{}',    -- { "<item id>": จำนวน }
  name          text not null,
  description   text not null default '',
  icon          text not null default '🎉',
  sort          int  not null default 0
);
create index if not exists event_quests_event on public.event_quests(event_id, sort);

-- เก็บเฉพาะ "รับรางวัลแล้ว" เหมือน user_quests · period_key: แบบ 'event' ใช้วันคงที่ 2000-01-01 · แบบ 'daily' ใช้วันของเกม
create table if not exists public.user_event_quests (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  quest_id   text not null references public.event_quests(id) on delete cascade,
  period_key date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_id, period_key)
);

-- เควสปกติ: ชนิด 'feat' ต้องรู้ชื่อท่า
alter table public.quest_defs add column if not exists feat text;
alter table public.quest_defs drop constraint if exists quest_defs_metric_check;
alter table public.quest_defs add constraint quest_defs_metric_check
  check (metric in ('login', 'play', 'win', 'coins', 'rules', 'days', 'melds', 'knock', 'feat'));

alter table public.admins            enable row level security;
alter table public.admin_log         enable row level security;
alter table public.events            enable row level security;
alter table public.event_quests      enable row level security;
alter table public.user_event_quests enable row level security;
-- ไม่มี policy = อ่าน/เขียนตรงไม่ได้ทั้งหมด · ทุกอย่างผ่านฟังก์ชันด้านล่าง
revoke all on public.admins, public.admin_log, public.events, public.event_quests, public.user_event_quests from anon, authenticated;

-- ================= ตัวช่วย =================
create or replace function public._is_admin(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = u) $$;

-- เรียกต้นฟังก์ชัน admin_* ทุกตัว · คืน id ของแอดมิน
create or replace function public._require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  if not public._is_admin(u) then raise exception 'เฉพาะแอดมิน'; end if;
  return u;
end $$;

create or replace function public._admin_log(p_admin uuid, p_action text, p_target text, p_detail jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into public.admin_log(admin_id, action, target, detail) values (p_admin, p_action, p_target, coalesce(p_detail, '{}')) $$;

create or replace function public._quest_metric_ok(p_metric text) returns boolean
language sql immutable as $$
  select p_metric in ('login', 'play', 'win', 'coins', 'rules', 'days', 'melds', 'knock', 'feat') $$;

-- ข้อความจากแอดมิน: ตัดอักขระควบคุม ตัดช่องว่างหัวท้าย จำกัดความยาว
create or replace function public._clean_text(p_text text, p_max int) returns text
language sql immutable as $$
  select left(trim(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]]', ' ', 'g')), p_max) $$;

-- ตัวเลขจากแอดมิน: ว่าง = ค่าเริ่มต้น · นอกช่วง = แจ้งชื่อช่องให้แก้ (กันพิมพ์ศูนย์เกิน)
create or replace function public._clean_int(p_value text, p_label text, p_min int, p_max int, p_default int) returns int
language plpgsql immutable as $$
declare v numeric;
begin
  if p_value is null or trim(p_value) = '' then return p_default; end if;
  if trim(p_value) !~ '^-?[0-9]+$' then raise exception '% ต้องเป็นตัวเลข', p_label; end if;
  v := trim(p_value)::numeric;
  if v < p_min or v > p_max then raise exception '% ต้องอยู่ระหว่าง % ถึง %', p_label, p_min, p_max; end if;
  return v::int;
end $$;

-- id ใหม่: ใช้ที่แอดมินพิมพ์ (a-z 0-9 _ -) หรือสุ่มให้ถ้าเว้นว่าง
create or replace function public._clean_id(p_id text, p_prefix text) returns text
language plpgsql volatile as $$
declare v text := lower(trim(coalesce(p_id, '')));
begin
  if v = '' then return p_prefix || substr(md5(random()::text || clock_timestamp()::text), 1, 8); end if;
  if v !~ '^[a-z0-9_-]{2,40}$' then raise exception 'รหัสใช้ได้เฉพาะ a-z 0-9 _ - ยาว 2–40 ตัว'; end if;
  return v;
end $$;

-- ลิงก์รูป: https:// เท่านั้น หรือไฟล์ในเกม ./Assets/... (กันลิงก์ javascript: / data:)
create or replace function public._clean_url(p_url text) returns text
language plpgsql immutable as $$
declare v text := trim(coalesce(p_url, ''));
begin
  if v = '' then return ''; end if;
  if length(v) > 500 then raise exception 'ลิงก์รูปยาวเกิน 500 ตัวอักษร'; end if;
  if v !~ '^(https://|\./Assets/)[^\s"''<>]+$' then raise exception 'ลิงก์รูปต้องขึ้นต้นด้วย https:// หรือ ./Assets/'; end if;
  return v;
end $$;

-- รางวัลไอเทม { id: จำนวน } · id ต้องมีในรายการไอเทมของเกม (economy.items)
create or replace function public._clean_items(p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare k text; n text; v_out jsonb := '{}'; v_qty int;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'object' then return '{}'; end if;
  for k, n in select * from jsonb_each_text(p_items) loop
    if not (public._eco() -> 'items') ? k then raise exception 'ไม่มีไอเทมรหัส %', k; end if;
    v_qty := public._clean_int(n, 'จำนวนไอเทม ' || k, 0, 999, 0);
    if v_qty > 0 then v_out := v_out || jsonb_build_object(k, v_qty); end if;
  end loop;
  return v_out;
end $$;

-- ความคืบหน้าในช่วงเวลา [p_from, p_to) — ใช้ร่วมเควสปกติและเควสอีเวนต์ · ไม่นับตาโหมดซ้อม (เหมือน v7)
create or replace function public._window_progress(p_user uuid, p_metric text, p_game text, p_feat text,
                                                   p_from timestamptz, p_to timestamptz) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_val bigint := 0;
begin
  if p_to <= p_from then return 0; end if;
  if p_metric = 'login' then
    select count(*) into v_val from public.login_days
    where user_id = p_user and day >= public.game_day(p_from) and public._day_start(day) < p_to;
    return least(coalesce(v_val, 0), 2147483647)::int;
  end if;
  select case p_metric
      when 'play'  then count(*)
      when 'win'   then count(*) filter (where result = 'win')
      when 'coins' then coalesce(sum(greatest(coin_delta + bonus, 0)), 0)
      when 'rules' then count(distinct game_id)
      when 'days'  then count(distinct public.game_day(played_at))
      when 'melds' then coalesce(sum(melds), 0)
      when 'knock' then count(*) filter (where knock)
      when 'feat'  then count(*) filter (where p_feat = any(feats))
      else 0 end
  into v_val
  from public.game_log
  where user_id = p_user
    and played_at >= p_from
    and played_at < p_to
    and not practice
    and (p_game is null or game_id = p_game);
  return least(coalesce(v_val, 0), 2147483647)::int;
end $$;

-- เควสปกติ: ใช้ตัวนับกลาง (เพิ่มชนิด feat) · ช่วงเวลาเหมือน v7 ทุกอย่าง
create or replace function public._quest_progress(p_user uuid, q public.quest_defs, p_key date) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_days int := case q.period when 'daily' then 1 else 7 end;
begin
  return public._window_progress(p_user, q.metric, q.game_id, q.feat, public._day_start(p_key), public._day_start(p_key + v_days));
end $$;

-- ================= อีเวนต์ฝั่งผู้เล่น =================
create or replace function public._event_running(e public.events) returns boolean
language sql stable as $$ select e.active and e.starts_at <= now() and e.ends_at > now() $$;

-- ตู้กาชาเปิดได้ไหม: ตู้ปกติ = active · ตู้ที่ผูกกับอีเวนต์ = ต้องมีอีเวนต์ที่ผูกไว้กำลังจัดอยู่
create or replace function public._banner_open(p_banner text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gacha_banners b where b.id = p_banner and b.active)
     and (not exists (select 1 from public.events e where p_banner = any(e.banner_ids))
          or exists (select 1 from public.events e where p_banner = any(e.banner_ids) and public._event_running(e))) $$;

create or replace function public._event_quest_key(q public.event_quests) returns date
language sql stable set search_path = public as $$
  select case q.mode when 'daily' then public.game_day() else date '2000-01-01' end $$;

create or replace function public._event_quest_progress(p_user uuid, q public.event_quests, e public.events) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_from timestamptz := e.starts_at; v_to timestamptz := least(now(), e.ends_at);
begin
  if q.mode = 'daily' then
    v_from := greatest(v_from, public._day_start(public.game_day()));
    v_to := least(e.ends_at, public._day_start(public.game_day() + 1));
  end if;
  return public._window_progress(p_user, q.metric, q.game_id, q.feat, v_from, v_to);
end $$;

create or replace function public._event_quest_json(p_user uuid, q public.event_quests, e public.events) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', q.id, 'mode', q.mode, 'name', q.name, 'description', q.description, 'icon', q.icon,
    'metric', q.metric, 'game', q.game_id, 'target', q.target,
    'progress', least(public._event_quest_progress(p_user, q, e), q.target),
    'reward_coins', q.reward_coins, 'reward_mcash', q.reward_mcash, 'reward_bp', q.reward_bp, 'reward_items', q.reward_items,
    'claimed', exists (select 1 from public.user_event_quests c
                       where c.user_id = p_user and c.quest_id = q.id and c.period_key = public._event_quest_key(q))) $$;

-- อีเวนต์ที่กำลังจัดอยู่ + เควส + ตู้ที่ผูก
create or replace function public.get_events() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  perform public.record_login();   -- เควสอีเวนต์แบบล็อกอินนับทันทีเมื่อเปิดหน้าอีเวนต์ (เหมือน get_quests)
  return jsonb_build_object('now', now(), 'events', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', e.id, 'name', e.name, 'description', e.description, 'banner_url', e.banner_url,
             'starts_at', e.starts_at, 'ends_at', e.ends_at,
             'banners', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.sort, b.id)
                                  from public.gacha_banners b where b.id = any(e.banner_ids) and b.active), '[]'),
             'quests', coalesce((select jsonb_agg(public._event_quest_json(u, q, e) order by q.sort, q.id)
                                 from public.event_quests q where q.event_id = e.id), '[]'))
           order by e.sort, e.ends_at)
    from public.events e
    where public._event_running(e)), '[]'));
end $$;

create or replace function public.claim_event_quest(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); q public.event_quests; e public.events; v_key date; v_bp int := 0; k text; n text;
begin
  select * into q from public.event_quests where id = p_id;
  if not found then raise exception 'ไม่พบเควสนี้'; end if;
  select * into e from public.events where id = q.event_id;
  if not public._event_running(e) then raise exception 'อีเวนต์นี้ไม่ได้จัดอยู่ตอนนี้'; end if;
  v_key := public._event_quest_key(q);
  perform 1 from public.profiles where id = u for update;   -- กันกดรับซ้อนสองครั้งพร้อมกัน
  if exists (select 1 from public.user_event_quests where user_id = u and quest_id = q.id and period_key = v_key) then
    raise exception 'รับรางวัลเควสนี้แล้ว';
  end if;
  if public._event_quest_progress(u, q, e) < q.target then raise exception 'เควสยังไม่สำเร็จ'; end if;
  insert into public.user_event_quests(user_id, quest_id, period_key) values (u, q.id, v_key);
  if q.reward_coins > 0 then perform public._wallet_add(u, 'coins', q.reward_coins, 'event', q.id || ':' || v_key); end if;
  if q.reward_mcash > 0 then perform public._wallet_add(u, 'mcash', q.reward_mcash, 'event', q.id || ':' || v_key); end if;
  if q.reward_bp > 0 then v_bp := public._bp_add(u, q.reward_bp); end if;
  for k, n in select * from jsonb_each_text(q.reward_items) loop
    perform public._grant_qty(u, 'items', k, n::int);
  end loop;
  return jsonb_build_object('coins', q.reward_coins, 'mcash', q.reward_mcash, 'bp', v_bp, 'items', q.reward_items,
    'quest', public._event_quest_json(u, q, e));
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public._is_admin(auth.uid()) $$;

-- ================= แอดมิน =================
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return jsonb_build_object(
    'now', now(),
    'events', coalesce((select jsonb_agg(to_jsonb(e) || jsonb_build_object('running', public._event_running(e)) order by e.starts_at desc)
                        from public.events e), '[]'),
    'event_quests', coalesce((select jsonb_agg(to_jsonb(q) order by q.event_id, q.sort, q.id) from public.event_quests q), '[]'),
    'quests', coalesce((select jsonb_agg(to_jsonb(q) order by q.period, q.id) from public.quest_defs q), '[]'),
    'banners', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'active', b.active) order by b.sort, b.id)
                         from public.gacha_banners b), '[]'),
    'items', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(public._eco() -> 'items') k), '[]'),
    'admins', coalesce((select jsonb_agg(jsonb_build_object('username', p.username, 'display_name', p.display_name, 'added_at', a.added_at)
                                         order by a.added_at)
                        from public.admins a join public.profiles p on p.id = a.user_id), '[]'));
end $$;

-- บันทึกอีเวนต์ (ไม่มี id หรือ id ใหม่ = สร้าง · id เดิม = แก้)
create or replace function public.admin_save_event(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_id text; v_name text; v_start timestamptz; v_end timestamptz; v_banners text[]; b text;
begin
  v_id := public._clean_id(p ->> 'id', 'ev_');
  v_name := public._clean_text(p ->> 'name', 60);
  if v_name = '' then raise exception 'ใส่ชื่ออีเวนต์'; end if;
  begin
    v_start := (p ->> 'starts_at')::timestamptz;
    v_end := (p ->> 'ends_at')::timestamptz;
  exception when others then raise exception 'วันเริ่ม/วันจบไม่ถูกต้อง';
  end;
  if v_start is null or v_end is null then raise exception 'ใส่วันเริ่มและวันจบ'; end if;
  if v_end <= v_start then raise exception 'วันจบต้องหลังวันเริ่ม'; end if;
  select coalesce(array_agg(distinct x), '{}') into v_banners
  from jsonb_array_elements_text(case when jsonb_typeof(p -> 'banner_ids') = 'array' then p -> 'banner_ids' else '[]' end) x;
  foreach b in array v_banners loop
    if not exists (select 1 from public.gacha_banners where id = b) then raise exception 'ไม่มีตู้กาชารหัส %', b; end if;
  end loop;
  insert into public.events(id, name, description, banner_url, starts_at, ends_at, banner_ids, active, sort, updated_at)
  values (v_id, v_name, public._clean_text(p ->> 'description', 500), public._clean_url(p ->> 'banner_url'), v_start, v_end, v_banners,
          coalesce((p ->> 'active')::boolean, true), public._clean_int(p ->> 'sort', 'ลำดับ', -999, 999, 0), now())
  on conflict (id) do update set name = excluded.name, description = excluded.description, banner_url = excluded.banner_url,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, banner_ids = excluded.banner_ids, active = excluded.active,
    sort = excluded.sort, updated_at = now();
  perform public._admin_log(a, 'save_event', v_id, p);
  return (select to_jsonb(e) from public.events e where e.id = v_id);
end $$;

create or replace function public.admin_delete_event(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_row jsonb;
begin
  delete from public.events where id = p_id returning to_jsonb(events.*) into v_row;
  if v_row is null then raise exception 'ไม่พบอีเวนต์นี้'; end if;
  perform public._admin_log(a, 'delete_event', p_id, v_row);
  return jsonb_build_object('deleted', p_id);
end $$;

-- ตรวจช่องของเควส (ใช้ทั้งเควสอีเวนต์และเควสปกติ)
create or replace function public._clean_quest_fields(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_metric text := trim(coalesce(p ->> 'metric', '')); v_feat text := nullif(trim(coalesce(p ->> 'feat', '')), '');
        v_game text := nullif(trim(coalesce(p ->> 'game_id', '')), ''); v_name text := public._clean_text(p ->> 'name', 40);
begin
  if not public._quest_metric_ok(v_metric) then raise exception 'ชนิดเควสไม่ถูกต้อง'; end if;
  if v_metric = 'feat' and (v_feat is null or v_feat !~ '^[a-z0-9_]{1,30}$') then raise exception 'เควสท่าพิเศษต้องใส่ชื่อท่า (a-z 0-9 _)'; end if;
  if v_metric <> 'feat' then v_feat := null; end if;
  if v_game is not null and v_game !~ '^[a-z0-9_-]{1,30}$' then raise exception 'รหัสเกมไม่ถูกต้อง'; end if;
  if v_name = '' then raise exception 'ใส่ชื่อเควส'; end if;
  return jsonb_build_object(
    'metric', v_metric, 'feat', v_feat, 'game_id', v_game, 'name', v_name,
    'description', public._clean_text(p ->> 'description', 120),
    'icon', coalesce(nullif(public._clean_text(p ->> 'icon', 8), ''), '🎉'),
    'target', public._clean_int(p ->> 'target', 'เป้าหมาย', 1, 100000, 1),
    'reward_coins', public._clean_int(p ->> 'reward_coins', 'เหรียญ', 0, 1000000, 0),
    'reward_mcash', public._clean_int(p ->> 'reward_mcash', 'เพชร', 0, 100000, 0),
    'reward_bp', public._clean_int(p ->> 'reward_bp', 'EXP แบทเทิลพาส', 0, 100000, 0),
    'sort', public._clean_int(p ->> 'sort', 'ลำดับ', -999, 999, 0));
end $$;

create or replace function public.admin_save_event_quest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_id text; f jsonb; v_event text := trim(coalesce(p ->> 'event_id', ''));
        v_mode text := coalesce(nullif(trim(p ->> 'mode'), ''), 'event');
begin
  if not exists (select 1 from public.events where id = v_event) then raise exception 'ไม่พบอีเวนต์ของเควสนี้'; end if;
  if v_mode not in ('event', 'daily') then raise exception 'แบบเควสต้องเป็น event หรือ daily'; end if;
  v_id := public._clean_id(p ->> 'id', 'eq_');
  if exists (select 1 from public.event_quests where id = v_id and event_id <> v_event) then raise exception 'รหัสเควสนี้ใช้กับอีเวนต์อื่นแล้ว'; end if;
  f := public._clean_quest_fields(p);
  insert into public.event_quests(id, event_id, mode, metric, feat, game_id, target, reward_coins, reward_mcash, reward_bp, reward_items,
                                  name, description, icon, sort)
  values (v_id, v_event, v_mode, f ->> 'metric', f ->> 'feat', f ->> 'game_id', (f ->> 'target')::int, (f ->> 'reward_coins')::int,
          (f ->> 'reward_mcash')::int, (f ->> 'reward_bp')::int, public._clean_items(p -> 'reward_items'),
          f ->> 'name', f ->> 'description', f ->> 'icon', (f ->> 'sort')::int)
  on conflict (id) do update set mode = excluded.mode, metric = excluded.metric, feat = excluded.feat, game_id = excluded.game_id,
    target = excluded.target, reward_coins = excluded.reward_coins, reward_mcash = excluded.reward_mcash, reward_bp = excluded.reward_bp,
    reward_items = excluded.reward_items, name = excluded.name, description = excluded.description, icon = excluded.icon, sort = excluded.sort;
  perform public._admin_log(a, 'save_event_quest', v_id, p);
  return (select to_jsonb(q) from public.event_quests q where q.id = v_id);
end $$;

create or replace function public.admin_delete_event_quest(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_row jsonb;
begin
  delete from public.event_quests where id = p_id returning to_jsonb(event_quests.*) into v_row;
  if v_row is null then raise exception 'ไม่พบเควสนี้'; end if;
  perform public._admin_log(a, 'delete_event_quest', p_id, v_row);
  return jsonb_build_object('deleted', p_id);
end $$;

-- เควสปกติ (รายวัน/รายสัปดาห์) · แต้มกิจกรรม (points) คงค่าเดิมเมื่อแก้ · เควสรายวันใหม่ได้แต้มเท่าเควสรายวันเดิม (25 ตาม v6)
create or replace function public.admin_save_quest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_id text; f jsonb; v_period text := trim(coalesce(p ->> 'period', ''));
        v_points int;
begin
  if v_period not in ('daily', 'weekly') then raise exception 'รอบเควสต้องเป็น daily หรือ weekly'; end if;
  v_id := public._clean_id(p ->> 'id', 'q_');
  f := public._clean_quest_fields(p);
  v_points := case when v_period = 'daily' then 25 else 0 end;
  insert into public.quest_defs(id, period, metric, feat, game_id, target, reward_coins, reward_mcash, reward_bp, points,
                                name, description, icon, always, active)
  values (v_id, v_period, f ->> 'metric', f ->> 'feat', f ->> 'game_id', (f ->> 'target')::int, (f ->> 'reward_coins')::int,
          (f ->> 'reward_mcash')::int, (f ->> 'reward_bp')::int, v_points, f ->> 'name', f ->> 'description', f ->> 'icon',
          coalesce((p ->> 'always')::boolean, false), coalesce((p ->> 'active')::boolean, true))
  on conflict (id) do update set period = excluded.period, metric = excluded.metric, feat = excluded.feat, game_id = excluded.game_id,
    target = excluded.target, reward_coins = excluded.reward_coins, reward_mcash = excluded.reward_mcash, reward_bp = excluded.reward_bp,
    name = excluded.name, description = excluded.description, icon = excluded.icon, always = excluded.always, active = excluded.active;
  perform public._admin_log(a, 'save_quest', v_id, p);
  return (select to_jsonb(q) from public.quest_defs q where q.id = v_id);
end $$;

create or replace function public.admin_delete_quest(p_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_row jsonb;
begin
  delete from public.quest_defs where id = p_id returning to_jsonb(quest_defs.*) into v_row;
  if v_row is null then raise exception 'ไม่พบเควสนี้'; end if;
  perform public._admin_log(a, 'delete_quest', p_id, v_row);
  return jsonb_build_object('deleted', p_id);
end $$;

create or replace function public.admin_add_admin(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_user uuid;
begin
  select id into v_user from public.profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if v_user is null then raise exception 'ไม่พบผู้เล่นชื่อนี้'; end if;
  insert into public.admins(user_id, added_by) values (v_user, a) on conflict do nothing;
  perform public._admin_log(a, 'add_admin', p_username);
  return jsonb_build_object('added', p_username);
end $$;

create or replace function public.admin_remove_admin(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid := public._require_admin(); v_user uuid;
begin
  select id into v_user from public.profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if v_user is null or not public._is_admin(v_user) then raise exception 'ผู้เล่นนี้ไม่ได้เป็นแอดมิน'; end if;
  if v_user = a then raise exception 'ถอดสิทธิ์ตัวเองไม่ได้ (ให้แอดมินคนอื่นถอดให้)'; end if;   -- กันระบบไม่เหลือแอดมิน
  delete from public.admins where user_id = v_user;
  perform public._admin_log(a, 'remove_admin', p_username);
  return jsonb_build_object('removed', p_username);
end $$;

-- ================= สิทธิ์ =================
revoke all on function
  public._is_admin(uuid), public._require_admin(), public._admin_log(uuid, text, text, jsonb), public._clean_items(jsonb),
  public._window_progress(uuid, text, text, text, timestamptz, timestamptz), public._banner_open(text),
  public._event_quest_progress(uuid, public.event_quests, public.events), public._event_quest_json(uuid, public.event_quests, public.events),
  public._clean_quest_fields(jsonb)
from public, anon, authenticated;
revoke all on function
  public.get_events(), public.claim_event_quest(text), public.is_admin(), public.admin_overview(),
  public.admin_save_event(jsonb), public.admin_delete_event(text), public.admin_save_event_quest(jsonb), public.admin_delete_event_quest(text),
  public.admin_save_quest(jsonb), public.admin_delete_quest(text), public.admin_add_admin(text), public.admin_remove_admin(text)
from public, anon;
grant execute on function
  public.get_events(), public.claim_event_quest(text), public.is_admin(), public.admin_overview(),
  public.admin_save_event(jsonb), public.admin_delete_event(text), public.admin_save_event_quest(jsonb), public.admin_delete_event_quest(text),
  public.admin_save_quest(jsonb), public.admin_delete_quest(text), public.admin_add_admin(text), public.admin_remove_admin(text)
to authenticated;

-- ================= ตู้กาชาเฉพาะช่วงอีเวนต์ =================
-- คัดลอกจาก v8_gacha.sql ทั้งฟังก์ชัน ต่างกันแค่บรรทัดที่มีป้าย "v17" (ตรวจ _banner_open) — ถ้าแก้ gacha_pull/get_gacha ในอนาคต ให้เริ่มจากไฟล์นี้
create or replace function public.gacha_pull(p_banner text, p_count int, p_currency text default 'coins') returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); b public.gacha_banners; v_cost int := 0; v_bal bigint; v_since int; v_i int; v_force text[];
        pk record; v_have int; v_good boolean := false; v_res jsonb := '[]'::jsonb; v_coins bigint; v_mcash bigint; v_cur text;
        v_tk int := 0; v_use int := 0; v_buy int := 0; v_conv bigint := 0; v_sell int;
begin
  if p_count not in (1, 10) then raise exception 'สุ่มได้ครั้งละ 1 หรือ 10 ครั้ง'; end if;
  select * into b from public.gacha_banners where id = p_banner and active;
  if not found then raise exception 'ไม่พบตู้กาชานี้'; end if;
  if not public._banner_open(p_banner) then raise exception 'ตู้นี้เปิดเฉพาะช่วงอีเวนต์'; end if;   -- v17
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
      order by b.sort, b.id) from public.gacha_banners b where b.active and public._banner_open(b.id)), '[]'));   -- v17: ตู้อีเวนต์ขึ้นเฉพาะช่วงอีเวนต์
end $$;
