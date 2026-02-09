import "dotenv/config";
import fs from "fs";
import { createStateFromCase, getCaseById } from "../server/cases.js";
import { runMurderMysteryJudge } from "../server/story_judge.js";

function readFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return "";
  if (index + 1 >= args.length) return "";
  return args[index + 1];
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
  const asJson = args.includes("--json");

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
  const result = await runMurderMysteryJudge({
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
    sourceLabel
  });

  if (result?.error) {
    throw new Error(result.error);
  }

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const gate = result.quality_gate || { verdict: "fail", reasons: [] };
  const verdictLine = `Quality Gate: ${String(gate.verdict || "fail").toUpperCase()}`;
  const reasons = Array.isArray(gate.reasons) && gate.reasons.length
    ? `Reasons: ${gate.reasons.join(" | ")}`
    : "Reasons: none";
  console.log(`${result.report_markdown}\n\n${verdictLine}\n${reasons}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
