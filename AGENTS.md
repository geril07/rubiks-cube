## Coding practices

- DRY: extract shared logic rather than copying. Prefer a single source of truth, and prefer colocation over premature abstraction — only extract when the duplication is proven, not the first time it appears.
- Low coupling, high cohesion: keep each unit focused on one concern, and reach across concerns through narrow public interfaces. Prefer colocation — put related code together so cohesion is visible and coupling stays local.
- Single responsibility: each module, function, and component has one clear job. If you cannot name it in one phrase, split it.
- Fail loud: surface invalid state and contradiction explicitly rather than silently papering over it. Prefer pure functions and narrow side effects: isolate IO (db, storage, network, timers) at the edges; keep domain logic pure and testable.

## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature-slug>/` (local-markdown tracker; no PR triage surface). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles with default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
