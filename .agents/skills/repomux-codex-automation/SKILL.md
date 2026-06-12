---
name: repomux-codex-automation
description: Use when a user wants Codex to create, update, or inspect a Repomux automation in the Codex app for the current checkout.
---

# Repomux Codex automation

Use this skill when the user wants the native Codex automation flow for Repomux instead of a manual copy-paste setup.

## Default approach

1. Read `codex/repomux-automation.template.md`.
2. Replace the template placeholders with the current checkout values:
    - `__REPOMUX_APP_URL__`: default `http://localhost:5173` unless the user provides another URL
    - `__REPOMUX_REPO_ROOT__`: the absolute path of the current Repomux checkout
    - `__WORKTREE_ROOT__`: default to the parent directory of the Repomux checkout unless the user provides another path
3. Use `codex_app.automation_update` to create or update a cron automation.
4. Prefer `mode=suggested_create` or `mode=suggested_update` so the user can review the automation in the app before saving it.

## Automation defaults

- `kind`: `cron`
- `executionEnvironment`: `local`
- `cwds`: the current Repomux checkout
- `reasoningEffort`: `medium`
- `model`: omit unless the user explicitly asks for one
- `status`: `ACTIVE` unless the user asks to start paused
- `name`: `Repomux Queue`

## Prompt requirements

- Keep the automation prompt self-sufficient.
- Do not include schedule details in the prompt text.
- Tell the automation to process at most one item per run.
- Keep the GitHub comment and validation reporting requirements from the template.

## Fallback

If the user explicitly wants a manual prompt file instead of native automation creation, run:

`bun scripts/setup-repomux-codex-automation.mjs`

That fallback should not be the default recommendation.
