# Compact Handoff (murder_mystery)

## Current State
- Latest commit pushed to `main`: `8fde505` ("Add case drawer tools and Watson advisor").
- Case Drawer/Skills UI implemented in `public/` with toggle, drawer, stacked skill cards, timeline/relationships/evidence/contradictions widgets.
- Watson now appears under Characters as an "Advisor" card; clicking it switches chat to Watson.
- Watson chat calls `/api/watson` (LLM-backed) instead of local stub.
- `skills.md` contains the PRD (ASCII-normalized).

## User Intent (Watson)
- Watson should be a freestyle chat character.
- Tone: helpful, patient, joyful/giddy/goofy.
- Must not know the solution or reveal hidden truth.
- Should recommend drawer tools as needed and keep context.
- If user rejects an idea, Watson should acknowledge and not repeat it.
- Behavior should honor drawer settings (frequency, quality: chaotic -> sharp, style: questions vs hypothesis).

## Key Implementation
- **Client** (`public/app.js`):
  - Chat mode "watson" sends to `/api/watson`.
  - Watson logs stored in localStorage (`watsonLog`).
  - Drawer board state + tool list sent in request.
  - Skills UI: stacked cards + expand on click + "See all skills".
- **Server**:
  - `/api/watson` added in `server/index.js`.
  - Watson prompt + response logic in `server/llm.js` (`generateWatsonResponse`).

## Known Issue
- User reports: "Watson still does not work."
  - Likely `/api/watson` request failing or OpenAI env missing.
  - Debug: check DevTools Network for `/api/watson` status/response.
  - Ensure `OPENAI_API_KEY` set in Vercel env and redeploy after push.

## Files Touched (recent)
- `public/index.html` (advisor card + chat tabs + drawer)
- `public/styles.css` (drawer/skills/chat styles + Watson card)
- `public/app.js` (skills logic, Watson chat, /api/watson calls)
- `public/i18n.js` (new strings for skills + Watson)
- `server/index.js` (add /api/watson)
- `server/llm.js` (Watson prompt + response)
- `skills.md` (PRD)

## Suggested Next Steps
1. Verify `/api/watson` in prod:
   - If 404: Vercel not deployed updated server.
   - If 500: OpenAI API key missing or runtime error.
2. If API key present, add small server logging to confirm requests hit.
3. If desired, add client-side fallback to show a local response when `/api/watson` fails.
