import {
  buildStateFromClient,
  extractClientState,
  getOrCreateSession,
  getPublicView,
  getPublicViewForState
} from "../server/state.js";
import { ensureCaseBriefing } from "../server/narrator.js";
import { readJsonBody } from "../server/request.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const { sessionId, language, caseId, client_state } = body || {};
    if (client_state) {
      const state = buildStateFromClient({ caseId, clientState: client_state });
      await ensureCaseBriefing({ state });
      res.status(200).json({
        ...getPublicViewForState(state, language, sessionId || null),
        client_state: extractClientState(state)
      });
      return;
    }

    const session = getOrCreateSession(sessionId, caseId);
    await ensureCaseBriefing(session);
    res.status(200).json({
      ...getPublicView(session, language),
      client_state: extractClientState(session.state)
    });
    return;
  }

  const session = getOrCreateSession(req.query?.sessionId, req.query?.caseId);
  await ensureCaseBriefing(session);
  res.status(200).json({
    ...getPublicView(session, req.query?.lang),
    client_state: extractClientState(session.state)
  });
}
