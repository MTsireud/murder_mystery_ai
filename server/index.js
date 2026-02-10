import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildStateFromClient,
  extractClientState,
  getOrCreateSession,
  getPublicView,
  getPublicViewForState,
  resetSession
} from "./state.js";
import { createStateFromCase, getCaseById, getCaseList } from "./cases.js";
import { runLocationAction, runObserveAction, runTurn } from "./logic.js";
import { generateWatsonResponse } from "./llm.js";
import { ensureCaseBriefing } from "./narrator.js";
import { checkSolution } from "./checker.js";
import { runMurderMysteryJudge } from "./story_judge.js";
import { runStoryQualityFeedbackLoop } from "./story_feedback_loop.js";
import { buildWatsonEvidenceContext } from "./watson_context.js";

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.get("/debug", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/api/state", async (req, res) => {
  const session = getOrCreateSession(req.query.sessionId, req.query.caseId);
  await ensureCaseBriefing(session);
  res.json({
    ...getPublicView(session, req.query.lang),
    client_state: extractClientState(session.state)
  });
});

app.post("/api/state", async (req, res) => {
  const { sessionId, language, caseId, client_state } = req.body || {};
  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: client_state });
    await ensureCaseBriefing({ state });
    res.json({
      ...getPublicViewForState(state, language, sessionId || null),
      client_state: extractClientState(state)
    });
    return;
  }

  const session = getOrCreateSession(sessionId, caseId);
  await ensureCaseBriefing(session);
  res.json({
    ...getPublicView(session, language),
    client_state: extractClientState(session.state)
  });
});

app.get("/api/cases", (req, res) => {
  res.json({ cases: getCaseList(req.query.lang) });
});

app.post("/api/turn", async (req, res) => {
  const { sessionId, characterId, message, language, modelMode, caseId, client_state } = req.body || {};
  if (!characterId || !message) {
    res.status(400).json({ error: "characterId and message are required" });
    return;
  }

  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: client_state });
    const result = await runTurn({
      state,
      characterId,
      message,
      language,
      modelMode
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      sessionId: sessionId || null,
      dialogue: result.character_response.dialogue,
      public_state: result.public_state,
      evidence_delta: result.evidence_delta,
      accusations_delta: result.accusations_delta,
      time_advance_minutes: result.time_advance_minutes,
      event_delta: result.event_delta,
      debug_meta: result.debug_meta || null,
      model_used: result.model_used,
      model_selected: result.model_selected,
      model_mode: result.model_mode,
      model_mock: result.model_mock,
      client_state: extractClientState(state)
    });
    return;
  }

  const session = getOrCreateSession(sessionId, caseId);
  const result = await runTurn({
    state: session.state,
    characterId,
    message,
    language,
    modelMode
  });

  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    sessionId: session.id,
    dialogue: result.character_response.dialogue,
    public_state: result.public_state,
    evidence_delta: result.evidence_delta,
    accusations_delta: result.accusations_delta,
    time_advance_minutes: result.time_advance_minutes,
    event_delta: result.event_delta,
    debug_meta: result.debug_meta || null,
    model_used: result.model_used,
    model_selected: result.model_selected,
    model_mode: result.model_mode,
    model_mock: result.model_mock,
    client_state: extractClientState(session.state)
  });
});

app.post("/api/action", async (req, res) => {
  const { sessionId, actionType, locationId, language, caseId, client_state } = req.body || {};
  if (actionType !== "move" && actionType !== "inspect") {
    res.status(400).json({ error: "actionType must be move or inspect" });
    return;
  }

  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: client_state });
    const result = await runLocationAction({
      state,
      actionType,
      locationId,
      language
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      sessionId: sessionId || null,
      ...result,
      client_state: extractClientState(state)
    });
    return;
  }

  const session = getOrCreateSession(sessionId, caseId);
  const result = await runLocationAction({
    state: session.state,
    actionType,
    locationId,
    language
  });
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    sessionId: session.id,
    ...result,
    client_state: extractClientState(session.state)
  });
});

