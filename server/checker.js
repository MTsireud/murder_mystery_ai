import { createResponse, getOpenAIClient } from "./openai.js";
import { getLocalized, normalizeLanguage } from "./i18n.js";
import { getBaselineCaseConfig } from "./investigation.js";
import { loadPrompt } from "./prompts.js";

const CHECKER_MODEL =
  process.env.OPENAI_MODEL_CHECKER ||
  process.env.OPENAI_MODEL_ROUTINE ||
  "gpt-4.1-mini";
const MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 240);
const TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.2);

function isGpt5Model(model) {
  return String(model || "").toLowerCase().startsWith("gpt-5");
}

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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeSolution(solution) {
  if (!solution || typeof solution !== "object") return {};
  const killer = String(solution.killer || "").trim();
  const method = String(solution.method || "").trim();
  const motive = String(solution.motive || "").trim();
  const timeline = String(solution.timeline || "").trim();
  const characterNotes = String(solution.character_notes || "").trim();
  const fullText = String(solution.full_text || "").trim();
  const mergedText = uniqueStrings([killer, method, motive, timeline, characterNotes, fullText]).join("\n");
  return {
    killer,
    method,
    motive,
    timeline,
    character_notes: characterNotes,
    full_text: mergedText
  };
}

function includesText(haystack, needle) {
  const source = normalizeText(haystack);
  const target = normalizeText(needle);
  if (!target) return false;
  return source.includes(target);
}

function getCanonicalReveal(state, language) {
  const lang = normalizeLanguage(language);
  const truth = state?.truth || {};
  const killerId = String(truth?.killer_id || "").trim();
  const killerCharacter = Array.isArray(state?.characters)
    ? state.characters.find((character) => String(character?.id || "").trim() === killerId)
    : null;
  const timeline = Array.isArray(truth?.timeline)
    ? truth.timeline.map((item) => String(getLocalized(item, lang) || item || "").trim()).filter(Boolean)
    : [];
  const plantedEvidence = Array.isArray(truth?.planted_evidence)
    ? truth.planted_evidence.map((item) => String(getLocalized(item, lang) || item || "").trim()).filter(Boolean)
    : [];
  return {
    killer_id: killerId,
    killer_name: killerCharacter?.name || killerId,
    method: String(getLocalized(truth?.method, lang) || truth?.method || "").trim(),
    motive: String(getLocalized(truth?.motive, lang) || truth?.motive || "").trim(),
    timeline,
    planted_evidence: plantedEvidence
  };
}

function getTruthLedgerContext(state, language) {
  const lang = normalizeLanguage(language);
  const config = getBaselineCaseConfig(state?.case_id);
  const facts = Array.isArray(config?.truth_ledger) ? config.truth_ledger : [];
  return facts.map((fact) => ({
    id: String(fact?.id || ""),
    summary: getLocalized(fact?.summary, lang),
    detail: getLocalized(fact?.detail, lang),
    contradiction_tests: Array.isArray(fact?.contradiction_tests)
      ? fact.contradiction_tests.map((item) => getLocalized(item, lang)).filter(Boolean)
      : []
  }));
}

function buildCheckerContext({ state, language, solution, revealRequested }) {
  const lang = normalizeLanguage(language);
  return {
    response_language: lang,
    reveal_requested: revealRequested,
    truth: state.truth,
    truth_ledger: getTruthLedgerContext(state, lang),
    public_state: {
      case_time: state.public_state.case_time,
      case_location: state.public_state.case_location,
      tensions: state.public_state.tensions,
      discovered_evidence: state.public_state.discovered_evidence
    },
    characters: state.characters
      .filter((character) => !character?.is_location_contact)
      .map((character) => ({
        id: character.id,
        name: character.name,
        role: getLocalized(character.role, lang)
      })),
    solution
  };
}

