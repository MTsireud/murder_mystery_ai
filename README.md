# Interrogation Sim MVP

Local MVP for a shared-world, multi-character interrogation sim.

## Run
1. Install dependencies:
   - `npm install`
2. Create a local `.env` (copy from `.env.example`) and set `OPENAI_API_KEY`.
3. Start the server:
   - `npm run dev`
3. Open `http://localhost:3000`.

## Notes
- State is stored in-memory per session.
- Character responses use the OpenAI API when `OPENAI_API_KEY` is set.
- Agent prompt templates live in `agents/`.
- Language toggle (English/Greek) is available in the UI.
- Model mode toggle (auto/routine/critical) is available in the UI.

## Story Logic Judge + Feedback Loop
- LLM judge endpoint: `POST /api/story-judge`
  - Accepts `novel` (or `story_text`) plus optional `cast_list`, `timeline_notes`, `clue_list`, `solution_reveal`.
  - Returns structured scores + a full markdown critique report.
- Feedback loop endpoint: `POST /api/story-loop`
  - Runs judge -> pass/fail gate -> minimal patch -> re-judge (up to `max_rounds`).
  - Returns each round’s judge report, patch summary, and final verdict.
- Unified endpoint: `POST /api/storylab`
  - Same inputs as above.
  - Set `judge_only: true` for judge-only mode; default runs loop mode.

Quality gate (pass criteria):
- total score >= 80/100
- internal consistency >= 18/25
- means/opportunity/motive integrity >= 14/20
- clue fairness >= 14/20
- critical contradictions <= 0
- major contradictions <= 2

CLI:
- Judge only (text report): `npm run story:judge -- <caseId> --file <story.txt>`
- Judge only (JSON): `npm run story:judge -- <caseId> --file <story.txt> --json`
- Feedback loop JSON: `npm run story:loop -- <caseId> --file <story.txt>`
- Batch judge+fix all library stories: `npm run story:all -- --max-rounds 3 --write-casepacks`
- Legacy storylab review: `npm run storylab:review -- <caseId> <novel-file-path>`

## Vercel (serverless)
- API routes are in `api/` and are compatible with Vercel Serverless Functions.
- Deploy the repo and set environment variables in Vercel:
  - `OPENAI_API_KEY`
  - Optional: `OPENAI_MODEL_ROUTINE`, `OPENAI_MODEL_CRITICAL`, `OPENAI_MODEL_NARRATOR`, `OPENAI_MODEL_CHECKER`, `OPENAI_MODEL_STORY_JUDGE`, `OPENAI_MODEL_STORY_FIXER`, `OPENAI_MODEL_STORYLAB`, `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TEMPERATURE`
- Note: in-memory sessions are ephemeral on serverless; persistence needs a DB/KV for production.
