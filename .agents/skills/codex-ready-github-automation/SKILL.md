---
name: codex-ready-github-automation
description: Use when a user wants Codex to create, update, or inspect a GitHub-driven automation that picks up one `codex-ready` issue or pull request at a time.
---

# Codex-ready GitHub automation

Use this skill when the user wants a Codex automation whose source of truth is GitHub, with Repomux treated only as optional operator UI.
This skill is checkout-local convenience, not a requirement for the automation to exist.

## Default approach

1. Read `codex/repomux-automation.template.md`.
2. Replace the template placeholders with the current checkout values:
    - `{{AUTOMATION_WORKSPACE_ROOT}}`: the absolute path of the current workspace that should host the automation run
    - `{{WORKTREE_ROOT}}`: only fill this when the user has confirmed where target repositories should be cloned or reused locally
    - `{{GITHUB_SCOPE_HINT}}`: a short scope hint such as `repo:owner/name`, `org:my-org`, or `user:my-user`
3. Use `codex_app.automation_update` to create or update a cron automation.
4. Prefer `mode=suggested_create` or `mode=suggested_update` so the user can review the automation in the app before saving it.
5. If the local repository root or GitHub search scope is not obvious, stop and ask instead of guessing.
6. Make the GitHub prerequisites explicit in the automation prompt:
    - Codex-side GitHub access must already be connected and approved for the needed repositories
    - local git credentials and `gh` authentication may also be required for clone, push, PR, and comment operations

## Automation defaults

- `kind`: `cron`
- `executionEnvironment`: `local`
- `cwds`: the current workspace root that should host the automation
- `reasoningEffort`: `medium`
- `model`: omit unless the user explicitly asks for one
- `status`: `ACTIVE` unless the user asks to start paused
- `name`: `Codex Ready Queue`

## Prompt requirements

- Keep the automation prompt self-sufficient.
- Do not include schedule details in the prompt text.
- Tell the automation to process at most one item per run.
- Make GitHub the queue source of truth using `codex-ready` label search.
- Treat Repomux as optional; only mention it as operator-facing UI that may have created the prompt comment.
- Include exact blocker text for missing GitHub setup so the user knows what action to take next.

## Fallback

If the user explicitly wants a manual prompt file instead of native automation creation, run:

`bun scripts/setup-repomux-codex-automation.mjs`

That fallback should not be the default recommendation.
