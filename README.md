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
VITE_GITHUB_OAUTH_CLIENT_ID=
```

Run `supabase/schema.sql` in Supabase to create the `repositories`
table. Create a GitHub OAuth App whose callback URL matches the app URL,
for example `http://localhost:5173/` during local development, and set
the OAuth app client ID in `VITE_GITHUB_OAUTH_CLIENT_ID`.

Deploy `supabase/functions/github-oauth-token` and set these Supabase
Edge Function secrets:

```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

The browser redirects through GitHub OAuth, exchanges the returned code
through the Edge Function, stores the returned user token in browser session
storage, and uses that token to post the prompt comment and add the
`codex-ready` label.

## Check

```bash
bun run check
```

This project includes `bunfig.toml` with `minimumReleaseAge = 604800`.
