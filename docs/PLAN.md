# Agito — Plan

Agito is the app name (repo: AgentFirst-Task-Finance-Tracker). Visual identity,
terminology, and UX decisions live in [DESIGN.md](DESIGN.md).

A web app (mobile app later) for tracking tasks, and later finances. Adding and
closing tasks should be fast, obvious, and satisfying. AI agents (Claude on
claude.ai and the Claude phone app) connect over MCP so they can read tasks,
help plan them onto a calendar, and help get them done.

**Scope for now: tasks only.** Finance comes later.

## Principles

- Keep dependencies minimal. Prefer built-in browser/React/Next.js features.
- Only a title is required to create a task.
- Every row belongs to a user and is protected by Row Level Security, so adding
  other users later needs no redesign. For now it's single-user.
- Agents get as much context as possible: descriptions, files, and the task feed.

## Stack

| Package / service | Purpose |
|---|---|
| Next.js (React, TypeScript) | Web app, server actions, API routes, MCP endpoint |
| Tailwind CSS | Styling |
| `@supabase/supabase-js` + `@supabase/ssr` | Database, auth, storage, sessions |
| MCP TypeScript SDK | MCP server (phase 4 only) |
| Supabase | Postgres, Auth (incl. OAuth server for agents), Storage |
| Own VM (planned, decided 2026-09-15) | Hosting (needed so Claude can reach the MCP server): Node running `next start`, HTTPS via a reverse proxy such as Caddy, always on |

Deliberately not used: UI kits, animation libraries, data-fetching libraries,
natural-language date parsing, PDF text extraction. Replacements: custom
components, CSS animations, React `useOptimistic` + server actions, native date
input, and sending original files to Claude (it reads PDFs and images directly).

## Creating a task

- **Title** — required. Enter saves.
- **Description** — optional, free text for context.
- **Files** — optional (Supabase Storage). Decided 2026-09-15:
  - Up to 50 MB per file.
  - Allowed: PDF; images (PNG, JPG, WebP, GIF, HEIC/HEIF); text (TXT,
    Markdown, CSV, JSON); Word, Excel, PowerPoint (DOCX, XLSX, PPTX).
    Everything else is blocked (HTML, SVG, programs, scripts, archives).
  - Files are stored exactly as uploaded — no conversion.
  - Deleting a task or an attachment also deletes the stored file. For task
    deletes this happens after the 5-second undo window.
- **Due date** — optional, native date picker, optional time.
- **Time estimate** — optional, number + minutes/hours toggle, stored as minutes.
- **Agent: do this** — optional toggle. When on, the agent works on the task
  instead of scheduling it, and the estimate field is hidden.

No scheduled start/end on tasks. Agents put work directly on the user's
calendar through their own calendar connectors.

## Data model

### `lists`
`id, user_id, name, created_at` — a default list is created for each user; more can be added.

### `tasks`
`id, user_id, list_id, title, description, due_date, due_time, estimate_minutes, agent_task, status, completed_at, created_at, updated_at`

`agent_task` is "Agent: do this": the agent works on the task instead of
scheduling time for the user, so it has no estimate. Only the user can set it.

Due date and time are stored separately (`date` + optional `time`) so a date-only
task never shifts days across time zones.

### `user_settings`
`user_id, schedule_window_start, schedule_window_end, schedule_weekends, check_frequency_minutes, time_zone, onboarded_at, updated_at` —
one row per user, created at sign-up. The scheduling window (default 9am–9pm)
is asked during onboarding and limits when agents place tasks on the calendar.
Any window is allowed: end before start means overnight, start equal to end
means all day. `time_zone` (IANA name, e.g. `America/New_York`) is picked during
onboarding so Agito and Claude agree on times (decided 2026-09-15). It's a
**dropdown, not a text field**: options come from the browser's built-in list
(`Intl.supportedValuesOf("timeZone")`, no package), pre-selected to the
detected zone. The server action accepts any zone name the
runtime's `Intl` recognizes (browsers and Node name some zones differently,
e.g. `Asia/Kolkata` vs `Asia/Calcutta`) and saves the runtime's name; the
database trigger still rejects unknown names as a last line of defense.

