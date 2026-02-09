import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CASE_LIBRARY, createStateFromCase } from "../server/cases.js";
import { runStoryQualityFeedbackLoop } from "../server/story_feedback_loop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const casepackOutputDir = path.join(rootDir, "server", "generated_casepacks");

function readFlag(args, flag, fallback = "") {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  if (index + 1 >= args.length) return fallback;
  return args[index + 1];
}

function readNumberFlag(args, flag, fallback) {
  const value = Number(readFlag(args, flag, ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function asEn(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.en === "string") return value.en;
  return "";
}

function buildStoryText(caseData) {
  const truthTimeline = Array.isArray(caseData?.truth?.timeline)
    ? caseData.truth.timeline.map((item) => `- ${item}`).join("\n")
    : "-";
  const plantedEvidence = Array.isArray(caseData?.truth?.planted_evidence)
    ? caseData.truth.planted_evidence.map((item) => `- ${item}`).join("\n")
    : "-";
  const sections = [
    `Case: ${asEn(caseData.title)}`,
    asEn(caseData.plot) || asEn(caseData.synopsis),
    `Public briefing:\n${asEn(caseData?.public_state?.case_briefing)}`,
    `Intended solution:\n${asEn(caseData.solution)}`,
    `Truth timeline:\n${truthTimeline}`,
    `Planted evidence:\n${plantedEvidence}`
  ].filter(Boolean);
  return sections.join("\n\n");
}

function buildCastList(state) {
  const characters = Array.isArray(state?.characters) ? state.characters : [];
  return characters
    .filter((character) => !character?.is_location_contact)
    .map((character) => `${character.name} - ${asEn(character.role)}`)
    .join("\n");
}

function buildTimelineNotes(state) {
  const truthTimeline = Array.isArray(state?.truth?.timeline) ? state.truth.timeline : [];
  return truthTimeline.join("\n");
}

function summarizeResult(caseId, result) {
  const rounds = Array.isArray(result?.rounds) ? result.rounds : [];
  const finalRound = rounds[rounds.length - 1] || {};
  const finalJudge = finalRound?.judge || {};
  return {
    case_id: caseId,
    pass: Boolean(result?.pass),
    verdict: result?.verdict || "fail",
    rounds_completed: Number(result?.rounds_completed || rounds.length || 0),
    final_score: Number(finalJudge?.final_score?.total || 0),
    failed_checks: Array.isArray(finalJudge?.quality_gate?.failed_checks)
      ? finalJudge.quality_gate.failed_checks
      : Array.isArray(finalJudge?.failed_checks)
        ? finalJudge.failed_checks
        : []
  };
}

async function main() {
  const args = process.argv.slice(2);
  const onlyCase = readFlag(args, "--case", "");
  const outputPath = readFlag(args, "--out", "");
  const maxRounds = readNumberFlag(args, "--max-rounds", 3);
  const writeCasepacks = args.includes("--write-casepacks");
  const includeConfig = writeCasepacks || args.includes("--include-config");
  const autoFix = !args.includes("--no-fix");

  const selectedCases = onlyCase
    ? CASE_LIBRARY.filter((caseData) => caseData.id === onlyCase)
    : CASE_LIBRARY.slice();

  if (!selectedCases.length) {
    throw new Error(onlyCase ? `Case not found: ${onlyCase}` : "No cases available.");
  }

  const reports = [];
  for (const caseData of selectedCases) {
    const caseId = caseData.id;
    const seedState = createStateFromCase(caseData);
    const result = await runStoryQualityFeedbackLoop({
      caseId,
      caseContext: {
        truth: seedState.truth,
        public_state: seedState.public_state,
        characters: seedState.characters.filter((character) => !character?.is_location_contact)
      },
      storyText: buildStoryText(caseData),
      castList: buildCastList(seedState),
      timeline: buildTimelineNotes(seedState),
      clueList: (Array.isArray(caseData?.truth?.planted_evidence) ? caseData.truth.planted_evidence : []).join("\n"),
      solutionReveal: asEn(caseData.solution),
      sourceLabel: "case-library-batch",
      maxRounds,
      autoFix,
      includeConfig
    });

    if (result?.error) {
      reports.push({
        case_id: caseId,
        pass: false,
        verdict: "error",
        rounds_completed: 0,
        final_score: 0,
        failed_checks: ["pipeline_error"],
        error: result.error
      });
      continue;
    }

    if (writeCasepacks && result.final_casepack) {
      fs.mkdirSync(casepackOutputDir, { recursive: true });
      const pathOut = path.join(casepackOutputDir, `${caseId}.json`);
      fs.writeFileSync(pathOut, JSON.stringify(result.final_casepack, null, 2));
    }

    reports.push(summarizeResult(caseId, result));
  }

  const failed = reports.filter((entry) => !entry.pass);
  const output = {
    run_at: new Date().toISOString(),
    cases_total: reports.length,
    failed_total: failed.length,
    max_rounds: maxRounds,
    auto_fix: autoFix,
    write_casepacks: writeCasepacks,
    results: reports
  };

  if (outputPath) {
    const resolvedOutput = path.isAbsolute(outputPath)
      ? outputPath
      : path.join(rootDir, outputPath);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, JSON.stringify(output, null, 2));
  }

  console.log(JSON.stringify(output, null, 2));
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
