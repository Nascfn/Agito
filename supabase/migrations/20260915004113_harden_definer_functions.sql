-- Trigger functions are not part of the API. Revoking EXECUTE keeps them off
-- the PostgREST RPC surface (/rest/v1/rpc/...). Triggers still fire: Postgres
-- checks EXECUTE when a trigger is created, not each time it runs.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_task_feed_author() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.set_task_completed_at() from public, anon, authenticated;
revoke execute on function public.block_agent_task_changes() from public, anon, authenticated;
