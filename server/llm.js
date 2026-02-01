import { getLocalized, normalizeLanguage, t } from "./i18n.js";
import { getOpenAIClient } from "./openai.js";

const ROUTINE_MODEL = process.env.OPENAI_MODEL_ROUTINE || "gpt-4.1-mini";
const CRITICAL_MODEL = process.env.OPENAI_MODEL_CRITICAL || "gpt-4.1";
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 220);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.7);
const USE_MOCK = String(process.env.OPENAI_USE_MOCK || "false").toLowerCase() === "true";

const KEYWORDS = {
  en: {
    alibi: ["where", "when", "alibi"],
    evidence: ["evidence", "saw", "seen", "notice", "observe", "observed"],
    accusation: ["who", "suspect", "motive", "blame", "accuse", "accusation", "killer", "murder"],
    secret: ["secret", "pressure", "truth", "confess"],
    mistake: ["mistake", "error"],
    finance: ["finance", "money", "funds", "budget"]
  },
  el: {
    alibi: ["πού", "που", "πότε", "άλλοθι", "αλλοθι"],
    evidence: ["απόδειξη", "αποδείξεις", "είδες", "είδα", "παρατήρησες", "παρατήρησα", "πρόσεξες", "πρόσεξα"],
    accusation: [
      "ποιος",
      "ποια",
      "ποιον",
      "ύποπτος",
      "υποπτος",
      "κίνητρο",
      "φταίει",
      "κατηγορείς",
      "κατηγορία",
      "δολοφόνος",
      "δολοφον"
    ],
    secret: ["μυστικό", "αλήθεια", "πιέζω", "πίεση", "ομολογ"],
    mistake: ["λάθος", "σφάλμα"],
    finance: ["οικονομ", "χρήμα", "ταμεί", "χρέος"]
  }
};

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dialogue", "claims", "intent"],
  properties: {
    dialogue: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "content", "confidence", "evidence"],
        properties: {
          type: {
            type: "string",
            enum: ["alibi", "accusation", "observation", "rumor", "other"]
          },
          content: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          evidence: { type: "string" }
        }
      }
    },
    intent: {
      type: "string",
      enum: ["deflect", "accuse", "reveal", "stall", "comply"]
    }
  }
};

function matchAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function pickDefaultLine(character, language) {
  const trait = getLocalized(character.psycho[0], language) || "reserved";
  return t(language, "default_line", { trait });
}

function shouldLie(character, message, language) {
  const lower = message.toLowerCase();
  const tags = new Set(character.lie_strategy_tags || []);
  const keyset = KEYWORDS[language] || KEYWORDS.en;

  if (tags.has("deny_where_when") && matchAny(lower, keyset.alibi)) {
    return true;
  }

  if (tags.has("deny_timing") && /\b\d{1,2}:\d{2}\b/.test(lower)) {
    return true;
  }

  if (tags.has("deflect_mistakes") && matchAny(lower, keyset.mistake)) {
    return true;
  }

  if (tags.has("minimize_finances") && matchAny(lower, keyset.finance)) {
    return true;
  }

  return false;
}

function getIntent(message, language) {
  const lower = message.toLowerCase();
  const keyset = KEYWORDS[language] || KEYWORDS.en;

  if (matchAny(lower, keyset.alibi)) return "alibi";
  if (matchAny(lower, keyset.evidence)) return "evidence";
  if (matchAny(lower, keyset.accusation)) return "accuse";
  if (matchAny(lower, keyset.secret)) return "secret";
  return "default";
}

function normalizeIntent(intent) {
  const allowed = new Set(["deflect", "accuse", "reveal", "stall", "comply"]);
  return allowed.has(intent) ? intent : "comply";
}

function normalizeModelMode(input) {
  const value = String(input || "auto").toLowerCase();
  if (value === "routine" || value === "critical" || value === "auto") return value;
  return "auto";
}

