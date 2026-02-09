import "dotenv/config";
import {
  buildStateFromClient,
  extractClientState,
  getPublicView,
  getPublicViewForState,
  resetSession
} from "../server/state.js";
import { ensureCaseBriefing } from "../server/narrator.js";
import { readJsonBody } from "../server/request.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const { sessionId, language, caseId, client_state } = body || {};
  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: null });
    await ensureCaseBriefing({ state });
    res.status(200).json({
      ...getPublicViewForState(state, language, sessionId || null),
      client_state: extractClientState(state)
    });
    return;
  }

  const session = resetSession(sessionId, caseId);
  await ensureCaseBriefing(session);
  res.status(200).json({
    ...getPublicView(session, language),
    client_state: extractClientState(session.state)
  });
}
