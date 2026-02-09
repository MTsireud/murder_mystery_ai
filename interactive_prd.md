# Interactive Evidence Loop MVP PRD

## Document Control
- Status: Draft v1 (planning)
- Product Name: Interactive Evidence Loop
- Objective: Move from text-only interrogation to a visual-first investigation loop while preserving immutable story truth.
- Primary Cases in Scope: all current library cases, with first quality bar on `athens-2012-kidnapping` (Glyfada marina flow).

## 1. Problem Statement
Players currently solve mostly through text exchange. This weakens immersion, lowers perceived investigative agency, and reduces clue discoverability. The MVP must make movement and observation feel physical while keeping plot logic consistent and fair.

## 2. MVP Outcome
From case start to case solve:
1. The player sees a strong case intro.
2. Every location transition has visual feedback.
3. Each location has consistent visual objects that can be observed.
4. Observations produce evidence-linked prompts for questioning.
5. Watson guides with Socratic hints based on observed evidence and missing links.
6. All visual and textual clues stay aligned with immutable truth (`state.truth` + `truth_ledger`).

## 3. Design Principles
1. Progressive disclosure: clue access should unlock in stages by location and prior findings.
2. Fair-play mystery: required solution clues must be discoverable without random guessing.
3. Canonical consistency: visuals are another view of the same truth, never alternate canon.
4. Actionable immersion: every visual affordance should suggest an investigative next step.
5. Controlled assistance: Watson should nudge, not solve for the player.

## 4. MVP Feature Set

### F1. Case Intro Experience (Dossier Reel)
Provide a short intro experience in a modal with two tabs:
1. Case Folder (structured sections, cast, location summary).
2. Watson narration (short, tone-controlled, lightly riddle-like).

MVP format:
1. Animated still panels (no full video generation dependency).
2. Optional looped ambient background per case if asset exists.

### F2. Transition Visualization on Move
On each `move` action:
1. Show transition overlay (`Moving to <location>`).
2. Load the target scene visual with deterministic identity.
3. Record a movement event in timeline.

### F3. Location Scene Viewer with Hotspots
Each location has:
1. Scene image.
2. Object hotspots (camera, gate, vehicle lane, office window, etc.).
3. Tooltip text and one-click “Observe” action.

### F4. Observation Cards + Prompt Bridge
When player observes an object:
1. Create an observation card linked to location/object/time.
2. Add evidence or lead suggestion to case board.
3. Suggest question prompts for interrogation (example: ask guard for camera logs).

### F5. Watson Evidence-Aware Socratic Layer
Watson hint logic ladder:
1. Clarify hypothesis request.
2. Point to unexplored location/object.
3. Suggest one concrete evidence-backed question.

Watson must read:
1. location visited state
2. observed objects
3. clue-chain progress (`investigation_state`)

### F6. Truth-Ledger Consistency Protocol
All scene objects and observation outcomes must be ledger-bound:
1. Every hotspot maps to truth-ledger fact ids or clue-chain step ids.
2. No generated object can imply facts outside case truth.
3. Constructor extensions can only add micro-detail, never alter truth anchors.

### F7. Character-Scoped Interrogation Threads
Interrogation transcript must be separated per NPC:
1. Each character has an individual conversation thread with the detective.
2. Location/system actions remain in a dedicated case/system thread.
3. Switching active NPC shows only that character’s interrogation history by default.
4. Player can still access a global audit timeline if needed.

## 5. In Scope vs Out of Scope

In scope:
1. Static image scene system with optional loop overlays.
2. Hotspot observation interactions and evidence linking.
3. Backend contracts for scene/object metadata.
4. Watson hint upgrades based on evidence state.
5. Plot-consistency validation checks.
6. Separate per-character chat threads in interrogation UX.

Out of scope (post-MVP):
1. Fully generated videos per transition.
2. Free-camera 3D scene exploration.
3. Full visual contradiction simulation by model at runtime.
4. Multiplayer co-op investigation.

## 6. User Journey (MVP)
1. Player opens case.
2. Intro dossier appears (auto-open once per case, reopenable).
3. Player enters starting location scene.
4. Player clicks hotspot (example: marina camera) and records observation.
5. System suggests prompt (`Ask marina office for camera footage 19:35-19:45`).
6. Player interrogates relevant character/contact.
7. New clue-chain step unlocks and updates board.
8. Player moves to next location and repeats loop.
9. Watson provides escalating hints only when needed.
10. Player submits solution with higher confidence and evidence coverage.

