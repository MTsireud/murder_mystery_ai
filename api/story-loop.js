// Story Loop API Route
// Run locally with `npm run dev`, then POST `story_text` to `/api/story-loop`.
// Purpose: execute judge/enrich loop, constructor pass, and optional backlog persistence.
import "dotenv/config";
import { createStateFromCase, getCaseById } from "../server/cases.js";
import { readJsonBody } from "../server/request.js";
import { runStoryQualityFeedbackLoop } from "../server/story_feedback_loop.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
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
  } = body || {};
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
  res.status(200).json({ caseId: resolvedCaseId, result });
}
