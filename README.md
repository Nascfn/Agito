# Agito

**A task tracker built for you and your AI agents.**

Agito makes it fast to write tasks down and gives them enough context (notes,
files, deadlines) that an AI agent like Claude can understand them. Connect
Claude, and it checks in on your tasks on a schedule: it prepares you for what's
coming, books time on your calendar, and works on the tasks you hand off to it.
You stay in control. Agents can read your tasks and write to a task's feed, but
only you create, edit, close, or delete tasks.

> **Status: early development.** Task tracking and file attachments are built;
> the Claude connection is designed but not built yet. Finance tracking is
> planned for later.

## What it does

### For you
- **Quick add:** type a title and press Enter. Everything else is optional.
- **Context for every task:** a description, due date and time, a time
  estimate, and file attachments (PDFs, images, text, Word, Excel, PowerPoint).
- **Satisfying to finish:** tap the circle to complete a task, with a short
  animation and a 5-second undo.
- **Lists** to group tasks.
- **"Agent: do this":** mark a task for your agent to work on instead of
  scheduling time for you to do it.
- **Onboarding:** pick your time zone, the hours your agent may schedule work,
  whether weekends are allowed, and how often Claude checks in.

### For your agent (in progress)
Agito exposes an [MCP](https://modelcontextprotocol.io) server that Claude
connects to as a custom connector, with OAuth sign-in. Once connected:
- **Ask about any task** in a normal Claude chat.
- **Scheduled check-ins** (Claude Cowork): Claude reviews new and changed
  tasks, writes plans, questions, and progress to each task's **task feed**,
  and puts regular tasks in the next free slot on your Google Calendar through
  Claude's own calendar connector.
- **"Agent: do this" tasks** are worked on by Claude with the tools you allow
  in Cowork, and it reports back in the task feed.

### Guardrails
Enforced in the database, not just the app:
- Row Level Security on every table — users only ever see their own data.
- Agents can read tasks and add task feed entries. They can't create, edit,
  complete, or delete tasks, lists, files, or settings, and can't mark tasks
  "Agent: do this".
- Task feed authorship comes from the login token, so an agent can't post as
  you.
- File uploads are limited by type and size and can only go into your own
  tasks' folders.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com) 4
- [Supabase](https://supabase.com): Postgres, Auth (magic link, OAuth server
  for agents), Storage
- Deliberately few dependencies: no UI kit, animation, or data-fetching
  libraries

## Project structure

```
src/app/            Pages, server actions, auth routes, onboarding
src/components/     Task board, quick add, edit sheet, file drop, etc.
src/lib/            Supabase clients, validation, formatting, types
src/proxy.ts        Session refresh and sign-in redirects
supabase/migrations Database schema, RLS policies, storage rules
docs/               Plan, design system, OAuth/MCP research, Claude setup prompt
```

## Running it locally

**Requirements:** Node.js 20+, a Supabase project.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL
   and publishable key. Never commit `.env.local`, and never use the service
   role key in this app.
3. Apply the migrations in `supabase/migrations/` to your Supabase project, in
   order.
4. In Supabase → Authentication → URL Configuration, set the Site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/confirm` as a
   redirect URL.
5. Optional, recommended: with custom SMTP configured, change the Magic Link
   email template's link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` so a
   link requested on one device works on another.
6. Start the dev server and sign in with a magic link:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Roadmap

1. ✅ Sign-in, database, and security rules
2. ✅ Tasks and lists
3. 🟡 File attachments (built, testing in progress)
4. 🔨 Agents: onboarding (built), task feed, MCP server with OAuth, Claude setup
5. Polish: keyboard shortcuts, sound, mobile refinements
6. Later: mobile app, finance tracking

See [docs/PLAN.md](docs/PLAN.md) for details.
