-- Applied 2026-09-15 as version 20260915173612.

-- 1. Agents can't create tasks for now (decided 2026-09-15). They read tasks
--    and write to the task feed only. `create or replace` keeps the revoked
--    EXECUTE privileges from 20260915004113_harden_definer_functions.sql.
create or replace function public.block_agent_task_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.jwt() ->> 'client_id' is not null then
    if tg_op = 'INSERT' then
      raise exception 'Agents can''t create tasks; add to the task feed instead'
        using errcode = '42501';
    elsif tg_op = 'UPDATE' then
      raise exception 'Agents can''t edit tasks; add to the task feed instead'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- 2. Each user's time zone, picked during onboarding (IANA name, e.g.
--    America/New_York). Null until onboarding.
alter table public.user_settings
  add column time_zone text
    check (time_zone is null or char_length(time_zone) between 1 and 64);

create or replace function public.validate_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.time_zone is not null then
    -- Raises "time zone ... not recognized" for unknown names.
    perform now() at time zone new.time_zone;
  end if;
  return new;
end;
$$;

create trigger user_settings_validate_time_zone
  before insert or update of time_zone on public.user_settings
  for each row execute function public.validate_time_zone();

revoke execute on function public.validate_time_zone() from public, anon, authenticated;

revoke update on public.user_settings from anon, authenticated;
grant update (
  schedule_window_start,
  schedule_window_end,
  schedule_weekends,
  check_frequency_minutes,
  time_zone,
  onboarded_at
) on public.user_settings to authenticated;
