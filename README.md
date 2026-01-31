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

## Vercel (serverless)
- API routes are in `api/` and are compatible with Vercel Serverless Functions.
- Deploy the repo and set environment variables in Vercel:
  - `OPENAI_API_KEY`
  - Optional: `OPENAI_MODEL_ROUTINE`, `OPENAI_MODEL_CRITICAL`, `OPENAI_MODEL_NARRATOR`, `OPENAI_MODEL_CHECKER`, `OPENAI_MAX_OUTPUT_TOKENS`, `OPENAI_TEMPERATURE`
- Note: in-memory sessions are ephemeral on serverless; persistence needs a DB/KV for production.