function selectModel({ intent, message, mode }) {
  if (mode === "routine") return ROUTINE_MODEL;
  if (mode === "critical") return CRITICAL_MODEL;
  const lower = message.toLowerCase();
  const criticalTriggers = ["confess", "killer", "murder", "weapon", "cover up", "frame"];
  const isCritical =
    intent === "accuse" ||
    intent === "secret" ||
    intent === "alibi" ||
    criticalTriggers.some((trigger) => lower.includes(trigger));
  return isCritical ? CRITICAL_MODEL : ROUTINE_MODEL;
}

function buildCharacterPrompt({ character, language, publicState, allCharacters }) {
  const role = getLocalized(character.role, language);
  const psycho = (character.psycho || []).map((item) => `- ${getLocalized(item, language)}`).join("\n");
  const goals = (character.goals || []).map((item) => `- ${getLocalized(item, language)}`).join("\n");
  const secrets = (character.secrets || []).map((item) => `- ${getLocalized(item, language)}`).join("\n");
  const knowledge = (character.knowledge || [])
    .slice(-8)
    .map((item) => `- ${getLocalized(item, language)}`)
    .join("\n");

  const observationText = getLocalized(character.private_facts?.observation?.text, language);
  const observationEvidence = getLocalized(character.private_facts?.observation?.evidence, language);
  const suspect = allCharacters.find((c) => c.id === character.private_facts?.suspicion_id);
  const suspectLine = suspect ? `${suspect.name} (${getLocalized(suspect.role, language)})` : "";

  const evidenceList = (publicState?.discovered_evidence || [])
    .slice(-6)
    .map((item) => `- ${getLocalized(item, language)}`)
    .join("\n");

  const accusations = (publicState?.public_accusations || [])
    .slice(-6)
    .map((item) => `- ${getLocalized(item, language)}`)
    .join("\n");

  const languageName = language === "el" ? "Greek" : "English";

  return [
    `You are ${character.name}, the ${role}.`,
    `Respond in ${languageName}.`,
    "Stay in character and keep answers concise (1-4 sentences).",
    "You can lie if your lie strategy tags support it, but do not invent verified evidence.",
    "If you do not know something, say you do not know.",
    "Never mention hidden truth unless it is in your private facts.",
    "Return ONLY valid JSON that matches the provided schema.",
    "",
    "Personality traits:",
    psycho || "-",
    "Goals:",
    goals || "-",
    "Secrets:",
    secrets || "-",
    "Private facts:",
    `- true alibi: ${getLocalized(character.private_facts?.true_alibi, language)}`,
    `- lie alibi: ${getLocalized(character.private_facts?.lie_alibi, language)}`,
    `- motive: ${getLocalized(character.private_facts?.motive, language)}`,
    `- leverage: ${getLocalized(character.private_facts?.leverage, language)}`,
    observationText ? `- observation: ${observationText}` : "- observation: none",
    observationEvidence ? `- evidence label: ${observationEvidence}` : "- evidence label: none",
    suspectLine ? `- suspicion: ${suspectLine}` : "- suspicion: none",
    "Lie strategy tags:",
    `- ${(character.lie_strategy_tags || []).join(", ") || "none"}`,
    "Knowledge (latest first):",
    knowledge || "-",
    "Public evidence (summary):",
    evidenceList || "-",
    "Public accusations (summary):",
    accusations || "-"
  ].join("\n");
}

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

function sanitizeResponse(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { dialogue: "", claims: [], intent: "comply" };
  }
  return {
    dialogue: typeof parsed.dialogue === "string" ? parsed.dialogue : "",
    claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    intent: normalizeIntent(parsed.intent)
  };
}

