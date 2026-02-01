# Upgrade v2: AI Quality Upgrades (FE-Only Storage)

## Constraints
- Runtime state lives in the browser (localStorage + client_state).
- Server reads client_state but does not persist any new data store.
- Keep prompts concise and never mutate fixed truth.

## Approach (Phased)
1) **P0**: Fix baseline correctness (victim identity, timeline constants, location disambiguation, “don’t know” policy).
2) **P1**: Improve intelligence (repeat-question refinement, relationship graph, workplace map).
3) **P2**: UX polish (full Greek localization, voice mode).

## Engineering Tasks (with checks)

### Preflight
- [x] Translate product intent into engineering tasks and checks.
- [x] Create upgrade plan and TODO file.

### P0 — Must Fix
- [ ] DATA-1: Add **case constants** to case data (police_call_time, death_window, canonical locations list).
  - Check: constants are single source of truth; never drift in prompts.
- [ ] DATA-2: Add **victim dossier** fields in public_state (name, role, last_seen window, relationship summary).
  - Check: surfaced in prompts + UI without new server storage.
- [ ] DATA-3: Add **character grounding** fields (relationship_to_victim, workplace, routine, location_id).
  - Check: remains small in client_state; loaded from case data.
- [ ] PROMPT-1: Update character prompt to include case constants + victim dossier + character grounding.
  - Check: prompt remains concise; no hidden truth leakage.
- [ ] POLICY-1: Implement “I don’t know” policy in prompt (must add adjacent fact / pointer / reason).
  - Check: fallback still safe with mock mode.
- [ ] CONSIST-1: Enforce **location disambiguation** by canonical labels in prompts + UI.
  - Check: all place references resolve to a known location_id.
- [x] DATA-4: Enrich **character backgrounds** (workplace, income, routine, tenure, relationships).
  - Check: prompt includes background + relationships; no new names outside roster.
- [x] DATA-5: Add **global relationship history timeline** aligned with case plot.
  - Check: timeline is consistent with truth; characters receive known history in prompts.

### P1 — Intelligence Upgrades
- [ ] MEMORY-1: Store last_question + last_answer per character (client_state memory).
  - Check: no server persistence; memory kept trimmed.
- [ ] BEHAV-1: Repeat-question handling (acknowledge + add new detail or clarify premise).
  - Check: avoid verbatim repeats; do not contradict case constants.
- [ ] REL-1: Add structured **relationship edges** in case data (who trusts/avoids who).
  - Check: graph feeds Relationship Tracker without inventing new actors.
- [ ] MAP-1: Add Places Directory + Character Directory UI widgets (workplace + role + relationship).
  - Check: FE-only; derived from case data + chat facts.
- [ ] FACTS-1: Add auto-captured “Fact Cards” from chat claims (claimed vs verified).
  - Check: claims never promoted to verified without evidence tag.

### P2 — UX / Localization
- [ ] I18N-1: Audit Greek translations for headers, skill cards, drawer sections, and new UI labels.
  - Check: Greek mode shows no English headings (except proper nouns).
- [ ] VOICE-1: Add TTS playback per message + autoplay toggle + voice selector.
  - Check: non-blocking UI, respects localStorage settings.

## Architecture Compatibility Checks
- **State size:** client_state must remain small (trim lists, limit history).
- **Server expectations:** server/state.js must tolerate new fields in client_state.
- **Prompt safety:** no new fields can mutate truth; prompts should be additive only.
- **Localization:** all new strings must be routed through public/i18n.js.
- **UI latency:** new directories and fact cards must not block chat input.

## Open Questions (need product decisions)
1) Canonical location UX: do you want a **Places Directory** panel, tags on messages, or both?
2) Minimum character fields: confirm required set (role, workplace, relationship, routine, secret, alibi).
3) Voice mode: generic TTS or character-specific voices/styles?
