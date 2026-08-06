-- ============================================================================
-- NITS HelpDesk — notifications, activity log, announcements, FAQ, rate limits
-- ============================================================================

-- ----------------------------------------------------------------------------
-- notifications — realtime feed, one row per recipient
-- ----------------------------------------------------------------------------
create table public.notifications (
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
create index notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);
create index notifications_complaint_idx on public.notifications (complaint_id)
  where complaint_id is not null;

-- ----------------------------------------------------------------------------
-- activity_logs — append-only audit trail
--
-- Written only by SECURITY DEFINER triggers; no client may insert directly.
-- ----------------------------------------------------------------------------
create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index activity_logs_entity_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);
create index activity_logs_actor_idx
  on public.activity_logs (actor_id, created_at desc);

-- ----------------------------------------------------------------------------
-- announcements
-- ----------------------------------------------------------------------------
create table public.announcements (
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

create index announcements_live_idx
  on public.announcements (is_pinned desc, published_at desc)
  where is_published;

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- faq
-- ----------------------------------------------------------------------------
create table public.faq (
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

create index faq_published_idx on public.faq (display_order, created_at)
  where is_published;

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
create table public.rate_limits (
  bucket_key   text primary key,
  hit_count    integer not null default 0,
  window_start timestamptz not null default now()
);

create index rate_limits_window_idx on public.rate_limits (window_start);

comment on table public.rate_limits is
  'Written exclusively by public.check_rate_limit(). No RLS policy grants
   client access; the function is SECURITY DEFINER.';