### `task_attachments`
`id, task_id, user_id, storage_path, file_name, mime_type, size_bytes, created_at`

### `task_feed`
A timeline of written entries on a task, from the user or from agents.

| Column | Type | Details |
|---|---|---|
| `id` | uuid | |
| `task_id` | uuid → tasks | cascade delete |
| `user_id` | uuid → auth.users | RLS owner |
| `author_type` | `'user'` \| `'agent'` | |
| `author_name` | text | display name, e.g. "You", "Claude" |
| `oauth_client_id` | text, nullable | which connected app wrote it |
| `body` | text | plain text / markdown |
| `created_at` | timestamptz | |

Index on `(task_id, created_at)`.

Rules:
- Author is derived from the OAuth token on the server, never supplied by the agent.
- Agents can only add entries (no edit/delete). The user can delete any entry.
- The description is the user's; agents write to the feed instead.
- Written entries only — no automatic "status changed" events.
- No attachments on feed entries for now.

## MCP tools (phase 4)

Full list and the Claude setup prompt: [SETUP-PROMPT.md](SETUP-PROMPT.md).
Summary: read tools (`list_tasks`, `list_lists`, `get_preferences`, `get_task`,
`get_attachment`, `get_updates`), plus `ack_updates` and `add_feed_entry`.
Agents are feed-only for now — no tool creates or edits tasks.

Agents **cannot delete anything** — tasks, lists, attachments, files, or feed
entries — and **cannot edit tasks, mark them done, or reopen them**; they also
can't create or rename lists, upload files, or change settings (decided
2026-09-14). They can read everything, and write to the task feed. They
**can't create tasks** for now (decided 2026-09-15; maybe later). Only the user can mark a task "Agent: do this". There are no tools for the rest, and the database blocks it for OAuth
sessions. If an agent believes a task is done, it says so in the task feed;
only the user closes it. Later: a small indicator on tasks where an agent
thinks the work is done.

### Agent setup prompt (decided: build it, optimized for Claude first)

Users paste a setup prompt into Claude Cowork, which creates a
scheduled check-in (around the clock). Each run reads new or changed tasks,
writes to the task feed, and adds work to Google Calendar. Users can also ask
Claude about any task in a normal chat. No Agito notifications for now.
Draft prompt, user steps, and required tools: [SETUP-PROMPT.md](SETUP-PROMPT.md).

Tasks marked "Agent: do this" are worked on by the agent (with whatever the
user allows in Cowork) instead of scheduled. Regular tasks are estimated and
placed in the next free slot inside the user's scheduling window, skipping
weekends if the user chose that during onboarding. Onboarding also asks how
often Claude should check in: every 15 or 30 minutes (advanced), every hour
(default), every 2 hours, or every 4 hours.

## Audience

Built for other people to use, not just the owner. Users never touch
Supabase: they sign up in Agito and connect Claude from Agito's own setup page.

Auth: OAuth via Supabase Auth so the app can be added as a custom connector in
claude.ai and the Claude phone app. Details, requirements, and open questions:
[OAUTH-MCP.md](OAUTH-MCP.md).

## Phases

1. Next.js project, Supabase schema + RLS, login — *done; migration applied
   and magic-link sign-in tested against the real database (2026-09-14)*
2. Lists and tasks: create, view, edit, complete, delete — *done; all tested
   against the real database (2026-09-14), including undo on complete and
   delete, and the "Agent: do this" constraint*
3. File attachments on tasks — *code written 2026-09-15; migration
   `20260915134248_phase3_attachments.sql` applied and verified;
   **browser testing still pending** (see "Pending testing" below)*
4. Task feed, MCP server with OAuth, deploy to own VM, connect in claude.ai —
   *onboarding screen (`/onboarding`) code written 2026-09-15, not tested*
5. Polish: completion animation, keyboard shortcuts, sound