function buildDeterministicResult({ state, solution, revealRequested, language }) {
  const narrative = String(solution?.full_text || "").trim();
  const truth = state?.truth || {};
  const characters = Array.isArray(state?.characters)
    ? state.characters.filter((character) => !character?.is_location_contact)
    : [];
  const referencedCharacterNames = characters
    .filter((character) => includesText(narrative, character?.name || ""))
    .map((character) => character.name);
  const missingCharacters = characters
    .filter((character) => !includesText(narrative, character?.name || ""))
    .map((character) => character.name);
  const coverageTarget = Math.min(3, characters.length || 0);
  const characterCoverage = coverageTarget === 0 || referencedCharacterNames.length >= coverageTarget;

  const killerCharacter = characters.find((character) => String(character?.id || "") === String(truth?.killer_id || ""));
  const killerName = killerCharacter?.name || String(truth?.killer_id || "");
  const killerMatch = killerName ? includesText(narrative, killerName) : false;
  const methodMatch = includesText(narrative, truth?.method || "");
  const motiveMatch = includesText(narrative, truth?.motive || "");

  const timelineTerms = Array.isArray(truth?.timeline)
    ? truth.timeline.map((item) => String(item || "")).filter(Boolean)
    : [];
  const timelineMatches = timelineTerms.filter((item) => includesText(narrative, item));
  const timelineCoverage = timelineTerms.length ? timelineMatches.length / timelineTerms.length : 0;

  const ledgerFacts = getTruthLedgerContext(state, language);
  const ledgerHits = ledgerFacts.filter((fact) => {
    return includesText(narrative, fact?.summary || "") || includesText(narrative, fact?.detail || "");
  });

  const evidenceTerms = Array.isArray(truth?.planted_evidence)
    ? truth.planted_evidence.map((item) => String(item || "")).filter(Boolean)
    : [];
  const evidenceHits = evidenceTerms.filter((item) => includesText(narrative, item));
  const consistency =
    killerMatch || methodMatch || motiveMatch || timelineMatches.length || evidenceHits.length || ledgerHits.length
      ? "consistent"
      : "inconsistent";

  const checks = {
    killer: killerMatch ? "match" : narrative ? "mismatch" : "missing",
    method: methodMatch ? "match" : narrative ? "mismatch" : "missing",
    motive: motiveMatch ? "match" : narrative ? "mismatch" : "missing",
    timeline: timelineMatches.length > 0 ? "match" : narrative ? "mismatch" : "missing",
    character_coverage: characterCoverage ? "complete" : "incomplete",
    consistency
  };

  let verdict = "incorrect";
  if (!narrative) {
    verdict = "insufficient";
  } else if (
    checks.killer === "match" &&
    checks.method === "match" &&
    checks.motive === "match" &&
    checks.timeline === "match" &&
    checks.character_coverage === "complete" &&
    checks.consistency === "consistent"
  ) {
    verdict = "correct";
  } else if (
    checks.killer === "match" ||
    checks.method === "match" ||
    checks.motive === "match" ||
    timelineCoverage >= 0.5 ||
    evidenceHits.length > 0 ||
    ledgerHits.length > 0
  ) {
    verdict = "partially_correct";
  }

  const inconsistencies = [];
  if (checks.killer !== "match") {
    inconsistencies.push("Your culprit assignment does not align with the case facts.");
  }
  if (checks.method !== "match") {
    inconsistencies.push("Your method explanation conflicts with established evidence.");
  }
  if (checks.motive !== "match") {
    inconsistencies.push("Your motive does not match the motive in the case record.");
  }
  if (checks.timeline !== "match") {
    inconsistencies.push("Your timeline misses key anchored moments.");
  }
  if (!ledgerHits.length && narrative) {
    inconsistencies.push("Your theory needs stronger links to truth-ledger facts.");
  }

  const advice = [];
  if (!characterCoverage) {
    advice.push("Add more named participants and their specific roles in the sequence.");
  }
  if (!ledgerHits.length) {
    advice.push("Use concrete ledger evidence and contradiction points to support your claim.");
  }
  if (!evidenceHits.length) {
    advice.push("Reference at least one physical evidence item and explain what it proves.");
  }
  if (!timelineMatches.length) {
    advice.push("Anchor your theory with at least two specific timeline moments.");
  }
  if (!referencedCharacterNames.length && narrative) {
    advice.push("Name the key people directly, not only roles.");
  }

  return {
    verdict,
    checks,
    missing_characters: characterCoverage ? [] : missingCharacters.slice(0, 4),
    inconsistencies: uniqueStrings(inconsistencies),
    advice: uniqueStrings(advice),
    reveal_requested: revealRequested,
    reveal: revealRequested ? getCanonicalReveal(state, language) : blankReveal()
  };
}

