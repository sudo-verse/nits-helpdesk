-- ============================================================================
-- NITS HelpDesk — extensions, enums and shared helper functions
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;


-- ============================================================================
-- Pre-Migration Repair: Fix missing/renamed columns on existing database
-- ============================================================================
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'complaint_status_history' and column_name = 'changed_at'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'complaint_status_history' and column_name = 'created_at'
  ) then
    alter table public.complaint_status_history rename column changed_at to created_at;
  end if;
end $$;

alter table public.complaints add column if not exists category text;
alter table public.complaints add column if not exists location text;
alter table public.departments add column if not exists department_type text not null default 'service';
alter table public.complaint_status_history add column if not exists created_at timestamptz default now();


create extension if not exists "citext" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'student',
      'staff',
      'admin',
      'super_admin'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'complaint_status') then
    create type public.complaint_status as enum (
      'submitted',
      'assigned',
      'under_review',
      'in_progress',
      'resolved',
      'closed'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'complaint_priority') then
    create type public.complaint_priority as enum (
      'low',
      'medium',
      'high'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'complaint_created',
      'assignment',
      'comment',
      'status_update',
      'resolution',
      'announcement'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'attachment_kind') then
    create type public.attachment_kind as enum (
      'evidence',
      'resolution',
      'comment'
    );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Shared triggers
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Generic BEFORE UPDATE trigger keeping updated_at honest regardless of client.';
-- ============================================================================
-- NITS HelpDesk — lookup tables and profiles
-- ============================================================================

-- ----------------------------------------------------------------------------
-- departments
-- ----------------------------------------------------------------------------
create table if not exists public.departments (
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

create index if not exists departments_active_idx on public.departments (is_active) where is_active;

drop trigger if exists departments_set_updated_at on public.departments;
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
create table if not exists public.hostels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hostels_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

drop trigger if exists hostels_set_updated_at on public.hostels;
create trigger hostels_set_updated_at
  before update on public.hostels
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- profiles
--
-- 1:1 with auth.users. Rows are created by the handle_new_user() trigger, which
-- also enforces the institute-domain rule (see 20260101000600_auth.sql).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
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

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_department_idx on public.profiles (department_id)
  where department_id is not null;
create index if not exists profiles_hostel_idx on public.profiles (hostel_id)
  where hostel_id is not null;
-- Supports the admin user-search box.
create index if not exists profiles_name_trgm_idx on public.profiles
  using gin (name extensions.gin_trgm_ops);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on column public.profiles.role is
  'Privilege level. Only a super_admin may change this — enforced by the
   profiles_guard_privileged_columns trigger, not by RLS, because RLS cannot
   restrict individual columns.';
-- ============================================================================
-- NITS HelpDesk — complaints and everything hanging off them
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Human-readable complaint codes: CMP-2026-00001
--
-- The design shows "#CMP-2023-8942" / "#CMP-9041". A per-year sequence keeps
-- codes short and non-guessable-in-bulk while staying sortable.
-- ----------------------------------------------------------------------------
create sequence if not exists public.complaint_code_seq;

-- Implemented as a column DEFAULT rather than a BEFORE INSERT trigger so that
-- `supabase gen types` marks complaint_code optional on insert. With a trigger
-- the generated Insert type demands a value the application must never supply.
create or replace function public.next_complaint_code()
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select 'CMP-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.complaint_code_seq')::text, 5, '0');
$$;

-- ----------------------------------------------------------------------------
-- complaints
-- ----------------------------------------------------------------------------
create table if not exists public.complaints (
  id              uuid primary key default gen_random_uuid(),
  complaint_code  text not null unique default public.next_complaint_code(),
  title           text not null,
  description     text not null,
  department_id   uuid not null references public.departments (id) on delete restrict,
  category        text,
  hostel_id       uuid references public.hostels (id) on delete set null,
  location        text,
  priority        public.complaint_priority not null default 'medium',
  status          public.complaint_status not null default 'submitted',
  -- Hides the reporter from staff/admins. Enforced by the v_complaints view,
  -- because RLS gates rows, not columns.
  is_anonymous    boolean not null default false,
  -- Defaults to the caller so the reporter can never be omitted or forged.
  -- The RLS insert policy still asserts created_by = auth.uid().
  created_by      uuid not null default auth.uid()
                    references public.profiles (id) on delete cascade,
  assigned_to     uuid references public.profiles (id) on delete set null,
  resolution_note text,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint complaints_title_length check (char_length(trim(title)) between 5 and 150),
  constraint complaints_description_length check (char_length(trim(description)) between 10 and 5000),
  constraint complaints_location_length check (location is null or char_length(location) <= 200),
  -- A complaint cannot be marked resolved without saying what was done.
  constraint complaints_resolution_note_required check (
    status not in ('resolved', 'closed')
    or (resolution_note is not null and char_length(trim(resolution_note)) > 0)
  ),
  constraint complaints_resolved_at_set check (
    (status in ('resolved', 'closed')) = (resolved_at is not null)
  ),
  constraint complaints_closed_at_set check (
    (status = 'closed') = (closed_at is not null)
  )
);

create index if not exists complaints_created_by_status_idx
  on public.complaints (created_by, status, created_at desc);
create index if not exists complaints_assigned_to_idx
  on public.complaints (assigned_to, status) where assigned_to is not null;
create index if not exists complaints_department_status_idx
  on public.complaints (department_id, status);
create index if not exists complaints_triage_idx
  on public.complaints (status, priority, created_at desc);
