-- ============================================================================
-- NITS HelpDesk — extensions, enums and shared helper functions
-- ============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type public.user_role as enum (
  'student',
  'staff',
  'admin',
  'super_admin'
);

-- Ordered to match the lifecycle in the design's timeline component.
create type public.complaint_status as enum (
  'submitted',
  'assigned',
  'under_review',
  'in_progress',
  'resolved',
  'closed'
);

create type public.complaint_priority as enum (
  'low',
  'medium',
  'high'
);

create type public.notification_type as enum (
  'complaint_created',
  'assignment',
  'comment',
  'status_update',
  'resolution',
  'announcement'
);

-- Distinguishes the student's original evidence from the staff member's
-- proof-of-fix, which the detail page renders in separate galleries.
create type public.attachment_kind as enum (
  'evidence',
  'resolution',
  'comment'
);

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
