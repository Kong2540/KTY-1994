-- =====================================================================
-- KTY1994 ระบบเช็คชื่อพนักงาน — ช่วงที่ 1: ฐานระบบ
-- วิธีใช้: เปิด Supabase > SQL Editor > New query > วางทั้งไฟล์ > Run
-- รันครั้งเดียวกับโปรเจกต์ใหม่ (ถ้ารันซ้ำจะ error ว่ามีตารางอยู่แล้ว)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) ตารางตั้งค่า: ตำแหน่ง และ ไซต์งาน
-- ---------------------------------------------------------------------
create table public.positions (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.sites (
  id          bigint generated always as identity primary key,
  name        text not null,
  location    text,
  status      text not null default 'active' check (status in ('active','closed')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) พนักงานประจำบริษัท
-- ---------------------------------------------------------------------
create sequence public.emp_code_seq;

create table public.employees (
  id                  uuid primary key default gen_random_uuid(),
  emp_code            text unique default ('KTY-' || lpad(nextval('public.emp_code_seq')::text, 4, '0')),
  title               text not null,
  first_name          text not null,
  last_name           text not null,
  nickname            text,
  birth_date          date,
  national_id         text unique check (national_id ~ '^[0-9]{13}$'),
  id_address          text,
  social_security_no  text,
  phone               text,
  position_id         bigint references public.positions(id) on delete set null,
  wage_type           text not null default 'daily' check (wage_type in ('daily','monthly')),
  wage_rate           numeric(12,2) not null default 0 check (wage_rate >= 0),
  ot_rate             numeric(10,2) not null default 0 check (ot_rate >= 0),
  start_date          date,
  status              text not null default 'active' check (status in ('active','resigned')),
  stars               numeric(2,1) not null default 5
                      check (stars between 0 and 5 and stars * 2 = floor(stars * 2)),
  change_reason       text,          -- เหตุผลของการแก้ไขล่าสุด (บันทึกลง audit_log)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) ผู้ใช้ระบบ (ผูกกับ Supabase Auth)
--    role: pending = รออนุมัติ, employee, foreman, executive, admin
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  phone         text,
  role          text not null default 'pending'
                check (role in ('pending','employee','foreman','executive','admin')),
  is_active     boolean not null default true,
  employee_id   uuid references public.employees(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ไซต์ที่โฟร์แมน/วิศวกรรับผิดชอบ (ใช้จริงในช่วงที่ 2)
create table public.site_assignments (
  user_id  uuid   references public.profiles(id) on delete cascade,
  site_id  bigint references public.sites(id) on delete cascade,
  primary key (user_id, site_id)
);

-- ---------------------------------------------------------------------
-- 4) บันทึกการแก้ไขทุกครั้ง (ใคร เมื่อไหร่ ค่าเดิม ค่าใหม่ เหตุผล)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id               bigint generated always as identity primary key,
  table_name       text not null,
  record_id        text,
  action           text not null,
  old_data         jsonb,
  new_data         jsonb,
  reason           text,
  changed_by       uuid,
  changed_by_name  text,
  changed_at       timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id, changed_at desc);
create index audit_log_time_idx   on public.audit_log (changed_at desc);

-- ---------------------------------------------------------------------
-- 5) ฟังก์ชันตรวจสิทธิ์
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select case when p.is_active then p.role else 'pending' end
  from profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'admin', false)
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('admin','executive'), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('admin','executive','foreman','employee'), false)
$$;

create or replace function public.my_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from profiles where id = auth.uid()
$$;

-- รายชื่อพนักงานแบบย่อ (ไม่มีข้อมูลส่วนตัว/ค่าแรง) สำหรับโฟร์แมน
create or replace function public.list_employees_basic()
returns table (id uuid, emp_code text, title text, first_name text, last_name text,
               nickname text, position_name text)
language sql stable security definer set search_path = public as $$
  select e.id, e.emp_code, e.title, e.first_name, e.last_name, e.nickname, p.name
  from employees e left join positions p on p.id = e.position_id
  where is_staff() and e.status = 'active'
  order by e.first_name
$$;

-- ---------------------------------------------------------------------
-- 6) Trigger
-- ---------------------------------------------------------------------
-- สมัครสมาชิกใหม่ -> สร้าง profile สถานะรออนุมัติ
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name, phone)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'phone');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ผู้ใช้ทั่วไปแก้ได้แค่ชื่อ/เบอร์ของตัวเอง; สิทธิ์เปลี่ยนได้เฉพาะแอดมิน
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.employee_id is distinct from old.employee_id
       or new.email is distinct from old.email then
      raise exception 'เฉพาะแอดมินเท่านั้นที่เปลี่ยนสิทธิ์ผู้ใช้ได้';
    end if;
  end if;
  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and not exists (select 1 from profiles
                     where role = 'admin' and is_active and id <> old.id) then
    raise exception 'ระบบต้องมีแอดมินอย่างน้อย 1 คน';
  end if;
  return new;