create index if not exists complaints_hostel_idx
  on public.complaints (hostel_id) where hostel_id is not null;
create index if not exists complaints_unassigned_idx
  on public.complaints (created_at desc) where assigned_to is null;

-- Full-text search across title + description for the global search bar.
create index if not exists complaints_search_idx on public.complaints
  using gin (to_tsvector('english', title || ' ' || description));
-- Trigram index so searching a partial complaint code stays fast.
create index if not exists complaints_code_trgm_idx on public.complaints
  using gin (complaint_code extensions.gin_trgm_ops);

drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- complaint_comments
-- ----------------------------------------------------------------------------
create table if not exists public.complaint_comments (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  author_id    uuid not null default auth.uid()
                 references public.profiles (id) on delete cascade,
  body         text not null,
  -- Staff-only notes. Hidden from the reporting student by RLS.
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint comments_body_length check (char_length(trim(body)) between 1 and 2000)
);

create index if not exists comments_complaint_idx
  on public.complaint_comments (complaint_id, created_at);
create index if not exists comments_author_idx on public.complaint_comments (author_id);

drop trigger if exists comments_set_updated_at on public.complaint_comments;
create trigger comments_set_updated_at
  before update on public.complaint_comments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- complaint_images  (images *and* PDF attachments)
-- ----------------------------------------------------------------------------
create table if not exists public.complaint_images (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  -- Set when the file is attached to a comment rather than the complaint body.
  comment_id   uuid references public.complaint_comments (id) on delete cascade,
  uploaded_by  uuid not null default auth.uid()
                 references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  public_url   text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null,
  kind         public.attachment_kind not null default 'evidence',
  created_at   timestamptz not null default now(),

  -- Mirrors the storage bucket limits. Defence in depth: the bucket config,
  -- this constraint and the Zod schema all enforce the same rule.
  constraint images_size_limit check (size_bytes > 0 and size_bytes <= 10485760),
  constraint images_mime_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'application/pdf')
  )
);

create index if not exists images_complaint_idx on public.complaint_images (complaint_id, kind);
create index if not exists images_comment_idx on public.complaint_images (comment_id)
  where comment_id is not null;

-- ----------------------------------------------------------------------------
-- complaint_status_history — feeds the timeline component
-- ----------------------------------------------------------------------------
create table if not exists public.complaint_status_history (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  from_status  public.complaint_status,
  to_status    public.complaint_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists status_history_complaint_idx
  on public.complaint_status_history (complaint_id, created_at);

-- ----------------------------------------------------------------------------
-- staff_assignments — full assignment history, not just the current holder
-- ----------------------------------------------------------------------------
create table if not exists public.staff_assignments (
  id             uuid primary key default gen_random_uuid(),
  complaint_id   uuid not null references public.complaints (id) on delete cascade,
  staff_id       uuid not null references public.profiles (id) on delete cascade,
  assigned_by    uuid references public.profiles (id) on delete set null,
  assigned_at    timestamptz not null default now(),
  unassigned_at  timestamptz,
  is_active      boolean not null default true,

  constraint assignment_active_consistency check (
    is_active = (unassigned_at is null)
  )
);

-- At most one live assignment per complaint.
create unique index if not exists assignments_one_active_idx
  on public.staff_assignments (complaint_id) where is_active;
create index if not exists assignments_staff_idx
  on public.staff_assignments (staff_id, is_active);

-- ----------------------------------------------------------------------------
-- feedback — 1-5 stars, once per complaint, only after closure
-- ----------------------------------------------------------------------------
create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique references public.complaints (id) on delete cascade,
  student_id   uuid not null default auth.uid()
                 references public.profiles (id) on delete cascade,
  rating       smallint not null,
  comment      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint feedback_rating_range check (rating between 1 and 5),
  constraint feedback_comment_length check (comment is null or char_length(comment) <= 1000)
);

create index if not exists feedback_student_idx on public.feedback (student_id);

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();
-- ============================================================================
-- NITS HelpDesk — notifications, activity log, announcements, FAQ, rate limits
-- ============================================================================

-- ----------------------------------------------------------------------------
-- notifications — realtime feed, one row per recipient
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         public.notification_type not null,
  title        text not null,
  body         text,
  complaint_id uuid references public.complaints (id) on delete cascade,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Drives both the unread badge count and the feed ordering.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);
create index if not exists notifications_complaint_idx on public.notifications (complaint_id)
  where complaint_id is not null;

-- ----------------------------------------------------------------------------
-- activity_logs — append-only audit trail
--
-- Written only by SECURITY DEFINER triggers; no client may insert directly.
-- ----------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);
create index if not exists activity_logs_actor_idx
  on public.activity_logs (actor_id, created_at desc);

-- ----------------------------------------------------------------------------
-- announcements
-- ----------------------------------------------------------------------------
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  author_id     uuid references public.profiles (id) on delete set null,
  -- Null targets the whole institute.
  department_id uuid references public.departments (id) on delete cascade,
  is_pinned     boolean not null default false,
  is_published  boolean not null default false,
  published_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint announcements_title_length check (char_length(trim(title)) between 3 and 200),
  constraint announcements_body_length check (char_length(trim(body)) between 3 and 5000),
  constraint announcements_expiry_after_publish check (
    expires_at is null or published_at is null or expires_at > published_at
  )
);

