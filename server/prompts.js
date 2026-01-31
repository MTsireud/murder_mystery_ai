import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = path.join(__dirname, "..", "agents");
const cache = new Map();

export function loadPrompt(agentName) {
  if (cache.has(agentName)) return cache.get(agentName);
  const filePath = path.join(PROMPT_DIR, agentName, "AGENTS.md");
  const text = fs.readFileSync(filePath, "utf8").trim();
  cache.set(agentName, text);
  return text;
}
