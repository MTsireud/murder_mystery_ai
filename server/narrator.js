import { getOpenAIClient } from "./openai.js";
import { getLocalized } from "./i18n.js";
import { loadPrompt } from "./prompts.js";

const NARRATOR_MODEL =
  process.env.OPENAI_MODEL_NARRATOR ||
  process.env.OPENAI_MODEL_ROUTINE ||
  "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 220);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.4);

const BRIEFING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["briefing_en", "briefing_el"],
  properties: {
    briefing_en: { type: "string" },
    briefing_el: { type: "string" }
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

function buildNarratorContext(state) {
  return {
    truth: state.truth,
    public_state: {
      victim_name: state.public_state.victim_name,
      victim_role: state.public_state.victim_role,
      case_time: state.public_state.case_time,
      case_location: state.public_state.case_location,
      tensions: state.public_state.tensions,
      discovered_evidence: state.public_state.discovered_evidence
    },
    characters: state.characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role
    }))
  };
}

function buildFallbackBriefing(publicState) {
  const victimNameEn = getLocalized(publicState.victim_name, "en");
  const victimRoleEn = getLocalized(publicState.victim_role, "en");
  const victimNameEl = getLocalized(publicState.victim_name, "el");
  const victimRoleEl = getLocalized(publicState.victim_role, "el");

  const en = `The victim, ${victimNameEn} (${victimRoleEn}), was found dead in the stairwell minutes after the show was delayed. The cast and crew are contained backstage, the press is gathering outside, and you have a short window to question everyone before police take over.`;
  const el = `Το θύμα, ${victimNameEl} (${victimRoleEl}), βρέθηκε νεκρό στη σκάλα λίγα λεπτά μετά την καθυστέρηση της παράστασης. Το καστ και το συνεργείο έχουν απομονωθεί στα παρασκήνια, ο Τύπος συγκεντρώνεται έξω και έχεις λίγο χρόνο να ανακρίνεις πριν αναλάβει η αστυνομία.`;

  return { en, el };
}

function briefingMentionsUnderstudy(publicState) {
  const en = getLocalized(publicState.case_briefing, "en").toLowerCase();
  const el = getLocalized(publicState.case_briefing, "el").toLowerCase();
  return en.includes("understudy") || el.includes("αναπληρω");
}

export async function generateCaseBriefing({ state }) {
  const client = getOpenAIClient();
  if (!client) return null;
  const prompt = loadPrompt("narrator");
  const context = buildNarratorContext(state);

  let response;
  try {
    response = await client.responses.create({
      model: NARRATOR_MODEL,
      input: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(context) }
      ],
      temperature: TEMPERATURE,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      text: {
        format: {
          type: "json_schema",
          name: "CaseBriefing",
          strict: true,
          schema: BRIEFING_SCHEMA
        }
      }
    });
  } catch {
    return null;
  }

  const outputText = extractOutputText(response);
  if (!outputText) return null;
  try {
    return JSON.parse(outputText);
  } catch {
    return null;
  }
}

export async function ensureCaseBriefing(session) {
  const publicState = session?.state?.public_state;
  if (!publicState) return;

  if (publicState.case_briefing_source === "library") {
    return;
  }

  if (briefingMentionsUnderstudy(publicState)) {
    publicState.case_briefing = buildFallbackBriefing(publicState);
    publicState.case_briefing_source = "seed";
  }

  if (publicState.case_briefing_source === "generated") return;

  const result = await generateCaseBriefing({ state: session.state });
  if (!result) {
    publicState.case_briefing = buildFallbackBriefing(publicState);
    publicState.case_briefing_source = "seed";
    return;
  }

  const fallbackEn = getLocalized(publicState.case_briefing, "en");
  const fallbackEl = getLocalized(publicState.case_briefing, "el");
  publicState.case_briefing = {
    en: result.briefing_en || fallbackEn,
    el: result.briefing_el || fallbackEl
  };
  publicState.case_briefing_source = "generated";
}