## 7. Functional Requirements

### FR-1 Intro Dossier
1. System shall show intro modal for unseen case ids.
2. System shall support Case Folder and Watson tabs.
3. Modal shall close via button, backdrop, and `Escape`.
4. Modal content shall be case-scoped and never leak across case ids.

### FR-2 Scene Contracts
1. Every `public_state.case_locations[]` item shall include `scene` metadata.
2. Scene metadata shall include stable asset id/version and hotspot definitions.
3. Hotspots shall have deterministic ids and localized labels.

### FR-3 Observation Action
1. Player shall be able to observe one hotspot at a time.
2. Observation shall emit event + optional evidence delta + optional lead prompt.
3. Re-observing same hotspot shall not duplicate unique evidence.

### FR-4 Interrogation Bridge
1. Observation shall expose one-click prompt suggestions.
2. Prompt suggestions shall reference object + time + target role.
3. Suggestions shall be localized (EN/EL).

### FR-5 Watson Guidance
1. Watson shall consume observation + clue-chain state.
2. Watson shall prefer question-form hints.
3. Watson shall avoid direct reveal unless explicit reveal flow is requested.

### FR-6 Truth Integrity
1. `truth` fields remain immutable.
2. `truth_ledger` and `clue_chain` remain canonical for unlock logic.
3. Visual metadata can add affordance only, not alternate facts.

### FR-7 Character-Specific Transcript UX
1. Interrogation chat shall be scoped to the selected character NPC.
2. System/location events shall not pollute individual character threads.
3. Player shall be able to switch between character threads without losing context.
4. A case-level thread/timeline shall remain available for movement and observation logs.

## 8. Data Model Changes

## 8.1 Case Authoring (`server/cases.js`)
Add location-scene contract to each `public_state.case_locations[]` entry:
- `scene.asset_id` (string)
- `scene.asset_path` (string, local path under `public/images/...`)
- `scene.asset_version` (string)
- `scene.hotspots[]`:
  - `id`
  - `label` (localized)
  - `anchor` (`x`, `y`, optional `radius`)
  - `object_type` (`camera`, `entry_gate`, `vehicle_lane`, etc.)
  - `observation_note` (localized)
  - `suggested_questions[]` (localized)
  - `reveal_fact_ids[]` (truth_ledger ids)
  - `unlock_step_ids[]` (clue_chain ids)
  - `repeatable` (bool)

## 8.2 Runtime State (`server/state.js`)
Extend client state serialization:
- `public_state.observed_hotspot_ids[]`
- `public_state.observation_events[]` (bounded list with `hotspot_id`, `location_id`, `time_minutes`)

## 8.3 Investigation Model (`server/investigation.js`)
Extend step gating support:
- Optional `required_hotspot_ids[]` on clue chain steps.
- Prompt context field `recommended_hotspots[]`.

## 8.4 Story Enrichment (`server/story.js`)
Add normalization + defaults:
1. `ensureSceneContracts(state)` validates location scene fields.
2. `ensureHotspotToLedgerBindings(state)` ensures hotspot ids map only to known fact/step ids.

## 8.5 Transcript State Model (`server/state.js` + client state)
Add chat-thread state contracts:
- `client_state.chat_threads`:
  - `case`: append-only system/action feed ids
  - `characters`: map of `character_id -> thread events[]`
- `client_state.chat_thread_meta`:
  - `last_active_character_id`
  - optional unread counters per thread

Rule:
1. Global `events[]` remains canonical log.
2. Thread projections are deterministic views over events and/or dedicated thread events.

## 9. API and Contract Changes

### 9.1 Modify `POST /api/state`
Return for current location:
1. `current_scene` object with hotspots and player observation status.

Dependencies:
1. `server/state.js` public view builder.
2. `server/i18n.js` localization of scene labels.

### 9.2 Modify `POST /api/action` (move/inspect)
Include:
1. `transition` payload for frontend overlay.
2. `current_scene` payload after action.

Dependencies:
1. `server/logic.js` location action result.
2. `api/action.js` passthrough contract.

### 9.3 Add `POST /api/observe` (new)
Input:
1. `sessionId`
2. `caseId`
3. `locationId`
4. `hotspotId`
5. `client_state`

