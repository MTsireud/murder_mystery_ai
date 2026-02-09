import { getLocalized, normalizeLanguage, t } from "./i18n.js";
import { normalizeMemory, summarizeAffect } from "./memory.js";
import { createResponse, getOpenAIClient } from "./openai.js";

const ROUTINE_MODEL = process.env.OPENAI_MODEL_ROUTINE || "gpt-5";
const CRITICAL_MODEL = process.env.OPENAI_MODEL_CRITICAL || "gpt-5";
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 220);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.7);
const USE_MOCK = String(process.env.OPENAI_USE_MOCK || "false").toLowerCase() === "true";

function isGpt5Model(model) {
  return String(model || "").toLowerCase().startsWith("gpt-5");
}

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

function formatValue(value, language) {
  if (!value) return "";
  return getLocalized(value, language);
}

function buildCharacterPrompt({
  character,
  language,
  publicState,
  allCharacters,
  answerFrame,
  runtimeContext
}) {
  const role = getLocalized(character.role, language);
  const psycho = (character.psycho || []).map((item) => `- ${getLocalized(item, language)}`).join("\n");
  const goals = (character.goals || []).map((item) => `- ${getLocalized(item, language)}`).join("\n");
  const secrets = (character.secrets || []).map((item) => `- ${getLocalized(item, language)}`).join("\n");
  const knowledge = (character.knowledge || [])
    .slice(-8)
    .map((item) => `- ${getLocalized(item, language)}`)
    .join("\n");
  const memory = normalizeMemory(character.memory || {});
  const commitmentItems = (memory.commitments || []).filter((item) => item?.text);
  const claimItems = (memory.self_claims || []).filter((item) => item?.text);
  const heardItems = (memory.heard_claims || []).filter((item) => item?.text);

  const commitments = commitmentItems
    .slice(-3)
    .map((item) => `- ${item.text}`)
    .join("\n");
  const lastCommitment = commitmentItems.length
    ? String(commitmentItems[commitmentItems.length - 1]?.text || "")
    : "";
  const selfClaims = claimItems
    .slice(-3)
    .map((item) => `- ${item.text}${item.evidence ? ` (evidence: ${item.evidence})` : ""}`)
    .join("\n");
  const heardClaims = heardItems
    .slice(-2)
    .map((item) => `- ${item.text}`)
    .join("\n");
  const stance = summarizeAffect(memory.affect, memory.heat);
  const heatLevel = memory.heat >= 70 ? "high" : memory.heat >= 40 ? "medium" : "low";

  const background = character.background || {};
  const backgroundLines = [
    background.workplace ? `- workplace: ${formatValue(background.workplace, language)}` : "",
    background.income ? `- income: ${formatValue(background.income, language)}` : "",
    Number.isFinite(background.tenure_years)
      ? `- tenure: ${background.tenure_years} years`
      : "",
    background.residence ? `- residence: ${formatValue(background.residence, language)}` : "",
    background.education ? `- education: ${formatValue(background.education, language)}` : "",
    background.routine ? `- routine: ${formatValue(background.routine, language)}` : "",
    background.family ? `- family: ${formatValue(background.family, language)}` : "",
    background.financial_pressure
      ? `- financial pressure: ${formatValue(background.financial_pressure, language)}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  const relationshipLines = (character.relationships || [])
    .map((rel) => {
      if (!rel || !rel.with) return "";
      const target =
        allCharacters.find((entry) => entry.id === rel.with)?.name || rel.with;
      const relation = formatValue(rel.relation, language);
      const since = rel.since ? formatValue(rel.since, language) : "";
      const trust = rel.trust ? formatValue(rel.trust, language) : "";
      const notes = rel.notes ? formatValue(rel.notes, language) : "";
      const details = [relation, since ? `since ${since}` : "", trust ? `trust: ${trust}` : "", notes]
        .filter(Boolean)
        .join("; ");
      return `- ${target}${details ? ` (${details})` : ""}`;
    })
    .filter(Boolean)
    .join("\n");

  const caseLocations = Array.isArray(publicState?.case_locations)
    ? publicState.case_locations
    : [];
  const locationNameList = caseLocations
    .map((loc) => formatValue(loc.name, language))
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");
  const locationById = new Map(
    caseLocations
      .filter((loc) => loc && loc.id && loc.name)
      .map((loc) => [loc.id, formatValue(loc.name, language)])
  );
  const currentLocationName = publicState?.current_location_id
    ? locationById.get(publicState.current_location_id) || publicState.current_location_id
    : "";
  const characterLocationNames = (Array.isArray(character?.presence?.location_ids)
    ? character.presence.location_ids
    : []
  )
    .map((locationId) => locationById.get(locationId) || locationId)
    .filter(Boolean)
    .join(", ");

  const victimDossier = publicState?.victim_dossier || {};
  const victimBio = formatValue(victimDossier.bio, language);
  const victimLastSeen = formatValue(victimDossier.last_seen, language);
  const victimRel = formatValue(victimDossier.relationship_summary, language);
  const policeCallTime = formatValue(publicState?.police_call_time, language);

  const storyPack = character.story_pack || {};
  const storyLastSeenTime = formatValue(storyPack.last_seen?.time, language);
  const storyLastSeenLoc = storyPack.last_seen?.location_id
    ? locationById.get(storyPack.last_seen.location_id)
    : "";
  const storyLastSeenNote = formatValue(storyPack.last_seen?.note, language);
  const storyLastContactTime = formatValue(storyPack.last_contact?.time, language);
  const storyLastContactWith = formatValue(storyPack.last_contact?.with, language);
  const storyLastContactNote = formatValue(storyPack.last_contact?.note, language);

  const historyList = Array.isArray(publicState?.relationship_history)
    ? publicState.relationship_history
    : [];
  const knownHistoryIds = Array.isArray(character.known_history_ids)
    ? new Set(character.known_history_ids)
    : null;
  const knownHistory = historyList.filter((entry) => {
    if (!entry || !entry.id) return false;
    if (!knownHistoryIds) return true;
    return knownHistoryIds.has(entry.id);
  });
  const historyLines = knownHistory
    .slice(-8)
    .map((entry) => {
      const timeLabel = formatValue(entry.time, language);
      const eventText = formatValue(entry.event, language);
      const location = entry.location_id ? locationById.get(entry.location_id) : "";
      const tail = location ? ` @ ${location}` : "";
      return `- ${timeLabel || "time unknown"}: ${eventText}${tail}`;
    })
    .filter(Boolean)
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

  const answerFrameText = answerFrame?.text ? answerFrame.text : "";
  const answerFrameKey = answerFrame?.key ? answerFrame.key : "";
  const answerFrameSection = answerFrameText
    ? ["Answer frame (must use this content):", `- ${answerFrameKey || "direct"}`, `- ${answerFrameText}`]
        .filter(Boolean)
        .join("\n")
    : "";

  const revealedFacts = Array.isArray(runtimeContext?.revealed_facts)
    ? runtimeContext.revealed_facts
    : [];
  const openLeads = Array.isArray(runtimeContext?.open_leads)
    ? runtimeContext.open_leads
    : [];
  const recentStrategies = Array.isArray(runtimeContext?.recent_strategies)
    ? runtimeContext.recent_strategies
    : [];
  const strategyLabel = runtimeContext?.strategy || "neutral";
  const chainProgress = runtimeContext?.chain_progress || "0/0";

  return [
    `You are ${character.name}, the ${role}.`,
    `Respond in ${languageName}.`,
    "Stay in character and keep answers concise (1-3 sentences, under 240 characters).",
    "You can lie if your lie strategy tags support it, but do not invent verified evidence.",
    "If you do not know something, say you do not know.",
    "Never mention hidden truth unless it is in your private facts.",
    "If you evade or stall, suspicion rises. Consider whether sharing safe details reduces heat.",
    "Let your stance toward the detective affect your tone and cooperation.",
    "Use revealed investigation facts as anchors; do not invent chain evidence not listed.",
    "If the detective bluffs, react based on pressure and revealed facts. Consider partial admissions.",
    "Choose how much background or history to reveal based on your goals and the detective's pressure.",
    "Do not repeat your previous sentence verbatim.",
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
    "Your current stance toward the detective:",
    `- ${stance}`,
    "Suspicion risk level:",
    `- ${heatLevel}`,
    "Background (what you know about yourself):",
    backgroundLines || "-",
    "Known relationships (with others):",
    relationshipLines || "-",
    "Known relationship history timeline:",
    historyLines || "-",
    "Story anchors (use when asked):",
    storyPack?.last_seen
      ? `- last_seen: ${[storyLastSeenTime, storyLastSeenLoc, storyLastSeenNote]
          .filter(Boolean)
          .join(" | ") || "-"}`
      : "- last_seen: -",
    storyPack?.last_contact
      ? `- last_contact: ${[storyLastContactTime, storyLastContactWith, storyLastContactNote]
          .filter(Boolean)
          .join(" | ") || "-"}`
      : "- last_contact: -",
    answerFrameSection ? answerFrameSection : "",
    "Your commitments (do not contradict):",
    commitments || "-",
    "Your recent claims (unverified unless evidence listed):",
    selfClaims || "-",
    "What you've heard from the detective (unverified):",
    heardClaims || "-",
    "Investigation chain status:",
    `- progress: ${chainProgress}`,
    `- detective strategy this turn: ${strategyLabel}`,
    "Revealed chain facts (authoritative):",
    revealedFacts.length ? revealedFacts.map((item) => `- ${item}`).join("\n") : "-",
    "Open leads (what the detective can test next):",
    openLeads.length ? openLeads.map((item) => `- ${item}`).join("\n") : "-",
    "Recent detective strategies:",
    recentStrategies.length ? `- ${recentStrategies.join(", ")}` : "-",
    "Your immediate prior answer (avoid exact reuse):",
    lastCommitment || "-",
    "Knowledge (latest first):",
    knowledge || "-",
    "Public evidence (summary):",
    evidenceList || "-",
    "Public accusations (summary):",
    accusations || "-",
    "Victim dossier:",
    victimBio || "-",
    victimLastSeen || "-",
    victimRel || "-",
    "Canonical locations (use these exact labels):",
    locationNameList || "-",
    "Current investigation location:",
    currentLocationName || "-",
    "Where you can be found:",
    characterLocationNames || "not location-bound",
    "Police call time (do not contradict):",
    policeCallTime || "-"
  ].join("\n");
}

function extractOutputText(response) {
  if (!response) return "";
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  const outputs = response.output || [];
  for (const item of outputs) {
    const content = item?.content || [];
    for (const entry of content) {
      if (typeof entry?.text === "string" && entry.text.trim()) {
        return entry.text;
      }
      if (entry?.type === "output_json" && entry.json && typeof entry.json === "object") {
        return JSON.stringify(entry.json);
      }
    }
  }
  if (response.output_json && typeof response.output_json === "object") {
    return JSON.stringify(response.output_json);
  }
  return "";
}

function extractDialogueFromJsonLike(text) {
  if (!text || typeof text !== "string") return "";
  const key = "\"dialogue\"";
  const start = text.indexOf(key);
  if (start === -1) return "";
  const colon = text.indexOf(":", start + key.length);
  if (colon === -1) return "";
  let i = colon + 1;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] !== "\"") return "";
  i += 1;
  let result = "";
  let escaped = false;
  for (; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      switch (ch) {
        case "n":
          result += "\n";
          break;
        case "t":
          result += "\t";
          break;
        case "r":
          result += "\r";
          break;
        case "\"":
          result += "\"";
          break;
        case "\\":
          result += "\\";
          break;
        default:
          result += ch;
          break;
      }
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "\"") break;
    result += ch;
  }
  return result;
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

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function solveSimpleMath(message) {
  const match = String(message || "")
    .toLowerCase()
    .replace(/equals|ewual|eq|is/g, "=")
    .match(/(-?\d+)\s*([+\-*x])\s*(-?\d+)/);
  if (!match) return null;
  const left = Number(match[1]);
  const op = match[2];
  const right = Number(match[3]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (op === "+") return left + right;
  if (op === "-") return left - right;
  if (op === "*" || op === "x") return left * right;
  return null;
}

function isGenericStaticLine(dialogue) {
  const lower = String(dialogue || "").toLowerCase();
  return (
    lower.includes("ask me something concrete") ||
    lower.includes("ρώτα κάτι συγκεκριμένο") ||
    lower.includes("ρωτα κατι συγκεκριμενο")
  );
}

function buildAdaptiveFallbackLine({ message, language, runtimeContext }) {
  const lang = normalizeLanguage(language);
  const lower = String(message || "").toLowerCase();
  const math = solveSimpleMath(lower);
  if (Number.isFinite(math)) {
    return lang === "el"
      ? `Είναι ${math}. Συνέχισε με την επόμενη κίνηση στην υπόθεση.`
      : `It's ${math}. Keep going with the next case move.`;
  }
  const lead = Array.isArray(runtimeContext?.open_leads) ? runtimeContext.open_leads[0] : "";
  const variants =
    lang === "el"
      ? [
          `Καταλαβαίνω. ${lead || "Πες μου ποιο στοιχείο θες να κλειδώσουμε πρώτο."}`,
          `Σε ακούω. ${lead || "Δώσε μου ένα συγκεκριμένο σημείο χρόνου ή στοιχείο."}`,
          `Εντάξει. ${lead || "Πίεσέ με με ένα τεκμήριο για να απαντήσω καθαρά."}`
        ]
      : [
          `Understood. ${lead || "Tell me which evidence link you want to lock first."}`,
          `I'm listening. ${lead || "Give me one concrete time marker or evidence item."}`,
          `Alright. ${lead || "Push me with one hard piece of evidence and I'll answer directly."}`
        ];
  const index = hashString(lower) % variants.length;
  return variants[index];
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
    const activeCast = (allCharacters || []).filter((entry) => !entry?.is_location_contact);
    const target =
      activeCast.find((c) => c.id === suspicionId) ||
      activeCast.find((c) => c.id !== character.id);
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

function applyAnswerFrame(response, answerFrame) {
  if (!answerFrame || !answerFrame.text) return response;
  const dialogue = response.dialogue || "";
  const lower = dialogue.toLowerCase();
  const anchors = Array.isArray(answerFrame.anchors) ? answerFrame.anchors : [];
  const hasAnchor = anchors.some((anchor) => anchor && lower.includes(String(anchor).toLowerCase()));
  if (answerFrame.force || !hasAnchor) {
    return { ...response, dialogue: answerFrame.text };
  }
  return response;
}

export async function generateCharacterResponse({
  character,
  message,
  language,
  allCharacters,
  publicState,
  modelMode,
  answerFrame,
  runtimeContext
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
    return applyAnswerFrame(response, answerFrame);
  }

  const model = selectedModel;
  const prompt = buildCharacterPrompt({
    character,
    language: lang,
    publicState,
    allCharacters,
    answerFrame,
    runtimeContext
  });

  const responseParams = {
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
  };
  if (isGpt5Model(model)) {
    responseParams.reasoning = { effort: "minimal" };
    responseParams.text = { ...responseParams.text, verbosity: "low" };
    responseParams.max_output_tokens = Math.max(MAX_OUTPUT_TOKENS, 360);
  }

  const response = await createResponse(client, responseParams);

  const outputText = extractOutputText(response);
  let parsed = null;
  if (outputText) {
    try {
      parsed = JSON.parse(outputText);
    } catch {
      const extracted = extractDialogueFromJsonLike(outputText);
      parsed = {
        dialogue: extracted || outputText.trim(),
        claims: [],
        intent: "comply"
      };
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
    return applyAnswerFrame(fallback, answerFrame);
  }
  const sanitized = sanitizeResponse(parsed);
  const memory = normalizeMemory(character.memory || {});
  const commitmentItems = (memory.commitments || []).filter((item) => item?.text);
  const previousDialogue = commitmentItems.length
    ? String(commitmentItems[commitmentItems.length - 1].text || "").trim().toLowerCase()
    : "";
  const currentDialogue = String(sanitized.dialogue || "").trim().toLowerCase();
  if (previousDialogue && currentDialogue && previousDialogue === currentDialogue) {
    sanitized.dialogue = lang === "el"
      ? `${sanitized.dialogue} Θέλεις να το δούμε με στοιχεία βήμα-βήμα;`
      : `${sanitized.dialogue} Want to test this step by step with evidence?`;
  }
  if (isGenericStaticLine(sanitized.dialogue)) {
    sanitized.dialogue = buildAdaptiveFallbackLine({
      message,
      language: lang,
      runtimeContext
    });
    sanitized.intent = "comply";
  }
  sanitized._meta = {
    model_used: model,
    model_selected: model,
    model_mode: mode,
    mock: false
  };
  return applyAnswerFrame(sanitized, answerFrame);
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

function detectWatsonStuckSignal(message) {
  const lower = String(message || "").toLowerCase();
  const markers = [
    "stuck",
    "hint",
    "help",
    "i'm lost",
    "im lost",
    "what now",
    "next step",
    "δεν ξερω",
    "δεν ξέρω",
    "βοηθεια",
    "βοήθεια",
    "υπόδειξη",
    "υποδειξη",
    "κολλησα",
    "κόλλησα"
  ];
  return markers.some((marker) => lower.includes(marker));
}

function buildWatsonPrompt({
  language,
  publicState,
  allCharacters,
  boardState,
  tools,
  settings,
  stuckSignal,
  evidenceContext
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
  const caseLocations = Array.isArray(publicState?.case_locations)
    ? publicState.case_locations
    : [];
  const locationNameById = new Map(
    caseLocations
      .filter((entry) => entry?.id)
      .map((entry) => [entry.id, getLocalized(entry.name, lang) || entry.id])
  );
  const currentLocationId = String(publicState?.current_location_id || "").trim();
  const currentLocationName = currentLocationId
    ? locationNameById.get(currentLocationId) || currentLocationId
    : getLocalized(publicState?.case_location, lang) || "-";
  const visitedLocations = (Array.isArray(publicState?.visited_location_ids)
    ? publicState.visited_location_ids
    : []
  )
    .map((locationId) => locationNameById.get(locationId) || locationId)
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");
  const onSiteContacts = (allCharacters || [])
    .filter((character) => {
      const ids = Array.isArray(character?.presence?.location_ids)
        ? character.presence.location_ids
        : [];
      return Boolean(character?.is_location_contact) && ids.includes(currentLocationId);
    })
    .map((character) => `${character.name} (${getLocalized(character.role, lang)})`)
    .join(", ");

  const knownCharacters = (allCharacters || [])
    .map((character) => `${character.name} (${getLocalized(character.role, lang)})`)
    .join(", ");
  const safeEvidenceContext = evidenceContext && typeof evidenceContext === "object"
    ? evidenceContext
    : {};
  const observedHotspots = Array.isArray(safeEvidenceContext.observed_hotspots)
    ? safeEvidenceContext.observed_hotspots.slice(0, 8)
    : [];
  const unexploredCriticalHotspots = Array.isArray(safeEvidenceContext.unexplored_critical_hotspots)
    ? safeEvidenceContext.unexplored_critical_hotspots.slice(0, 8)
    : [];
  const recommendedNextHotspots = Array.isArray(safeEvidenceContext.recommended_next_hotspots)
    ? safeEvidenceContext.recommended_next_hotspots.slice(0, 3)
    : [];
  const observedHotspotLines = observedHotspots.length
    ? observedHotspots
        .map((entry) => `${entry.hotspot_label || entry.hotspot_id || "-"} @ ${entry.location_name || "-"}`)
        .join(" | ")
    : "-";
  const unexploredCriticalLines = unexploredCriticalHotspots.length
    ? unexploredCriticalHotspots
        .map((entry) => {
          const reason = entry.reason ? ` (${entry.reason})` : "";
          return `${entry.hotspot_label || entry.hotspot_id || "-"} @ ${entry.location_name || "-"}${reason}`;
        })
        .join(" | ")
    : "-";
  const recommendedHotspotLines = recommendedNextHotspots.length
    ? recommendedNextHotspots
        .map((entry) => {
          const prompt = entry.suggested_prompt ? ` | Prompt: ${entry.suggested_prompt}` : "";
          return `${entry.hotspot_label || entry.hotspot_id || "-"} @ ${entry.location_name || "-"}${prompt}`;
        })
        .join(" | ")
    : "-";
  const hotspotPriorityGuidance = unexploredCriticalHotspots.length
    ? "Priority rule: lead with one unexplored critical hotspot by name and location before generic tool advice."
    : "Priority rule: if no critical hotspot remains, move to timeline/relationship validation.";

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
      "Offer 1 hypothesis plus 1 test. Include one explicit 'Next:' action.";
  }
  const stuckGuidance = stuckSignal
    ? "The user is stuck. Give exactly one gentle riddle-like clue (<= 10 words), then one direct hint tied to a location/object, then one 'Next:' action."
    : "Use one short riddle-like clue only when it adds value, then stay direct.";

  return [
    "You are Watson, an investigative advisor.",
    `Respond in ${languageName}.`,
    "Be helpful, patient, and a little playful.",
    "Voice rule: one light riddle-like sentence max, then clear plain guidance.",
    "Do not become cryptic. Keep hints understandable in gameplay.",
    "Never claim to know the real solution. Use only the case snapshot and conversation.",
    "Do not reveal hidden truth or private facts. Treat all claims as uncertain.",
    "Never claim a hotspot proves guilt; frame it as a test path.",
    "If the user rejects an idea, acknowledge it and do not repeat that idea.",
    "Keep the chat in context. Refer to recent user messages when useful.",
    `${settingsLine}`,
    `${qualityLine}`,
    `${toolGuidance}`,
    `${styleGuidance}`,
    `${stuckGuidance}`,
    `${hotspotPriorityGuidance}`,
    "Keep replies concise (2-4 sentences).",
    "",
    "Case snapshot:",
    `- Title: ${getLocalized(publicState?.case_title, lang) || "-"}`,
    `- Time: ${getLocalized(publicState?.case_time, lang) || "-"}`,
    `- Location: ${getLocalized(publicState?.case_location, lang) || "-"}`,
    `- Current location: ${currentLocationName || "-"}`,
    `- Visited locations: ${visitedLocations || "-"}`,
    `- On-site contacts: ${onSiteContacts || "-"}`,
    `- Victim: ${getLocalized(publicState?.victim_name, lang) || "-"}`,
    `- Briefing: ${getLocalized(publicState?.case_briefing, lang) || "-"}`,
    `- Evidence: ${evidenceLines}`,
    `- Timeline anchors: ${anchorLines}`,
    `- Timeline gaps: ${gapLines}`,
    `- Contradictions: ${contradictionLines}`,
    `- Relationships: ${relationshipLines}`,
    `- People: ${knownCharacters || "-"}`,
    `- Observed hotspots: ${observedHotspotLines}`,
    `- Unexplored critical hotspots: ${unexploredCriticalLines}`,
    `- Recommended next hotspots: ${recommendedHotspotLines}`,
    "",
    "Available tools:",
    toolLines,
    "",
    "When you recommend a tool, name it exactly and give one concrete prompt.",
    "When possible, include an explicit line starting with 'Next:'."
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
  history,
  evidenceContext
}) {
  const lang = normalizeLanguage(language);
  const client = getOpenAIClient();
  const normalizedSettings = normalizeWatsonSettings(settings);
  const stuckSignal = detectWatsonStuckSignal(message);
  const currentLocationName = getLocalized(publicState?.current_location_name, lang)
    || getLocalized(publicState?.case_location, lang)
    || "the scene";
  const recommendedHotspot = Array.isArray(evidenceContext?.recommended_next_hotspots)
    ? evidenceContext.recommended_next_hotspots[0]
    : null;
  const hotspotTarget = recommendedHotspot
    ? `${recommendedHotspot.hotspot_label || recommendedHotspot.hotspot_id || "hotspot"} @ ${recommendedHotspot.location_name || currentLocationName}`
    : currentLocationName;
  const hotspotPrompt = String(recommendedHotspot?.suggested_prompt || "").trim();

  const temperature =
    normalizedSettings.quality < 35 ? 0.9 : normalizedSettings.quality < 70 ? 0.65 : 0.45;

  if (!client || USE_MOCK) {
    const stuckFallback = lang === "el"
      ? `Κοίτα τη σκιά, όχι το θόρυβο. Ίχνος: έλεγξε ${hotspotTarget}. Next: ${hotspotPrompt || "πάρε επιτόπια επιβεβαίωση για αυτό το σημείο."}`
      : `Watch the shadow, not the noise. Hint: check ${hotspotTarget}. Next: ${hotspotPrompt || "get an on-site verification for that spot."}`;
    const fallback = {
      dialogue:
        stuckSignal
          ? stuckFallback
          : normalizedSettings.style === "hypothesis"
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
    settings: normalizedSettings,
    stuckSignal,
    evidenceContext
  });
  try {
    const responseParams = {
      model: ROUTINE_MODEL,
      input: [
        { role: "system", content: prompt },
        ...buildWatsonHistory(history),
        { role: "user", content: message }
      ],
      temperature,
      max_output_tokens: MAX_OUTPUT_TOKENS
    };
    if (isGpt5Model(ROUTINE_MODEL)) {
      responseParams.reasoning = { effort: "minimal" };
      responseParams.text = { verbosity: "low" };
    }

    const response = await createResponse(client, responseParams);

    const outputText = extractOutputText(response);
    const dialogue = outputText ? outputText.trim() : "";
    if (!dialogue) {
      return {
        dialogue:
          lang === "el"
            ? `Κάτι λείπει στο μοτίβο. Hint: τσέκαρε ${hotspotTarget}. Next: ${hotspotPrompt || "κλείδωσε ποιος ήταν εκεί στο κρίσιμο λεπτό."}`
            : `There is a gap in the pattern. Hint: re-check ${hotspotTarget}. Next: ${hotspotPrompt || "lock who was there at the key minute."}`,
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
        lang === "el"
          ? `Το νήμα είναι λεπτό, όχι χαμένο. Hint: έλεγξε ${hotspotTarget}. Next: ${hotspotPrompt || "ζήτα ένα συγκεκριμένο σημείο χρόνου από τον επόμενο μάρτυρα."}`
          : `The thread is thin, not gone. Hint: check ${hotspotTarget}. Next: ${hotspotPrompt || "ask your next witness for one precise time anchor."}`,
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