## Pending testing

Paused 2026-09-15 (needs the user signed in; Claude doesn't sign in to accounts).
Don't mark phase 3 done until every item passes.

**Phase 3 — file attachments (browser, signed in)**
- [ ] Quick add: add files in Details, save; row shows "Uploading…", then a
      paperclip with the file count
- [ ] Edit sheet: upload files; they appear in the list with name and size
- [ ] Open a PDF or image (opens in a new tab) and a DOCX/XLSX (downloads)
- [ ] Remove a file (Remove / Keep confirmation); the stored file is deleted
- [ ] Delete a task that has files; Undo within 5 seconds restores it with its
      files; after the undo window the task and its stored files are gone
- [ ] A blocked type (e.g. `.html`, `.svg`, `.zip`) is refused with a message
- [ ] A file over 50 MB is refused with a message
- [ ] Watch the dev server log for errors throughout

**Database update `20260915173612_no_agent_tasks_and_time_zone.sql`**
- [ ] A normal signed-in user can still create, edit, complete, and delete tasks
- [ ] An invalid time zone is rejected (check when onboarding exists)

**Onboarding (`/onboarding`, written 2026-09-15)**
- [ ] A user whose `user_settings.onboarded_at` is empty is sent to
      `/onboarding` from the home page
- [ ] The time zone dropdown lists real zones with offsets and pre-selects the
      browser's zone
- [ ] Overnight (end before start) and all-day (equal) windows show their hint
- [ ] Picking 15 or 30 minutes shows the advanced warning
- [ ] "Save and continue" saves all fields plus `onboarded_at`, then opens the
      task list; the home page no longer redirects
- [ ] Revisiting `/onboarding` shows the saved values

**Done without signing in (2026-09-15):** rolled-back database security tests
impersonating two users, an agent, and anon — 136 checks passed, nothing
persisted. Automated logic tests: `npm test` (dates, validation, file rules,
settings).

## Follow-ups from review and security tests (2026-09-15)

Not yet fixed; pick before other users join.

Database hardening — **applied 2026-09-15** as
`20260915183858_security_hardening.sql`; re-tested with rolled-back database
tests (111 checks passed, nothing persisted):
- [x] `TRUNCATE` revoked from `anon`/`authenticated` on public tables.
- [x] `.` and `..` segments rejected in `task_attachments.storage_path`.
- [x] INSERT limited to the columns the app sends (tasks, lists, attachments).
- [x] UPDATE revoked on `task_feed` and `task_attachments`.
- [x] Time zones must exist in `pg_timezone_names` (`EST5EDT` is listed there,
      so it's still accepted; it's a real tz database name).
- Accepted, can't fix: `storage.objects` still allows `TRUNCATE` for
  `anon`/`authenticated` — Supabase's storage role owns those grants.
- [ ] Optional: revoke table-level INSERT on `user_settings` (RLS already
      blocks it; no insert policy).
- [ ] Check where `public.rls_auto_enable()` came from (not in our
      migrations; callable by anon/authenticated per the advisors) and revoke
      EXECUTE if it isn't needed.

App — code written 2026-09-15 (type-check, lint, tests, build pass; needs
browser testing):
- [x] Edits, sheet uploads, and deletes queue behind task creation in
      `task-board.tsx`.
- [x] Pending deletes commit when the tab is hidden or closed (the undo window
      ends when you leave the tab).
- [x] Toasts stack (up to 3), so a new message doesn't remove an Undo.
- [x] Signed file links refresh every 8 minutes while the sheet is open.
- [x] Task delete cleanup pages through `storage.list`.
- [x] HSTS header in production; `NEXT_PUBLIC_SITE_URL` required in production.
- [ ] Decide whether "today" uses the browser zone or the saved time zone.
- [ ] Undo after a delete restores the task's files as of the delete (files
      uploaded during the undo window show after reload).

## Later

- Attachments on feed entries
- Multiple users / sharing
- Mobile app (Expo)
- Finance tracking
