# Project Agent Notes

This repo uses lightweight prompt files under `agents/` for the character, reducer, and seed generators.

- Keep prompts concise and state-driven.
- Never allow prompts to change the fixed `truth` values.
- Prefer structured outputs so the reducer can enforce rules.