create index if not exists announcements_live_idx
  on public.announcements (is_pinned desc, published_at desc)
  where is_published;

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- faq
-- ----------------------------------------------------------------------------
create table if not exists public.faq (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer        text not null,
  category      text,
  department_id uuid references public.departments (id) on delete set null,
  display_order integer not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint faq_question_length check (char_length(trim(question)) between 5 and 300),
  constraint faq_answer_length check (char_length(trim(answer)) between 5 and 5000)
);

create index if not exists faq_published_idx on public.faq (display_order, created_at)
  where is_published;

drop trigger if exists faq_set_updated_at on public.faq;
create trigger faq_set_updated_at
  before update on public.faq
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- rate_limits
--
-- Postgres-backed fixed-window limiter. Avoids adding Redis for what is a
-- low-volume campus app, while still being a real limit shared across all
-- serverless instances (an in-memory LRU would not be).
-- ----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket_key   text primary key,
  hit_count    integer not null default 0,
  window_start timestamptz not null default now()
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

comment on table public.rate_limits is
  'Written exclusively by public.check_rate_limit(). No RLS policy grants
   client access; the function is SECURITY DEFINER.';
-- ============================================================================
-- NITS HelpDesk — institute-domain gate, business-logic triggers, rate limiter
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Institute domain gate
--
-- This is the hard boundary. Server Actions validate the address before
-- requesting an OTP, but that check lives in application code a determined
-- caller can bypass — and Google OAuth never passes through it at all, because
-- the account is created by Supabase from the provider callback.
--
-- Raising here aborts the auth.users INSERT transaction, so a personal Gmail
-- cannot become a user no matter which entry point is used.
-- ----------------------------------------------------------------------------
create or replace function public.is_institute_email(email text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select email ~* '^[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+\.)*nits\.ac\.in$';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_institute_email(new.email) then
    raise exception
      'Only NIT Silchar institute accounts (@nits.ac.in or @students.nits.ac.in) may sign in.'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    -- Google returns a display name; OTP sign-ups have none until onboarding.
    nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Protect privileged profile columns
--
-- RLS decides which *rows* a user may update, never which columns. Without
-- this, the "update own profile" policy would also let a student set
-- role = 'super_admin' on their own row.
-- ----------------------------------------------------------------------------
create or replace function public.guard_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.user_role;
begin
  -- Trusted server paths (service_role) and internal triggers bypass the guard.
  if auth.uid() is null then
    return new;
  end if;

  select role into actor_role from public.profiles where id = auth.uid();

  if new.role is distinct from old.role and coalesce(actor_role, 'student') <> 'super_admin' then
    raise exception 'Only a super_admin may change a user role.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.is_active is distinct from old.is_active
     and coalesce(actor_role, 'student') not in ('admin', 'super_admin') then
    raise exception 'Only an admin may activate or deactivate an account.'
      using errcode = 'insufficient_privilege';
  end if;

  -- The email is the identity; it must keep matching auth.users.
  if new.email is distinct from old.email then
    raise exception 'Email cannot be changed.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_privileged_profile_columns();

-- ----------------------------------------------------------------------------
-- Status transition graph
--
-- Prevents a client jumping straight from 'submitted' to 'closed' and skipping
-- the audit trail the timeline depends on.
-- ----------------------------------------------------------------------------
create or replace function public.validate_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allowed public.complaint_status[];
begin
  if new.status = old.status then
    return new;
  end if;

  -- A complaint cannot be closed straight out of 'submitted'. Dismissing a
  -- duplicate or bogus report still has to pass through 'under_review', which
  -- forces a reviewer and a reason onto the status history instead of letting
  -- reports vanish silently.
  allowed := case old.status
    when 'submitted'    then array['assigned', 'under_review']::public.complaint_status[]
    -- back to 'submitted' = un-assigned and returned to the triage queue
    when 'assigned'     then array['under_review', 'in_progress', 'submitted']::public.complaint_status[]
    when 'under_review' then array['in_progress', 'assigned', 'resolved', 'closed']::public.complaint_status[]
    when 'in_progress'  then array['resolved', 'under_review', 'closed']::public.complaint_status[]
    -- reopen when the student reports the fix did not hold
    when 'resolved'     then array['closed', 'in_progress']::public.complaint_status[]
    -- Closed is terminal; reopening means filing a new complaint.
    when 'closed'       then array[]::public.complaint_status[]
  end;

  if not (new.status = any(allowed)) then
    raise exception 'Invalid status transition: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Keep the timestamp columns consistent with the status they describe.
  if new.status in ('resolved', 'closed') and new.resolved_at is null then
    new.resolved_at := now();
  end if;
  if new.status = 'closed' and new.closed_at is null then
    new.closed_at := now();
  end if;
  if new.status not in ('resolved', 'closed') then
    new.resolved_at := null;
    new.closed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists complaints_validate_status_transition on public.complaints;
create trigger complaints_validate_status_transition
  before update of status on public.complaints
  for each row execute function public.validate_status_transition();

-- ----------------------------------------------------------------------------
-- Fan-out: status history, notifications, activity log
-- ----------------------------------------------------------------------------
create or replace function public.notify(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_complaint_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Never notify someone about their own action.
  if p_user_id is null or p_user_id = auth.uid() then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, complaint_id)
  values (p_user_id, p_type, p_title, p_body, p_complaint_id);
end;
$$;

create or replace function public.log_complaint_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dept_name text;
begin
  insert into public.complaint_status_history (complaint_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.created_by);

  insert into public.activity_logs (actor_id, entity_type, entity_id, action, metadata)
  values (
    new.created_by, 'complaint', new.id, 'created',
    jsonb_build_object('complaint_code', new.complaint_code, 'priority', new.priority)
  );

  select name into dept_name from public.departments where id = new.department_id;

  -- Tell every admin a new complaint has landed so triage has a queue.
  insert into public.notifications (user_id, type, title, body, complaint_id)
  select
    p.id,
    'complaint_created',
    'New complaint: ' || new.complaint_code,
    coalesce(dept_name, 'Unassigned') || ' · ' || new.title,
    new.id
  from public.profiles p
  where p.role in ('admin', 'super_admin')
    and p.is_active
    and p.id <> new.created_by;

  return new;
end;
$$;

drop trigger if exists complaints_on_insert on public.complaints;
create trigger complaints_on_insert
  after insert on public.complaints
  for each row execute function public.log_complaint_insert();

create or replace function public.log_complaint_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_name text;
begin
  ----------------------------------------------------------------- status ----
  if new.status is distinct from old.status then
    insert into public.complaint_status_history
      (complaint_id, from_status, to_status, changed_by, note)
    values
      (new.id, old.status, new.status, auth.uid(),
       case when new.status in ('resolved', 'closed') then new.resolution_note end);

    insert into public.activity_logs (actor_id, entity_type, entity_id, action, metadata)
    values (auth.uid(), 'complaint', new.id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));

    perform public.notify(
      new.created_by,
      case when new.status = 'resolved' then 'resolution'::public.notification_type
           else 'status_update'::public.notification_type end,
      case when new.status = 'resolved'
           then 'Resolved: ' || new.complaint_code
           else 'Status updated: ' || new.complaint_code end,
      new.title || ' is now ' || replace(new.status::text, '_', ' ') || '.',
      new.id
    );
  end if;

  ------------------------------------------------------------- assignment ----
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    -- Close out any previous holder, then record the new one.
    update public.staff_assignments
       set is_active = false, unassigned_at = now()
     where complaint_id = new.id and is_active;

    insert into public.staff_assignments (complaint_id, staff_id, assigned_by)
    values (new.id, new.assigned_to, auth.uid());

    insert into public.activity_logs (actor_id, entity_type, entity_id, action, metadata)
    values (auth.uid(), 'complaint', new.id, 'assigned',
            jsonb_build_object('staff_id', new.assigned_to));

    select name into staff_name from public.profiles where id = new.assigned_to;

    -- Notify the staff member who now owns it...
    perform public.notify(
      new.assigned_to, 'assignment',
      'Assigned to you: ' || new.complaint_code,
      new.title, new.id
    );
    -- ...and the student who filed it.
    perform public.notify(
      new.created_by, 'assignment',
      'Complaint assigned: ' || new.complaint_code,
      coalesce(staff_name, 'A staff member') || ' is now handling your complaint.',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists complaints_on_update on public.complaints;
create trigger complaints_on_update
  after update on public.complaints
  for each row execute function public.log_complaint_update();

-- ----------------------------------------------------------------------------
-- Comments → notify the other side of the conversation
-- ----------------------------------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  author_name text;
begin
  select id, complaint_code, title, created_by, assigned_to
    into c
    from public.complaints
   where id = new.complaint_id;

  select coalesce(name, 'Someone') into author_name
    from public.profiles where id = new.author_id;

  -- Internal notes stay between staff; the student never sees them.
  if not new.is_internal then
    perform public.notify(
      c.created_by, 'comment',
      'New comment on ' || c.complaint_code,
      author_name || ': ' || left(new.body, 120),
      c.id
    );
  end if;

  perform public.notify(
    c.assigned_to, 'comment',
    'New comment on ' || c.complaint_code,
    author_name || ': ' || left(new.body, 120),
    c.id
  );

  return new;
end;
$$;

drop trigger if exists comments_on_insert on public.complaint_comments;
create trigger comments_on_insert
  after insert on public.complaint_comments
  for each row execute function public.notify_on_comment();

-- ----------------------------------------------------------------------------
-- Feedback may only be left on a closed complaint, by its author
-- ----------------------------------------------------------------------------
create or replace function public.validate_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  select status, created_by into c from public.complaints where id = new.complaint_id;

  if c is null then
    raise exception 'Complaint not found.' using errcode = 'foreign_key_violation';
  end if;

  if c.status <> 'closed' then
    raise exception 'Feedback can only be left once a complaint is closed.'
      using errcode = 'check_violation';
  end if;

  if new.student_id <> c.created_by then
    raise exception 'Only the student who filed a complaint may rate it.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists feedback_validate on public.feedback;
create trigger feedback_validate
  before insert or update on public.feedback
  for each row execute function public.validate_feedback();

-- ----------------------------------------------------------------------------
-- Announcements → notify the target audience
-- ----------------------------------------------------------------------------
create or replace function public.notify_on_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only fire as it goes live, not on every subsequent edit.
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    insert into public.notifications (user_id, type, title, body, complaint_id)
    select p.id, 'announcement', new.title, left(new.body, 160), null
      from public.profiles p
     where p.is_active
       and (new.department_id is null or p.department_id = new.department_id)
       and p.id <> coalesce(new.author_id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  return new;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
  after insert or update on public.announcements
  for each row execute function public.notify_on_announcement();

-- ----------------------------------------------------------------------------
-- Fixed-window rate limiter
-- ----------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_key text,
  p_max_hits integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  insert into public.rate_limits (bucket_key, hit_count, window_start)
  values (p_key, 1, now())
  on conflict (bucket_key) do update
    set
      -- Reset the counter when the previous window has elapsed.
      hit_count = case
        when public.rate_limits.window_start < now() - p_window then 1
        else public.rate_limits.hit_count + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - p_window then now()
        else public.rate_limits.window_start
      end
  returning hit_count into current_count;

  return current_count <= p_max_hits;
end;
$$;

comment on function public.check_rate_limit is
  'Returns false once p_max_hits is exceeded inside p_window. Callers must
   treat false as "reject". Buckets are keyed like ''otp:user@nits.ac.in''.';

-- Housekeeping so the table cannot grow unbounded.
create or replace function public.prune_rate_limits()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
-- ============================================================================
-- NITS HelpDesk — Row Level Security
--
-- Every helper is SECURITY DEFINER with `set search_path = ''`. Both matter:
--  * DEFINER lets a policy on `profiles` read `profiles` without re-entering
--    its own policy and recursing forever.
--  * The empty search_path stops a caller from shadowing `profiles` with a
--    temp table and escalating.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() in ('admin', 'super_admin'), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() in ('staff', 'admin', 'super_admin'), false);
$$;

create or replace function public.owns_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.complaints
     where id = p_complaint_id and created_by = auth.uid()
  );
