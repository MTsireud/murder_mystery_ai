# Skills Drawer + Passive Investigation Curriculum

## 1) Goal

Make players **feel smart quickly** by teaching a lightweight "detective framework" implicitly-without a cringe tutor and without making the game feel like homework.

Players should:

- know **what to do next** (bounded options),
- understand **why it matters** (one-line rationale),
- see **progress** (what's missing),
- and still feel free to ignore it (ad-hoc, optional).

## 2) Problem statement

Right now, the primary loop is chat-driven interrogation + a final submission. That can create:

- **cognitive overload** (player must remember too much),
- **analysis paralysis** ("what should I ask next?"),
- **ego threat** ("I feel dumb / stuck").

We want to reduce working-memory load by converting chat into **structured, testable claims** and by offering **investigative "skills"** that produce useful outputs (timeline anchors, relationship links, contradictions, corroborations).

## 3) Non-goals

- Turning the game into a policing simulator or training course.
- Forcing a linear checklist or gating core gameplay behind curriculum use.
- Adding heavy UI that competes with the chat experience.

## 4) Design principles (do not overwhelm)

1. **Optional by default:** core loop remains playable with zero Skills usage.
2. **Progressive disclosure:** the drawer is collapsed; skills appear when relevant.
3. **One action -> one output:** each skill produces a tangible artifact (card, link, anchor).
4. **Low reading burden:** each skill explains itself in <=10 seconds.
5. **Player dignity:** hints are framed as tests ("Try this angle") not lectures.

---

## 5) Feature overview

### Feature: Skills Drawer

A slide-out drawer containing "Skill Cards" (investigative techniques). Players can pull a skill at any time, read a short explanation, and click **prompt chips** to apply it in conversation.

### Feature: Passive Capture + Auto-Update

The system continuously extracts "atomic facts" from chats and writes them into:

- Relationship Tracker
- Timeline Strip
- Contradiction Ledger
- Evidence Locker

Skill Cards auto-update as the case evolves:

- show "you've already got 2 timeline anchors"
- unlock advanced prompt chips when contradictions exist
- highlight missing slots ("Opportunity missing")

### Feature: Light "Watson" (optional)

Watson is not a character voice in the UI. It's a **probabilistic suggestion system** that recommends a **Skill** + a **test**, sometimes imperfectly depending on settings.

---

## 6) User stories

**New player**

- As a new player, I want a simple way to know what to ask next so I don't stall.
- As a new player, I want the game to summarize "what matters" without feeling told off.

**Intermediate player**

- As an intermediate player, I want techniques that reliably create progress (find contradictions, lock alibis).

**Power player**

- As a power player, I want minimal UI clutter and the ability to ignore the curriculum while still benefiting from auto-structured evidence.

---

## 7) UX: "Slick + ad hoc" interaction design

### Entry points (3 ways to discover skills without being forced)

1. **Drawer button** ("Skills") - always available, collapsed by default.
2. **Context nudges** (small, non-blocking):

   - "Gap in timeline (22:06-22:11)" -> opens *Build Timeline* card
   - "Conflict detected (10:05 vs 10:12)" -> opens *Contradiction Press*
3. **Watson ping** (optional): "Testable angle: lock the alibi chain?"

### Minimal surface area

- Skills drawer opens over the side; chat stays primary.
- Each skill card is 1 screen tall max; deeper content behind "More".

---

## 8) Skill Card spec (concrete structure)

### Skill Card layout

**Header**

- Skill name
- Tags: *Early / Mid / Late* + "Best for: witness / suspect / anyone"
- "Output: Timeline / Relationship / Contradiction / Motive"

**Quip (1 line, playful, not cringe)**

- Example: "Everybody lies. The timeline is how you catch the *shape* of it."

**What it is (1-2 lines)**

- Plain-language definition

**Why it works (1-2 lines)**

- The "benefit" in game terms: reduces uncertainty, creates testable claims

**Real-world anchor (1 line)**

- "Inspired by" a legitimate technique/framework, with a link:
  - *PEACE interviewing model (Account-Clarification-Challenge)* from College of Policing guidance. ([library.college.police.uk][1])
  - *Cognitive Interview* research for witness recall. ([ResearchGate][2])
  - *Strategic Use of Evidence (SUE)* deception-relevant disclosure strategy. ([openresearch.lsbu.ac.uk][3])
  - Association charting / network analysis guidance. ([College Assets][4])

**How to apply (3 steps)**

- Short numbered list

**Prompt chips (3-6)**

- Click inserts a well-formed question into the chat input

**Outputs + success criteria**

- Checkboxes like: "Time + Place + Corroborator captured"

**Cost/Risk**

- Heat / rapport impact, displayed as small icons

### Auto-update rules (key value-add)

- If the player has 0 timeline anchors -> *Build Timeline* appears at top.
- If a contradiction exists -> *Contradiction Press* gains "challenge" prompt chips.
- If alibi is uncorroborated -> *Alibi Lock* shows a warning badge "No corroborator".

---

## 9) Initial skill set (v1)

Keep v1 to **6-8 skills** to avoid overwhelming.

### v1 Skills (recommended)

1. **Build Timeline** (anchors + gaps) - PEACE-inspired structure ([library.college.police.uk][1])
2. **Relationship Mapping** (who protects whom) - association charting concept ([College Assets][4])
3. **Alibi Lock** (corroboration chain) - link analysis mindset ([i2 Group][5])
4. **Motive Probe** (incentives) - game-native but essential
5. **Cognitive Interview (Witness)** - memory retrieval prompts ([ResearchGate][2])
6. **Strategic Use of Evidence (SUE)** - when/how to reveal evidence ([openresearch.lsbu.ac.uk][3])
7. **Contradiction Press** - "clarify/challenge" once conflicts exist ([library.college.police.uk][1])
8. **Theory Builder** - 3 competing hypotheses, each with a disproving test

### Progressive unlocking (anti-overwhelm)

- Start with 3: Timeline, Motive, Relationship
- Unlock Alibi Lock once player has >=1 alibi claim
- Unlock Contradiction Press once system detects >=1 conflict
- Unlock SUE once player has >=2 evidence cards

---

## 10) Core UI widgets (the "passive framework")

### A) Relationship Tracker (bullet list + unknown "?")

- Each entry: `Person A <-> Person B : link type (status)`
- Status: Confirmed / Claimed / Inferred / Unknown (?)
- Clicking "?" opens Relationship Mapping card with prompts.

### B) Timeline Strip

- Anchors with confidence labels
- Highlight gaps and conflicting times
- Clicking a gap opens Build Timeline.

### C) Evidence Locker (atomic fact cards)

- Fact text, source, confidence, tags
- Auto-conflict detection highlights contradictions.

### D) Contradiction Ledger

- Side-by-side conflicting claims + "Resolve" CTA (opens Contradiction Press)

**Important:** these widgets should be compact, collapsible, and never block chat.

---

## 11) Watson settings (optional, dignity-preserving)

Watson appears as a small "Suggestion" chip, not a character voice.

**Controls**

- Frequency: Off / Rare / Normal / High
- Quality: "Chaotic" <-> "Sharp"
- Style: "Questions only" <-> "Hypothesis + test"

**Behavior**

- Suggests a **skill + goal**, not "the answer":
  - "Test: lock Tariq's alibi chain (need corroborator)."
- Adaptive mode: the better the player is (measured by resolved contradictions + corroborated facts), the less Watson interrupts.

---

## 12) Success metrics

### Primary

- **Case completion rate** up
- **Median time-to-first-progress** (first evidence card / first resolved conflict) down
- **Drop-off after 3 interrogations** down

### Secondary

- Evidence usage rate in final submission up
- "Felt dumb/stuck" feedback (thumbs-down reasons) down
- Engagement: returning players / streaks up

### Qualitative success

Players report: "I learned a repeatable approach" without feeling lectured.

---

## 13) Implementation notes (pragmatic)

- **Atomic fact extraction**: LLM creates structured cards from the last message pair (user question + NPC response).
- **Conflict detection**: simple rule-based matching on time windows / location tokens + LLM "conflict? y/n" verification.
- **Auto-updating skills**: skill availability and prompt chips depend on board state (anchors count, conflicts count, alibis present).

---

## 14) Open questions / decisions

- Do you want Skills to be **universal** across cases, or allow **case-specific skills** (e.g., "Backstage Access Control", "Sensor Logs")?
- How "gamey" should costs be (Heat/rapport) vs purely advisory?
- Should players earn "Skill Mastery" badges that unlock advanced prompt chips?

---

**Q1: Which 6 skills should be in v1 to maximize "I feel smart" while minimizing UI clutter, and which 2 should be hidden until later acts?**

**Q2: What should the Relationship Tracker support as link types (romance, money, hierarchy, blackmail, mentorship, rivalry), and how many is the sweet spot before it feels heavy?**

**Q3: How should Watson's "quality" slider map to behavior (wrong-but-plausible hypotheses vs fewer suggestions vs weaker evidence weighting) so it's fun rather than frustrating?**

[1]: https://library.college.police.uk/docs/npia/BP-Nat-Investigative-Interviewing-Strategy-2009.pdf?utm_source=chatgpt.com "National Investigative Interviewing Strategy 2009"
[2]: https://www.researchgate.net/profile/Ronald-Fisher-2/publication/20362017_Field_Test_of_the_Cognitive_Interview_Enhancing_the_Recollection_of_Actual_Victims_and_Witnesses_of_Crime/links/54902c880cf2d1800d8647aa/Field-Test-of-the-Cognitive-Interview-Enhancing-the-Recollection-of-Actual-Victims-and-Witnesses-of-Crime.pdf?utm_source=chatgpt.com "Field Test of the Cognitive Interview"
[3]: https://openresearch.lsbu.ac.uk/item/92w0q?utm_source=chatgpt.com "Interviewing suspects with the Strategic Use of Evidence (SUE ..."
[4]: https://assets.college.police.uk/s3fs-public/2025-02/Intelligence-management-APP-consultation-supporting-document.pdf?utm_source=chatgpt.com "Intelligence management APP - Supporting document"
[5]: https://i2group.com/articles/what-is-link-analysis-and-link-visualization?utm_source=chatgpt.com "What is link analysis and link visualization?"
