---
name: repomux-codex-automation
description: Use when a user wants to install, refresh, inspect, or customize the reusable Codex automation prompt for Repomux in their own Codex setup.
---

# Repomux Codex automation

Use this skill when the user wants a local Codex automation that can pick up Repomux work without hardcoded personal paths or one-off prompt text.

## Workflow

1. Locate a Repomux checkout.
   The checkout must contain `scripts/setup-repomux-codex-automation.mjs`.
2. Run the installer from that checkout:
   `bun scripts/setup-repomux-codex-automation.mjs`
3. Only add flags when needed:
    - `--app-url <url>` when Repomux is not running at `http://localhost:5173`
    - `--worktree-root <absolute-path>` when target repositories should live somewhere other than the parent of the Repomux checkout
    - `--codex-home <absolute-path>` when `CODEX_HOME` or `~/.codex` should not be used
    - `--repo-root <absolute-path>` when the installer is launched outside the Repomux checkout
4. Tell the user where the generated prompt file and installed skill were written.
5. Tell the user to paste the generated prompt into a Codex automation.

## Customization

- The reusable prompt template lives at `codex/repomux-automation.template.md` in the Repomux checkout.
- Re-run the installer after editing the template so the generated prompt stays in sync.
- If the user wants different queue-selection rules, change the template instead of editing a single user's local prompt by hand.
