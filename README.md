# Repomux

Created from the Vite frontend template.

## Install

```bash
bun install
```

## Develop

```bash
bun run dev
```

## Configure

Create `.env` from `.env.example` and set:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_GITHUB_OAUTH_SCOPE=repo
VITE_GITHUB_OAUTH_REDIRECT_URL=http://localhost:5173/
```

Apply the checked-in migration at
`supabase/migrations/20260612010200_scope_repositories_to_github_users.sql`
to create/update the `repositories` table. `supabase/schema.sql` reflects
the expected end state. The table is user-scoped: every row belongs to
the authenticated Supabase user, and row-level security only allows each
user to read and modify their own repositories.

Enable GitHub as a Supabase Auth provider in the Supabase dashboard and
set the app URL, for example `http://localhost:5173/` during local
development, in the provider's redirect allow list.

For hosted Supabase, GitHub does not need to trust your localhost app URL.
GitHub only needs the Supabase callback URL registered on the GitHub OAuth
App:

```text
https://tfcypevhielaycatojoo.supabase.co/auth/v1/callback
```

Supabase then validates `VITE_GITHUB_OAUTH_REDIRECT_URL` and redirects back
to the local app after GitHub completes. If GitHub shows a 404 on
`/login/oauth/authorize`, the Supabase provider is usually using the GitHub
app name instead of the OAuth client ID.

Do not add a GitHub client secret to frontend env. The secret belongs in
the Supabase GitHub Auth provider configuration. If local dev needs a
different callback than `location.origin + location.pathname`, set
`VITE_GITHUB_OAUTH_REDIRECT_URL` to the exact allowed redirect URL.

The browser signs in through Supabase GitHub OAuth, stores the GitHub
provider token in browser session storage, and uses that token to read
the GitHub queue, post the prompt comment, and add the `codex-ready`
label.

`VITE_GITHUB_OAUTH_SCOPE` defaults to `repo`, which is still required if
you need private repository issue/PR access through a GitHub OAuth app.
If your deployment only needs public repositories, set it to
`public_repo` to reduce token scope.

## Local Supabase Auth

Use this when you want an isolated test environment that does not depend on
the hosted Supabase project's GitHub provider settings.

1. Create a GitHub OAuth App for local development.
2. Set its Authorization callback URL to:

```text
http://127.0.0.1:54321/auth/v1/callback
```

3. Create `.env.local` from `.env.local.supabase.example`.
4. Fill in `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` and
   `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`.
5. Start local Supabase:

```bash
bunx supabase start
```

6. Copy the local anon key from `bunx supabase status` into
   `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
7. Start the app:

```bash
bun run dev -- --host 127.0.0.1 --port 5173
```

The checked-in `supabase/config.toml` enables GitHub Auth locally and uses
the dedicated local callback above, while the browser still returns to
`http://localhost:5173/`.

## Check

```bash
bun run check
```

## Smoke

Run the authenticated repository smoke test with a real Supabase user JWT:

```bash
REPO_MUX_SMOKE_ACCESS_TOKEN=... bun run smoke
```

It uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your
environment, verifies the token resolves to a real user, inserts a
repository row for that user, reads it back through RLS, then archives it
with an update.

This project includes `bunfig.toml` with `minimumReleaseAge = 604800`.
