-- v16_history.sql — ประวัติการเล่น + สถิติแยกเกม (โรดแมพข้อ 9)
-- รันหลัง v15_title_select.sql · รันซ้ำได้ ปลอดภัย · ไม่สร้างตาราง ไม่แก้ฟังก์ชันบันทึกผล — อ่านจาก game_log อย่างเดียว
-- ทำไมคำนวณจาก game_log แทน game_stats: ได้ตัวเลขเพิ่ม (ชนะติดกัน · ตัวละครที่ใช้บ่อย · น็อก) และตัดตาซ้อมออกได้
-- ตาโหมดซ้อม (practice = สตามิน่าไม่พอ ไม่ได้รางวัล) ไม่แสดงทั้งในประวัติและสถิติ · โต๊ะที่มีบอทยังนับ (ติดป้ายในประวัติ)
-- Public: get_game_history(p_limit) · get_game_stats()
-- Extend: อยากได้ตัวเลขเพิ่มต่อเกม → เพิ่มคอลัมน์ใน CTE per_game แล้วใส่ชื่อใน jsonb_build_object ท้ายฟังก์ชัน

-- ประวัติล่าสุดของตัวเอง (ใหม่สุดก่อน) · จำกัด 1–100 ตา ค่าเริ่มต้น 30
create or replace function public.get_game_history(p_limit int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u       uuid := public._uid();
  v_limit int  := greatest(1, least(100, coalesce(p_limit, 30)));
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'game',      g.game_id,
             'result',    g.result,
             'coins',     g.coin_delta,
             'exp',       g.exp_gain,
             'bp',        g.bp_gain,
             'melds',     g.melds,
             'knock',     g.knock,
             'feats',     g.feats,
             'character', g.character_id,
             'bots',      g.bots,
             'farm',      g.farm,
             'at',        g.played_at)
           order by g.played_at desc, g.id desc)
    from (
      select *
      from public.game_log
      where user_id = u
        and not practice
      order by played_at desc, id desc
      limit v_limit
    ) g), '[]'::jsonb);
end $$;

-- สถิติแยกเกมของตัวเอง + ยอดรวมทุกเกม
create or replace function public.get_game_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  u       uuid := public._uid();
  v_games jsonb;
  v_total jsonb;
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;

  with rows as (
    select game_id, result, coin_delta, melds, knock, character_id, played_at, id
    from public.game_log
    where user_id = u
      and not practice
  ),
  -- ชนะติดกัน: ให้ทุกตาที่ "แพ้" เปิดกลุ่มใหม่ แล้วนับตาที่ชนะในแต่ละกลุ่ม
  streak_groups as (
    select game_id, result,
           count(*) filter (where result <> 'win')
             over (partition by game_id order by played_at, id) as grp
    from rows
  ),
  best_streak as (
    select game_id, max(wins_in_group) as best
    from (
      select game_id, grp, count(*) filter (where result = 'win') as wins_in_group
      from streak_groups
      group by game_id, grp
    ) s
    group by game_id
  ),
  -- ชนะติดกันตอนนี้ = จำนวนตาที่ชนะหลังตาที่แพ้ครั้งล่าสุด
  current_streak as (
    select r.game_id, count(*) as now_streak
    from rows r
    where r.result = 'win'
      and not exists (
        select 1 from rows later
        where later.game_id = r.game_id
          and later.result <> 'win'
          and (later.played_at, later.id) > (r.played_at, r.id))
    group by r.game_id
  ),
  -- ตัวละครที่ใช้บ่อยที่สุดต่อเกม (เท่ากัน = ตัวที่ใช้ล่าสุด)
  top_character as (
    select distinct on (game_id) game_id, character_id
    from rows
    where character_id is not null
    group by game_id, character_id
    order by game_id, count(*) desc, max(played_at) desc
  ),
  per_game as (
    select game_id,
           count(*)                                    as plays,
           count(*) filter (where result = 'win')      as wins,
           coalesce(sum(coin_delta), 0)                as coins,
           coalesce(sum(melds), 0)                     as melds,
           count(*) filter (where knock)               as knocks,
           max(played_at)                              as last_at
    from rows
    group by game_id
  )
  select jsonb_agg(jsonb_build_object(
           'game',         p.game_id,
           'plays',        p.plays,
           'wins',         p.wins,
           'coins',        p.coins,
           'melds',        p.melds,
           'knocks',       p.knocks,
           'best_streak',  coalesce(b.best, 0),
           'streak',       coalesce(c.now_streak, 0),
           'character',    t.character_id,
           'last_at',      p.last_at)
         order by p.plays desc, p.game_id)
  into v_games
  from per_game p
  left join best_streak    b using (game_id)
  left join current_streak c using (game_id)
  left join top_character  t using (game_id);

  select jsonb_build_object(
           'plays', count(*),
           'wins',  count(*) filter (where result = 'win'),
           'coins', coalesce(sum(coin_delta), 0))
  into v_total
  from public.game_log
  where user_id = u
    and not practice;

  return jsonb_build_object('games', coalesce(v_games, '[]'::jsonb), 'total', v_total);
end $$;

revoke all on function public.get_game_history(int) from public, anon;
revoke all on function public.get_game_stats()      from public, anon;
grant execute on function public.get_game_history(int) to authenticated;
grant execute on function public.get_game_stats()      to authenticated;
