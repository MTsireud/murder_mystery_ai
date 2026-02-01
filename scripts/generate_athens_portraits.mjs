import OpenAI from "openai";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { CASE_LIBRARY } from "../server/cases.js";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is required.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const caseData = CASE_LIBRARY.find((entry) => entry.id === "athens-2012-kidnapping");
if (!caseData) {
  console.error("Athens case not found.");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "public", "images", "athens-2012");
await mkdir(outDir, { recursive: true });

for (const character of caseData.characters) {
  if (!character.portrait_prompt || !character.portrait_path) continue;
  const outPath = path.join(process.cwd(), "public", character.portrait_path);
  console.log(`Generating ${character.id} -> ${character.portrait_path}`);

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: character.portrait_prompt,
    size: "1024x1024"
  });

  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) {
    console.error(`No image data for ${character.id}.`);
    continue;
  }

  const buffer = Buffer.from(b64, "base64");
  await writeFile(outPath, buffer);
}

console.log("Done.");
