-- ===================================================================================
-- v12: เพื่อน — ส่งคำขอด้วยชื่อผู้ใช้ (@username) · ตอบรับ/ปฏิเสธ · ลบเพื่อน
-- - หนึ่งแถวต่อคู่ (lo < hi) เก็บสถานะ: none · req_lo (lo ขอ) · req_hi (hi ขอ) · friends — เปลี่ยนสถานะแทนการลบแถว
-- - ขอกันทั้งสองฝ่าย = เป็นเพื่อนทันที · เพื่อนสูงสุด 100 คน · คำขอที่ค้างส่งออกสูงสุด 50
-- - สถานะออนไลน์/ชวนเข้าห้องอยู่ที่เซิร์ฟเวอร์เกม (ขอรายชื่อเพื่อนผ่าน friend_ids ด้วยสิทธิ์ service_role)
-- - รันซ้ำได้
-- ===================================================================================
create table if not exists public.friendships (
  lo uuid not null references public.profiles(id) on delete cascade,
  hi uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'none' check (status in ('none', 'req_lo', 'req_hi', 'friends')),
  updated_at timestamptz not null default now(),
  primary key (lo, hi), check (lo < hi)
);
create index if not exists friendships_hi on public.friendships(hi, status);
create index if not exists friendships_lo on public.friendships(lo, status);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

insert into public.game_config(key, value) values ('friends', '{"max": 100, "max_out": 50}'::jsonb) on conflict (key) do nothing;

-- ---------- ตัวช่วย ----------
create or replace function public._fr_cfg(p_k text, p_def int) returns int
language sql stable set search_path = public as $$ select coalesce((public._cfg('friends') ->> p_k)::int, p_def) $$;
create or replace function public._fr_count(p_user uuid) returns int
language sql stable set search_path = public as $$ select count(*)::int from public.friendships where (lo = p_user or hi = p_user) and status = 'friends' $$;
-- สถานะจากมุมของ p_me: none · friends · out (ฉันขอ) · in (เขาขอฉัน)
create or replace function public._fr_rel(p_me uuid, s text, p_lo uuid) returns text
language sql immutable as $$
  select case when s = 'friends' then 'friends' when s = 'none' or s is null then 'none'
              when (s = 'req_lo') = (p_me = p_lo) then 'out' else 'in' end $$;