$$;

-- Staff see a complaint if it is assigned to them OR belongs to their
-- department (so a department can cover for an absent colleague).
create or replace function public.can_service_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.complaints c
      join public.profiles p on p.id = auth.uid()
     where c.id = p_complaint_id
       and p.is_active
       and (
         public.is_admin()
         or (p.role = 'staff' and (c.assigned_to = p.id or c.department_id = p.department_id))
       )
  );
$$;

-- Single source of truth for "may this user read this complaint at all".
create or replace function public.can_read_complaint(p_complaint_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.owns_complaint(p_complaint_id)
      or public.can_service_complaint(p_complaint_id);
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere. A table with RLS on and no policy denies everything,
-- which is the correct default.
-- ----------------------------------------------------------------------------
alter table public.departments              enable row level security;
alter table public.hostels                  enable row level security;
alter table public.profiles                 enable row level security;
alter table public.complaints               enable row level security;
alter table public.complaint_comments       enable row level security;
alter table public.complaint_images         enable row level security;
alter table public.complaint_status_history enable row level security;
alter table public.staff_assignments        enable row level security;
alter table public.feedback                 enable row level security;
alter table public.notifications            enable row level security;
alter table public.activity_logs            enable row level security;
alter table public.announcements            enable row level security;
alter table public.faq                      enable row level security;
alter table public.rate_limits              enable row level security;

-- ----------------------------------------------------------------------------
-- departments / hostels — readable by every signed-in user, admin-managed
-- ----------------------------------------------------------------------------
create policy "departments readable by authenticated"
  on public.departments for select to authenticated using (true);

create policy "departments managed by admin"
  on public.departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "hostels readable by authenticated"
  on public.hostels for select to authenticated using (true);

create policy "hostels managed by admin"
  on public.hostels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "profiles select own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles select by admin"
  on public.profiles for select to authenticated
  using (public.is_admin());

-- Staff need counterpart names to render comment threads and assignment chips.
create policy "profiles select counterparts for staff"
  on public.profiles for select to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.complaints c
       where (c.created_by = public.profiles.id or c.assigned_to = public.profiles.id)
         and public.can_service_complaint(c.id)
    )
  );

