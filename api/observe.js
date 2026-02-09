import "dotenv/config";
import {
  buildStateFromClient,
  extractClientState,
  getOrCreateSession
} from "../server/state.js";
import { runObserveAction } from "../server/logic.js";
import { readJsonBody } from "../server/request.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const { sessionId, locationId, hotspotId, language, caseId, client_state } = body || {};
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
    res.status(200).json({
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
  res.status(200).json({
    sessionId: session.id,
    ...result,
    client_state: extractClientState(session.state)
  });
}