Output:
1. `observation` object
2. `event_delta`
3. `evidence_delta`
4. `suggested_prompts`
5. `public_state`
6. `client_state`

Dependencies:
1. new handler in `server/logic.js` or dedicated `server/observation.js`
2. `api/observe.js`

### 9.4 Modify `POST /api/watson`
Add context:
1. observed hotspot summary
2. unexplored hotspot summary
3. recommended next location/object

Dependencies:
1. `server/index.js` or `api/watson.js` payload composition
2. `server/llm.js` Watson prompt context section

## 9.5 Transcript API Contract Changes
1. `POST /api/state` returns thread payload:
   - `chat_threads.case`
   - `chat_threads.characters[character_id]`
2. `POST /api/turn` returns:
   - `thread_delta` for active character
   - optional `case_thread_delta` for system events generated during turn
3. `POST /api/action` and `POST /api/observe` return:
   - `case_thread_delta` only (no direct character thread writes)

## 9.6 Agent Prompt Dependencies
Prompt-layer updates required to keep behavior aligned with truth:
1. `/Users/markostsirekas/codex/murder_mystery/agents/character/AGENTS.md`
   - allow referencing observed hotspot claims as evidence context
   - keep rule that characters cannot mutate hidden truth
2. `/Users/markostsirekas/codex/murder_mystery/agents/reducer/AGENTS.md`
   - define observation event types and evidence promotion rules
   - ensure only verified observation mappings can become hard evidence
3. `/Users/markostsirekas/codex/murder_mystery/agents/story_judge/AGENTS.md`
   - add visual-consistency checks against truth ledger bindings

## 10. Frontend MVP UX Tasks

### 10.1 Scene Viewer UI (`public/index.html`, `public/styles.css`)
1. Replace placeholder scene stage with real scene image container.
2. Render clickable hotspot pins.
3. Show observation drawer/list with suggested prompts.

### 10.2 App State + Rendering (`public/app.js`)
1. Add `sceneState` and `observationState` in client memory.
2. Render scene from API payload.
3. Handle hotspot click -> call `/api/observe`.
4. Append observation events to case chat/system log.
5. Insert suggested prompt into message input on click.

### 10.3 I18n (`public/i18n.js`)
Add UI labels:
1. observe action
2. observations list headers
3. hotspot empty states
4. suggestion chip labels

## 11. Plot Fidelity and Story-Truth Constraints

### 11.1 Hard Invariants
1. `state.truth` cannot be changed by UI actions, observe actions, or constructor extensions.
2. Hotspot output cannot imply killer/method/motive changes.
3. Hotspot reveals must reference existing `truth_ledger` ids only.
4. If hotspot and dialogue conflict, hotspot text must be treated as observation claim unless mapped to verified fact reveal.

### 11.2 Case Authoring Rules
1. Every required clue-chain step must be obtainable by at least one scene hotspot or dialogue trigger path.
2. Every hotspot with `unlock_step_ids` must be physically in allowed `location_ids`.
3. No hotspot may reference non-existent character/location/fact ids.

### 11.3 Judge/Checker Rules
Update story quality checks to include:
1. visual-to-ledger mapping completeness
2. clue fairness with visual path available
3. no canonical contradiction introduced by scene notes

Files:
1. `server/story_judge.js`
2. `server/story_feedback_loop.js`
3. `scripts/story_quality_all.mjs`

## 12. Detailed Engineering Task Breakdown (Granular TODO)

### 12.0 Customer-Facing Feature Bundles (Primary Tracking)
Definition:
1. A feature is a bundle of fixes and changes that materially improves customer experience.
2. The A-F task lists below remain implementation checklists used to deliver each feature.

#### FB1. Smooth Scene Navigation + Observation Loop
Customer outcome:
1. Players can move through locations, observe objects, and immediately use suggested prompts in interrogation.

Bundle scope:
1. Scene + observe baseline: B1-B6, D1-D5, D7
2. Transition clarity polish: D6
3. Loop reliability coverage: F1

Status:
1. Completed

#### FB2. Character-Scoped Interrogation Threads
Customer outcome:
1. Players see focused, per-character interrogations while case/system actions stay in a separate thread.

Bundle scope:
1. Backend thread projections and immutability: B7, B8, B9
2. Interrogation thread UX + switching: D8, D9, D10
3. Thread isolation regression coverage: F7, F8

Status:
1. Completed

