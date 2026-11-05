-- v13_profile_card.sql — บัตรโปรไฟล์แบบ Endfield: ข้อความแนะนำตัว · ตู้โชว์ตัวละคร 4 ช่อง · เหรียญฉายาที่ปักโชว์ 6 ช่อง · ธีม · ตัวละครเด่น
-- รันหลัง v12_friends.sql · รันซ้ำได้ ปลอดภัย (เพิ่มคอลัมน์/ฟังก์ชันใหม่ ไม่แตะของเดิม)
-- get_profile_card(ชื่อผู้ใช้) เปิดดูของคนอื่นได้ — ส่งเฉพาะข้อมูลที่ตั้งใจโชว์ ไม่มีเหรียญ/เพชร/คลังของ

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists showcase text[] not null default '{}';
alter table public.profiles add column if not exists pinned_titles text[] not null default '{}';
alter table public.profiles add column if not exists card_theme text not null default 'sakura';
alter table public.profiles add column if not exists featured_char text;

-- มีตัวละครนี้ไหม: ในคลังของ (inventory / ตัวฟรีเริ่มต้น) หรือมีแถวดาวใน user_characters
create or replace function public._has_char(u uuid, p_char text) returns boolean
language sql stable security definer set search_path = public as $$
  select public._owns(u, 'characters', p_char) or exists (select 1 from public.user_characters where user_id = u and character_id = p_char) $$;

-- ข้อมูลบัตรของผู้เล่น 1 คน (ใช้ร่วมกันทั้งดูของตัวเองและของคนอื่น)
create or replace function public._profile_card(u uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p public.profiles; s public.rank_season; v_featured text;
begin
  select * into p from public.profiles where id = u;
  if not found then return null; end if;
  select * into s from public.rank_season where user_id = u;
  v_featured := coalesce(p.featured_char, p.equipped->>'characters');
  return jsonb_build_object(
    'username', p.username, 'name', p.display_name, 'title', p.title, 'created_at', p.created_at,
    'level', public._level_of(p.player_exp), 'bio', p.bio, 'theme', p.card_theme, 'featured', v_featured,
    'best_streak', p.best_streak, 'total_login_days', p.total_login_days,
    'badge', (select t.name from public.user_titles t where t.user_id = u and t.title_id = p.badge),
    'rank', case when s.user_id is null then null else public._rank_info(public._rp_now(s.rp, s.month)) end,
    'showcase', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'stars', coalesce(c.stars, 1), 'level', coalesce(c.level, 1)) order by x.n)
      from unnest(p.showcase) with ordinality as x(id, n)
      left join public.user_characters c on c.user_id = u and c.character_id = x.id
      where public._has_char(u, x.id)), '[]'),   -- ตัวละครฟรีเริ่มต้นไม่มีแถวใน user_characters จึงตรวจด้วย _has_char
    'medals', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.title_id, 'name', t.name, 'times', t.times) order by x.n)
      from unnest(p.pinned_titles) with ordinality as x(id, n)
      join public.user_titles t on t.user_id = u and t.title_id = x.id), '[]'),
    'titles_all', coalesce((select jsonb_agg(jsonb_build_object('id', title_id, 'name', name, 'times', times) order by got_at desc)
      from public.user_titles where user_id = u), '[]'),
    'counts', jsonb_build_object(
      'characters', (select count(*) from public.user_characters where user_id = u),
      'items', (select count(*) from public.inventory where user_id = u and kind <> 'characters' and qty >= 1),
      'titles', (select count(*) from public.user_titles where user_id = u)),
    'mastery', coalesce((select jsonb_agg(jsonb_build_object('game', g.game_id, 'plays', g.plays, 'wins', g.wins) order by g.plays desc)
      from public.game_stats g where g.user_id = u), '[]'));
end $$;

-- ดูบัตรโปรไฟล์: ไม่ใส่ชื่อ = ของตัวเอง · ใส่ชื่อผู้ใช้ = ของคนอื่น (ไม่สนตัวพิมพ์เล็กใหญ่)
create or replace function public.get_profile_card(p_username text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public._uid(); v_target uuid;
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  if p_username is null or trim(p_username) = '' then
    v_target := u;
  else
    select id into v_target from public.profiles where lower(username) = lower(trim(p_username));
    if v_target is null then raise exception 'ไม่พบผู้เล่น'; end if;
  end if;
  return public._profile_card(v_target) || jsonb_build_object('mine', v_target = u);
end $$;

-- บันทึกการตั้งค่าบัตร: ส่งเฉพาะช่องที่จะเปลี่ยน (null = ไม่เปลี่ยน) · ตรวจทุกช่องที่ฐานข้อมูล
create or replace function public.set_profile_card(p_bio text default null, p_showcase text[] default null, p_pinned text[] default null,
  p_theme text default null, p_featured text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_bio text; v_id text;
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  if p_bio is not null then
    v_bio := left(trim(regexp_replace(p_bio, '[[:cntrl:]]', '', 'g')), 60);
    if v_bio <> '' and public._bad_name(v_bio) is not null then raise exception 'ข้อความแนะนำตัว: %', public._bad_name(v_bio); end if;
    update public.profiles set bio = v_bio, updated_at = now() where id = u;
  end if;
  if p_showcase is not null then
    if cardinality(p_showcase) > 4 then raise exception 'ตู้โชว์ใส่ได้ไม่เกิน 4 ตัว'; end if;
    if cardinality(p_showcase) <> (select count(distinct x) from unnest(p_showcase) x) then raise exception 'ใส่ตัวละครซ้ำไม่ได้'; end if;
    foreach v_id in array p_showcase loop
      if not public._has_char(u, v_id) then raise exception 'คุณยังไม่มีตัวละครนี้'; end if;
    end loop;
    update public.profiles set showcase = p_showcase, updated_at = now() where id = u;
  end if;
  if p_pinned is not null then
    if cardinality(p_pinned) > 6 then raise exception 'ปักเหรียญได้ไม่เกิน 6 อัน'; end if;
    if cardinality(p_pinned) <> (select count(distinct x) from unnest(p_pinned) x) then raise exception 'ปักเหรียญซ้ำไม่ได้'; end if;
    foreach v_id in array p_pinned loop
      if not exists (select 1 from public.user_titles where user_id = u and title_id = v_id) then raise exception 'ยังไม่มีฉายานี้'; end if;
    end loop;
    update public.profiles set pinned_titles = p_pinned, updated_at = now() where id = u;
  end if;
  if p_theme is not null then
    if p_theme not in ('sakura', 'night', 'teahouse') then raise exception 'ไม่มีธีมนี้'; end if;
    update public.profiles set card_theme = p_theme, updated_at = now() where id = u;
  end if;
  if p_featured is not null then
    if p_featured = '' then
      update public.profiles set featured_char = null, updated_at = now() where id = u;
    else
      if not public._has_char(u, p_featured) then raise exception 'คุณยังไม่มีตัวละครนี้'; end if;
      update public.profiles set featured_char = p_featured, updated_at = now() where id = u;
    end if;
  end if;
  return public._profile_card(u) || jsonb_build_object('mine', true);
end $$;

-- ---------- สิทธิ์ ----------
revoke all on function public._profile_card(uuid), public._has_char(uuid, text) from public, anon, authenticated;
revoke all on function public.get_profile_card(text), public.set_profile_card(text, text[], text[], text, text) from public, anon;
grant execute on function public.get_profile_card(text), public.set_profile_card(text, text[], text[], text, text) to authenticated;