-- Column-level protection (role, is_active, email) is handled by the
-- profiles_guard_privileged_columns trigger — RLS cannot express it.
create policy "profiles update own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles update by admin"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No INSERT policy: rows come only from the handle_new_user() trigger.
-- No DELETE policy: removing a user cascades from auth.users.

-- ----------------------------------------------------------------------------
-- complaints
-- ----------------------------------------------------------------------------
create policy "complaints select own"
  on public.complaints for select to authenticated
  using (created_by = auth.uid());

create policy "complaints select serviceable"
  on public.complaints for select to authenticated
  using (public.can_service_complaint(id));

create policy "complaints insert own"
  on public.complaints for insert to authenticated
  with check (
    created_by = auth.uid()
    -- A student may not self-assign or open a complaint already resolved.
    and assigned_to is null
    and status = 'submitted'
  );

-- Students may still correct a complaint nobody has picked up yet.
create policy "complaints update own while submitted"
  on public.complaints for update to authenticated
  using (created_by = auth.uid() and status = 'submitted')
  with check (created_by = auth.uid());

create policy "complaints update by servicer"
  on public.complaints for update to authenticated
  using (public.can_service_complaint(id))
  with check (public.can_service_complaint(id));

create policy "complaints delete by admin"
  on public.complaints for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- complaint_comments — internal notes are invisible to the student
-- ----------------------------------------------------------------------------
create policy "comments select visible"
  on public.complaint_comments for select to authenticated
  using (
    public.can_read_complaint(complaint_id)
    and (not is_internal or public.is_staff())
  );

create policy "comments insert by participant"
  on public.complaint_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_read_complaint(complaint_id)
    -- Only staff may write an internal note.
    and (not is_internal or public.is_staff())
  );

create policy "comments update own"
  on public.complaint_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "comments delete own or admin"
  on public.complaint_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- complaint_images
-- ----------------------------------------------------------------------------
create policy "images select with complaint"
  on public.complaint_images for select to authenticated
  using (public.can_read_complaint(complaint_id));

