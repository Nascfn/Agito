-- Phase 3: file attachments.
-- Applied 2026-09-15 as version 20260915134248.
--
-- Limits match docs/PLAN.md: 50 MB per file; PDF, images, text, and
-- Word/Excel/PowerPoint (OOXML) only.

update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
where id = 'task-attachments';

-- Uploads must go to <user_id>/<task_id>/..., and the task must belong to the
-- user. Agents (OAuth sessions) still can't upload.
drop policy "Users can upload their attachment files" on storage.objects;

create policy "Users can upload their attachment files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.jwt() ->> 'client_id') is null
    and exists (
      select 1
      from public.tasks t
      where t.id::text = (storage.foldername(name))[2]
        and t.user_id = (select auth.uid())
    )
  );

-- An attachment row must point at a file inside its own task's folder, and
-- only allowed types and sizes can be recorded.
alter table public.task_attachments
  add constraint task_attachments_path_in_task_folder
    check (storage_path like user_id::text || '/' || task_id::text || '/%'),
  add constraint task_attachments_max_size
    check (size_bytes <= 52428800),
  add constraint task_attachments_allowed_mime_type
    check (mime_type in (
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ));
