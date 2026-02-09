import "dotenv/config";
import { buildStateFromClient, getOrCreateSession } from "../server/state.js";
import { ensureCaseBriefing } from "../server/narrator.js";
import { generateWatsonResponse } from "../server/llm.js";
import { readJsonBody } from "../server/request.js";
import { buildWatsonEvidenceContext } from "../server/watson_context.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
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
  } = body || {};

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

    res.status(200).json({
      sessionId: sessionId || null,
      dialogue: result.dialogue,
      model_used: result._meta?.model_used || "unknown",
      model_selected: result._meta?.model_selected || "unknown",
      model_mode: result._meta?.model_mode || "watson",
      model_mock: Boolean(result._meta?.mock)
    });
  } catch (error) {
    res.status(200).json({
      sessionId: sessionId || null,
      dialogue: "Watson is taking a breath. Try again in a moment.",
      model_used: "fallback",
      model_selected: "fallback",
      model_mode: "watson",
      model_mock: true
    });
  }
}
