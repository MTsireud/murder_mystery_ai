import "dotenv/config";
import {
  buildStateFromClient,
  extractClientState,
  getOrCreateSession
} from "../server/state.js";
import { runTurn } from "../server/logic.js";
import { readJsonBody } from "../server/request.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const { sessionId, characterId, message, language, modelMode, caseId, client_state } = body || {};
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

    res.status(200).json({
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

  res.status(200).json({
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
}
