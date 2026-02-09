# Project Agent Notes

This repo uses lightweight prompt files under `agents/` for the character, reducer, and seed generators.

- Keep prompts concise and state-driven.
- Never allow prompts to change the fixed `truth` values.
- Prefer structured outputs so the reducer can enforce rules.

## Execution Workflow Rules

- PRD-first execution: before implementing any feature/action, plan it in `/Users/markostsirekas/codex/murder_mystery/interactive_prd.md`.
- PRD tracking: after completing work, mark the corresponding PRD checklist item(s) as done.
- Local verification: always run smoke tests and restart the local app/server before handing off for testing.
- Production safety: do not commit or push directly to production branches/environments.