#### FB3. Evidence-Aware Watson Guidance
Customer outcome:
1. Watson guidance reflects observed hotspots and missing evidence links without direct reveals.

Bundle scope:
1. Investigation gating + prompt context: C1, C2
2. Watson request and prompt shaping: C3, C4
3. Guardrail coverage + prompt rule updates: C5, C6

Status:
1. In progress
2. Current feature in implementation

#### FB4. Visual Grounding for MVP Case Fairness
Customer outcome:
1. The primary MVP case has complete, fair, truth-bound hotspot coverage for required clue paths.

Bundle scope:
1. Athens hotspot authoring + marina camera chain: E1, E2
2. Constructor + verifier + judge pipeline: E3, E4, E5, E6
3. End-to-end scenario and judge loop checks: F4, F6

Status:
1. Not started

#### FB5. Mobile-First Touch UX + Accessibility
Customer outcome:
1. Core gameplay remains fully usable without hover, with safe mobile interactions and accessibility fallbacks.

Bundle scope:
1. Mobile interaction and motion tasks in Section 18.6: D8-D12 (Section 18 numbering)
2. Mobile/accessibility verification in Section 18.6: F7-F9 (Section 18 numbering)

Status:
1. Not started

#### FB6. Trust, Consistency, and Regression Safety
Customer outcome:
1. Players get consistent canon, isolated case data, and stable core flows across languages and sessions.

Bundle scope:
1. Hotspot binding invariants: A2
2. Case isolation and modal regression checks: F2, F3
3. Bilingual consistency checks: F5

Status:
1. Not started

## Phase A - Contracts and Safety Gates
- [x] A1. Add scene/hotspot schema comments and normalization helpers in `/Users/markostsirekas/codex/murder_mystery/server/story.js`.
- [ ] A2. Add invariant validator `validateHotspotBindings(state)` in `/Users/markostsirekas/codex/murder_mystery/server/story.js`.
- [x] A3. Extend `createStateFromCase` expectations and sample case entries in `/Users/markostsirekas/codex/murder_mystery/server/cases.js`.
- [x] A4. Add serialization support for observation state in `/Users/markostsirekas/codex/murder_mystery/server/state.js` (`buildStateFromClient` + `extractClientState`).
- [x] A5. Add localization fields support for scene/hotspot labels in `/Users/markostsirekas/codex/murder_mystery/server/i18n.js`.

Dependencies:
1. A1 before A2.
2. A3 before A4.
3. A5 required before frontend rendering.

## Phase B - Backend Actions and APIs
- [x] B1. Implement `runObserveAction` in `/Users/markostsirekas/codex/murder_mystery/server/logic.js` (or new `/Users/markostsirekas/codex/murder_mystery/server/observation.js`).
- [x] B2. Return `current_scene` and transition metadata from `runLocationAction`.
- [x] B3. Add `POST /api/observe` in `/Users/markostsirekas/codex/murder_mystery/api/observe.js`.
- [x] B4. Register route in `/Users/markostsirekas/codex/murder_mystery/server/index.js` if needed for local express parity.
- [x] B5. Update `/Users/markostsirekas/codex/murder_mystery/api/state.js` and `/Users/markostsirekas/codex/murder_mystery/api/action.js` response shape.
- [x] B6. Add bounded dedupe rules for repeated observation events.
- [ ] B7. Introduce thread projection utilities in `/Users/markostsirekas/codex/murder_mystery/server/state.js` for case thread + per-character thread views.
- [ ] B8. Update `/Users/markostsirekas/codex/murder_mystery/server/index.js` and serverless API handlers to return `chat_threads` and `thread_delta` payloads.
- [ ] B9. Keep canonical `events[]` immutable while deriving thread views without data loss.

Dependencies:
1. B1 before B3.
2. B2 before frontend scene transition UI.
3. B5 depends on A4.
4. B7 before B8.
5. B9 depends on B7.

