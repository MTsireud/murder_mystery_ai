import { createResponse, getOpenAIClient } from "./openai.js";
import { constructCaseConfig } from "./investigation.js";
import { getLocalized, normalizeLanguage } from "./i18n.js";
import { loadPrompt } from "./prompts.js";

const loc = (en, el = en) => ({ en, el });

const STORYLAB_MODEL =
  process.env.OPENAI_MODEL_STORYLAB ||
  process.env.OPENAI_MODEL_CRITICAL ||
  "gpt-5";
const STORYLAB_MAX_OUTPUT_TOKENS = Math.max(
  Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 240),
  1200
);
const STORYLAB_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.2);
const STRATEGY_ENUM = ["bluff", "pressure", "empathy", "evidence_push"];

const STORYLAB_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "story_intrigue",
    "difficulty",
    "plausibility",
    "fact_check",
    "coherence",
    "gaps",
    "recommendations",
    "corrections",
    "gameplay_patch"
  ],
  properties: {
    story_intrigue: {
      type: "object",
      additionalProperties: false,
      required: ["score", "label", "notes"],
      properties: {
        score: { type: "integer", minimum: 1, maximum: 10 },
        label: { type: "string", enum: ["low", "medium", "high"] },
        notes: { type: "array", items: { type: "string" } }
      }
    },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    plausibility: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "notes"],
      properties: {
        verdict: { type: "string", enum: ["plausible", "borderline", "implausible"] },
        notes: { type: "array", items: { type: "string" } }
      }
    },
    fact_check: {
      type: "object",
      additionalProperties: false,
      required: ["has_inconsistencies", "inconsistencies"],
      properties: {
        has_inconsistencies: { type: "boolean" },
        inconsistencies: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["where", "issue", "severity", "suggested_fix"],
            properties: {
              where: { type: "string" },
              issue: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              suggested_fix: { type: "string" }
            }
          }
        }
      }
    },
    coherence: {
      type: "object",
      additionalProperties: false,
      required: ["motives", "relationships", "notes"],
      properties: {
        motives: { type: "string", enum: ["strong", "adequate", "weak", "missing"] },
        relationships: { type: "string", enum: ["strong", "adequate", "weak", "missing"] },
        notes: { type: "array", items: { type: "string" } }
      }
    },
    gaps: {
      type: "object",
      additionalProperties: false,
      required: ["timeline", "motives", "relationships", "evidence_chain", "character_knowledge"],
      properties: {
        timeline: { type: "array", items: { type: "string" } },
        motives: { type: "array", items: { type: "string" } },
        relationships: { type: "array", items: { type: "string" } },
        evidence_chain: { type: "array", items: { type: "string" } },
        character_knowledge: { type: "array", items: { type: "string" } }
      }
    },
    recommendations: { type: "array", items: { type: "string" } },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["where", "issue", "proposed_change", "reason"],
        properties: {
          where: { type: "string" },
          issue: { type: "string" },
          proposed_change: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    gameplay_patch: {
      type: "object",
      additionalProperties: false,
      required: [
        "truth_ledger_additions",
        "truth_ledger_updates",
        "clue_step_updates",
        "statement_scripts_additions"
      ],
      properties: {
        truth_ledger_additions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "summary", "detail", "micro_details", "contradiction_tests"],
            properties: {
              id: { type: "string" },
              summary: { type: "string" },
              detail: { type: "string" },
              micro_details: { type: "array", items: { type: "string" } },
              contradiction_tests: { type: "array", items: { type: "string" } }
            }
          }
        },
        truth_ledger_updates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["fact_id", "micro_details_add", "contradiction_tests_add"],
            properties: {
              fact_id: { type: "string" },
              micro_details_add: { type: "array", items: { type: "string" } },
              contradiction_tests_add: { type: "array", items: { type: "string" } }
            }
          }
        },
        clue_step_updates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["step_id", "extra_triggers", "extra_evidence", "extra_leads"],
            properties: {
              step_id: { type: "string" },
              extra_triggers: { type: "array", items: { type: "string" } },
              extra_evidence: { type: "array", items: { type: "string" } },
              extra_leads: { type: "array", items: { type: "string" } }
            }
          }
        },
        statement_scripts_additions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "character_id",
              "strategies",
              "require_fact_ids",
              "text",
              "evidence_label"
            ],
            properties: {
              id: { type: "string" },
              character_id: { type: "string" },
              strategies: {
                type: "array",
                items: { type: "string", enum: STRATEGY_ENUM }
              },
              require_fact_ids: { type: "array", items: { type: "string" } },
              text: { type: "string" },
              evidence_label: { type: "string" }
            }
          }
        }
      }
    }
  }
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(list) {
  return Array.from(new Set(ensureArray(list).filter(Boolean)));
}

