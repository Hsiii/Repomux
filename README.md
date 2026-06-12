<div align="center">
  <img src="public/repomux-logo.svg" alt="Repomux logo" width="160" />

<h1>Repomux</h1>

Assign GitHub work to coding agents without babysitting the queue.

<img src="repomux-implementation.png" alt="Repomux app interface" height="720" />
</div>

## Why Repomux

- **One queue, less context switching:** Track repositories, prompts, and assignment state from one workspace instead of bouncing between tabs.
- **GitHub-native handoff:** Repomux uses your GitHub identity to queue work, post prompt comments, and apply the `codex-ready` label where your agents expect it.
- **Personal by default:** Repository records are scoped to the signed-in Supabase user with row-level security, so each operator only sees and edits their own queue.
- **Built for overnight runs:** The login wall, repository list, and work panel are optimized for quick triage when you want to assign work and step away.

## Install

```bash
bun install
```

## Development

Start the app:

```bash
bun run dev
```

Run the full local check:

```bash
bun run check
```

Install the reusable Codex automation files for this checkout:

```bash
bun run setup:codex
```

## Configure

Create `.env.local` or `.env` with:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_GITHUB_OAUTH_SCOPE=repo
VITE_GITHUB_OAUTH_REDIRECT_URL=http://localhost:5173/
```

Apply the checked-in migration `supabase/migrations/20260612010200_scope_repositories_to_github_users.sql`.

Enable GitHub as a Supabase Auth provider and allow your app URL, such as `http://localhost:5173/`, as a redirect target in Supabase.

If you use hosted Supabase, register the Supabase callback URL on the GitHub OAuth App:

```text
https://tfcypevhielaycatojoo.supabase.co/auth/v1/callback
```

Repomux signs in through Supabase GitHub OAuth, stores the GitHub provider token in browser session storage, then uses that token to read the queue, post the prompt comment, and add the `codex-ready` label.

If you only need public repositories, set `VITE_GITHUB_OAUTH_SCOPE=public_repo`. Use `repo` when private repository access is required.

## Codex Automation

Repomux now ships a reusable automation template instead of a single-user prompt.

Run `bun run setup:codex` from your Repomux checkout to:

- install the `repomux-codex-automation` skill into `CODEX_HOME` or `~/.codex`
- generate a local prompt file at `~/.codex/repomux/repomux-automation.prompt.md`

By default the generated prompt assumes:

- Repomux runs at `http://localhost:5173`
- target repositories can be checked out under the parent directory of your Repomux checkout

Override those defaults when needed:

```bash
bun run setup:codex -- --app-url https://repomux.example.com --worktree-root /absolute/path/for/repos
```

Then paste the generated prompt into a Codex automation in the app UI. The prompt is written with local paths for the current machine, but the checked-in template stays generic for every Repomux user.

## Local Supabase Auth

Use local Supabase when you want isolated auth configuration for development.

1. Create a GitHub OAuth App for local development.
2. Set its callback URL to `http://127.0.0.1:54321/auth/v1/callback`.
3. Create `.env.local` from `.env.local.supabase.example`.
4. Fill in `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET`.
5. Start Supabase with `bunx supabase start`.
6. Copy the local anon key from `bunx supabase status` into `VITE_SUPABASE_PUBLISHABLE_KEY`.
7. Start the app with `bun run dev -- --host 127.0.0.1 --port 5173`.

The checked-in `supabase/config.toml` already enables GitHub Auth locally and returns the browser to `http://localhost:5173/`.

## Smoke Test

Run the authenticated repository smoke test with a real Supabase user JWT:

```bash
REPO_MUX_SMOKE_ACCESS_TOKEN=... bun run smoke
```

It verifies that the user can insert, read, and archive a repository row through the live RLS rules.