## Phase C - Investigation and Watson Integration
- [x] C1. Add `required_hotspot_ids` support to clue step availability checks in `/Users/markostsirekas/codex/murder_mystery/server/investigation.js`.
- [x] C2. Include hotspot-derived hints in `prompt_context.open_leads`.
- [x] C3. Extend Watson request context in `/Users/markostsirekas/codex/murder_mystery/server/index.js` + `/Users/markostsirekas/codex/murder_mystery/api/watson.js`.
- [x] C4. Update Watson prompt shaping in `/Users/markostsirekas/codex/murder_mystery/server/llm.js` to prioritize unexplored critical hotspots.
- [ ] C5. Add guardrail tests for “Watson cannot reveal truth directly” unless reveal flow.
- [ ] C6. Update agent prompt files for character/reducer/judge visual evidence rules:
  - `/Users/markostsirekas/codex/murder_mystery/agents/character/AGENTS.md`
  - `/Users/markostsirekas/codex/murder_mystery/agents/reducer/AGENTS.md`
  - `/Users/markostsirekas/codex/murder_mystery/agents/story_judge/AGENTS.md`

Dependencies:
1. C1 depends on B1/B2 data availability.
2. C3 depends on A4 state fields.
3. C4 depends on C3 context payload.
4. C6 depends on FR-6 truth integrity contract definitions.

## Phase D - Frontend UX Delivery
- [x] D1. Add scene viewer container and observation list markup in `/Users/markostsirekas/codex/murder_mystery/public/index.html`.
- [x] D2. Add hotspot and scene styles in `/Users/markostsirekas/codex/murder_mystery/public/styles.css`.
- [x] D3. Add render pipeline for `current_scene` in `/Users/markostsirekas/codex/murder_mystery/public/app.js`.
- [x] D4. Implement hotspot click -> `/api/observe` -> UI updates in `/Users/markostsirekas/codex/murder_mystery/public/app.js`.
- [x] D5. Add prompt insertion chips from suggested prompts in `/Users/markostsirekas/codex/murder_mystery/public/app.js`.
- [x] D6. Ensure transition overlay shows on move and clears on scene ready.
- [x] D7. Add i18n keys in `/Users/markostsirekas/codex/murder_mystery/public/i18n.js`.
- [x] D8. Refactor interrogation renderer in `/Users/markostsirekas/codex/murder_mystery/public/app.js` to show only active character thread in Interrogation mode.
- [x] D9. Add thread switch behavior on character card selection (preserve scroll/position per thread).
- [x] D10. Add Case/System thread toggle for movement/observation logs.

Dependencies:
1. D3 depends on B2/B5.
2. D4 depends on B3.
3. D7 required before QA signoff in EL.
4. D8 depends on B8.
5. D9 depends on D8.
6. D10 depends on B8.

## Phase E - Case Content + Constructor + Judge
- [ ] E1. Author hotspot contracts for each location in `athens-2012-kidnapping` inside `/Users/markostsirekas/codex/murder_mystery/server/cases.js`.
- [ ] E2. Ensure marina camera hotspot exists and maps to camera evidence chain.
- [ ] E3. Update constructor context in `/Users/markostsirekas/codex/murder_mystery/server/investigation.js` to include scene/hotspot metadata.
- [ ] E4. Update `/Users/markostsirekas/codex/murder_mystery/scripts/construct_casepack.mjs` output verification for hotspot mappings.
- [ ] E5. Extend story judge in `/Users/markostsirekas/codex/murder_mystery/server/story_judge.js` with visual consistency checks.
- [ ] E6. Update batch script `/Users/markostsirekas/codex/murder_mystery/scripts/story_quality_all.mjs` to fail on missing visual mappings.

Dependencies:
1. E1 before E2.
2. E3 before E4.
3. E5 before E6.

## Phase F - QA, Regression, and Launch Gate
- [x] F1. Add API contract smoke tests for `/api/state`, `/api/action`, `/api/observe`.
- [ ] F2. Add consistency regression checks: case switch does not leak scene/case data.
- [ ] F3. Add modal behavior checks: close button/backdrop/Escape.
- [ ] F4. Add scenario test: observe marina camera -> suggested prompt -> unlock chain step.
- [ ] F5. Add bilingual checks (EN/EL scene labels and prompts).
- [ ] F6. Run story judge loop for all cases and log failures.
- [ ] F7. Verify thread isolation: asking Character A does not appear in Character B transcript.
- [ ] F8. Verify case/system actions appear only in case thread, not NPC threads.

Dependencies:
1. F1 requires B complete.
2. F4 requires D + E complete.
3. F6 requires E5/E6 complete.
4. F7 depends on B8 + D8.
5. F8 depends on D10.

## 13. Task Dependency Graph (High Level)
1. A -> B -> D -> F
2. A -> C -> F
3. A -> E -> F
4. B + C + D + E must converge before launch gate.

