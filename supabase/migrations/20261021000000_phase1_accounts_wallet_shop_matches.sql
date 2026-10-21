-- Dummy Online — เฟส 1: บัญชีผู้เล่น · เหรียญ · ร้านค้า · ประวัติเกม
-- รันทั้งไฟล์ใน Supabase Dashboard > SQL Editor (หรือ `supabase db push`)
-- หลักการ: client (anon/authenticated) "อ่านได้เฉพาะของตัวเอง" ห้ามเขียนตรง ๆ ทุกการเขียนผ่าน server (service_role) + ฟังก์ชันด้านล่าง

-- ───────────── ตาราง ─────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default 'ผู้เล่น' check (char_length(name) between 1 and 14),
  coins       bigint not null default 5000 check (coins >= 0),
  equipped    jsonb  not null default '{}'::jsonb,   -- สกินที่ใส่อยู่ เช่น {"dummyBackSkin":"gold","dummyTitle":"..."}
  games       integer not null default 0,
  wins        integer not null default 0,            -- ตาที่ได้เหรียญสุทธิ > 0
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.shop_items (                      -- สร้างจาก client/public/skin/skins.json ด้วย scripts/gen-shop-sql.js
  kind   text not null,                               -- themes | characters | backs | tables | backgrounds | cards | docks
  id     text not null,
  name   text,
  price  integer not null default 0 check (price >= 0),
  primary key (kind, id)
);

create table public.purchases (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  item_id    text not null,
  price      integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, item_id),
  foreign key (kind, item_id) references public.shop_items (kind, id)
);

create table public.matches (
  gid       text primary key,                         -- รหัสเกมจาก engine ใช้กันบันทึก/จ่ายซ้ำ
  rule      text not null,                            -- dummy | pokdeng | gaogae | somsip | eekae
  stake     integer not null default 0,
  seats     integer not null,
  humans    integer not null,                         -- จำนวนผู้เล่นจริงตอนเริ่มตา (เฟส 2: แรงค์นับเฉพาะ humans >= 2)
  ended_at  timestamptz not null default now()
);

create table public.match_players (
  gid      text not null references public.matches (gid) on delete cascade,
  seat     integer not null,
  user_id  uuid references public.profiles (id) on delete set null,   -- null = บอท/แขก
  name     text not null,
  delta    integer not null,                          -- ผลเหรียญตามกติกา
  applied  integer not null,                          -- ที่หักบวกจริง (ไม่ให้ยอดต่ำกว่า 0)
  won      boolean not null,
  place    integer not null,
  primary key (gid, seat)
);
create index match_players_user_idx on public.match_players (user_id, gid);

create table public.coin_ledger (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  amount         bigint not null,
  balance_after  bigint not null,
  kind           text not null check (kind in ('grant', 'shop', 'match')),
  ref            text not null,
  created_at     timestamptz not null default now(),
  unique (user_id, kind, ref)
);

