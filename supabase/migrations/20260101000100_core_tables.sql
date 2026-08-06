-- ============================================================================
-- NITS HelpDesk — lookup tables and profiles
-- ============================================================================

-- ----------------------------------------------------------------------------
-- departments
-- ----------------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  -- Material Symbol ligature name; the UI renders <Icon name={icon} />.
  icon        text not null default 'category',
  -- Design-token name (e.g. 'primary', 'error') driving the chip colour.
  color_token text not null default 'primary',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint departments_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index departments_active_idx on public.departments (is_active) where is_active;

create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- hostels
--
-- Not in the original table list, but the dashboard and history screens filter
-- by hostel. A lookup table keeps that filter data-driven instead of relying on
-- students typing "Hostel 9" / "hostel-9" / "H9" consistently.
-- ----------------------------------------------------------------------------
create table public.hostels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hostels_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger hostels_set_updated_at
  before update on public.hostels
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- profiles
--
-- 1:1 with auth.users. Rows are created by the handle_new_user() trigger, which
-- also enforces the institute-domain rule (see 20260101000600_auth.sql).
-- ----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         extensions.citext not null unique,
  name          text,
  roll_number   text,
  department_id uuid references public.departments (id) on delete set null,
  hostel_id     uuid references public.hostels (id) on delete set null,
  phone         text,
  avatar_url    text,
  role          public.user_role not null default 'student',
  -- Set false to revoke access without deleting history.
  is_active     boolean not null default true,
  -- Flipped once the onboarding form is completed on first login.
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint profiles_email_domain check (
    email ~* '^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)*nits\.ac\.in$'
  ),
  constraint profiles_phone_format check (
    phone is null or phone ~ '^[0-9]{10}$'
  ),
  constraint profiles_roll_number_format check (
    roll_number is null or roll_number ~ '^[A-Za-z0-9/-]{3,20}$'
  )
);

create index profiles_role_idx on public.profiles (role);
create index profiles_department_idx on public.profiles (department_id)
  where department_id is not null;
create index profiles_hostel_idx on public.profiles (hostel_id)
  where hostel_id is not null;
-- Supports the admin user-search box.
create index profiles_name_trgm_idx on public.profiles
  using gin (name extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on column public.profiles.role is
  'Privilege level. Only a super_admin may change this — enforced by the
   profiles_guard_privileged_columns trigger, not by RLS, because RLS cannot
   restrict individual columns.';
