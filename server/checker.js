import { getOpenAIClient } from "./openai.js";
import { getLocalized, normalizeLanguage } from "./i18n.js";
import { loadPrompt } from "./prompts.js";

const CHECKER_MODEL =
  process.env.OPENAI_MODEL_CHECKER ||
  process.env.OPENAI_MODEL_CRITICAL ||
  "gpt-4.1";
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 240);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.2);

const CHECKER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "verdict",
    "checks",
    "missing_characters",
    "inconsistencies",
    "advice",
    "reveal_requested",
    "reveal"
  ],
  properties: {
    verdict: { type: "string", enum: ["correct", "partially_correct", "incorrect", "insufficient"] },
    checks: {
      type: "object",
      additionalProperties: false,
      required: ["killer", "method", "motive", "timeline", "character_coverage", "consistency"],
      properties: {
        killer: { type: "string", enum: ["match", "mismatch", "missing"] },
        method: { type: "string", enum: ["match", "mismatch", "missing"] },
        motive: { type: "string", enum: ["match", "mismatch", "missing"] },
        timeline: { type: "string", enum: ["match", "mismatch", "missing"] },
        character_coverage: { type: "string", enum: ["complete", "incomplete"] },
        consistency: { type: "string", enum: ["consistent", "inconsistent"] }
      }
    },
    missing_characters: {
      type: "array",
      items: { type: "string" }
    },
    inconsistencies: {
      type: "array",
      items: { type: "string" }
    },
    advice: {
      type: "array",
      items: { type: "string" }
    },
    reveal_requested: { type: "boolean" },
    reveal: {
      type: "object",
      additionalProperties: false,
      required: ["killer_id", "killer_name", "method", "motive", "timeline", "planted_evidence"],
      properties: {
        killer_id: { type: "string" },
        killer_name: { type: "string" },
        method: { type: "string" },
        motive: { type: "string" },
        timeline: {
          type: "array",
          items: { type: "string" }
        },
        planted_evidence: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  }
};

function extractOutputText(response) {
  if (!response) return "";
  if (typeof response.output_text === "string") return response.output_text;
  const outputs = response.output || [];
  for (const item of outputs) {
    const content = item?.content || [];
    for (const entry of content) {
      if (entry?.type === "output_text" && typeof entry.text === "string") {
        return entry.text;
      }
    }
  }
  return "";
}

function blankReveal() {
  return {
    killer_id: "",
    killer_name: "",
    method: "",
    motive: "",
    timeline: [],
    planted_evidence: []
  };
}

function normalizeSolution(solution) {
  if (!solution || typeof solution !== "object") return {};
  return {
    killer: String(solution.killer || ""),
    method: String(solution.method || ""),
    motive: String(solution.motive || ""),
    timeline: String(solution.timeline || ""),
    character_notes: String(solution.character_notes || ""),
    full_text: String(solution.full_text || "")
  };
}

function buildCheckerContext({ state, language, solution, revealRequested }) {
  const lang = normalizeLanguage(language);
  return {
    response_language: lang,
    reveal_requested: revealRequested,
    truth: state.truth,
    public_state: {
      case_time: state.public_state.case_time,
      case_location: state.public_state.case_location,
      tensions: state.public_state.tensions,
      discovered_evidence: state.public_state.discovered_evidence
    },
    characters: state.characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: getLocalized(character.role, lang)
    })),
    solution
  };
}

function fallbackResult(revealRequested) {
  return {
    verdict: "insufficient",
    checks: {
      killer: "missing",
      method: "missing",
      motive: "missing",
      timeline: "missing",
      character_coverage: "incomplete",
      consistency: "inconsistent"
    },
    missing_characters: [],
    inconsistencies: ["Checker unavailable."],
    advice: ["Try again once the model is available."],
    reveal_requested: revealRequested,
    reveal: revealRequested ? blankReveal() : blankReveal()
  };
}

export async function checkSolution({ state, solution, reveal, language }) {
  const revealRequested = Boolean(reveal);
  const client = getOpenAIClient();
  if (!client) return fallbackResult(revealRequested);

  const prompt = loadPrompt("checker");
  const normalizedSolution = normalizeSolution(solution);
  const context = buildCheckerContext({
    state,
    language,
    solution: normalizedSolution,
    revealRequested
  });

  let response;
  try {
    response = await client.responses.create({
      model: CHECKER_MODEL,
      input: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(context) }
      ],
      temperature: TEMPERATURE,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      text: {
        format: {
          type: "json_schema",
          name: "CaseCheck",
          strict: true,
          schema: CHECKER_SCHEMA
        }
      }
    });
  } catch {
    return fallbackResult(revealRequested);
  }

  const outputText = extractOutputText(response);
  if (!outputText) return fallbackResult(revealRequested);
  try {
    const parsed = JSON.parse(outputText);
    parsed.reveal_requested = revealRequested;
    if (!revealRequested) {
      parsed.reveal = blankReveal();
    }
    return parsed;
  } catch {
    return fallbackResult(revealRequested);
  }
}