-- ───────────── ฟังก์ชัน (เรียกได้เฉพาะ service_role = เซิร์ฟเวอร์เกม) ─────────────
create or replace function public.ensure_profile(p_user uuid, p_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_coins bigint;
begin
  insert into profiles (id, name)
  values (p_user, coalesce(nullif(left(btrim(coalesce(p_name, '')), 14), ''), 'ผู้เล่น'))
  on conflict (id) do nothing
  returning coins into v_coins;
  if found then
    insert into coin_ledger (user_id, amount, balance_after, kind, ref)
    values (p_user, v_coins, v_coins, 'grant', 'initial') on conflict do nothing;
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_profile(new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ซื้อของ: ราคาอ่านจาก shop_items เสมอ (client บอกราคาเองไม่ได้) · atomic · ซื้อซ้ำไม่หักซ้ำ
create or replace function public.buy_item(p_user uuid, p_kind text, p_item text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_price integer; v_coins bigint;
begin
  select price into v_price from shop_items where kind = p_kind and id = p_item;
  if not found then return jsonb_build_object('ok', false, 'error', 'unknown_item'); end if;
  select coins into v_coins from profiles where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_profile'); end if;
  if exists (select 1 from purchases where user_id = p_user and kind = p_kind and item_id = p_item) then
    return jsonb_build_object('ok', true, 'already', true, 'coins', v_coins);
  end if;
  if v_price > 0 and v_coins < v_price then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'coins', v_coins);
  end if;
  if v_price > 0 then
    v_coins := v_coins - v_price;
    update profiles set coins = v_coins, updated_at = now() where id = p_user;
    insert into coin_ledger (user_id, amount, balance_after, kind, ref)
    values (p_user, -v_price, v_coins, 'shop', p_kind || ':' || p_item);
  end if;
  insert into purchases (user_id, kind, item_id, price) values (p_user, p_kind, p_item, v_price);
  return jsonb_build_object('ok', true, 'coins', v_coins);
end $$;

-- บันทึกผลหนึ่งตา + จ่ายเหรียญทุกคนใน transaction เดียว · gid ซ้ำ = ไม่ทำอะไร (idempotent)
-- p_match = {gid, rule, stake, seats, humans, players:[{user_id|null, seat, name, delta, won, place}]}
create or replace function public.settle_match(p_match jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gid text := p_match ->> 'gid';
  r record; v_uid uuid; v_coins bigint; v_new bigint; v_applied integer; v_n integer;
  v_bal jsonb := '{}'::jsonb;
begin
  if v_gid is null or v_gid = '' then return jsonb_build_object('ok', false, 'error', 'bad_gid'); end if;
  insert into matches (gid, rule, stake, seats, humans)
  values (v_gid, coalesce(p_match ->> 'rule', 'dummy'), coalesce((p_match ->> 'stake')::int, 0),
          (p_match ->> 'seats')::int, (p_match ->> 'humans')::int)
  on conflict (gid) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  -- ล็อกแถวผู้เล่นตามลำดับ user_id เสมอ กัน deadlock เมื่อสองตาปิดพร้อมกัน
  for r in
    select * from jsonb_to_recordset(p_match -> 'players')
      as x (user_id uuid, seat int, name text, delta int, won boolean, place int)
    order by x.user_id nulls last, x.seat
  loop
    v_uid := r.user_id; v_applied := r.delta;
    if v_uid is not null then
      select coins into v_coins from profiles where id = v_uid for update;
      if found then
        v_new := greatest(0, v_coins + r.delta);
        v_applied := (v_new - v_coins)::int;
        update profiles
           set coins = v_new, games = games + 1,
               wins = wins + case when coalesce(r.won, false) then 1 else 0 end, updated_at = now()
         where id = v_uid;
        insert into coin_ledger (user_id, amount, balance_after, kind, ref)
        values (v_uid, v_applied, v_new, 'match', v_gid) on conflict do nothing;
        v_bal := v_bal || jsonb_build_object(v_uid::text, v_new);
      else
        v_uid := null;      -- ไม่มีโปรไฟล์ (ถูกลบ) ถือเป็นผู้เล่นไม่มีบัญชี
      end if;
    end if;
    insert into match_players (gid, seat, user_id, name, delta, applied, won, place)
    values (v_gid, r.seat, v_uid, left(coalesce(r.name, 'ผู้เล่น'), 14), r.delta, v_applied,
            coalesce(r.won, false), coalesce(r.place, 1));
  end loop;
  return jsonb_build_object('ok', true, 'balances', v_bal);
end $$;

revoke all on function public.ensure_profile(uuid, text)      from public, anon, authenticated;
revoke all on function public.handle_new_user()               from public, anon, authenticated;
revoke all on function public.buy_item(uuid, text, text)      from public, anon, authenticated;
revoke all on function public.settle_match(jsonb)             from public, anon, authenticated;
grant execute on function public.ensure_profile(uuid, text)   to service_role;
grant execute on function public.buy_item(uuid, text, text)   to service_role;
grant execute on function public.settle_match(jsonb)          to service_role;

-- ───────────── RLS: อ่านได้เฉพาะของตัวเอง ห้ามเขียนจาก client ─────────────
alter table public.profiles       enable row level security;
alter table public.shop_items     enable row level security;
alter table public.purchases      enable row level security;
alter table public.matches        enable row level security;
alter table public.match_players  enable row level security;
alter table public.coin_ledger    enable row level security;

revoke insert, update, delete, truncate on
  public.profiles, public.shop_items, public.purchases, public.matches, public.match_players, public.coin_ledger
  from anon, authenticated;

create policy profiles_read_own   on public.profiles      for select to authenticated using (id = auth.uid());
create policy shop_items_read     on public.shop_items    for select to anon, authenticated using (true);
create policy purchases_read_own  on public.purchases     for select to authenticated using (user_id = auth.uid());
create policy ledger_read_own     on public.coin_ledger   for select to authenticated using (user_id = auth.uid());
create policy match_players_own   on public.match_players for select to authenticated using (user_id = auth.uid());
create policy matches_own         on public.matches       for select to authenticated using (
  exists (select 1 from public.match_players mp where mp.gid = matches.gid and mp.user_id = auth.uid()));
