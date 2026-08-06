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
