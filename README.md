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
```

Run `supabase/schema.sql` in Supabase to create the `repositories`
table. The table is user-scoped: every row belongs to the authenticated
Supabase user, and row-level security only allows each user to read and
modify their own repositories.

Enable GitHub as a Supabase Auth provider in the Supabase dashboard and
set the app URL, for example `http://localhost:5173/` during local
development, in the provider's redirect allow list.

The browser signs in through Supabase GitHub OAuth, stores the GitHub
provider token in browser session storage, and uses that token to read
the GitHub queue, post the prompt comment, and add the `codex-ready`
label.

## Check

```bash
bun run check
```

This project includes `bunfig.toml` with `minimumReleaseAge = 604800`.