create policy "images insert by participant"
  on public.complaint_images for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.can_read_complaint(complaint_id)
    -- Resolution evidence is the servicer's to add, not the reporter's.
    and (kind <> 'resolution' or public.can_service_complaint(complaint_id))
  );

create policy "images delete own or admin"
  on public.complaint_images for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- complaint_status_history — read-only to clients; written by triggers
-- ----------------------------------------------------------------------------
create policy "status history select with complaint"
  on public.complaint_status_history for select to authenticated
  using (public.can_read_complaint(complaint_id));

-- ----------------------------------------------------------------------------
-- staff_assignments
-- ----------------------------------------------------------------------------
create policy "assignments select with complaint"
  on public.staff_assignments for select to authenticated
  using (public.can_read_complaint(complaint_id));

create policy "assignments managed by admin"
  on public.staff_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- feedback
-- ----------------------------------------------------------------------------
create policy "feedback select own or servicer"
  on public.feedback for select to authenticated
  using (student_id = auth.uid() or public.can_service_complaint(complaint_id));

create policy "feedback insert own"
  on public.feedback for insert to authenticated
  with check (student_id = auth.uid() and public.owns_complaint(complaint_id));

create policy "feedback update own"
  on public.feedback for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- ----------------------------------------------------------------------------
-- notifications — strictly personal
-- ----------------------------------------------------------------------------
create policy "notifications select own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

-- Only ever used to flip is_read.
create policy "notifications update own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications delete own"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- No INSERT policy: notifications originate from SECURITY DEFINER triggers.

-- ----------------------------------------------------------------------------
-- activity_logs — admin-visible, append-only via triggers
-- ----------------------------------------------------------------------------
create policy "activity logs select by admin"
  on public.activity_logs for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- announcements
-- ----------------------------------------------------------------------------
create policy "announcements select published"
  on public.announcements for select to authenticated
  using (
    (is_published
     and (published_at is null or published_at <= now())
     and (expires_at is null or expires_at > now()))
    or public.is_admin()
  );

create policy "announcements managed by admin"
  on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- faq
-- ----------------------------------------------------------------------------
create policy "faq select published"
  on public.faq for select to authenticated
  using (is_published or public.is_admin());

create policy "faq managed by admin"
  on public.faq for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- rate_limits — no policies at all. Reachable only through
-- public.check_rate_limit(), which is SECURITY DEFINER.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Column-level guard for complaints
--
-- The "update own while submitted" policy decides which ROW a student may
-- touch; it cannot say which COLUMNS. Without this trigger a student could run
--
--   update complaints set assigned_to = '<any staff uuid>' where id = <own>
--
-- on their own complaint — self-assigning, or dumping work into an arbitrary
-- staff member's queue and bypassing admin triage entirely.
--
-- Defined here rather than alongside the other triggers because it depends on
-- the can_service_complaint() helper above.
-- ----------------------------------------------------------------------------
create or replace function public.guard_privileged_complaint_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Trusted server paths (service_role, internal triggers) are not gated.
  if auth.uid() is null then
    return new;
  end if;

  -- Immutable for everyone, admins included: these define the record's
  -- identity and its audit trail.
  if new.id is distinct from old.id
     or new.complaint_code is distinct from old.complaint_code
     or new.created_by is distinct from old.created_by then
    raise exception 'Complaint identity columns are immutable.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Anonymity is a promise made at submission time. Letting anyone flip it
  -- afterwards would retroactively unmask the reporter to every staff member
  -- who can see the complaint.
  if new.is_anonymous is distinct from old.is_anonymous then
    raise exception 'Anonymity cannot be changed after submission.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Staff and admins own the workflow columns.
  if public.can_service_complaint(new.id) then
    return new;
  end if;

  -- The reporter may correct the details of their own report, nothing more.
  if old.created_by = auth.uid() then
    if new.status      is distinct from old.status
       or new.assigned_to     is distinct from old.assigned_to
       or new.resolution_note is distinct from old.resolution_note
       or new.resolved_at     is distinct from old.resolved_at
       or new.closed_at       is distinct from old.closed_at then
      raise exception
        'A student may edit the details of their complaint, not its workflow state.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  raise exception 'Not permitted to modify this complaint.'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists complaints_guard_privileged_columns on public.complaints;
create trigger complaints_guard_privileged_columns
  before update on public.complaints
  for each row execute function public.guard_privileged_complaint_columns();
-- ============================================================================
-- NITS HelpDesk — anonymity view and Storage buckets
-- ============================================================================

-- ----------------------------------------------------------------------------
-- v_complaints
--
-- RLS gates rows, never columns, so it cannot hide `created_by` from staff on
-- an anonymous complaint while keeping it visible to the reporter. This view
-- nulls the reporter for everyone except the reporter themselves.
--
-- `security_invoker = on` is essential: without it the view would run as its
-- owner and bypass the RLS policies on public.complaints entirely, turning a
-- privacy feature into a data leak.
--
-- All staff/admin reads must go through this view. A student reading their own
-- complaints may query the table directly.
-- ----------------------------------------------------------------------------
drop view if exists public.v_complaints cascade;
create view public.v_complaints
with (security_invoker = on)
as
select
  c.id,
  c.complaint_code,
  c.title,
  c.description,
  c.department_id,
  c.category,
  c.hostel_id,
  c.location,
  c.priority,
  c.status,
  c.is_anonymous,
  case
    when c.is_anonymous and c.created_by <> auth.uid() then null
    else c.created_by
  end as created_by,
  c.assigned_to,
  c.resolution_note,
  c.resolved_at,
  c.closed_at,
  c.created_at,
  c.updated_at