function isGpt5Model(model) {
  return String(model || "").toLowerCase().startsWith("gpt-5");
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

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeStringList(value) {
  return unique(
    ensureArray(value)
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
}

function normalizeId(value, fallback) {
  const raw = String(value || "").trim();
  const clean = raw.replace(/[^A-Za-z0-9_:-]/g, "_");
  return clean || fallback;
}

function toLocalized(value) {
  if (!value) return loc("");
  if (typeof value === "string") return loc(value);
  if (typeof value === "object" && typeof value.en === "string") {
    return loc(value.en, typeof value.el === "string" ? value.el : value.en);
  }
  return loc(String(value));
}

function mergeLocalizedList(existing, additions) {
  const result = ensureArray(existing).slice();
  const seen = new Set(result.map((entry) => getLocalized(entry, "en")).filter(Boolean));
  for (const entry of ensureArray(additions)) {
    const text = getLocalized(entry, "en");
    if (!text || seen.has(text)) continue;
    result.push(entry);
    seen.add(text);
  }
  return result;
}

function mergeStringList(existing, additions) {
  const seed = ensureArray(existing).map((value) => String(value || "").trim()).filter(Boolean);
  const seen = new Set(seed.map((value) => value.toLowerCase()));
  const result = seed.slice();
  for (const value of ensureArray(additions)) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    result.push(text);
    seen.add(key);
  }
  return result;
}

function buildStorylabContext({ caseId, caseContext, baseConfig, novel, language }) {
  const lang = normalizeLanguage(language);
  const truth = caseContext?.truth || {};
  const publicState = caseContext?.public_state || {};
  const characters = ensureArray(caseContext?.characters)
    .filter((character) => !character?.is_location_contact)
    .map((character) => ({
      id: character.id,
      name: character.name,
      role: getLocalized(character.role, lang),
      relationship_to_victim: getLocalized(character.relationship_to_victim, lang),
      relationships: ensureArray(character.relationships).map((entry) => ({
        with: entry.with || "",
        relation: getLocalized(entry.relation, lang),
        since: getLocalized(entry.since, lang),
        trust: getLocalized(entry.trust, lang)
      })),
      goals: ensureArray(character.goals).map((entry) => getLocalized(entry, lang)),
      secrets: ensureArray(character.secrets).map((entry) => getLocalized(entry, lang)),
      knowledge: ensureArray(character.knowledge).map((entry) => getLocalized(entry, lang)),
      private_facts: {
        true_alibi: getLocalized(character.private_facts?.true_alibi, lang),
        lie_alibi: getLocalized(character.private_facts?.lie_alibi, lang),
        motive: getLocalized(character.private_facts?.motive, lang),
        suspicion_id: character.private_facts?.suspicion_id || ""
      },
      frame_truths: {
        last_seen: getLocalized(character.frames?.last_seen?.truth?.text, lang),
        last_contact: getLocalized(character.frames?.last_contact?.truth?.text, lang),
        alibi_at_time: getLocalized(character.frames?.alibi_at_time?.truth?.text, lang)
      }
    }));

  return {
    response_language: lang,
    case_id: caseId,
    immutable_truth: {
      killer_id: truth.killer_id || "",
      method: truth.method || "",
      motive: truth.motive || "",
      timeline: ensureArray(truth.timeline),
      planted_evidence: ensureArray(truth.planted_evidence)
    },
    public_state: {
      victim_name: getLocalized(publicState.victim_name, lang),
      victim_role: getLocalized(publicState.victim_role, lang),
      case_time: getLocalized(publicState.case_time, lang),
      case_location: getLocalized(publicState.case_location, lang),
      case_briefing: getLocalized(publicState.case_briefing, lang),
      tensions: ensureArray(publicState.tensions).map((entry) => getLocalized(entry, lang))
    },
    characters,
    gameplay_baseline: {
      clue_chain: ensureArray(baseConfig?.clue_chain).map((step) => ({
        id: step.id,
        requires: ensureArray(step.requires),
        location_ids: ensureArray(step.location_ids),
        evidence: ensureArray(step.evidence).map((entry) => getLocalized(entry, lang)),
        leads: ensureArray(step.leads).map((entry) => getLocalized(entry, lang))
      })),
      truth_ledger: ensureArray(baseConfig?.truth_ledger).map((fact) => ({
        id: fact.id,
        summary: getLocalized(fact.summary, lang),
        detail: getLocalized(fact.detail, lang),
        micro_details: ensureArray(fact.micro_details).map((entry) => getLocalized(entry, lang)),
        contradiction_tests: ensureArray(fact.contradiction_tests).map((entry) => getLocalized(entry, lang))
      })),
      statement_scripts: ensureArray(baseConfig?.statement_scripts).map((entry) => ({
        id: entry.id,
        character_id: entry.character_id,
        strategies: ensureArray(entry.strategies),
        require_fact_ids: ensureArray(entry.require_fact_ids),
        text: getLocalized(entry.text, lang),
        evidence_label: getLocalized(entry.evidence_label, lang)
      }))
    },
    novel_text: String(novel || "")
  };
}

function parseTimelineMinutes(text) {
  const match = String(text || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour === 12) hour = 0;
  if (period === "PM") hour += 12;
  return hour * 60 + minute;
}

function normalizeStorylabOutput(raw) {
  const fallback = fallbackJudgeOutput();
  if (!raw || typeof raw !== "object") return fallback;

  const intrigueScore = Number(raw.story_intrigue?.score);
  const intrigueLabel = ["low", "medium", "high"].includes(raw.story_intrigue?.label)
    ? raw.story_intrigue.label
    : "medium";
  const difficulty = ["easy", "medium", "hard"].includes(raw.difficulty)
    ? raw.difficulty
    : "medium";
  const plausibilityVerdict = ["plausible", "borderline", "implausible"].includes(
    raw.plausibility?.verdict
  )
    ? raw.plausibility.verdict
    : "borderline";
  const motivesVerdict = ["strong", "adequate", "weak", "missing"].includes(raw.coherence?.motives)
    ? raw.coherence.motives
    : "adequate";
  const relationshipsVerdict = ["strong", "adequate", "weak", "missing"].includes(
    raw.coherence?.relationships
  )
    ? raw.coherence.relationships
    : "adequate";

  const normalized = {
    story_intrigue: {
      score: Number.isInteger(intrigueScore) ? Math.min(10, Math.max(1, intrigueScore)) : 5,
      label: intrigueLabel,
      notes: normalizeStringList(raw.story_intrigue?.notes)
    },
    difficulty,
    plausibility: {
      verdict: plausibilityVerdict,
      notes: normalizeStringList(raw.plausibility?.notes)
    },
    fact_check: {
      has_inconsistencies: Boolean(raw.fact_check?.has_inconsistencies),
      inconsistencies: ensureArray(raw.fact_check?.inconsistencies)
        .map((item) => ({
          where: String(item?.where || "").trim(),
          issue: String(item?.issue || "").trim(),
          severity: ["low", "medium", "high"].includes(item?.severity)
            ? item.severity
            : "medium",
          suggested_fix: String(item?.suggested_fix || "").trim()
        }))
        .filter((item) => item.where && item.issue)
    },
    coherence: {
      motives: motivesVerdict,
      relationships: relationshipsVerdict,
      notes: normalizeStringList(raw.coherence?.notes)
    },
    gaps: {
      timeline: normalizeStringList(raw.gaps?.timeline),
      motives: normalizeStringList(raw.gaps?.motives),
      relationships: normalizeStringList(raw.gaps?.relationships),
      evidence_chain: normalizeStringList(raw.gaps?.evidence_chain),
      character_knowledge: normalizeStringList(raw.gaps?.character_knowledge)
    },
    recommendations: normalizeStringList(raw.recommendations),
    corrections: ensureArray(raw.corrections)
      .map((entry) => ({
        where: String(entry?.where || "").trim(),
        issue: String(entry?.issue || "").trim(),
        proposed_change: String(entry?.proposed_change || "").trim(),
        reason: String(entry?.reason || "").trim()
      }))
      .filter((entry) => entry.where && entry.issue && entry.proposed_change),
    gameplay_patch: {
      truth_ledger_additions: ensureArray(raw.gameplay_patch?.truth_ledger_additions).map(
        (entry, index) => ({
          id: normalizeId(entry?.id, `F_NOVEL_${index + 1}`),
          summary: String(entry?.summary || "").trim(),
          detail: String(entry?.detail || "").trim(),
          micro_details: normalizeStringList(entry?.micro_details),
          contradiction_tests: normalizeStringList(entry?.contradiction_tests)
        })
      ),
      truth_ledger_updates: ensureArray(raw.gameplay_patch?.truth_ledger_updates).map((entry) => ({
        fact_id: normalizeId(entry?.fact_id, ""),
        micro_details_add: normalizeStringList(entry?.micro_details_add),
        contradiction_tests_add: normalizeStringList(entry?.contradiction_tests_add)
      })),
      clue_step_updates: ensureArray(raw.gameplay_patch?.clue_step_updates).map((entry) => ({
        step_id: normalizeId(entry?.step_id, ""),
        extra_triggers: normalizeStringList(entry?.extra_triggers),
        extra_evidence: normalizeStringList(entry?.extra_evidence),
        extra_leads: normalizeStringList(entry?.extra_leads)
      })),
      statement_scripts_additions: ensureArray(raw.gameplay_patch?.statement_scripts_additions).map(
        (entry, index) => ({
          id: normalizeId(entry?.id, `ST_NOVEL_${index + 1}`),
          character_id: normalizeId(entry?.character_id, ""),
          strategies: unique(
            ensureArray(entry?.strategies).filter((value) => STRATEGY_ENUM.includes(value))
          ),
          require_fact_ids: normalizeStringList(entry?.require_fact_ids),
          text: String(entry?.text || "").trim(),
          evidence_label: String(entry?.evidence_label || "").trim()
        })
      )
    }
  };

  normalized.gameplay_patch.truth_ledger_additions = normalized.gameplay_patch.truth_ledger_additions.filter(
    (entry) => entry.id && entry.summary && entry.detail
  );
  normalized.gameplay_patch.truth_ledger_updates = normalized.gameplay_patch.truth_ledger_updates.filter(
    (entry) => entry.fact_id
  );
  normalized.gameplay_patch.clue_step_updates = normalized.gameplay_patch.clue_step_updates.filter(
    (entry) => entry.step_id
  );
  normalized.gameplay_patch.statement_scripts_additions =
    normalized.gameplay_patch.statement_scripts_additions.filter(
      (entry) => entry.id && entry.character_id && entry.text
    );

  return normalized;
}

function fallbackJudgeOutput() {
  return {
    story_intrigue: {
      score: 5,
      label: "medium",
      notes: ["Story judge unavailable; run again with model access."]
    },
    difficulty: "medium",
    plausibility: {
      verdict: "borderline",
      notes: ["Model did not return a plausibility judgment."]
    },
    fact_check: {
      has_inconsistencies: false,
      inconsistencies: []
    },
    coherence: {
      motives: "adequate",
      relationships: "adequate",
      notes: ["Model did not return coherence diagnostics."]
    },
    gaps: {
      timeline: [],
      motives: [],
      relationships: [],
      evidence_chain: [],
      character_knowledge: []
    },
    recommendations: ["Provide an OPENAI_API_KEY and retry for full story analysis."],
    corrections: [],
    gameplay_patch: {
      truth_ledger_additions: [],
      truth_ledger_updates: [],
      clue_step_updates: [],
      statement_scripts_additions: []
    }
  };
}

function summarizeCasepack(config) {
  return {
    steps: ensureArray(config?.clue_chain).length,
    facts: ensureArray(config?.truth_ledger).length,
    statements: ensureArray(config?.statement_scripts).length
  };
}

export function applyGameplayPatch(baseConfig, patch) {
  const merged = deepClone(baseConfig || {});
  if (!merged || typeof merged !== "object") return null;
  const safePatch = normalizeStorylabOutput({ gameplay_patch: patch }).gameplay_patch;

  merged.clue_chain = ensureArray(merged.clue_chain);
  merged.truth_ledger = ensureArray(merged.truth_ledger);
  merged.statement_scripts = ensureArray(merged.statement_scripts);

  const factMap = new Map(merged.truth_ledger.map((fact) => [fact.id, fact]));
  for (const addition of safePatch.truth_ledger_additions) {
    const existing = factMap.get(addition.id);
    if (existing) {
      existing.micro_details = mergeLocalizedList(
        existing.micro_details,
        addition.micro_details.map((line) => loc(line))
      );
      existing.contradiction_tests = mergeLocalizedList(
        existing.contradiction_tests,
        addition.contradiction_tests.map((line) => loc(line))
      );
      continue;
    }
    const fact = {
      id: addition.id,
      summary: loc(addition.summary),
      detail: loc(addition.detail),
      micro_details: addition.micro_details.map((line) => loc(line)),
      contradiction_tests: addition.contradiction_tests.map((line) => loc(line))
    };
    merged.truth_ledger.push(fact);
    factMap.set(fact.id, fact);
  }

  for (const update of safePatch.truth_ledger_updates) {
    const fact = factMap.get(update.fact_id);
    if (!fact) continue;
    fact.micro_details = mergeLocalizedList(
      fact.micro_details,
      update.micro_details_add.map((line) => loc(line))
    );
    fact.contradiction_tests = mergeLocalizedList(
      fact.contradiction_tests,
      update.contradiction_tests_add.map((line) => loc(line))
    );
  }

  const stepMap = new Map(merged.clue_chain.map((step) => [step.id, step]));
  for (const update of safePatch.clue_step_updates) {
    const step = stepMap.get(update.step_id);
    if (!step) continue;
    step.triggers = mergeStringList(step.triggers, update.extra_triggers);
    step.evidence = mergeLocalizedList(
      step.evidence,
      update.extra_evidence.map((line) => toLocalized(line))
    );
    step.leads = mergeLocalizedList(step.leads, update.extra_leads.map((line) => toLocalized(line)));
  }

  const statementIds = new Set(merged.statement_scripts.map((entry) => entry.id));
  for (const addition of safePatch.statement_scripts_additions) {
    if (statementIds.has(addition.id)) continue;
    merged.statement_scripts.push({
      id: addition.id,
      character_id: addition.character_id,
      strategies: addition.strategies.length ? addition.strategies : ["bluff"],
      require_fact_ids: addition.require_fact_ids,
      text: loc(addition.text),
      evidence_label: loc(addition.evidence_label || "recorded statement")
    });
    statementIds.add(addition.id);
  }

  return merged;
}

export function runStaticStoryChecks({ caseContext, config }) {
  const issues = [];
  const truth = caseContext?.truth || {};
  const characters = ensureArray(caseContext?.characters);
  const characterIds = new Set(characters.map((character) => character.id));

  if (truth.killer_id && !characterIds.has(truth.killer_id)) {
    issues.push({
      code: "TRUTH_KILLER_MISSING",
      where: "truth.killer_id",
      severity: "high",
      issue: `killer_id "${truth.killer_id}" does not match any character id.`,
      suggested_fix: "Set truth.killer_id to an existing character id."
    });
  }

  let previousMinute = null;
  ensureArray(truth.timeline).forEach((entry, index) => {
    const minute = parseTimelineMinutes(entry);
    if (minute === null) return;
    if (previousMinute !== null && minute < previousMinute) {
      issues.push({
        code: "TIMELINE_ORDER",
        where: `truth.timeline[${index}]`,
        severity: "high",
        issue: "Timeline appears out of chronological order.",
        suggested_fix: "Sort timeline anchors into monotonic time order."
      });
    }
    previousMinute = minute;
  });

  for (const character of characters) {
    const charPath = `characters.${character.id || "unknown"}`;
    const hasRelationshipToVictim = Boolean(character.relationship_to_victim);
    const hasRelationshipMap = ensureArray(character.relationships).length > 0;
    if (!hasRelationshipToVictim && !hasRelationshipMap) {
      issues.push({
        code: "CHAR_RELATIONSHIP_MISSING",
        where: `${charPath}.relationship_to_victim`,
        severity: "medium",
        issue: "Character has no relationship context.",
        suggested_fix: "Add relationship_to_victim or at least one relationships entry."
      });
    }
    const trueAlibi = getLocalized(character.private_facts?.true_alibi, "en");
    const lieAlibi = getLocalized(character.private_facts?.lie_alibi, "en");
    if (!trueAlibi || !lieAlibi) {
      issues.push({
        code: "CHAR_ALIBI_INCOMPLETE",
        where: `${charPath}.private_facts`,
        severity: "medium",
        issue: "Character is missing true_alibi or lie_alibi.",
        suggested_fix: "Provide both true_alibi and lie_alibi strings."
      });
    }
    const suspicionId = character.private_facts?.suspicion_id;
    if (suspicionId && !characterIds.has(suspicionId)) {
      issues.push({
        code: "CHAR_SUSPICION_UNKNOWN",
        where: `${charPath}.private_facts.suspicion_id`,
        severity: "medium",
        issue: `suspicion_id "${suspicionId}" does not match any character id.`,
        suggested_fix: "Point suspicion_id to an existing character."
      });
    }
  }

  const stepIds = new Set();
  for (const step of ensureArray(config?.clue_chain)) {
    if (!step?.id) continue;
    if (stepIds.has(step.id)) {
      issues.push({
        code: "CLUE_STEP_DUPLICATE",
        where: `clue_chain.${step.id}`,
        severity: "medium",
        issue: "Duplicate clue step id.",
        suggested_fix: "Ensure each clue step id is unique."
      });
    }
    stepIds.add(step.id);
  }
  for (const step of ensureArray(config?.clue_chain)) {
    for (const requiredId of ensureArray(step?.requires)) {
      if (!stepIds.has(requiredId)) {
        issues.push({
          code: "CLUE_STEP_REQUIRE_UNKNOWN",
          where: `clue_chain.${step?.id || "unknown"}.requires`,
          severity: "high",
          issue: `Required step "${requiredId}" is missing.`,
          suggested_fix: "Fix requires to reference an existing clue step."
        });
      }
    }
  }

  const factIds = new Set();
  for (const fact of ensureArray(config?.truth_ledger)) {
    if (!fact?.id) continue;
    if (factIds.has(fact.id)) {
      issues.push({
        code: "FACT_DUPLICATE",
        where: `truth_ledger.${fact.id}`,
        severity: "medium",
        issue: "Duplicate truth ledger id.",
        suggested_fix: "Ensure each fact id is unique."
      });
    }
    factIds.add(fact.id);
  }

  const statementIds = new Set();
  for (const statement of ensureArray(config?.statement_scripts)) {
    if (!statement?.id) continue;
    if (statementIds.has(statement.id)) {
      issues.push({
        code: "STATEMENT_DUPLICATE",
        where: `statement_scripts.${statement.id}`,
        severity: "medium",
        issue: "Duplicate statement script id.",
        suggested_fix: "Use unique statement ids."
      });
    }
    statementIds.add(statement.id);
    if (statement.character_id && !characterIds.has(statement.character_id)) {
      issues.push({
        code: "STATEMENT_CHARACTER_UNKNOWN",
        where: `statement_scripts.${statement.id}.character_id`,
        severity: "high",
        issue: `Statement references unknown character "${statement.character_id}".`,
        suggested_fix: "Set character_id to an existing case character."
      });
    }
    for (const factId of ensureArray(statement.require_fact_ids)) {
      if (!factIds.has(factId)) {
        issues.push({
          code: "STATEMENT_FACT_UNKNOWN",
          where: `statement_scripts.${statement.id}.require_fact_ids`,
          severity: "medium",
          issue: `Statement requires unknown fact "${factId}".`,
          suggested_fix: "Reference only ids from truth_ledger."
        });
      }
    }
  }

  return {
    has_issues: issues.length > 0,
    issues
  };
}

export async function reviewNovelForGameplay({
  caseId,
  caseContext,
  novel,
  language = "en",
  includeConfig = false
}) {
  const lang = normalizeLanguage(language);
  const novelText = String(novel || "").trim();
  if (!caseId) {
    return { error: "caseId is required" };
  }
  if (!novelText) {
    return { error: "novel is required" };
  }
  if (!caseContext || typeof caseContext !== "object") {
    return { error: "caseContext is required" };
  }

  const baseConfig = await constructCaseConfig(caseId, caseContext);
  if (!baseConfig) {
    return { error: `No gameplay config found for case ${caseId}` };
  }

  const preflight = runStaticStoryChecks({ caseContext, config: baseConfig });
  const client = getOpenAIClient();
  const prompt = loadPrompt("storylab");
  let normalizedJudge = fallbackJudgeOutput();
  let modelUsed = "fallback";
  let modelMock = true;

  if (client) {
    const context = buildStorylabContext({
      caseId,
      caseContext,
      baseConfig,
      novel: novelText,
      language: lang
    });
    const responseParams = {
      model: STORYLAB_MODEL,
      input: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(context) }
      ],
      temperature: STORYLAB_TEMPERATURE,
      max_output_tokens: STORYLAB_MAX_OUTPUT_TOKENS,
      text: {
        format: {
          type: "json_schema",
          name: "StorylabReview",
          strict: true,
          schema: STORYLAB_SCHEMA
        }
      }
    };
    if (isGpt5Model(STORYLAB_MODEL)) {
      responseParams.reasoning = { effort: "minimal" };
      responseParams.text = { ...responseParams.text, verbosity: "low" };
    }
    try {
      const response = await createResponse(client, responseParams);
      const outputText = extractOutputText(response);
      if (outputText) {
        const parsed = JSON.parse(outputText);
        normalizedJudge = normalizeStorylabOutput(parsed);
        modelUsed = STORYLAB_MODEL;
        modelMock = false;
      }
    } catch {
      normalizedJudge = fallbackJudgeOutput();
      modelUsed = "fallback";
      modelMock = true;
    }
  } else {
    normalizedJudge = fallbackJudgeOutput();
  }

  const mergedConfig = applyGameplayPatch(baseConfig, normalizedJudge.gameplay_patch);
  const postflight = runStaticStoryChecks({ caseContext, config: mergedConfig });
  const staticInconsistencies = ensureArray(postflight.issues).map((issue) => ({
    where: issue.where,
    issue: issue.issue,
    severity: issue.severity,
    suggested_fix: issue.suggested_fix
  }));
  const combinedInconsistencies = normalizedJudge.fact_check.inconsistencies.concat(staticInconsistencies);
  const dedupedInconsistencies = [];
  const seen = new Set();
  for (const entry of combinedInconsistencies) {
    const key = `${entry.where}|${entry.issue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedInconsistencies.push(entry);
  }

  normalizedJudge.fact_check = {
    has_inconsistencies:
      normalizedJudge.fact_check.has_inconsistencies || dedupedInconsistencies.length > 0,
    inconsistencies: dedupedInconsistencies
  };

  return {
    case_id: caseId,
    model_used: modelUsed,
    model_mock: modelMock,
    base_config: summarizeCasepack(baseConfig),
    enriched_config: summarizeCasepack(mergedConfig),
    story_intrigue: normalizedJudge.story_intrigue,
    difficulty: normalizedJudge.difficulty,
    plausibility: normalizedJudge.plausibility,
    fact_check: normalizedJudge.fact_check,
    coherence: normalizedJudge.coherence,
    gaps: normalizedJudge.gaps,
    recommendations: normalizedJudge.recommendations,
    corrections: normalizedJudge.corrections,
    gameplay_patch: normalizedJudge.gameplay_patch,
    static_checks: {
      before_patch: preflight,
      after_patch: postflight
    },
    preview: {
      added_fact_ids: ensureArray(normalizedJudge.gameplay_patch.truth_ledger_additions).map(
        (entry) => entry.id
      ),
      updated_fact_ids: ensureArray(normalizedJudge.gameplay_patch.truth_ledger_updates).map(
        (entry) => entry.fact_id
      ),
      updated_step_ids: ensureArray(normalizedJudge.gameplay_patch.clue_step_updates).map(
        (entry) => entry.step_id
      ),
      added_statement_ids: ensureArray(normalizedJudge.gameplay_patch.statement_scripts_additions).map(
        (entry) => entry.id
      )
    },
    enriched_casepack: includeConfig ? mergedConfig : undefined
  };
}

export async function convertNovelToGameplay(args) {
  return reviewNovelForGameplay({
    ...args,
    includeConfig: args?.includeConfig !== false
  });
}
