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

The browser signs in through Supabase GitHub OAuth, stores the GitHub
provider token in browser session storage, and uses that token to read
the GitHub queue, post the prompt comment, and add the `codex-ready`
label.

`VITE_GITHUB_OAUTH_SCOPE` defaults to `repo`, which is still required if
you need private repository issue/PR access through a GitHub OAuth app.
If your deployment only needs public repositories, set it to
`public_repo` to reduce token scope.

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