from public.complaints c;

comment on view public.v_complaints is
  'Complaints with the reporter redacted on anonymous submissions. Every read
   path that is not "the student viewing their own complaint" must use this.';

grant select on public.v_complaints to authenticated;

-- ----------------------------------------------------------------------------
-- Storage buckets
--
-- Public-read because the spec calls for storing public URLs. The privacy
-- boundary is the unguessable UUID path plus the row-level access check on
-- complaint_images — a URL is only ever surfaced to someone RLS already lets
-- read the parent complaint.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'complaint-attachments',
    'complaint-attachments',
    true,
    10485760, -- 10 MB
    array['image/jpeg', 'image/png', 'application/pdf']
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152, -- 2 MB
    array['image/jpeg', 'image/png']
  )
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- ---- complaint-attachments -------------------------------------------------
-- Object key layout: {complaint_id}/{uuid}.{ext}

create policy "attachments are publicly readable"
  on storage.objects for select
  using (bucket_id = 'complaint-attachments');

-- A user may only write into the folder of a complaint they can already read,
-- which stops uploads being scattered into other students' complaints.
create policy "attachments insert by complaint participant"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'complaint-attachments'
    and public.can_read_complaint(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments delete by owner or admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'complaint-attachments'
    and (owner = auth.uid() or public.is_admin())
  );

-- ---- avatars ---------------------------------------------------------------
-- Object key layout: {user_id}/{filename}

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars insert own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars update own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars delete own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Realtime — the app subscribes to these for live comments and notifications.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.complaint_comments;
alter publication supabase_realtime add table public.complaints;
alter publication supabase_realtime add table public.complaint_status_history;
-- ============================================================================
-- NITS HelpDesk — seed data
--
-- This is real reference data the application reads at runtime, not UI mocks:
-- departments and hostels populate the report form's dropdowns, the dashboard
-- chips and the search filters.
--
-- Hostel names follow the numbering used in the Stitch designs ("Hostel 9",
-- "Hostel 7") plus the one named hall they reference. Replace these with the
-- institute's actual hall names via the admin panel before going live.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Departments — the 13 from the spec, each with its Material Symbol.
-- Icon names must exist in scripts/icon-names.txt or they render as a blank box.
-- ----------------------------------------------------------------------------
alter table public.departments add column if not exists department_type text not null default 'service';

insert into public.departments (name, slug, description, icon, color_token, department_type) values
  -- Academic Departments (for User Onboarding & Profile Branch)
  ('Computer Science and Engineering (CSE)',            'cse',                         'Department of Computer Science & Engineering',             'computer',                'primary',  'academic'),
  ('Electronics and Communication Engineering (ECE)',    'ece',                         'Department of Electronics & Communication Engineering',     'memory',                  'primary',  'academic'),
  ('Electrical Engineering (EE)',                        'ee',                          'Department of Electrical Engineering',                     'bolt',                    'primary',  'academic'),
  ('Mechanical Engineering (ME)',                        'me',                          'Department of Mechanical Engineering',                     'settings',                'primary',  'academic'),
  ('Civil Engineering (CE)',                             'ce',                          'Department of Civil Engineering',                          'construction',            'primary',  'academic'),
  ('Electronics and Instrumentation Engineering (EIE)',  'eie',                         'Department of Electronics & Instrumentation Engineering',  'precision_manufacturing', 'primary',  'academic'),
  ('Physics',                                            'physics',                     'Department of Physics',                                    'science',                 'tertiary', 'academic'),
  ('Chemistry',                                          'chemistry',                   'Department of Chemistry',                                  'science',                 'tertiary', 'academic'),
  ('Mathematics',                                        'mathematics',                 'Department of Mathematics',                                'functions',               'tertiary', 'academic'),
  ('Management Studies',                                 'management-studies',          'Department of Management Studies (MBA)',                   'business_center',         'secondary','academic'),
  ('Humanities and Social Sciences',                     'humanities-social-sciences',  'Department of Humanities & Social Sciences',              'menu_book',               'secondary','academic'),
  -- Service / Issue Departments (for Filing Complaints)
  ('Hostel',            'hostel',            'Rooms, furniture, mess and warden matters',        'apartment',        'primary',  'service'),
  ('Electrical',        'electrical',        'Lighting, fans, wiring and power outages',         'bolt',             'tertiary', 'service'),
  ('Water Supply',      'water-supply',      'Taps, plumbing, drinking water and drainage',      'water_drop',       'secondary','service'),
  ('Internet/WiFi',     'internet-wifi',     'Campus network, WiFi access points and LAN',       'wifi',             'secondary','service'),
  ('Library',           'library',           'Books, reading rooms, journals and study spaces',  'local_library',    'primary',  'service'),
  ('Academic Section',  'academic-section',  'Registration, transcripts and course records',     'school',           'primary',  'service'),
  ('Examination Cell',  'examination-cell',  'Exam schedules, results and re-evaluation',        'history_edu',      'tertiary', 'service'),
  ('Medical Centre',    'medical-centre',    'Health centre, ambulance and medical emergencies', 'medical_services', 'error',    'service'),
  ('Sports Complex',    'sports-complex',    'Grounds, gymnasium and sports equipment',          'sports_soccer',    'success',  'service'),
  ('Placement Cell',    'placement-cell',    'Internships, placements and company drives',       'work',             'primary',  'service'),
  ('Security',          'security',          'Campus security, lost property and access',        'security',         'error',    'service'),
  ('Transport',         'transport',         'Buses, shuttles and vehicle requests',             'directions_bus',   'tertiary', 'service'),
  ('Others',            'others',            'Anything that does not fit another department',    'category',         'primary',  'service')