function fallbackResult({ state, revealRequested, solution, language }) {
  return buildDeterministicResult({
    state,
    solution,
    revealRequested,
    language
  });
}

function parseModelOutput(outputText) {
  if (!outputText) return null;
  try {
    return JSON.parse(outputText);
  } catch {
    const firstBrace = outputText.indexOf("{");
    const lastBrace = outputText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = outputText.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeModelResult({ parsed, state, revealRequested, language, deterministic }) {
  if (!parsed || typeof parsed !== "object") return deterministic;
  const safe = {
    verdict: ["correct", "partially_correct", "incorrect", "insufficient"].includes(parsed.verdict)
      ? parsed.verdict
      : deterministic.verdict,
    checks: {
      killer: ["match", "mismatch", "missing"].includes(parsed?.checks?.killer)
        ? parsed.checks.killer
        : deterministic.checks.killer,
      method: ["match", "mismatch", "missing"].includes(parsed?.checks?.method)
        ? parsed.checks.method
        : deterministic.checks.method,
      motive: ["match", "mismatch", "missing"].includes(parsed?.checks?.motive)
        ? parsed.checks.motive
        : deterministic.checks.motive,
      timeline: ["match", "mismatch", "missing"].includes(parsed?.checks?.timeline)
        ? parsed.checks.timeline
        : deterministic.checks.timeline,
      character_coverage: ["complete", "incomplete"].includes(parsed?.checks?.character_coverage)
        ? parsed.checks.character_coverage
        : deterministic.checks.character_coverage,
      consistency: ["consistent", "inconsistent"].includes(parsed?.checks?.consistency)
        ? parsed.checks.consistency
        : deterministic.checks.consistency
    },
    missing_characters: Array.isArray(parsed.missing_characters)
      ? uniqueStrings(parsed.missing_characters)
      : deterministic.missing_characters,
    inconsistencies: Array.isArray(parsed.inconsistencies)
      ? uniqueStrings(parsed.inconsistencies)
      : deterministic.inconsistencies,
    advice: Array.isArray(parsed.advice) ? uniqueStrings(parsed.advice) : deterministic.advice,
    reveal_requested: revealRequested,
    reveal: revealRequested ? getCanonicalReveal(state, language) : blankReveal()
  };
  if (!safe.missing_characters.length && deterministic.missing_characters.length) {
    safe.missing_characters = deterministic.missing_characters;
  }
  if (!safe.inconsistencies.length) {
    safe.inconsistencies = deterministic.inconsistencies;
  }
  if (!safe.advice.length) {
    safe.advice = deterministic.advice;
  }
  return safe;
}

export async function checkSolution({ state, solution, reveal, language }) {
  const revealRequested = Boolean(reveal);
  const normalizedSolution = normalizeSolution(solution);
  const deterministic = buildDeterministicResult({
    state,
    solution: normalizedSolution,
    revealRequested,
    language
  });
  if (revealRequested) return deterministic;
  const client = getOpenAIClient();
  if (!client) return deterministic;

  const prompt = loadPrompt("checker");
  const context = buildCheckerContext({
    state,
    language,
    solution: normalizedSolution,
    revealRequested
  });

  let response;
  try {
    const responseParams = {
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
    };
    if (isGpt5Model(CHECKER_MODEL)) {
      responseParams.reasoning = { effort: "minimal" };
      responseParams.text = { ...responseParams.text, verbosity: "low" };
    }
    response = await createResponse(client, responseParams);
  } catch {
    return fallbackResult({
      state,
      revealRequested,
      solution: normalizedSolution,
      language
    });
  }

  const outputText = extractOutputText(response);
  const parsed = parseModelOutput(outputText);
  if (!parsed) {
    return fallbackResult({
      state,
      revealRequested,
      solution: normalizedSolution,
      language
    });
  }

  return sanitizeModelResult({
    parsed,
    state,
    revealRequested,
    language,
    deterministic
  });
}
