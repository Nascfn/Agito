-- Applied 2026-09-15 as version 20260915183858.
--
-- Note: the storage.objects TRUNCATE revoke has no effect. Those grants belong
-- to supabase_storage_admin, and the postgres role can't revoke them (Postgres
-- only warns). Accepted: anyone able to TRUNCATE there can already delete rows
-- under RLS, and file bytes live in the storage backend.
--
-- Hardening from the 2026-09-15 security tests. None of these gaps were
-- reachable through the app; they tighten direct database access.

-- 1. TRUNCATE ignores Row Level Security, and nothing in the app needs it.
revoke truncate on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate on tables from anon, authenticated;

do $$
begin
  revoke truncate on table storage.objects from anon, authenticated;
exception when insufficient_privilege then
  raise notice 'Skipped storage.objects TRUNCATE revoke: not permitted for this role';
end;
$$;

-- 2. Users may only set the columns the app sends when creating rows.
--    Ownership, flags, and timestamps come from defaults and triggers.
revoke insert on public.lists from anon, authenticated;
grant insert (name) on public.lists to authenticated;

revoke insert on public.tasks from anon, authenticated;
grant insert (id, list_id, title, description, due_date, due_time, estimate_minutes, agent_task)
  on public.tasks to authenticated;

revoke insert on public.task_attachments from anon, authenticated;
grant insert (id, task_id, storage_path, file_name, mime_type, size_bytes)
  on public.task_attachments to authenticated;

-- 3. Task feed entries and attachment records are never edited.
revoke update on public.task_feed, public.task_attachments from anon, authenticated;

-- 4. Attachment paths can't contain "." or ".." segments.
alter table public.task_attachments
  add constraint task_attachments_no_dot_segments
    check (storage_path !~ '(^|/)\.\.?(/|$)');

-- 5. Only real time zone names (no POSIX strings or offsets).
create or replace function public.validate_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.time_zone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone)
  then
    raise exception 'Unknown time zone: %', new.time_zone using errcode = '22023';
  end if;
  return new;
end;
$$;
