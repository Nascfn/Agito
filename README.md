# Agito

A task tracker built for you and your AI agents. Add tasks fast, give them
context (descriptions and files), and let agents like Claude read them, add to
the task feed, and help you get them done. Finance tracking comes later.

- Plan and data model: [docs/PLAN.md](docs/PLAN.md)
- Design and terminology: [docs/DESIGN.md](docs/DESIGN.md)

## Stack

Next.js, TypeScript, Tailwind CSS, Supabase (database, auth, storage).

## Getting started

1. Copy `.env.example` to `.env.local` and fill in your Supabase URL and
   publishable key. Never commit `.env.local`.
2. Apply the database migration in `supabase/migrations/`.
3. In Supabase → Authentication → URL Configuration, set the Site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/confirm` as a
   redirect URL.
4. In Supabase → Authentication → Emails → Magic Link, change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` so a
   link requested on one device (e.g. your computer) also works when opened on
   another (e.g. your phone's email app). Editing email templates requires
   custom SMTP. Without it the default template still signs you in, but only
   in the browser that requested the link.
5. After creating your own account, turn off "Allow new users to sign up" in
   Supabase → Authentication → Sign In / Providers while Agito is single-user.
6. Run the app:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with a magic link.
