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
