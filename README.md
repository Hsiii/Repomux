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

Render the fallback Codex automation prompt for this checkout:

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

Repomux now ships a reusable automation template and a repo-local skill for native Codex automation setup.

Preferred setup:

1. Open this Repomux checkout in Codex.
2. Ask Codex to set up the Repomux automation for you.
3. Codex should create a suggested in-app automation for review instead of asking you to copy a prompt by hand.

The repo-local skill at [.agents/skills/repomux-codex-automation/SKILL.md](.agents/skills/repomux-codex-automation/SKILL.md) tells Codex to use the native automation flow and prefill the current checkout path, worktree root, and Repomux URL.

Manual fallback:

- Run `bun run setup:codex` to render a prompt file at `.codex/repomux-automation.prompt.md` inside the checkout.
- Paste that rendered prompt into a Codex automation only if you do not want Codex to create the automation directly.

By default the generated prompt assumes:

- Repomux runs at `https://repomux.hsichen.dev`
- the automation workspace root is the current checkout
- the local repository root must be set explicitly before the automation is safe to save

Override those defaults when needed:

```bash
bun run setup:codex -- --app-url https://repomux.example.com --automation-workspace-root /absolute/path/to/workspace --worktree-root /absolute/path/for/repos --output /absolute/path/repomux-automation.prompt.md
```

The checked-in template stays generic for every Repomux user. Codex or the fallback renderer writes machine-specific paths only at setup time.

Important caveats for shared users:

- The hosted app URL is the default. `http://localhost:5173` only applies to local development.
- A Codex automation still runs on the user's local machine. It needs a real local directory where target repositories can be cloned or reused.
- This workflow also depends on GitHub being set up in two places:
    - Codex/ChatGPT must have GitHub connected and approved for the required repositories.
    - The local machine may also need working git credentials and `gh auth login` for clone, push, pull request, and comment flows.
- Do not assume another user's repository root matches your machine. Confirm it before creating or saving an automation.
- The automation depends on an existing Repomux browser session. If the hosted site requires login, MFA, or consent at runtime, the run should stop and report `manual sign-in required`.
- The repo-local skill only helps when Codex is opened on a Repomux checkout. Users who only know the hosted site and do not have this repo locally will need Codex to create the automation from explicit instructions instead of relying on the repo skill.
- If GitHub is missing or blocked, the automation should stop with either `GitHub connector setup required` or `local GitHub auth required` instead of continuing.

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