on conflict (slug) do update
  set name            = excluded.name,
      description     = excluded.description,
      icon            = excluded.icon,
      color_token     = excluded.color_token,
      department_type = excluded.department_type;

-- ----------------------------------------------------------------------------
-- Hostels
-- ----------------------------------------------------------------------------
insert into public.hostels (name, slug) values
  ('Hostel 1',   'hostel-1'),
  ('Hostel 2',   'hostel-2'),
  ('Hostel 3',   'hostel-3'),
  ('Hostel 4',   'hostel-4'),
  ('Hostel 5',   'hostel-5'),
  ('Hostel 6',   'hostel-6'),
  ('Hostel 7',   'hostel-7'),
  ('Hostel 8',   'hostel-8'),
  ('Hostel 9',   'hostel-9'),
  ('Hostel 10',  'hostel-10'),
  ('Hostel 11',  'hostel-11'),
  ('Hostel 12',  'hostel-12'),
  ('Aryabhatta', 'aryabhatta'),
  ('Day Scholar', 'day-scholar')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- FAQ
-- ----------------------------------------------------------------------------
insert into public.faq (question, answer, category, display_order, is_published) values
  (
    'Who can sign in to NITS HelpDesk?',
    'Only NIT Silchar institute accounts. Your email must end in @nits.ac.in or @students.nits.ac.in — personal addresses such as Gmail are rejected at sign-in.',
    'Account', 1, true
  ),
  (
    'How long does a complaint take to resolve?',
    'It depends on the department and priority. High-priority issues such as power or water failures are typically picked up the same day. You can follow the exact stage of your complaint on its timeline at any time.',
    'Complaints', 2, true
  ),
  (
    'What does each status mean?',
    'Submitted — received and waiting for triage. Assigned — a staff member now owns it. Under Review — they are inspecting the issue. In Progress — a fix is under way. Resolved — the work is done. Closed — the complaint is finished and you can rate it.',
    'Complaints', 3, true
  ),
  (
    'Can I report something anonymously?',
    'Yes. Turn on "Submit Anonymously" in the report form and your name is hidden from the staff handling it. You will still receive all updates, and you can still track the complaint from your own list.',
    'Privacy', 4, true
  ),
  (
    'What files can I attach?',
    'JPG, PNG and PDF files up to 10 MB each. Photographs of the problem help staff diagnose an issue far faster than a description alone.',
    'Complaints', 5, true
  ),
  (
    'Can I edit a complaint after submitting it?',
    'You can edit it while it is still in the Submitted stage. Once a staff member has been assigned, add a comment instead so the change is recorded on the thread.',
    'Complaints', 6, true
  ),
  (
    'How do I rate the resolution?',
    'Once a complaint is Closed, open it and leave a rating from 1 to 5 stars with optional feedback. This is what departments are measured on, so it genuinely matters.',
    'Feedback', 7, true
  ),
  (
    'I raised a complaint for the wrong department. What now?',
    'No action needed on your side. Admins re-route complaints during triage, and you will get a notification when it moves.',
    'Complaints', 8, true
  )
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Schema Repair & Backfill for Existing Databases
-- ----------------------------------------------------------------------------

-- Fix column name if complaint_status_history was created with changed_at instead of created_at
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'complaint_status_history' and column_name = 'changed_at'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'complaint_status_history' and column_name = 'created_at'
  ) then
    alter table public.complaint_status_history rename column changed_at to created_at;
  end if;
end $$;

alter table public.complaints add column if not exists category text;
alter table public.complaints add column if not exists location text;
alter table public.complaint_status_history add column if not exists created_at timestamptz default now();

drop view if exists public.v_complaints cascade;

create view public.v_complaints
with (security_invoker = on)
as
select
  c.id,
  c.complaint_code,
  c.title,
  c.description,
  c.department_id,
  c.category,
  c.hostel_id,
  c.location,
  c.priority,
  c.status,
  c.is_anonymous,
  case
    when c.is_anonymous and c.created_by <> auth.uid() then null
    else c.created_by
  end as created_by,
  c.assigned_to,
  c.resolution_note,
  c.resolved_at,
  c.closed_at,
  c.created_at,
  c.updated_at
from public.complaints c;

grant select on public.v_complaints to authenticated;

-- Backfill profiles for existing users
insert into public.profiles (id, email, name, avatar_url)
select
  id,
  email,
  nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')), ''),
  nullif(trim(coalesce(raw_user_meta_data ->> 'avatar_url', '')), '')
from auth.users
on conflict (id) do nothing;

-- ============================================================================
-- NITS HelpDesk — table/sequence grants
--
-- RLS policies decide which *rows* a role may touch; Postgres still checks the
-- coarse table-level GRANT first, and without it every query fails with
-- "permission denied" regardless of how permissive the policy is. This project
-- was created without Supabase's usual default-privilege bootstrapping, so
-- every base table except the explicitly-granted v_complaints view was
-- unreadable/unwritable via the Data API. See migration 20260101000700.
-- ============================================================================
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