create or replace function public._fr_target(p_username text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from public.profiles where username = lower(trim(coalesce(p_username, '')));
  if v is null then raise exception 'ไม่พบผู้เล่นชื่อผู้ใช้ @%', lower(trim(coalesce(p_username, ''))); end if;
  return v;
end $$;
create or replace function public._fr_card(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('username', p.username, 'name', p.display_name, 'title', p.title,
    'badge', (select t.name from public.user_titles t where t.user_id = p.id and t.title_id = p.badge),
    'ch', p.equipped->>'characters', 'last_login_at', p.last_login_at, 'last_game', p.last_game,
    'tier', public._tier_of(public._rp_now(rs.rp, rs.month)))
  from public.profiles p left join public.rank_season rs on rs.user_id = p.id where p.id = p_id $$;

-- ---------- ส่งคำขอ (หรือตอบรับทันทีถ้าเขาขอเรามาก่อน) ----------
create or replace function public.friend_request(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); t uuid := public._fr_target(p_username); v_lo uuid; v_hi uuid; f public.friendships; v_rel text;
begin
  if t = u then raise exception 'เพิ่มตัวเองเป็นเพื่อนไม่ได้'; end if;
  v_lo := least(u, t); v_hi := greatest(u, t);
  insert into public.friendships(lo, hi) values (v_lo, v_hi) on conflict (lo, hi) do nothing;
  select * into f from public.friendships where lo = v_lo and hi = v_hi for update;
  v_rel := public._fr_rel(u, f.status, f.lo);
  if v_rel = 'friends' then return jsonb_build_object('status', 'already') || jsonb_build_object('friend', public._fr_card(t)); end if;
  if v_rel = 'out' then return jsonb_build_object('status', 'sent'); end if;
  if public._fr_count(u) >= public._fr_cfg('max', 100) then raise exception 'รายชื่อเพื่อนเต็มแล้ว (% คน)', public._fr_cfg('max', 100); end if;
  if v_rel = 'in' then
    if public._fr_count(t) >= public._fr_cfg('max', 100) then raise exception 'รายชื่อเพื่อนของอีกฝ่ายเต็มแล้ว'; end if;
    update public.friendships set status = 'friends', updated_at = now() where lo = v_lo and hi = v_hi;
    return jsonb_build_object('status', 'accepted', 'friend', public._fr_card(t));
  end if;
  if (select count(*) from public.friendships where (lo = u and status = 'req_lo') or (hi = u and status = 'req_hi')) >= public._fr_cfg('max_out', 50) then
    raise exception 'ส่งคำขอค้างไว้มากเกินไป รออีกฝ่ายตอบก่อน'; end if;
  update public.friendships set status = case when u = v_lo then 'req_lo' else 'req_hi' end, updated_at = now() where lo = v_lo and hi = v_hi;
  return jsonb_build_object('status', 'sent');
end $$;

-- ---------- ตอบคำขอที่เข้ามา ----------
create or replace function public.friend_respond(p_username text, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); t uuid := public._fr_target(p_username); v_lo uuid := least(u, t); v_hi uuid := greatest(u, t); f public.friendships;
begin
  select * into f from public.friendships where lo = v_lo and hi = v_hi for update;
  if f.lo is null or public._fr_rel(u, f.status, f.lo) <> 'in' then raise exception 'ไม่มีคำขอนี้แล้ว'; end if;
  if p_accept then
    if public._fr_count(u) >= public._fr_cfg('max', 100) then raise exception 'รายชื่อเพื่อนเต็มแล้ว (% คน)', public._fr_cfg('max', 100); end if;
    if public._fr_count(t) >= public._fr_cfg('max', 100) then raise exception 'รายชื่อเพื่อนของอีกฝ่ายเต็มแล้ว'; end if;
  end if;
  update public.friendships set status = case when p_accept then 'friends' else 'none' end, updated_at = now() where lo = v_lo and hi = v_hi;
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end, 'friend', case when p_accept then public._fr_card(t) end);
end $$;

-- ---------- ลบเพื่อน / ยกเลิกคำขอที่ส่งไป ----------
create or replace function public.friend_remove(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); t uuid := public._fr_target(p_username);
begin
  update public.friendships set status = 'none', updated_at = now() where lo = least(u, t) and hi = greatest(u, t) and status <> 'none';
  return jsonb_build_object('status', 'removed');
end $$;

-- ---------- รายชื่อเพื่อน + คำขอเข้า/ออก ----------
create or replace function public.get_friends() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public._uid();
begin
  return (with r as (
      select case when f.lo = u then f.hi else f.lo end other, public._fr_rel(u, f.status, f.lo) rel, f.updated_at
      from public.friendships f where (f.lo = u or f.hi = u) and f.status <> 'none')
    select jsonb_build_object(
      'friends',  coalesce(jsonb_agg(public._fr_card(other) order by updated_at desc) filter (where rel = 'friends'), '[]'),
      'incoming', coalesce(jsonb_agg(public._fr_card(other) order by updated_at desc) filter (where rel = 'in'), '[]'),
      'outgoing', coalesce(jsonb_agg(public._fr_card(other) order by updated_at desc) filter (where rel = 'out'), '[]'),
      'max', public._fr_cfg('max', 100), 'me', (select username from public.profiles where id = u))
    from r);
end $$;

-- ---------- เซิร์ฟเวอร์เกม: รายชื่อเพื่อนของผู้เล่น (ใช้แสดงออนไลน์/ตรวจสิทธิ์ชวนเข้าห้อง) ----------
create or replace function public.friend_ids(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username)), '[]')
  from public.friendships f join public.profiles p on p.id = case when f.lo = p_user then f.hi else f.lo end
  where (f.lo = p_user or f.hi = p_user) and f.status = 'friends' $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._fr_cfg(text, int), public._fr_count(uuid), public._fr_rel(uuid, text, uuid), public._fr_target(text), public._fr_card(uuid) from public, anon, authenticated;
revoke all on function public.friend_ids(uuid) from public, anon, authenticated;
grant execute on function public.friend_ids(uuid) to service_role;
revoke all on function public.friend_request(text), public.friend_respond(text, boolean), public.friend_remove(text), public.get_friends() from public, anon;
grant execute on function public.friend_request(text), public.friend_respond(text, boolean), public.friend_remove(text), public.get_friends() to authenticated;
