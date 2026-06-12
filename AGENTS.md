# Repomux Agent Notes

## Working Rules

- Always commit changes in atomic conventional-commit chunks.
- Prefer patch staging to avoid unrelated edits.
- Use `style` only for formatting-only changes.
- Use `bun` when applicable and `bunx` for tools missing locally.
- When changing CSS, use tokens instead of hardcoded values, keep sizes and spacing in multiples of 4, and check whether the rule is overridden or overrides anything unintended.

## Product Context

repomux is a central workspace for managing software work across multiple repositories.

It connects to GitHub, surfaces relevant issues and pull requests, helps users add the intent Codex needs, and queues the work for async execution. When Codex returns with a pull request, users can review it, add follow-up direction, and send it back for another pass, just like iterating in Codex, but without staying in the loop the whole time.

Core flow:

```text
Repositories -> Work queue -> Prompt -> Assign to Codex -> Review PR -> Iterate or merge
```

Positioning:

repomux helps maintainers stop context-switching across repositories and turn scattered work into reviewable, repeatable async execution.