## 14. Acceptance Criteria (MVP Exit)
1. Every location transition displays a deterministic scene (no random visual drift).
2. At least one meaningful hotspot per location in MVP case.
3. Observation-generated prompts appear and can be sent directly to interrogation.
4. Watson gives evidence-aware hints tied to missing observation paths.
5. No truth-ledger contradictions introduced by scene text/hotspot outputs.
6. Case switching preserves strict data isolation across all scene and intro content.
7. Interrogation transcript is isolated per NPC and usable on mobile.

## 15. Telemetry and Success Metrics (MVP)
1. `% sessions with >=1 observation action`.
2. `% sessions where observation prompts are used in chat`.
3. `time_to_first_observation`.
4. `solve rate with cross-modal evidence path`.
5. `hint dependency rate` before and after observation usage.
6. `% sessions with >=2 character-thread switches`.
7. `% of turns where player remains in character-scoped thread vs global thread`.

## 16. Risks and Mitigations
1. Risk: visual assets lag engineering.
   Mitigation: fallback scene card with hotspot-only overlay support.
2. Risk: hotspot spam creates noisy evidence.
   Mitigation: dedupe + cooldown + per-hotspot repeatability rules.
3. Risk: constructor adds detail that implies non-canonical facts.
   Mitigation: strict id-bound extension schema and merge guards.
4. Risk: multilingual drift in hotspot labels/prompts.
   Mitigation: localized schema + i18n validation script.
5. Risk: regression of case isolation and modal behavior.
   Mitigation: stale-response guards + explicit UI integration tests.

## 17. Recommended First Build Slice (Squash Order)
1. Slice 1: A1-A5, B2, D1-D3 (scene rendering with static data, no observe yet).
2. Slice 2: B1-B3, D4-D5 (observation loop end-to-end).
3. Slice 3: C1-C4 (Watson + clue-chain integration).
4. Slice 4: E1-E6 and F1-F6 (content hardening and quality gates).
5. Slice 5: B7-B9, D8-D10, F7-F8 (character-scoped transcript delivery).

## 18. Mobile-First UI Feature Spec

### 18.1 Visual System (MVP-Safe)

Direction:
1. Keep "Digital Noir Modern" but increase readability and mobile contrast.

Tokens:
1. `--bg-ink: #0A0A0A`
2. `--bg-paper: #F4F1EA`
3. `--accent-alert: #D4AF37`
4. `--accent-link: #2F6F8F` (replaces low-contrast desaturated blue for selected text)
5. `--text-main: #1B1B1B`
6. `--text-inverse: #F4F1EA`

Typography:
1. Story content: serif (Crimson Pro).
2. Evidence metadata and Watson/system chips: JetBrains Mono.
3. Keep strict font role separation (world text vs machine/system text).

Atmosphere:
1. Remove global film grain.
2. Apply subtle texture only in non-critical decorative zones (hero/intros), never over body text.

### 18.2 Interaction Model (Mobile-First)

Primary loop (mobile and desktop):
1. Move to location.
2. Scene loads with tappable hotspots.
3. Tap hotspot -> create observation card -> generate suggested prompts.
4. Tap prompt chip -> inserts question into composer.

Animation policy:
1. Scene load animation budget: <= 250ms for core transitions.
2. Respect `prefers-reduced-motion`; provide static fallback.
3. Keep "developing" effect minimal: fade + sharpen only.

### 18.3 Component Feature Set

#### A. Stitched Evidence Card (Revised)
1. Header: timestamp + evidence id + location tag.
2. Body: scene crop or full image.
3. Footer actions:
   - `Jump to source` (scroll/focus related log node)
   - `Use in question` (inject prompt)
   - `Expand` (full-screen sheet on mobile, modal on desktop)
4. Replace double-click with single-tap expand on mobile.

#### B. Spatial Pinning (Revised)
1. Use tappable pin list below scene on mobile (not hover thumbnails).
2. Desktop can keep hover preview as enhancement only.
3. Pins must map to hotspot ids and ledger bindings.

#### C. Discrepancy Toggle -> Evidence Overlay Mode (Revised)
1. Rename control to `Analyze`.
2. When enabled, show pre-authored hotspot overlays and system confidence tags.
3. Overlay highlights must be deterministic and case-authored, not runtime hallucinated.