app.post("/api/observe", async (req, res) => {
  const { sessionId, locationId, hotspotId, language, caseId, client_state } = req.body || {};
  if (!hotspotId) {
    res.status(400).json({ error: "hotspotId is required" });
    return;
  }

  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: client_state });
    const result = await runObserveAction({
      state,
      locationId,
      hotspotId,
      language
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      sessionId: sessionId || null,
      ...result,
      client_state: extractClientState(state)
    });
    return;
  }

  const session = getOrCreateSession(sessionId, caseId);
  const result = await runObserveAction({
    state: session.state,
    locationId,
    hotspotId,
    language
  });
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    sessionId: session.id,
    ...result,
    client_state: extractClientState(session.state)
  });
});

app.post("/api/watson", async (req, res) => {
  const {
    sessionId,
    language,
    caseId,
    client_state,
    message,
    watson_settings,
    watson_history,
    board_state,
    watson_tools
  } = req.body || {};

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const state = client_state
    ? buildStateFromClient({ caseId, clientState: client_state })
    : getOrCreateSession(sessionId, caseId).state;
  await ensureCaseBriefing({ state });

  try {
    const watsonEvidenceContext = await buildWatsonEvidenceContext({ state, language });
    const result = await generateWatsonResponse({
      message,
      language,
      publicState: state.public_state,
      allCharacters: state.characters,
      boardState: board_state,
      tools: watson_tools,
      settings: watson_settings,
      history: watson_history,
      evidenceContext: watsonEvidenceContext
    });

    res.json({
      sessionId: sessionId || null,
      dialogue: result.dialogue,
      model_used: result._meta?.model_used || "unknown",
      model_selected: result._meta?.model_selected || "unknown",
      model_mode: result._meta?.model_mode || "watson",
      model_mock: Boolean(result._meta?.mock)
    });
  } catch (error) {
    res.json({
      sessionId: sessionId || null,
      dialogue: "Watson is taking a breath. Try again in a moment.",
      model_used: "fallback",
      model_selected: "fallback",
      model_mode: "watson",
      model_mock: true
    });
  }
});

app.post("/api/reset", async (req, res) => {
  const { sessionId, language, caseId, client_state } = req.body || {};
  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: null });
    await ensureCaseBriefing({ state });
    res.json({
      ...getPublicViewForState(state, language, sessionId || null),
      client_state: extractClientState(state)
    });
    return;
  }

  const session = resetSession(sessionId, caseId);
  await ensureCaseBriefing(session);
  res.json({
    ...getPublicView(session, language),
    client_state: extractClientState(session.state)
  });
});

app.post("/api/solve", async (req, res) => {
  const { sessionId, solution, reveal, language, caseId, client_state } = req.body || {};
  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: client_state });
    const result = await checkSolution({
      state,
      solution,
      reveal,
      language
    });
    res.json({
      sessionId: sessionId || null,
      result,
      client_state: extractClientState(state)
    });
    return;
  }

  const session = getOrCreateSession(sessionId, caseId);
  const result = await checkSolution({
    state: session.state,
    solution,
    reveal,
    language
  });
  res.json({
    sessionId: session.id,
    result,
    client_state: extractClientState(session.state)
  });
});

