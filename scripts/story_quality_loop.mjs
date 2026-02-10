// Story Loop CLI
// Run: `npm run story:loop -- <caseId> --file <story.txt>` or `cat <story.txt> | npm run story:loop -- <caseId>`.
// Purpose: ingest a story, run judge/enrich loop, and optionally persist a passed backlog artifact.
import "dotenv/config";
import fs from "fs";
import { createStateFromCase, getCaseById } from "../server/cases.js";
import { runStoryQualityFeedbackLoop } from "../server/story_feedback_loop.js";

function readFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return "";
  if (index + 1 >= args.length) return "";
  return args[index + 1];
}

function readNumberFlag(args, flag, fallback) {
  const value = Number(readFlag(args, flag));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const caseId = args[0] && !args[0].startsWith("--") ? args[0] : "athens-2012-kidnapping";
  const filePath = readFlag(args, "--file");
  const textArg = readFlag(args, "--text");
  const castList = readFlag(args, "--cast");
  const timeline = readFlag(args, "--timeline");
  const clueList = readFlag(args, "--clues");
  const solutionReveal = readFlag(args, "--solution");
  const sourceLabel = readFlag(args, "--source");
  const maxRounds = readNumberFlag(args, "--max-rounds", 3);
  const autoFix = !args.includes("--no-fix");
  const persistBacklog = !args.includes("--no-backlog");
  const includeConfig = args.includes("--include-config");

  const caseData = getCaseById(caseId);
  if (!caseData || caseData.id !== caseId) {
    throw new Error(`Case not found: ${caseId}`);
  }

  let storyText = "";
  if (textArg) {
    storyText = textArg;
  } else if (filePath) {
    storyText = fs.readFileSync(filePath, "utf8");
  } else {
    storyText = fs.readFileSync(0, "utf8");
  }
  if (!String(storyText || "").trim()) {
    throw new Error("Story text is empty. Use --text, --file, or stdin.");
  }

  const seedState = createStateFromCase(caseData);
  const result = await runStoryQualityFeedbackLoop({
    caseId,
    caseContext: {
      truth: seedState.truth,
      public_state: seedState.public_state,
      characters: seedState.characters.filter((character) => !character?.is_location_contact)
    },
    storyText,
    castList,
    timeline,
    clueList,
    solutionReveal,
    sourceLabel,
    maxRounds,
    autoFix,
    includeConfig,
    persistBacklog
  });

  if (result?.error) {
    throw new Error(result.error);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
