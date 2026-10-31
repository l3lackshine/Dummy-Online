-- ===================================================================================
-- v10 · บทสอนเล่น: สถานะเคยเห็นบทสอน · รางวัลจบสอน (ครั้งเดียว · ข้ามก็ได้) · ภารกิจระยะยาว "เรียนจบดัมมี่" (metric tutorial)
-- ลำดับรัน: … → v9_bp_extra.sql → v10_tutorial.sql → bp_seed.sql (รันซ้ำได้ ปลอดภัย)
-- ผู้เล่นที่มีอยู่ก่อนอัปเดตนี้: ไม่เด้งบทสอนเอง (เปิดเองได้จากปุ่ม "สอนเล่น" และยังรับรางวัลได้ครั้งแรก)
-- ===================================================================================
do $m$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'tutorial_seen') then
    alter table public.profiles add column tutorial_seen boolean not null default false;
    update public.profiles set tutorial_seen = true;   -- ทำครั้งเดียวตอนเพิ่มคอลัมน์: ผู้เล่นเดิมไม่ต้องเด้งบทสอน
  end if;
end $m$;
alter table public.profiles add column if not exists tutorial_claimed boolean not null default false;

create or replace function public.get_tutorial() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('seen', tutorial_seen, 'claimed', tutorial_claimed, 'reward', coalesce(public._cfg('tutorial_reward'), '[]'))
  from public.profiles where id = public._uid() $$;

-- จบหรือข้ามบทสอน: บันทึกว่าเห็นแล้ว · รางวัลให้ครั้งแรกครั้งเดียว (game_config.tutorial_reward = [{kind,id,qty}])
create or replace function public.finish_tutorial(p_skipped boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_claimed boolean; r jsonb; v_got jsonb := '[]';
begin
  select tutorial_claimed into v_claimed from public.profiles where id = u for update;
  if v_claimed is null then raise exception 'ไม่พบผู้เล่น'; end if;
  update public.profiles set tutorial_seen = true, tutorial_claimed = true where id = u;
  if not v_claimed then
    for r in select * from jsonb_array_elements(coalesce(public._cfg('tutorial_reward'), '[]')) loop
      if r->>'kind' in ('coins', 'mcash') then perform public._wallet_add(u, r->>'kind', (r->>'qty')::int, 'tutorial', null);
      else perform public._grant_qty(u, r->>'kind', r->>'id', greatest(1, (r->>'qty')::int)); end if;
      v_got := v_got || jsonb_build_array(r);
    end loop;
  end if;
  return jsonb_build_object('first', not v_claimed, 'skipped', coalesce(p_skipped, false), 'reward', v_got);
end $$;

-- ตัวนับภารกิจ: เพิ่ม 'tutorial' (จบ/ข้ามบทสอนแล้ว = 1)
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
  elsif p_metric = 'tutorial' then
    select case when tutorial_claimed then 1 else 0 end into v from public.profiles where id = p_user;
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

insert into public.game_config(key, value) values ('tutorial_reward', '[{"kind":"items","id":"ticket-b","qty":1},{"kind":"items","id":"tea-g","qty":1}]'::jsonb)
on conflict (key) do update set value = excluded.value;

revoke all on function public.get_tutorial(), public.finish_tutorial(boolean) from public, anon;
grant execute on function public.get_tutorial(), public.finish_tutorial(boolean) to authenticated;