async function generateCharacterResponseMock({ character, message, language, allCharacters }) {
  const lang = normalizeLanguage(language);
  const response = {
    dialogue: "",
    claims: [],
    intent: "comply"
  };

  const intent = getIntent(message, lang);

  if (intent === "alibi") {
    const useLie = shouldLie(character, message, lang);
    const alibi = getLocalized(
      useLie ? character.private_facts.lie_alibi : character.private_facts.true_alibi,
      lang
    );
    response.dialogue = t(lang, "alibi_line", { alibi });
    response.claims.push({
      type: "alibi",
      content: alibi,
      confidence: useLie ? "low" : "high",
      evidence: ""
    });
    response.intent = useLie ? "deflect" : "comply";
    return response;
  }

  if (intent === "evidence") {
    const observation = character.private_facts.observation;
    response.dialogue = getLocalized(observation.text, lang);
    response.claims.push({
      type: "observation",
      content: response.dialogue,
      confidence: "medium",
      evidence: getLocalized(observation.evidence, lang)
    });
    response.intent = "reveal";
    return response;
  }

  if (intent === "accuse") {
    const suspicionId = character.private_facts.suspicion_id;
    const target =
      allCharacters.find((c) => c.id === suspicionId) ||
      allCharacters.find((c) => c.id !== character.id);
    const targetName = target?.name || t(lang, "no_one_specific");
    response.dialogue = t(lang, "accusation_line", { name: targetName });
    response.claims.push({
      type: "accusation",
      content: targetName,
      confidence: "medium",
      evidence: ""
    });
    response.intent = "accuse";
    return response;
  }

  if (intent === "secret") {
    response.dialogue = t(lang, "secret_line");
    response.intent = "deflect";
    return response;
  }

  response.dialogue = pickDefaultLine(character, lang);
  response.intent = normalizeIntent(response.intent);
  return response;
}

export async function generateCharacterResponse({
  character,
  message,
  language,
  allCharacters,
  publicState,
  modelMode
}) {
  const lang = normalizeLanguage(language);
  const client = getOpenAIClient();
  const mode = normalizeModelMode(modelMode);
  const intent = getIntent(message, lang);
  const selectedModel = selectModel({ intent, message, mode });

  if (!client || USE_MOCK) {
    const response = await generateCharacterResponseMock({
      character,
      message,
      language: lang,
      allCharacters
    });
    response._meta = {
      model_used: "mock",
      model_selected: selectedModel,
      model_mode: mode,
      mock: true
    };
    return response;
  }

  const model = selectedModel;
  const prompt = buildCharacterPrompt({
    character,
    language: lang,
    publicState,
    allCharacters
  });

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: prompt
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: TEMPERATURE,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    text: {
      format: {
        type: "json_schema",
        name: "CharacterResponse",
        strict: true,
        schema: RESPONSE_SCHEMA
      }
    }
  });

  const outputText = extractOutputText(response);
  let parsed = null;
  if (outputText) {
    try {
      parsed = JSON.parse(outputText);
    } catch {
      parsed = null;
    }
  }
  if (!parsed) {
    const fallback = await generateCharacterResponseMock({
      character,
      message,
      language: lang,
      allCharacters
    });
    fallback._meta = {
      model_used: "mock",
      model_selected: model,
      model_mode: mode,
      mock: true
    };
    return fallback;
  }
  const sanitized = sanitizeResponse(parsed);
  sanitized._meta = {
    model_used: model,
    model_selected: model,
    model_mode: mode,
    mock: false
  };
  return sanitized;
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeWatsonSettings(settings = {}) {
  const frequency = String(settings.frequency || "normal").toLowerCase();
  const style = String(settings.style || "questions").toLowerCase();
  const quality = clampNumber(Number(settings.quality ?? 70), 0, 100);
  return {
    frequency: ["off", "rare", "normal", "high"].includes(frequency) ? frequency : "normal",
    style: ["questions", "hypothesis"].includes(style) ? style : "questions",
    quality
  };
}

