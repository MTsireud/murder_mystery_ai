# Shared-World Interrogation Sim - MVP PRD

## 1) Overview
Build a shared-world, multi-character interrogation sim where a fixed ground truth (killer/method/motive) drives the case, but each character's knowledge evolves based on what the detective says and what they personally witness. The detective interacts with one character at a time, and the system maintains a single canonical game state plus per-character knowledge slices.

This MVP targets a playable single-session experience in a single-page UI with a lightweight backend. Persistence is in-memory for now.

## 2) Goals
- Provide a playable interrogation loop with time pressure and evolving knowledge.
- Enforce a fixed, immutable case truth (killer/method/motive) in the canonical state.
- Maintain per-character knowledge slices that update based on visibility.
- Allow characters to lie or deflect while keeping world facts consistent.
- Keep token usage predictable via compact state snapshots and knowledge slices.

## 3) Non-Goals
- Full narrative branching or replayable campaigns.
- Real-time multi-user support or multiplayer sessions.
- Long-term persistence, accounts, or analytics.
- Complex world simulation (off-screen character actions beyond basic ticks).

## 4) User Experience
### Primary user flow
1. Player chooses a character from a list.
2. Player asks a question or makes a statement.
3. Character responds in dialogue.
4. Time advances; evidence and knowledge update.
5. Player switches to another character and repeats.

### UI
- Left: Character list with current status tags.
- Center: Chat log and dialogue.
- Right/Top: Time remaining, evidence list, active accusations.
- Bottom: Input box + send button.

## 5) Core Data Model (MVP)
### Canonical Game State
- `truth` (hidden, immutable)
  - `killer_id`
  - `method`
  - `motive`
  - `timeline` (ordered list of events)
  - `planted_evidence`
- `public_state`
  - `time_minutes`
  - `discovered_evidence[]`
  - `public_accusations[]`
  - `tensions[]`
- `characters[]`
  - `id, name, role`
  - `psycho[]` (6-10 stable trait bullets)
  - `goals[]`
  - `secrets[]`
  - `private_facts[]` (true alibi, leverage)
  - `knowledge[]` (what they believe/know)
  - `lie_strategy_tags`
- `events[]` (append-only)
  - `type, content, visibility[], time_minutes`

## 6) Game Loop
1. **Character Response**
   - Input: character profile + private facts + knowledge slice + detective message.
   - Output (structured):
     - `dialogue`
     - `claims[]`
     - `intent` (deflect/accuse/reveal)
2. **Reducer**
   - Input: canonical state + character output + detective message.
   - Output:
     - append events
     - update knowledge slices by visibility
     - advance time
     - update public evidence/accusations

## 7) API (MVP)
### `POST /turn`
Input:
- `sessionId`
- `characterId`
- `message`

Output:
- `dialogue`
- `public_state`
- `evidence_delta`
- `time_advance_minutes`
- `event_delta`

## 8) LLM Integration
- Use schema-constrained outputs for character and reducer nodes.
- Do not allow the model to mutate `truth`.
- Treat most statements as claims until verified.

## 9) Skills/Tools Assessment
Available skills in this session:
- `skill-creator` (not required for this task)
- `skill-installer` (not required for this task)

No skill workflow is needed for this MVP build.

## 10) Risks
- Token growth from long event logs; mitigate with compact summaries.
- Model hallucination of new facts; mitigate via schema + reducer rules.
- Overly complex prompts; keep them short and consistent.

## 11) Milestones
1. Scaffold UI + backend + in-memory state.
2. Implement `/turn` with mock responder + reducer.
3. Add LLM integration hooks with structured outputs.
4. Manual sanity test of character knowledge updates.

## 12) Success Criteria
- Interrogation loop works end-to-end locally.
- Knowledge updates differ per character based on visibility.
- Time advances and evidence list updates.
- Fixed truth is never mutated.
