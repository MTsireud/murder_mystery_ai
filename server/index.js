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
import { getCaseList } from "./cases.js";
import { runTurn } from "./logic.js";
import { ensureCaseBriefing } from "./narrator.js";
import { checkSolution } from "./checker.js";

const app = express();
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

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
    model_used: result.model_used,
    model_selected: result.model_selected,
    model_mode: result.model_mode,
    model_mock: result.model_mock,
    client_state: extractClientState(session.state)
  });
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

const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";
app.listen(port, host, () => {
  const urlHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`MVP server running on http://${urlHost}:${port}`);
});