function buildWatsonPrompt({
  language,
  publicState,
  allCharacters,
  boardState,
  tools,
  settings
}) {
  const lang = normalizeLanguage(language);
  const languageName = lang === "el" ? "Greek" : "English";
  const safeTools = Array.isArray(tools) ? tools.slice(0, 8) : [];
  const safeBoard = boardState || {};
  const toolLines = safeTools.length
    ? safeTools
        .map((tool) => {
          const summary = tool.summary ? ` - ${tool.summary}` : "";
          const prompt = tool.prompt ? ` | Prompt: ${tool.prompt}` : "";
          return `- ${tool.name} (Output: ${tool.output})${summary}${prompt}`;
        })
        .join("\n")
    : "- Build Timeline\n- Relationship Mapping\n- Alibi Lock\n- Motive Probe\n- Strategic Use of Evidence\n- Contradiction Press\n- Theory Builder";

  const anchors = Array.isArray(safeBoard.anchors) ? safeBoard.anchors.slice(0, 6) : [];
  const gaps = Array.isArray(safeBoard.timeline_gaps) ? safeBoard.timeline_gaps.slice(0, 4) : [];
  const evidence = Array.isArray(safeBoard.evidence) ? safeBoard.evidence.slice(0, 6) : [];
  const contradictions = Array.isArray(safeBoard.contradictions)
    ? safeBoard.contradictions.slice(0, 4)
    : [];
  const relationships = Array.isArray(safeBoard.relationships)
    ? safeBoard.relationships.slice(0, 4)
    : [];

  const anchorLines = anchors.length
    ? anchors
        .map((item) => `${item.label || "-"} (${item.speaker || "unknown"})`)
        .join(", ")
    : "-";
  const gapLines = gaps.length ? gaps.map((item) => item.label || "-").join(", ") : "-";
  const evidenceLines = evidence.length ? evidence.join(", ") : "-";
  const contradictionLines = contradictions.length
    ? contradictions.map((item) => item.text || "-").join(" | ")
    : "-";
  const relationshipLines = relationships.length
    ? relationships
        .map((item) => `${item.from} <-> ${item.to} (${item.type || "link"})`)
        .join(" | ")
    : "-";

  const knownCharacters = (allCharacters || [])
    .map((character) => `${character.name} (${getLocalized(character.role, lang)})`)
    .join(", ");

  const settingsLine = `Frequency: ${settings.frequency}. Style: ${settings.style}. Quality: ${settings.quality}.`;
  let qualityLine = "Tone: sharp, clear, evidence-weighted.";
  if (settings.quality < 35) {
    qualityLine = "Tone: chaotic, playful, clearly label hunches.";
  } else if (settings.quality < 70) {
    qualityLine = "Tone: balanced, curious, a little playful.";
  }

  let toolGuidance = "Suggest 1 tool when it helps the user move forward.";
  if (settings.frequency === "off") {
    toolGuidance = "Only suggest tools if the user asks for help choosing one.";
  } else if (settings.frequency === "rare") {
    toolGuidance = "Suggest a tool only when there is a clear gap or conflict.";
  } else if (settings.frequency === "high") {
    toolGuidance = "Suggest up to 2 tools and a concrete next test.";
  }

  let styleGuidance = "Ask 1 short question at the end.";
  if (settings.style === "hypothesis") {
    styleGuidance =
      "Offer 1 hypothesis plus 1 test. End with a question that checks the test.";
  }

  return [
    "You are Watson, an investigative advisor.",
    `Respond in ${languageName}.`,
    "Be helpful, patient, joyful, giddy, and a little goofy. Stay respectful.",
    "Never claim to know the real solution. Use only the case snapshot and conversation.",
    "Do not reveal hidden truth or private facts. Treat all claims as uncertain.",
    "If the user rejects an idea, acknowledge it and do not repeat that idea.",
    "Keep the chat in context. Refer to recent user messages when useful.",
    `${settingsLine}`,
    `${qualityLine}`,
    `${toolGuidance}`,
    `${styleGuidance}`,
    "Keep replies concise (2-5 sentences).",
    "",
    "Case snapshot:",
    `- Title: ${getLocalized(publicState?.case_title, lang) || "-"}`,
    `- Time: ${getLocalized(publicState?.case_time, lang) || "-"}`,
    `- Location: ${getLocalized(publicState?.case_location, lang) || "-"}`,
    `- Victim: ${getLocalized(publicState?.victim_name, lang) || "-"}`,
    `- Briefing: ${getLocalized(publicState?.case_briefing, lang) || "-"}`,
    `- Evidence: ${evidenceLines}`,
    `- Timeline anchors: ${anchorLines}`,
    `- Timeline gaps: ${gapLines}`,
    `- Contradictions: ${contradictionLines}`,
    `- Relationships: ${relationshipLines}`,
    `- People: ${knownCharacters || "-"}`,
    "",
    "Available tools:",
    toolLines,
    "",
    "When you recommend a tool, name it exactly and give one concrete prompt."
  ].join("\n");
}

function buildWatsonHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-12)
    .map((entry) => {
      if (!entry || typeof entry.text !== "string") return null;
      return {
        role: entry.type === "watson-user" ? "user" : "assistant",
        content: entry.text
      };
    })
    .filter(Boolean);
}

export async function generateWatsonResponse({
  message,
  language,
  publicState,
  allCharacters,
  boardState,
  tools,
  settings,
  history
}) {
  const lang = normalizeLanguage(language);
  const client = getOpenAIClient();
  const normalizedSettings = normalizeWatsonSettings(settings);

  const temperature =
    normalizedSettings.quality < 35 ? 0.9 : normalizedSettings.quality < 70 ? 0.65 : 0.45;

  if (!client || USE_MOCK) {
    const fallback = {
      dialogue:
        normalizedSettings.style === "hypothesis"
          ? "Hypothesis: the timeline has a gap. Test: lock who can place each person. Which gap should we probe?"
          : "We should lock a clean timeline first. Want me to suggest the next question?"
    };
    fallback._meta = {
      model_used: "mock",
      model_selected: ROUTINE_MODEL,
      model_mode: "watson",
      mock: true
    };
    return fallback;
  }

  const prompt = buildWatsonPrompt({
    language: lang,
    publicState,
    allCharacters,
    boardState,
    tools,
    settings: normalizedSettings
  });
  try {
    const response = await client.responses.create({
      model: ROUTINE_MODEL,
      input: [
        { role: "system", content: prompt },
        ...buildWatsonHistory(history),
        { role: "user", content: message }
      ],
      temperature,
      max_output_tokens: MAX_OUTPUT_TOKENS
    });

    const outputText = extractOutputText(response);
    const dialogue = outputText ? outputText.trim() : "";
    if (!dialogue) {
      return {
        dialogue: "I need a moment to think. Want a quick timeline check next?",
        _meta: {
          model_used: ROUTINE_MODEL,
          model_selected: ROUTINE_MODEL,
          model_mode: "watson",
          mock: false
        }
      };
    }

    return {
      dialogue,
      _meta: {
        model_used: ROUTINE_MODEL,
        model_selected: ROUTINE_MODEL,
        model_mode: "watson",
        mock: false
      }
    };
  } catch (error) {
    return {
      dialogue:
        normalizedSettings.style === "hypothesis"
          ? "My brain fizzled for a second. Want me to try a timeline test instead?"
          : "I'm having trouble reaching my notes. Want a quick next question instead?",
      _meta: {
        model_used: "fallback",
        model_selected: ROUTINE_MODEL,
        model_mode: "watson",
        mock: true
      }
    };
  }
}

export function extractEvidenceFromClaims(claims) {
  const evidence = [];
  for (const claim of claims) {
    if (claim.type !== "observation") continue;
    if (claim.evidence) {
      evidence.push(claim.evidence);
      continue;
    }
  }
  return evidence;
}