### 18.4 Motion + Transition Rules
1. Location move: slide transition + short title crossfade.
2. Remove full-screen hue shift for MVP to avoid disorientation.
3. Optional haptic:
   - mobile only
   - enabled only when user setting `haptics_enabled = true`
   - fallback safely when unsupported

### 18.5 Mobile UX Requirements (Hard Requirements)
1. One-thumb navigation for core actions (`Move`, `Inspect`, `Observe`, `Use Prompt`).
2. Composer remains visible when keyboard opens; no blocked primary CTA.
3. Scene hotspots minimum touch target 44x44 px.
4. Bottom sheet pattern for evidence details and Watson hints.
5. No hover-dependent interaction for required gameplay.
6. P95 interaction response target under 200ms for tap feedback.
7. Sticky "current location + move" bar in viewport during scroll.
8. Safe-area handling (`env(safe-area-inset-*)`) for iOS.

### 18.6 Additions to Engineering Tasks (UI/UX + Mobile)

Add to Phase D:
- [x] D8. Implement mobile-first bottom sheet for observation card details in `/Users/markostsirekas/codex/murder_mystery/public/index.html` + `/Users/markostsirekas/codex/murder_mystery/public/styles.css`.
- [x] D9. Replace hover-only pin affordances with tap-first interactions in `/Users/markostsirekas/codex/murder_mystery/public/app.js`.
- [x] D10. Add reduced-motion fallback hooks in `/Users/markostsirekas/codex/murder_mystery/public/styles.css` and transition guards in `/Users/markostsirekas/codex/murder_mystery/public/app.js`.
- [x] D11. Add mobile safe-area and keyboard-safe composer behavior in `/Users/markostsirekas/codex/murder_mystery/public/styles.css`.
- [x] D12. Add optional settings toggle for haptics/sound cues in `/Users/markostsirekas/codex/murder_mystery/public/index.html`, `/Users/markostsirekas/codex/murder_mystery/public/app.js`, and `/Users/markostsirekas/codex/murder_mystery/public/i18n.js`.

Add to Phase F:
- [ ] F7. Mobile usability QA pass on iOS Safari + Android Chrome (portrait first, landscape second).
- [ ] F8. Accessibility checks for contrast, dynamic type scaling, and reduced motion behavior.
- [ ] F9. Verify all required interactions remain available with no hover support.

### 18.7 Updated MVP UI Acceptance Criteria
1. Core gameplay loop is fully playable with one-hand mobile interaction.
2. Every required clue action is tap-accessible on touch devices.
3. No mandatory desktop-only affordance (hover/double-click/right-click).
4. Visual overlays remain strictly truth-ledger bound.
5. Motion effects never block interaction and degrade gracefully under reduced-motion settings.

## 19. Visualization Strategy (Now / Next / Later)

### 19.1 Principle
The user must visualize scenes as part of investigation, not only click abstract location pins. Pins/hotspots are overlays on scene visuals, not a substitute for visualization.

### 19.2 MVP (Now)
1. Deterministic, case-authored location scene visuals (static image or designed fallback scene card).
2. Hotspots anchored on actual scene composition.
3. Observation cards with source-linked prompts.
4. No runtime generative video in MVP.

### 19.3 Near-Term (Next)
1. Offline/authoring-time generated scene stills:
   - generated before shipping (not during player turn)
   - saved as versioned assets under `public/images/...`
2. Controlled generation inputs:
   - location bible + object list + truth-ledger bindings
   - fixed seed per case/location/version
3. Human review gate before assets are publishable.

### 19.4 Later (Post-MVP)
1. Short pre-rendered transition loops or intro clips per location/case.
2. Optional generated motion content only if:
   - deterministic input recipe
   - canonical object continuity checks pass
   - no truth drift is introduced
3. Keep runtime model output advisory only, never canonical without validation.

### 19.5 Engineering Implications
1. Add scene asset manifest and versioning:
   - `scene.asset_id`
   - `scene.asset_path`
   - `scene.asset_version`
2. Add asset QA script to verify:
   - required objects visible
   - hotspot anchors valid
   - asset paths exist
3. Add story-judge check for visual grounding completeness.

### 19.6 Decision Record
1. Current approved direction: scene-first visualization with hotspot overlays and prompt bridging.
2. Runtime generative image/video is not required for MVP completion.
3. If later adopting runtime generation, truth-ledger binding + deterministic consistency checks are mandatory.
