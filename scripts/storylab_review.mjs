import "dotenv/config";
import fs from "fs";
import { createStateFromCase, getCaseById } from "../server/cases.js";
import { reviewNovelForGameplay } from "../server/storylab.js";

async function main() {
  const caseId = process.argv[2] || "athens-2012-kidnapping";
  const novelPath = process.argv[3] || "";
  const includeConfig = process.argv.includes("--include-config");

  const caseData = getCaseById(caseId);
  if (!caseData || caseData.id !== caseId) {
    throw new Error(`Case not found: ${caseId}`);
  }

  let novel = "";
  if (novelPath) {
    novel = fs.readFileSync(novelPath, "utf8");
  } else {
    novel = fs.readFileSync(0, "utf8");
  }

  if (!String(novel || "").trim()) {
    throw new Error("Novel text is empty. Provide a file path or pipe text via stdin.");
  }

  const seedState = createStateFromCase(caseData);
  const result = await reviewNovelForGameplay({
    caseId,
    caseContext: {
      truth: seedState.truth,
      public_state: seedState.public_state,
      characters: seedState.characters.filter((character) => !character?.is_location_contact)
    },
    novel,
    includeConfig
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
