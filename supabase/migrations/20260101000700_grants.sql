-- ============================================================================
-- NITS HelpDesk — table/sequence grants
--
-- RLS policies decide which *rows* a role may touch; Postgres still checks the
-- coarse table-level GRANT first; without it every query fails with
-- "permission denied" regardless of how permissive the policy is. Views must
-- be granted individually (see v_complaints in 20260101000600), but base
-- tables are covered here in one place, plus a default-privileges rule so a
-- table added by a future migration is not silently unreadable again.
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
