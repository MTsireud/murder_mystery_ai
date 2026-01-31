import {
  buildStateFromClient,
  extractClientState,
  getOrCreateSession
} from "../server/state.js";
import { readJsonBody } from "../server/request.js";
import { checkSolution } from "../server/checker.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  const { sessionId, solution, reveal, language, caseId, client_state } = body || {};
  if (client_state) {
    const state = buildStateFromClient({ caseId, clientState: client_state });
    const result = await checkSolution({
      state,
      solution,
      reveal,
      language
    });

    res.status(200).json({
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

  res.status(200).json({
    sessionId: session.id,
    result,
    client_state: extractClientState(session.state)
  });
}
