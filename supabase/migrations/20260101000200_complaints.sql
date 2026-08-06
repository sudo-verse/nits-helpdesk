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
create table public.complaints (
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

create index complaints_created_by_status_idx
  on public.complaints (created_by, status, created_at desc);
create index complaints_assigned_to_idx
  on public.complaints (assigned_to, status) where assigned_to is not null;
create index complaints_department_status_idx
  on public.complaints (department_id, status);
create index complaints_triage_idx
  on public.complaints (status, priority, created_at desc);
create index complaints_hostel_idx
  on public.complaints (hostel_id) where hostel_id is not null;
create index complaints_unassigned_idx
  on public.complaints (created_at desc) where assigned_to is null;

-- Full-text search across title + description for the global search bar.
create index complaints_search_idx on public.complaints
  using gin (to_tsvector('english', title || ' ' || description));
-- Trigram index so searching a partial complaint code stays fast.
create index complaints_code_trgm_idx on public.complaints
  using gin (complaint_code extensions.gin_trgm_ops);

create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- complaint_comments
-- ----------------------------------------------------------------------------
create table public.complaint_comments (
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

create index comments_complaint_idx
  on public.complaint_comments (complaint_id, created_at);
create index comments_author_idx on public.complaint_comments (author_id);

create trigger comments_set_updated_at
  before update on public.complaint_comments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- complaint_images  (images *and* PDF attachments)
-- ----------------------------------------------------------------------------
create table public.complaint_images (
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

create index images_complaint_idx on public.complaint_images (complaint_id, kind);
create index images_comment_idx on public.complaint_images (comment_id)
  where comment_id is not null;

-- ----------------------------------------------------------------------------
-- complaint_status_history — feeds the timeline component
-- ----------------------------------------------------------------------------
create table public.complaint_status_history (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  from_status  public.complaint_status,
  to_status    public.complaint_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index status_history_complaint_idx
  on public.complaint_status_history (complaint_id, created_at);

-- ----------------------------------------------------------------------------
-- staff_assignments — full assignment history, not just the current holder
-- ----------------------------------------------------------------------------
create table public.staff_assignments (
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
create unique index assignments_one_active_idx
  on public.staff_assignments (complaint_id) where is_active;
create index assignments_staff_idx
  on public.staff_assignments (staff_id, is_active);

-- ----------------------------------------------------------------------------
-- feedback — 1-5 stars, once per complaint, only after closure
-- ----------------------------------------------------------------------------
create table public.feedback (
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

create index feedback_student_idx on public.feedback (student_id);

create trigger feedback_set_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();
