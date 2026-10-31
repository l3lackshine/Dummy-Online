-- ===================================================================================
-- v11: ตารางอันดับรายสัปดาห์ (แยกตามเกม) + แรงก์รายเดือน + ฉายาพิเศษ
-- - นับเฉพาะห้องแรงก์ (หาแมตช์แรงก์: คนจริงล้วน ล็อกอิน ไม่มีบอท — เซิร์ฟเวอร์เกมกรองก่อนเรียก) · ฐานข้อมูลตรวจซ้ำว่าคน ≥ 2
--   ที่ 1 +30 · ที่ 2 +15 · ที่ 3 +5 · ที่โหล่ +0 (โต๊ะ 2 คน: 30/0 · 3 คน: 30/15/0)
-- - แต้มเดียวกันเข้า 2 ที่: ตารางรายสัปดาห์ของเกมนั้น (เริ่มใหม่ทุกวันจันทร์ เวลาไทย) + แต้มแรงก์รายเดือน (รวมทุกเกม)
-- - แรงก์: Bronze → Silver → Gold → Platinum → Diamond → Master · ต้นเดือนตกลง 1 ขั้น (เริ่มที่แต้มต่ำสุดของขั้นนั้น)
-- - รางวัลสัปดาห์: อันดับ 1–10 ของแต่ละเกม (ต้องมีแต้ม > 0) ได้เพชร · ที่ 1 ได้ฉายาแชมป์เกมนั้น
--   เล่นครบ 10 ตาในเกมนั้น = เหรียญปลอบใจ · กดรับเองหลังสัปดาห์จบ (ไม่ต้องตั้งเวลาฝั่งเซิร์ฟเวอร์)
-- - ตัวเลขทั้งหมดอยู่ใน game_config.ranked · รันซ้ำได้
-- ===================================================================================

insert into public.game_config(key, value) values ('ranked', '{
  "pts": [30, 15, 5, 0], "min_humans": 2,
  "tiers": [0, 200, 500, 1000, 1800, 3000],
  "tier_names": ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master"],
  "games": {"dummy": "ดัมมี่", "pokdeng": "ป๊อกเด้ง", "gaogae": "เก้าเก", "somsip": "ผสมสิบ", "eekae": "อีแก่"},
  "weekly": {"top": [[1, 1, 100], [2, 3, 50], [4, 10, 20]], "consol_plays": 10, "consol_coins": 300}
}'::jsonb) on conflict (key) do nothing;

