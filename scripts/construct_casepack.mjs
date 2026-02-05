import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createStateFromCase, getCaseById } from "../server/cases.js";
import { constructCaseConfig } from "../server/investigation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const outputDir = path.join(rootDir, "server", "generated_casepacks");

async function main() {
  const caseId = process.argv[2] || "athens-2012-kidnapping";
  const caseData = getCaseById(caseId);
  if (!caseData || caseData.id !== caseId) {
    throw new Error(`Case not found: ${caseId}`);
  }

  const seedState = createStateFromCase(caseData);
  const config = await constructCaseConfig(caseId, {
    truth: seedState.truth,
    public_state: seedState.public_state,
    characters: seedState.characters
  });
  if (!config) {
    throw new Error(`No constructor config generated for ${caseId}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${caseId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));

  const summary = {
    case_id: caseId,
    steps: Array.isArray(config.clue_chain) ? config.clue_chain.length : 0,
    facts: Array.isArray(config.truth_ledger) ? config.truth_ledger.length : 0,
    statements: Array.isArray(config.statement_scripts) ? config.statement_scripts.length : 0,
    output: outputPath
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