end $$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- แก้ค่าแรง / OT / ดาว ต้องมีเหตุผล
create or replace function public.employees_before_update() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if (new.wage_rate is distinct from old.wage_rate
      or new.ot_rate is distinct from old.ot_rate
      or new.wage_type is distinct from old.wage_type
      or new.stars is distinct from old.stars)
     and coalesce(trim(new.change_reason), '') = '' then
    raise exception 'กรุณาระบุเหตุผลเมื่อแก้ไขค่าแรง อัตรา OT หรือดาว';
  end if;
  return new;
end $$;

create trigger employees_before_update
  before update on public.employees
  for each row execute function public.employees_before_update();

-- บันทึก audit_log อัตโนมัติ
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_reason text; v_name text;
begin
  if tg_op in ('UPDATE','DELETE') then
    v_old := to_jsonb(old) - 'change_reason' - 'updated_at';
  end if;
  if tg_op in ('INSERT','UPDATE') then
    v_new := to_jsonb(new) - 'change_reason' - 'updated_at';
    v_reason := to_jsonb(new) ->> 'change_reason';
  end if;
  if tg_op = 'UPDATE' and v_old = v_new then
    return new;
  end if;
  select coalesce(display_name, email) into v_name from profiles where id = auth.uid();
  insert into audit_log (table_name, record_id, action, old_data, new_data,
                         reason, changed_by, changed_by_name)
  values (tg_table_name,
          coalesce(v_new->>'id', v_old->>'id', v_new->>'user_id', v_old->>'user_id'),
          tg_op, v_old, v_new, v_reason, auth.uid(), v_name);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger audit_employees  after insert or update or delete on public.employees
  for each row execute function public.audit_trigger();
create trigger audit_profiles   after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();
create trigger audit_positions  after insert or update or delete on public.positions
  for each row execute function public.audit_trigger();
create trigger audit_sites      after insert or update or delete on public.sites
  for each row execute function public.audit_trigger();
create trigger audit_site_assign after insert or update or delete on public.site_assignments
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- 7) Row Level Security — ด่านตรวจสิทธิ์ระดับฐานข้อมูล
-- ---------------------------------------------------------------------
alter table public.positions        enable row level security;
alter table public.sites            enable row level security;
alter table public.employees        enable row level security;
alter table public.profiles         enable row level security;
alter table public.site_assignments enable row level security;
alter table public.audit_log        enable row level security;

-- ตำแหน่ง: ทุกคนที่ได้รับอนุมัติอ่านได้, ผู้บริหาร/แอดมินแก้ได้
create policy positions_read  on public.positions for select to authenticated using (is_staff());
create policy positions_write on public.positions for all    to authenticated
  using (is_manager()) with check (is_manager());

-- ไซต์งาน
create policy sites_read  on public.sites for select to authenticated using (is_staff());
create policy sites_write on public.sites for all    to authenticated
  using (is_manager()) with check (is_manager());

-- พนักงาน: ผู้บริหาร/แอดมินเห็นทั้งหมด, พนักงานเห็นเฉพาะของตัวเอง
create policy employees_read   on public.employees for select to authenticated
  using (is_manager() or id = my_employee_id());
create policy employees_insert on public.employees for insert to authenticated
  with check (is_manager());
create policy employees_update on public.employees for update to authenticated
  using (is_manager()) with check (is_manager());
create policy employees_delete on public.employees for delete to authenticated
  using (is_admin());

-- ผู้ใช้
create policy profiles_read   on public.profiles for select to authenticated
  using (id = auth.uid() or is_manager());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- ไซต์ที่รับผิดชอบ
create policy assign_read  on public.site_assignments for select to authenticated
  using (user_id = auth.uid() or is_manager());
create policy assign_write on public.site_assignments for all to authenticated
  using (is_admin()) with check (is_admin());

-- บันทึกการแก้ไข: ผู้บริหาร/แอดมินอ่านได้อย่างเดียว (ไม่มีใครแก้หรือลบได้)
create policy audit_read on public.audit_log for select to authenticated using (is_manager());

-- ปิดสิทธิ์ผู้ที่ยังไม่ login
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;

-- ---------------------------------------------------------------------
-- 8) ข้อมูลตั้งต้น
-- ---------------------------------------------------------------------
insert into public.positions (name, sort_order) values
  ('ผู้บริหาร',1), ('วิศวกร',2), ('โฟร์แมน',3), ('ธุรการ/บัญชี',4),
  ('ช่างไฟ',5), ('ช่างปูน',6), ('ช่างเหล็ก',7), ('ช่างไม้',8),
  ('ช่างประปา',9), ('คนงานทั่วไป',10);

-- =====================================================================
-- หลังสมัครสมาชิกบัญชีแรกจากหน้าเว็บแล้ว ให้รันคำสั่งนี้ (แก้อีเมล) เพื่อตั้งเป็นแอดมิน:
--   update public.profiles set role = 'admin' where email = 'อีเมลของคุณ@gmail.com';
-- =====================================================================
