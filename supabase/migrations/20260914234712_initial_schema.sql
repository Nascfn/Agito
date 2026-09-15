-- Initial schema: lists, tasks, task attachments, task feed, storage bucket.
-- Every table is owned by a user and protected by Row Level Security.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- lists
-- ---------------------------------------------------------------------------

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create index lists_user_id_idx on public.lists (user_id);
create unique index lists_one_default_per_user on public.lists (user_id) where is_default;

alter table public.lists enable row level security;

create policy "Users can view their lists"
  on public.lists for select to authenticated
  using ((select auth.uid()) = user_id);

-- Agents (OAuth sessions, which carry a client_id claim) can't create or change lists.
create policy "Users can create their lists"
  on public.lists for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  );

create policy "Users can update their lists"
  on public.lists for update to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  )
  with check ((select auth.uid()) = user_id);

-- Agents (OAuth sessions, which carry a client_id claim) can't delete anything.
create policy "Users can delete their non-default lists"
  on public.lists for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and not is_default
    and (select auth.jwt() ->> 'client_id') is null
  );

-- Lists can be renamed, but ownership and the default flag can't be changed.
revoke update on public.lists from anon, authenticated;
grant update (name) on public.lists to authenticated;

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
-- Per-user preferences. The scheduling window is when agents may place tasks
-- on the user's calendar; asked during onboarding, default 9am–9pm.
-- Any window is allowed: if end is earlier than start it crosses midnight
-- (e.g. 22:00–06:00 for night shifts); if start equals end it's all day.
-- schedule_weekends: whether agents may place tasks on Saturday and Sunday.
-- check_frequency_minutes: how often the user's Claude check-in runs.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schedule_window_start time not null default '09:00',
  schedule_window_end time not null default '21:00',
  schedule_weekends boolean not null default true,
  check_frequency_minutes integer not null default 60
    check (check_frequency_minutes in (15, 30, 60, 120, 240)),
  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

create policy "Users can view their settings"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

-- Agents can read settings but not change them. Rows are created by the
-- new-user trigger, so there are no insert or delete policies.
create policy "Users can update their settings"
  on public.user_settings for update to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  )
  with check ((select auth.uid()) = user_id);

revoke update on public.user_settings from anon, authenticated;
grant update (schedule_window_start, schedule_window_end, schedule_weekends, check_frequency_minutes, onboarded_at)
  on public.user_settings to authenticated;

-- Create a default list and settings for every new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lists (user_id, name, is_default)
  values (new.id, 'Tasks', true);

  insert into public.user_settings (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id uuid not null,
  title text not null check (char_length(title) between 1 and 500),
  description text check (char_length(description) <= 50000),
  due_date date,
  due_time time,
  estimate_minutes integer check (estimate_minutes between 1 and 100000),
  -- "Agent: do this" — the agent works on the task instead of scheduling
  -- time for the user, so it has no estimate. Only the user can set it.
  agent_task boolean not null default false,
  status text not null default 'todo' check (status in ('todo', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- A time only makes sense with a date.
  check (due_time is null or due_date is not null),
  -- Agent tasks aren't scheduled for the user, so they have no estimate.
  check (not agent_task or estimate_minutes is null),
  -- The list must belong to the same user as the task.
  foreign key (list_id, user_id) references public.lists (id, user_id) on delete restrict
);

create index tasks_user_status_idx on public.tasks (user_id, status);
create index tasks_list_status_created_idx on public.tasks (list_id, status, created_at desc);

-- Keep completed_at in sync with status.
create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at
  before insert or update of status on public.tasks
  for each row execute function public.set_task_completed_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Agents (OAuth sessions, which carry a client_id claim) can create open tasks
-- but can't edit, open, or close existing ones — they write to the task feed
-- instead. Named to sort before tasks_set_completed_at so it runs first.
create or replace function public.block_agent_task_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.jwt() ->> 'client_id' is not null then
    if tg_op = 'INSERT' and new.status <> 'todo' then
      raise exception 'Agents can''t create completed tasks'
        using errcode = '42501';
    elsif tg_op = 'INSERT' and new.agent_task then
      -- Only the user decides what agents should do on their own.
      raise exception 'Only you can mark a task "Agent: do this"'
        using errcode = '42501';
    elsif tg_op = 'UPDATE' then
      raise exception 'Agents can''t edit tasks; add to the task feed instead'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_block_agent_changes
  before insert or update on public.tasks
  for each row execute function public.block_agent_task_changes();

alter table public.tasks enable row level security;

create policy "Users can view their tasks"
  on public.tasks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their tasks"
  on public.tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their tasks"
  on public.tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Agents (OAuth clients, which carry a client_id claim) can't delete tasks.
create policy "Users can delete their tasks"
  on public.tasks for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  );

-- Only user-editable fields can be updated; ownership, ids, and timestamps
-- are managed by defaults and triggers.
revoke update on public.tasks from anon, authenticated;
grant update (list_id, title, description, due_date, due_time, estimate_minutes, agent_task, status)
  on public.tasks to authenticated;

-- ---------------------------------------------------------------------------
-- task_attachments
-- ---------------------------------------------------------------------------

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index task_attachments_task_id_idx on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;

create policy "Users can view their attachments"
  on public.task_attachments for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their attachments"
  on public.task_attachments for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  );

