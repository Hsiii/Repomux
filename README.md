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
table. The browser uses Supabase for the repo list and asks for a
GitHub token before you assign an issue or PR to Codex. That token is
stored in browser local storage and is used to post the prompt comment
and add the `codex-ready` label.

## Check

```bash
bun run check
```

This project includes `bunfig.toml` with `minimumReleaseAge = 604800`.