-- ---------- ตาราง ----------
create table if not exists public.rank_log (          -- กันนับซ้ำต่อตา
  user_id uuid not null references public.profiles(id) on delete cascade,
  gid text not null, game_id text not null, week date not null,
  pts int not null default 0, hrank int not null, humans int not null,
  at timestamptz not null default now(),
  primary key (user_id, gid)
);
create table if not exists public.weekly_scores (
  week date not null, game_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points int not null default 0, plays int not null default 0, wins int not null default 0,
  reached_at timestamptz not null default now(),       -- เวลาที่แต้มขึ้นล่าสุด (แต้มเท่ากัน: ใครถึงก่อนอยู่บน)
  claimed boolean not null default false, reward jsonb,
  primary key (week, game_id, user_id)
);
create index if not exists weekly_scores_board on public.weekly_scores(week, game_id, points desc, wins desc, reached_at);
create index if not exists weekly_scores_user on public.weekly_scores(user_id, claimed);
create table if not exists public.rank_season (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  month date not null, rp int not null default 0, best_tier int not null default 0
);
create table if not exists public.user_titles (       -- ฉายาพิเศษที่ได้จากระบบ (ตั้งเองพิมพ์ได้อยู่แล้วที่ profiles.title)
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id text not null, name text not null, times int not null default 1,
  got_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
alter table public.profiles add column if not exists badge text;   -- title_id ที่ติดอยู่ (null = ไม่ติด)

alter table public.rank_log      enable row level security;
alter table public.weekly_scores enable row level security;
alter table public.rank_season   enable row level security;
alter table public.user_titles   enable row level security;
revoke all on public.rank_log, public.weekly_scores, public.rank_season, public.user_titles from anon, authenticated;

-- ---------- ตัวช่วย ----------
create or replace function public._rk() returns jsonb
language sql stable set search_path = public as $$ select coalesce(public._cfg('ranked'), '{}'::jsonb) $$;
create or replace function public.game_month(p_ts timestamptz default now()) returns date
language sql stable set search_path = public as $$ select date_trunc('month', public.game_day(p_ts)::timestamp)::date $$;
create or replace function public._tier_of(p_rp int) returns int
language sql stable set search_path = public as $$
  select coalesce(max(i - 1), 0)::int from jsonb_array_elements_text(public._rk()->'tiers') with ordinality t(v, i) where coalesce(p_rp, 0) >= v::int $$;
create or replace function public._tier_floor(p_tier int) returns int
language sql stable set search_path = public as $$ select coalesce((public._rk()->'tiers'->>greatest(0, p_tier))::int, 0) $$;
-- แต้มแรงก์ ณ เดือนปัจจุบัน (เดือนก่อน → ตกขั้นละ 1 ต่อเดือนที่ผ่านไป · ไม่เขียนลงตาราง)
create or replace function public._rp_now(p_rp int, p_month date) returns int
language sql stable set search_path = public as $$
  select case when p_month is null then 0
    when p_month >= public.game_month() then coalesce(p_rp, 0)
    else public._tier_floor(greatest(0, public._tier_of(p_rp)
      - ((extract(year from public.game_month()) - extract(year from p_month)) * 12 + extract(month from public.game_month()) - extract(month from p_month))::int)) end $$;
-- ข้อมูลแรงก์สำหรับแสดงผล
create or replace function public._rank_info(p_rp int) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('rp', p_rp, 'tier', t, 'tier_name', public._rk()->'tier_names'->>t,
    'floor', public._tier_floor(t), 'next', (public._rk()->'tiers'->>(t + 1))::int)
  from (select public._tier_of(p_rp) t) x $$;

-- ---------- บันทึกผล (เซิร์ฟเวอร์เกมเรียกหลัง record_game_result) ----------
-- p_hrank = อันดับในหมู่คนจริงบนโต๊ะ (1 = ดีสุด) · p_humans = จำนวนคนจริงตอนเริ่มตา
create or replace function public.record_rank(p_user uuid, p_gid text, p_game text, p_hrank int, p_humans int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c jsonb := public._rk(); v_h int := coalesce(p_humans, 0); v_r int; v_pts int; v_week date := public.game_week(); v_month date := public.game_month();
        s public.rank_season; v_old int; v_new int; v_wk public.weekly_scores;
begin
  if p_gid is null or p_game is null or not (c->'games') ? p_game then return jsonb_build_object('counted', false, 'reason', 'game'); end if;
  if v_h < coalesce((c->>'min_humans')::int, 2) then return jsonb_build_object('counted', false, 'reason', 'humans'); end if;
  v_h := least(v_h, 8); v_r := greatest(1, least(v_h, coalesce(p_hrank, v_h)));
  -- ที่ 1 = pts[0] · ที่โหล่ = pts สุดท้าย · ระหว่างกลาง = ตามลำดับ (ไม่เกินช่องรองสุดท้าย)
  v_pts := case when v_r = 1 then (c->'pts'->>0)::int
                when v_r = v_h then (c->'pts'->>(jsonb_array_length(c->'pts') - 1))::int
                else (c->'pts'->>least(v_r - 1, jsonb_array_length(c->'pts') - 2))::int end;
  v_pts := greatest(0, coalesce(v_pts, 0));
  insert into public.rank_log(user_id, gid, game_id, week, pts, hrank, humans) values (p_user, p_gid, p_game, v_week, v_pts, v_r, v_h)
    on conflict (user_id, gid) do nothing;
  if not found then return jsonb_build_object('counted', false, 'reason', 'duplicate'); end if;
  insert into public.weekly_scores as w(week, game_id, user_id, points, plays, wins, reached_at)
    values (v_week, p_game, p_user, v_pts, 1, (v_r = 1)::int, now())
    on conflict (week, game_id, user_id) do update set points = w.points + excluded.points, plays = w.plays + 1, wins = w.wins + excluded.wins,
      reached_at = case when excluded.points > 0 then now() else w.reached_at end
    returning * into v_wk;
  select * into s from public.rank_season where user_id = p_user for update;
  v_old := public._rp_now(s.rp, s.month); v_new := v_old + v_pts;
  insert into public.rank_season as r(user_id, month, rp, best_tier) values (p_user, v_month, v_new, public._tier_of(v_new))
    on conflict (user_id) do update set month = v_month, rp = v_new, best_tier = greatest(r.best_tier, public._tier_of(v_new));
  return jsonb_build_object('counted', true, 'pts', v_pts, 'hrank', v_r, 'humans', v_h, 'week_points', v_wk.points, 'week_plays', v_wk.plays,
    'tier_up', public._tier_of(v_new) > public._tier_of(v_old)) || public._rank_info(v_new);
end $$;

-- ---------- ตารางอันดับ ----------
-- p_prev = true: ดูสัปดาห์ที่แล้ว (ผลสุดท้าย)
create or replace function public.get_leaderboard(p_game text, p_prev boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public._uid(); v_week date := public.game_week() - case when p_prev then 7 else 0 end; c jsonb := public._rk(); v_top jsonb; v_me jsonb;
begin
  if not (c->'games') ? p_game then raise exception 'ไม่มีเกมนี้ในตารางอันดับ'; end if;
  with b as (
    select w.*, rank() over (order by w.points desc, w.wins desc, w.reached_at) rk
    from public.weekly_scores w where w.week = v_week and w.game_id = p_game and w.points > 0)
  select coalesce(jsonb_agg(jsonb_build_object('rank', b.rk, 'name', p.display_name, 'title', p.title,
      'badge', (select t.name from public.user_titles t where t.user_id = p.id and t.title_id = p.badge),
      'ch', p.equipped->>'characters', 'points', b.points, 'plays', b.plays, 'wins', b.wins, 'me', b.user_id = u,
      'tier', public._tier_of(public._rp_now(rs.rp, rs.month))) order by b.rk, b.reached_at) filter (where b.rk <= 50), '[]'),
    (select jsonb_build_object('rank', x.rk, 'points', x.points, 'plays', x.plays, 'wins', x.wins) from b x where x.user_id = u)
    into v_top, v_me
  from b join public.profiles p on p.id = b.user_id left join public.rank_season rs on rs.user_id = b.user_id;
  if v_me is null then
    select jsonb_build_object('rank', null, 'points', w.points, 'plays', w.plays, 'wins', w.wins) into v_me
    from public.weekly_scores w where w.week = v_week and w.game_id = p_game and w.user_id = u;
  end if;
  return jsonb_build_object('game', p_game, 'week', v_week, 'ends_at', public._day_start(v_week + 7), 'prev', coalesce(p_prev, false),
    'top', v_top, 'me', coalesce(v_me, jsonb_build_object('rank', null, 'points', 0, 'plays', 0, 'wins', 0)),
    'pts', c->'pts', 'weekly', c->'weekly', 'tier_names', c->'tier_names');
end $$;

-- ---------- แรงก์ของฉัน + รางวัลค้างรับ + ฉายาที่มี ----------
create or replace function public.get_rank() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public._uid(); s public.rank_season; v_rp int; v_pend int; c jsonb := public._rk();
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  select * into s from public.rank_season where user_id = u;
  v_rp := public._rp_now(s.rp, s.month);
  select count(*) into v_pend from public.weekly_scores where user_id = u and not claimed and week < public.game_week();
  return public._rank_info(v_rp) || jsonb_build_object('month', public.game_month(), 'month_ends', public._day_start((public.game_month() + interval '1 month')::date),
    'best_tier', coalesce(s.best_tier, 0), 'tiers', c->'tiers', 'tier_names', c->'tier_names', 'pending', v_pend,
    'badge', (select badge from public.profiles where id = u),
    'titles', coalesce((select jsonb_agg(jsonb_build_object('id', title_id, 'name', name, 'times', times) order by got_at desc) from public.user_titles where user_id = u), '[]'));
end $$;

-- ---------- รับรางวัลสัปดาห์ที่จบแล้ว (ทุกเกม ทุกสัปดาห์ที่ค้าง) ----------
create or replace function public.claim_rank_rewards() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); c jsonb := public._rk(); r record; v_rank int; v_m int; v_c int; v_t text; v_tn text; band jsonb;
        out jsonb := '[]'; tm int := 0; tc int := 0;
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  perform 1 from public.profiles where id = u for update;
  for r in select * from public.weekly_scores where user_id = u and not claimed and week < public.game_week() order by week, game_id loop
    v_rank := null; v_m := 0; v_c := 0; v_t := null; v_tn := null;
    if r.points > 0 then
      select x.rk into v_rank from (select user_id, rank() over (order by points desc, wins desc, reached_at) rk
        from public.weekly_scores where week = r.week and game_id = r.game_id and points > 0) x where x.user_id = u;
      for band in select * from jsonb_array_elements(c->'weekly'->'top') loop
        if v_rank between (band->>0)::int and (band->>1)::int then v_m := (band->>2)::int; end if;
      end loop;
    end if;
    if r.plays >= coalesce((c->'weekly'->>'consol_plays')::int, 10) then v_c := coalesce((c->'weekly'->>'consol_coins')::int, 0); end if;
    if v_rank = 1 then
      v_t := 'champ-' || r.game_id; v_tn := 'แชมป์' || coalesce(c->'games'->>r.game_id, r.game_id);
      insert into public.user_titles as t(user_id, title_id, name) values (u, v_t, v_tn)
        on conflict (user_id, title_id) do update set times = t.times + 1, name = excluded.name, got_at = now();
    end if;
    if v_m > 0 then perform public._wallet_add(u, 'mcash', v_m, 'weekly_rank', r.week || ':' || r.game_id); end if;
    if v_c > 0 then perform public._wallet_add(u, 'coins', v_c, 'weekly_consol', r.week || ':' || r.game_id); end if;
    update public.weekly_scores set claimed = true, reward = jsonb_build_object('rank', v_rank, 'mcash', v_m, 'coins', v_c, 'title', v_tn)
      where week = r.week and game_id = r.game_id and user_id = u;
    tm := tm + v_m; tc := tc + v_c;
    out := out || jsonb_build_object('week', r.week, 'game', r.game_id, 'rank', v_rank, 'points', r.points, 'plays', r.plays, 'mcash', v_m, 'coins', v_c, 'title', v_tn);
  end loop;
  return jsonb_build_object('items', out, 'mcash', tm, 'coins', tc);
end $$;

-- ---------- ติด/ถอดฉายาพิเศษ ----------
create or replace function public.set_badge(p_title text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  if p_title is not null and not exists (select 1 from public.user_titles where user_id = u and title_id = p_title) then raise exception 'ยังไม่มีฉายานี้'; end if;
  update public.profiles set badge = p_title, updated_at = now() where id = u;
  return jsonb_build_object('badge', p_title, 'name', (select name from public.user_titles where user_id = u and title_id = p_title));
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._rk(), public._tier_of(int), public._tier_floor(int), public._rp_now(int, date), public._rank_info(int) from public, anon, authenticated;
revoke all on function public.record_rank(uuid, text, text, int, int) from public, anon, authenticated;
grant execute on function public.record_rank(uuid, text, text, int, int) to service_role;
revoke all on function public.get_leaderboard(text, boolean), public.get_rank(), public.claim_rank_rewards(), public.set_badge(text) from public, anon;
grant execute on function public.get_leaderboard(text, boolean), public.get_rank(), public.claim_rank_rewards(), public.set_badge(text) to authenticated;
grant execute on function public.game_month(timestamptz) to anon, authenticated;