app.post("/api/storylab", async (req, res) => {
  const {
    caseId,
    novel,
    story_text,
    cast_list,
    timeline_notes,
    clue_list,
    solution_reveal,
    source_label,
    language,
    include_config,
    max_rounds,
    auto_fix,
    persist_backlog,
    judge_only,
    quality_bar
  } = req.body || {};
  const storyText = String(novel || story_text || "");
  if (!storyText.trim()) {
    res.status(400).json({ error: "novel or story_text is required" });
    return;
  }
  const resolvedCaseId = caseId || "athens-2012-kidnapping";
  const caseData = getCaseById(resolvedCaseId);
  if (!caseData || caseData.id !== resolvedCaseId) {
    res.status(404).json({ error: `Case not found: ${resolvedCaseId}` });
    return;
  }

  const seedState = createStateFromCase(caseData);
  const caseContext = {
    truth: seedState.truth,
    public_state: seedState.public_state,
    characters: seedState.characters.filter((character) => !character?.is_location_contact)
  };
  const result = judge_only
    ? await runMurderMysteryJudge({
        caseId: resolvedCaseId,
        caseContext,
        storyText,
        castList: cast_list,
        timeline: timeline_notes,
        clueList: clue_list,
        solutionReveal: solution_reveal,
        sourceLabel: source_label,
        language,
        qualityBar: quality_bar
      })
    : await runStoryQualityFeedbackLoop({
        caseId: resolvedCaseId,
        caseContext,
        storyText,
        castList: cast_list,
        timeline: timeline_notes,
        clueList: clue_list,
        solutionReveal: solution_reveal,
        sourceLabel: source_label,
        language,
        qualityBar: quality_bar,
        maxRounds: max_rounds,
        autoFix: auto_fix !== false,
        includeConfig: Boolean(include_config),
        persistBacklog: persist_backlog !== false
      });

  if (result?.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ caseId: resolvedCaseId, result });
});

app.post("/api/story-judge", async (req, res) => {
  const {
    caseId,
    novel,
    story_text,
    cast_list,
    timeline_notes,
    clue_list,
    solution_reveal,
    source_label,
    language,
    quality_bar
  } = req.body || {};
  const storyText = String(novel || story_text || "");
  if (!storyText.trim()) {
    res.status(400).json({ error: "novel or story_text is required" });
    return;
  }
  const resolvedCaseId = caseId || "athens-2012-kidnapping";
  const caseData = getCaseById(resolvedCaseId);
  if (!caseData || caseData.id !== resolvedCaseId) {
    res.status(404).json({ error: `Case not found: ${resolvedCaseId}` });
    return;
  }
  const seedState = createStateFromCase(caseData);
  const result = await runMurderMysteryJudge({
    caseId: resolvedCaseId,
    caseContext: {
      truth: seedState.truth,
      public_state: seedState.public_state,
      characters: seedState.characters.filter((character) => !character?.is_location_contact)
    },
    storyText,
    castList: cast_list,
    timeline: timeline_notes,
    clueList: clue_list,
    solutionReveal: solution_reveal,
    sourceLabel: source_label,
    language,
    qualityBar: quality_bar
  });
  if (result?.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ caseId: resolvedCaseId, result });
});

app.post("/api/story-loop", async (req, res) => {
  const {
    caseId,
    novel,
    story_text,
    cast_list,
    timeline_notes,
    clue_list,
    solution_reveal,
    source_label,
    language,
    include_config,
    max_rounds,
    auto_fix,
    persist_backlog,
    quality_bar
  } = req.body || {};
  const storyText = String(novel || story_text || "");
  if (!storyText.trim()) {
    res.status(400).json({ error: "novel or story_text is required" });
    return;
  }
  const resolvedCaseId = caseId || "athens-2012-kidnapping";
  const caseData = getCaseById(resolvedCaseId);
  if (!caseData || caseData.id !== resolvedCaseId) {
    res.status(404).json({ error: `Case not found: ${resolvedCaseId}` });
    return;
  }
  const seedState = createStateFromCase(caseData);
  const result = await runStoryQualityFeedbackLoop({
    caseId: resolvedCaseId,
    caseContext: {
      truth: seedState.truth,
      public_state: seedState.public_state,
      characters: seedState.characters.filter((character) => !character?.is_location_contact)
    },
    storyText,
    castList: cast_list,
    timeline: timeline_notes,
    clueList: clue_list,
    solutionReveal: solution_reveal,
    sourceLabel: source_label,
    language,
    qualityBar: quality_bar,
    maxRounds: max_rounds,
    autoFix: auto_fix !== false,
    includeConfig: Boolean(include_config),
    persistBacklog: persist_backlog !== false
  });
  if (result?.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ caseId: resolvedCaseId, result });
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  const urlHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`MVP server running on http://${urlHost}:${port}`);
});
