# Agito — OAuth and MCP (phase 4 research)

Researched 2026-09-14 from public docs. Recheck before building — several
pieces are in beta or mid-rollout. Scope and phases: [PLAN.md](PLAN.md).

## How it fits together

1. The user adds `https://<agito-domain>/api/mcp` as a custom connector in claude.ai.
2. Claude fetches `/.well-known/oauth-protected-resource`, which points to
   Supabase Auth as the authorization server.
3. Claude sends the user to Supabase, which redirects to Agito's consent page
   (`/oauth/consent`). The user signs in if needed and approves.
4. Claude receives a Supabase access token (a normal Supabase JWT with a
   `client_id` claim) and calls `/api/mcp` with it.
5. The MCP server verifies the token and queries Supabase **as the user**, so
   Row Level Security applies to everything agents do.

## Key facts

**Supabase OAuth 2.1 Server**
- Public beta, free on all plans during beta. Enabled in Dashboard →
  Authentication → OAuth Server.
- PKCE required; refresh tokens supported; access tokens last 1 hour.
- Dynamic Client Registration is an opt-in toggle (off by default).
- The app must host the consent page. It calls
  `supabase.auth.oauth.getAuthorizationDetails`, then `approveAuthorization`
  or `denyAuthorization`.
- Requires asymmetric JWT signing keys for local token verification.
- Issuer: `https://<ref>.supabase.co/auth/v1`.
- Only `openid`, `email`, `profile`, `phone` scopes — no custom scopes, so
  permissions live in RLS.
- `aud` is always `authenticated`; the `resource` parameter is reportedly
  ignored. **The MCP server must require a non-null `client_id` and check
  `iss`**, or it would accept normal browser session tokens.

**Claude custom connectors**
- Available on Free (limited to one custom connector), Pro, Max, Team, Enterprise.
- Added on web/desktop; once connected, works in the mobile app.
- Transport: Streamable HTTP.
- Callback URL: `https://claude.ai/api/mcp/auth_callback`.
- Supports DCR or a pre-registered client ID ("Use your own OAuth client").
- The `resource` in protected resource metadata must exactly match the URL
  entered; OAuth endpoints must respond within 10 seconds.

**MCP spec**
- Current revision 2026-07-28 (stateless). Claude's support is "rolling out".
- Server must serve Protected Resource Metadata (RFC 9728) and return 401 with
  `WWW-Authenticate` for missing/invalid tokens. Never pass tokens to other services.

## Planned implementation

| Piece | Location |
|---|---|
| Consent page | `src/app/oauth/consent/page.tsx` |
| Protected resource metadata | `src/app/.well-known/oauth-protected-resource/[[...path]]/route.ts` |
| MCP endpoint | `src/app/api/mcp/route.ts` |

- Library: Vercel's open-source `mcp-handler` (with `withMcpAuth`) on top of
  the official MCP SDK. If Claude can't connect with the 2026-07-28 version,
  try `mcp-handler` 1.x.
- Token check: `supabase.auth.getClaims(token)`, then require expected `iss`,
  non-null `client_id` (optionally an allowlist), not expired.
- Per-request Supabase client created with the user's token; never the service
  role key.
- `proxy.ts`: exclude `/api/mcp` and `/.well-known/*` from the login redirect;
  `/oauth/consent` must send signed-out users to login and back without losing
  `authorization_id`.
- Agents can't delete anything: every delete policy (tasks, lists,
  attachments, storage files, feed) requires a session without a
  `client_id` claim.
- Agents can't edit, close, or reopen tasks: a trigger rejects any task
  update from sessions with a `client_id` claim. Agents also can't create or
  rename lists, upload files, or change `user_settings` (RLS policies).
- **Registration (decided 2026-09-14): Claude registers itself** via Dynamic
  Client Registration, so users only paste Agito's MCP URL into Claude — no
  Supabase access or manual IDs. The consent page refuses any client whose
  redirect URI isn't Claude's (`https://claude.ai/api/mcp/auth_callback`);
  other callbacks (e.g. Claude Code's localhost) can be allowlisted later.
- Task feed authorship is set by a database trigger from the token's
  `client_id` (see the migration), so agents can't impersonate the user.

## Setup steps (user, in Supabase)

1. Switch to asymmetric JWT signing keys.
2. Enable OAuth Server with authorization path `/oauth/consent`.
3. Turn on Dynamic Client Registration (Claude registers itself; the consent
   page limits which clients can actually get access).

## Unverified — test early

- Whether claude.ai and mobile support MCP 2026-07-28 yet.
- Whether the access token's `client_id` claim matches `auth.oauth_clients.id`.
  The columns are confirmed (checked 2026-09-14): the table has `id` and
  `client_name`, which the feed trigger now reads; it still falls back to
  "Agent" if the lookup finds nothing.
- Whether consent is shown again on later authorizations.
- Pricing after the Supabase beta ends.
