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
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
