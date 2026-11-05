-- v15_title_select.sql — ฉายาใต้ชื่อเลือกได้เฉพาะที่ปลดล็อกแล้ว (ฉายาจากอันดับรายสัปดาห์ · ความสำเร็จ) ไม่พิมพ์เอง
-- รันหลัง v14_achievements.sql · รันซ้ำได้ ปลอดภัย · ฉายาที่ผู้เล่นพิมพ์ไว้ก่อนหน้านี้ยังอยู่จนกว่าจะเปลี่ยน
-- set_title(id) = ตั้งจาก user_titles ('' = ไม่ติด) · update_profile(p_title) ยังรับได้เฉพาะชื่อฉายาที่มีจริงหรือค่าว่าง (กันยิง API พิมพ์เอง)

create or replace function public.set_title(p_id text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := public._uid(); v_name text := '';
begin
  if u is null then raise exception 'ต้องล็อกอิน'; end if;
  if coalesce(p_id, '') <> '' then
    select name into v_name from public.user_titles where user_id = u and title_id = p_id;
    if v_name is null then raise exception 'ยังไม่ได้ปลดล็อกฉายานี้'; end if;
  end if;
  update public.profiles set title = v_name, updated_at = now() where id = u;
  return jsonb_build_object('title', v_name, 'id', coalesce(p_id, ''));
end $$;

-- เหมือน v6_progression.sql ทุกอย่าง ยกเว้นส่วนฉายา: ต้องเป็นชื่อฉายาที่ปลดล็อกแล้ว หรือค่าว่าง
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
    v_title := trim(p_title);
    if v_title <> '' and not exists (select 1 from public.user_titles where user_id = u and name = v_title) then
      raise exception 'เลือกได้เฉพาะฉายาที่ปลดล็อกแล้ว';
    end if;
    update public.profiles set title = v_title, updated_at = now() where id = u;
  end if;
  return (select jsonb_build_object('display_name', display_name, 'title', title, 'coins', coins, 'name_changes', name_changes, 'cost', v_cost) from public.profiles where id = u);
end $$;

revoke all on function public.set_title(text) from public, anon;
grant execute on function public.set_title(text) to authenticated;