create policy "Users can delete their attachments"
  on public.task_attachments for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  );

-- ---------------------------------------------------------------------------
-- task_feed
-- ---------------------------------------------------------------------------
-- Author is derived from the JWT, never trusted from the client:
-- sessions from an OAuth client (agents) carry a client_id claim.

create table public.task_feed (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_type text not null check (author_type in ('user', 'agent')),
  author_name text not null check (char_length(author_name) between 1 and 100),
  oauth_client_id text,
  body text not null check (char_length(body) between 1 and 50000),
  created_at timestamptz not null default now(),
  check ((author_type = 'agent') = (oauth_client_id is not null)),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

create index task_feed_task_created_idx on public.task_feed (task_id, created_at);

-- Set the author from the caller's JWT, ignoring anything the client sent.
-- Supabase OAuth access tokens carry a client_id claim; normal sessions don't.
-- Security definer so it can read the OAuth client's display name.
create or replace function public.set_task_feed_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_client_id text := auth.jwt() ->> 'client_id';
  client_name text;
begin
  new.oauth_client_id := jwt_client_id;

  if jwt_client_id is null then
    new.author_type := 'user';
    new.author_name := 'You';
  else
    new.author_type := 'agent';
    begin
      select c.client_name into client_name
      from auth.oauth_clients c
      where c.id::text = jwt_client_id
        and c.deleted_at is null;
    exception when undefined_table or undefined_column or insufficient_privilege then
      -- OAuth server tables differ or aren't enabled; fall back below.
      client_name := null;
    end;
    new.author_name := coalesce(nullif(left(client_name, 100), ''), 'Agent');
  end if;

  return new;
end;
$$;

create trigger task_feed_set_author
  before insert on public.task_feed
  for each row execute function public.set_task_feed_author();

-- Clients may only supply the task and the text; everything else is derived.
revoke insert on public.task_feed from anon, authenticated;
grant insert (task_id, body) on public.task_feed to authenticated;

alter table public.task_feed enable row level security;

create policy "Users can view their task feed"
  on public.task_feed for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users and agents can add feed entries"
  on public.task_feed for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and oauth_client_id is not distinct from (select auth.jwt() ->> 'client_id')
  );

-- No update policy: feed entries are append-only.
-- Only the user themselves (not an OAuth agent) can delete entries.
create policy "Users can delete their feed entries"
  on public.task_feed for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'client_id') is null
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket, files stored under <user_id>/<task_id>/<file>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 52428800)
on conflict (id) do nothing;

create policy "Users can view their attachment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload their attachment files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'client_id') is null
  );

create policy "Users can delete their attachment files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'client_id') is null
  );
