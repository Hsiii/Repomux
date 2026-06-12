---
name: repomux-codex-automation
description: Use when a user wants Codex to create, update, or inspect a Repomux automation in the Codex app for the current checkout.
---

# Repomux Codex automation

Use this skill when the user wants the native Codex automation flow for Repomux instead of a manual copy-paste setup.

## Default approach

1. Read `codex/repomux-automation.template.md`.
2. Replace the template placeholders with the current checkout values:
    - `{{REPOMUX_APP_URL}}`: default `https://repomux.hsichen.dev` unless the user explicitly wants a local deployment
    - `{{AUTOMATION_WORKSPACE_ROOT}}`: the absolute path of the current workspace that should host the automation run
    - `{{WORKTREE_ROOT}}`: only fill this when the user has confirmed where target repositories should be cloned or reused locally
3. Use `codex_app.automation_update` to create or update a cron automation.
4. Prefer `mode=suggested_create` or `mode=suggested_update` so the user can review the automation in the app before saving it.
5. If the local repository root is not obvious from the current workspace, stop and ask instead of guessing.
6. Make the GitHub prerequisites explicit in the automation prompt:
    - Codex-side GitHub access must already be connected and approved for the needed repositories
    - local git credentials and `gh` authentication may also be required for clone, push, PR, and comment operations
7. If the user asks whether GitHub setup is required, answer yes for this workflow unless they are deliberately limiting the automation to local-only repository work with no GitHub operations.

## Automation defaults

- `kind`: `cron`
- `executionEnvironment`: `local`
- `cwds`: the current workspace root that should host the automation
- `reasoningEffort`: `medium`
- `model`: omit unless the user explicitly asks for one
- `status`: `ACTIVE` unless the user asks to start paused
- `name`: `Repomux Queue`

## Prompt requirements

- Keep the automation prompt self-sufficient.
- Do not include schedule details in the prompt text.
- Tell the automation to process at most one item per run.
- Keep the GitHub comment and validation reporting requirements from the template.
- Preserve the caveat that the automation requires an existing Repomux login session plus a usable local clone destination for target repositories.
- Include exact blocker text for missing GitHub setup so the user knows what action to take next.

## Fallback

If the user explicitly wants a manual prompt file instead of native automation creation, run:

`bun scripts/setup-repomux-codex-automation.mjs`

That fallback should not be the default recommendation.
