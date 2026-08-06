-- ============================================================================
-- NITS HelpDesk — security probes
--
--   psql "$DATABASE_URL" -f supabase/tests/rls_probes.sql
--
-- Every block asserts and raises on failure, so a non-zero exit means a real
-- regression. These target the places where a mistake is silent and serious:
-- the domain gate, anonymous-reporter leakage, role self-escalation, and
-- cross-student complaint access.
--
-- Run against the LOCAL stack only — it creates and deletes users.
-- ============================================================================

\set ON_ERROR_STOP on
-- 'notice' (not 'warning') — the PASS/FAIL lines below are RAISE NOTICE.
set client_min_messages = notice;

do $$
declare
  student_a  uuid := gen_random_uuid();
  student_b  uuid := gen_random_uuid();
  staff_1    uuid := gen_random_uuid();
  admin_1    uuid := gen_random_uuid();
  dept_wifi  uuid;
  c_public   uuid;
  c_anon     uuid;
  got        int;
  got_uuid   uuid;
  failed     boolean;
  code       text;
begin
  select id into dept_wifi from public.departments where slug = 'internet-wifi';
  if dept_wifi is null then
    raise exception 'Seed data missing — run `supabase db reset` first.';
  end if;

  -- ==========================================================================
  raise notice '--- 1. domain gate ------------------------------------------';
  -- ==========================================================================

  -- Institute addresses are accepted and auto-provision a profile.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (student_a, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'probe.a@students.nits.ac.in', '', now(),
          '{"provider":"email","providers":["email"]}', '{"full_name":"Probe A"}',
          now(), now());

  select count(*) into got from public.profiles where id = student_a;
  if got <> 1 then
    raise exception 'FAIL 1a: handle_new_user did not create a profile (got %)', got;
  end if;
  raise notice 'PASS 1a: @students.nits.ac.in accepted, profile auto-created';

  -- A personal address must abort the signup transaction.
  failed := false;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'attacker@gmail.com', '', now(),
            '{"provider":"google","providers":["google"]}', '{}', now(), now());
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 1b: gmail.com was allowed to sign up';
  end if;
  raise notice 'PASS 1b: @gmail.com rejected (this is the Google-OAuth gate)';

  -- Lookalike domains must not slip through.
  failed := false;
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'evil@nits.ac.in.attacker.com', '', now(), '{}', '{}', now(), now());
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 1c: suffix-attack domain was allowed';
  end if;
  raise notice 'PASS 1c: nits.ac.in.attacker.com rejected';

  -- Remaining fixtures.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    (student_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.b@students.nits.ac.in', '', now(), '{}', '{"full_name":"Probe B"}', now(), now()),
    (staff_1,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.staff@nits.ac.in', '', now(), '{}', '{"full_name":"Probe Staff"}', now(), now()),
    (admin_1,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'probe.admin@nits.ac.in', '', now(), '{}', '{"full_name":"Probe Admin"}', now(), now());

  update public.profiles set role = 'staff', department_id = dept_wifi where id = staff_1;
  update public.profiles set role = 'admin' where id = admin_1;

  -- ==========================================================================
  raise notice '--- 2. complaint codes and status graph ----------------------';
  -- ==========================================================================

  insert into public.complaints (title, description, department_id, created_by, priority)
  values ('Probe public complaint', 'Description long enough to pass the check constraint.',
          dept_wifi, student_a, 'high')
  returning id into c_public;

  insert into public.complaints (title, description, department_id, created_by, is_anonymous)
  values ('Probe anonymous complaint', 'Description long enough to pass the check constraint.',
          dept_wifi, student_a, true)
  returning id into c_anon;

  select count(*) into got from public.complaints
   where id = c_public and complaint_code ~ '^CMP-[0-9]{4}-[0-9]{5}$';
  if got <> 1 then
    raise exception 'FAIL 2a: complaint_code not generated in CMP-YYYY-NNNNN form';
  end if;
  raise notice 'PASS 2a: complaint_code auto-generated';

  select count(*) into got from public.complaint_status_history where complaint_id = c_public;
  if got <> 1 then
    raise exception 'FAIL 2b: expected 1 initial status_history row, got %', got;
  end if;
  raise notice 'PASS 2b: initial status history row written';

  -- submitted -> closed is not a legal edge.
  failed := false;
  begin
    update public.complaints
       set status = 'closed', resolution_note = 'skipping the queue'
     where id = c_public;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 2c: illegal transition submitted -> closed was allowed';
  end if;
  raise notice 'PASS 2c: illegal status jump rejected';

  -- resolved requires a resolution note.
  failed := false;
  begin
    update public.complaints set status = 'assigned' where id = c_public;
    update public.complaints set status = 'in_progress' where id = c_public;
    update public.complaints set status = 'resolved', resolution_note = null where id = c_public;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 2d: resolved without a resolution_note was allowed';
  end if;
  raise notice 'PASS 2d: resolution_note required to resolve';

  -- ==========================================================================
  raise notice '--- 3. anonymity view ----------------------------------------';
  -- ==========================================================================

  -- As the reporter: they see their own identity on their own anonymous report.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', student_a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select created_by into got_uuid from public.v_complaints where id = c_anon;
  if got_uuid is distinct from student_a then
    raise exception 'FAIL 3a: reporter cannot see themselves on their own anonymous complaint';
  end if;
  raise notice 'PASS 3a: reporter still sees own identity';

  -- As staff: the reporter must be redacted.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', staff_1, 'role', 'authenticated')::text, true);

  select created_by into got_uuid from public.v_complaints where id = c_anon;
  if got_uuid is not null then
    raise exception 'FAIL 3b: ANONYMITY LEAK — staff read created_by = % on an anonymous complaint', got_uuid;
  end if;
  raise notice 'PASS 3b: reporter redacted from staff on anonymous complaint';

  -- ...but a non-anonymous complaint still shows its reporter.
  select created_by into got_uuid from public.v_complaints where id = c_public;
  if got_uuid is distinct from student_a then
    raise exception 'FAIL 3c: reporter wrongly hidden on a NON-anonymous complaint';
  end if;
  raise notice 'PASS 3c: non-anonymous reporter still visible to staff';

  -- ==========================================================================
  raise notice '--- 4. cross-student isolation -------------------------------';
  -- ==========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', student_b, 'role', 'authenticated')::text, true);

  select count(*) into got from public.complaints where id = c_public;
  if got <> 0 then
    raise exception 'FAIL 4a: student B read student A''s complaint';
  end if;
  raise notice 'PASS 4a: student B cannot read student A''s complaint';

  select count(*) into got from public.v_complaints where id = c_public;
  if got <> 0 then
    raise exception 'FAIL 4b: v_complaints leaked a row across students (security_invoker off?)';
  end if;
  raise notice 'PASS 4b: v_complaints enforces RLS (security_invoker on)';

  -- ==========================================================================
  raise notice '--- 5. privilege escalation ----------------------------------';
  -- ==========================================================================

  failed := false;
  begin
    update public.profiles set role = 'super_admin' where id = student_b;
  exception when others then
    failed := true;
  end;
  if not failed then
    select role::text into code from public.profiles where id = student_b;
    if code = 'super_admin' then
      raise exception 'FAIL 5a: PRIVILEGE ESCALATION — student promoted themselves to super_admin';
    end if;
  end if;
  raise notice 'PASS 5a: student cannot change their own role';

  failed := false;
  begin
    update public.profiles set email = 'someone.else@nits.ac.in' where id = student_b;
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 5b: student changed their own email (identity spoof)';
  end if;
  raise notice 'PASS 5b: email is immutable';

  -- A student must not be able to hand themselves a complaint.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', student_a, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    update public.complaints set assigned_to = student_a where id = c_anon;
  exception when others then
    failed := true;
  end;
  select count(*) into got from public.complaints where id = c_anon and assigned_to is not null;
  if got <> 0 then
    raise exception 'FAIL 5c: student self-assigned a complaint';
  end if;
  raise notice 'PASS 5c: student cannot self-assign';

  -- Flipping is_anonymous after the fact would retroactively unmask the
  -- reporter to every staff member who can see the complaint.
  failed := false;
  begin
    update public.complaints set is_anonymous = false where id = c_anon;
  exception when others then
    failed := true;
  end;
  select count(*) into got from public.complaints where id = c_anon and is_anonymous;
  if got <> 1 then
    raise exception 'FAIL 5d: ANONYMITY LEAK — is_anonymous was flipped off after submission';
  end if;
  raise notice 'PASS 5d: anonymity cannot be revoked after submission';

  -- A student must not be able to drive their own complaint's workflow.
  failed := false;
  begin
    update public.complaints set status = 'resolved', resolution_note = 'self-serve' where id = c_anon;
  exception when others then
    failed := true;
  end;
  select count(*) into got from public.complaints where id = c_anon and status <> 'submitted';
  if got <> 0 then
    raise exception 'FAIL 5e: student changed their own complaint status';
  end if;
  raise notice 'PASS 5e: student cannot change complaint status';

  -- ==========================================================================
  raise notice '--- 6. notifications are personal ----------------------------';
  -- ==========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', student_b, 'role', 'authenticated')::text, true);
  select count(*) into got from public.notifications where user_id = student_a;
  if got <> 0 then
    raise exception 'FAIL 6a: student B read student A''s notifications';
  end if;
  raise notice 'PASS 6a: notifications are per-user';

  -- ==========================================================================
  raise notice '--- 7. feedback gating ---------------------------------------';
  -- ==========================================================================

  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', null, true);

  failed := false;
  begin
    insert into public.feedback (complaint_id, student_id, rating)
    values (c_anon, student_a, 5);
  exception when others then
    failed := true;
  end;
  if not failed then
    raise exception 'FAIL 7a: feedback accepted on a complaint that is not closed';
  end if;
  raise notice 'PASS 7a: feedback rejected until the complaint is closed';

  -- ==========================================================================
  raise notice '--- 8. rate limiter ------------------------------------------';
  -- ==========================================================================

  got := 0;
  for i in 1..5 loop
    if public.check_rate_limit('probe:test', 3, interval '1 minute') then
      got := got + 1;
    end if;
  end loop;
  if got <> 3 then
    raise exception 'FAIL 8a: limiter allowed % of 5 calls, expected 3', got;
  end if;
  raise notice 'PASS 8a: rate limiter caps at the configured maximum';

  -- ==========================================================================
  -- Cleanup — cascades through profiles, complaints, notifications.
  -- ==========================================================================
  delete from auth.users where id in (student_a, student_b, staff_1, admin_1);
  delete from public.rate_limits where bucket_key = 'probe:test';

  raise notice '';
  raise notice '================ ALL SECURITY PROBES PASSED ================';
end;
$$;
