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

create trigger complaints_guard_privileged_columns
  before update on public.complaints
  for each row execute function public.guard_privileged_complaint_columns();
