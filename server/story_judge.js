// Story Judge Service
// Run: `npm run dev`, then call `POST /api/story-judge` or `POST /api/story-loop` with `story_text`.
// Purpose: score pasted story text against case truth and return a quality gate verdict.
import { createResponse, getOpenAIClient } from "./openai.js";
import { getLocalized, normalizeLanguage } from "./i18n.js";
import { loadPrompt } from "./prompts.js";

const STORY_JUDGE_MODEL =
  process.env.OPENAI_MODEL_STORY_JUDGE ||
  process.env.OPENAI_MODEL_CRITICAL ||
  "gpt-5";
const STORY_JUDGE_MAX_OUTPUT_TOKENS = Math.max(
  Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 240),
  1800
);
const STORY_JUDGE_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.2);

export const DEFAULT_QUALITY_BAR = {
  total_min: 80,
  internal_consistency_min: 18,
  mom_integrity_min: 14,
  clue_fairness_min: 14,
  max_critical: 0,
  max_major: 2
};

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "executive_verdict",
    "assumptions",
    "critical_contradictions",
    "fair_play_audit",
    "character_motive_audit",
    "timeline_opportunity_audit",
    "patch_plan_top5",
    "final_score",
    "publish_readiness_verdict",
    "report_markdown"
  ],
  properties: {
    executive_verdict: {
      type: "array",
      items: { type: "string" }
    },
    assumptions: {
      type: "array",
      items: { type: "string" }
    },
    critical_contradictions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "issue",
          "severity",
          "evidence",
          "why_it_breaks_logic",
          "minimal_fix",
          "confidence"
        ],
        properties: {
          issue: { type: "string" },
          severity: { type: "string", enum: ["Critical", "Major", "Minor"] },
          evidence: { type: "string" },
          why_it_breaks_logic: { type: "string" },
          minimal_fix: { type: "string" },
          confidence: { type: "string", enum: ["High", "Medium", "Low"] }
        }
      }
    },
    fair_play_audit: {
      type: "object",
      additionalProperties: false,
      required: ["fair_clues", "missing_or_withheld_clues", "solvable_before_reveal", "notes"],
      properties: {
        fair_clues: {
          type: "array",
          items: { type: "string" }
        },
        missing_or_withheld_clues: {
          type: "array",
          items: { type: "string" }
        },
        solvable_before_reveal: { type: "string", enum: ["yes", "partial", "no"] },
        notes: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    character_motive_audit: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "suspect",
          "motive_strength",
          "contradiction_risk",
          "believability",
          "notes"
        ],
        properties: {
          suspect: { type: "string" },
          motive_strength: { type: "string", enum: ["strong", "adequate", "weak", "missing"] },
          contradiction_risk: { type: "string", enum: ["low", "medium", "high"] },
          believability: { type: "string", enum: ["high", "medium", "low"] },
          notes: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    },
    timeline_opportunity_audit: {
      type: "object",
      additionalProperties: false,
      required: [
        "murder_window",
        "killer_access_viability",
        "impossible_movements",
        "opportunity_notes"
      ],
      properties: {
        murder_window: { type: "string" },
        killer_access_viability: { type: "string" },
        impossible_movements: {
          type: "array",
          items: { type: "string" }
        },
        opportunity_notes: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    patch_plan_top5: {
      type: "array",
      items: { type: "string" }
    },
    final_score: {
      type: "object",
      additionalProperties: false,
      required: [
        "total",
        "internal_consistency",
        "mom_integrity",
        "clue_fairness",
        "character_relationship_coherence",
        "investigative_plausibility",
        "ending_payoff_and_closure"
      ],
      properties: {
        total: { type: "integer", minimum: 0, maximum: 100 },
        internal_consistency: { type: "integer", minimum: 0, maximum: 25 },
        mom_integrity: { type: "integer", minimum: 0, maximum: 20 },
        clue_fairness: { type: "integer", minimum: 0, maximum: 20 },
        character_relationship_coherence: { type: "integer", minimum: 0, maximum: 15 },
        investigative_plausibility: { type: "integer", minimum: 0, maximum: 10 },
        ending_payoff_and_closure: { type: "integer", minimum: 0, maximum: 10 }
      }
    },
    publish_readiness_verdict: { type: "string" },
    report_markdown: { type: "string" }
  }
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStringList(list) {
  return ensureArray(list)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
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

function buildJudgeContext({
  caseId,
  caseContext,
  config,
  storyText,
  castList,
  timeline,
  clueList,
  solutionReveal,
  sourceLabel,
  language
}) {
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
      goals: ensureArray(character.goals).map((entry) => getLocalized(entry, lang)),
      secrets: ensureArray(character.secrets).map((entry) => getLocalized(entry, lang))
    }));

  return {
    response_language: lang,
    source_label: sourceLabel || "",
    story_text: String(storyText || ""),
    optional_material: {
      cast_list: String(castList || ""),
      timeline_notes: String(timeline || ""),
      clue_list: String(clueList || ""),
      solution_reveal: String(solutionReveal || "")
    },
    case_reference: {
      case_id: caseId || "",
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
        case_briefing: getLocalized(publicState.case_briefing, lang)
      },
      characters
    },
    gameplay_reference: {
      clue_chain: ensureArray(config?.clue_chain).map((step) => ({
        id: step.id,
        requires: ensureArray(step.requires),
        location_ids: ensureArray(step.location_ids),
        triggers: ensureArray(step.triggers),
        evidence: ensureArray(step.evidence).map((entry) => getLocalized(entry, lang))
      })),
      truth_ledger: ensureArray(config?.truth_ledger).map((fact) => ({
        id: fact.id,
        summary: getLocalized(fact.summary, lang),
        detail: getLocalized(fact.detail, lang)
      })),
      statement_scripts: ensureArray(config?.statement_scripts).map((entry) => ({
        id: entry.id,
        character_id: entry.character_id,
        require_fact_ids: ensureArray(entry.require_fact_ids)
      }))
    }
  };
}

function normalizeQualityBar(input) {
  const candidate = input && typeof input === "object" ? input : {};
  const result = { ...DEFAULT_QUALITY_BAR };
  for (const [key, value] of Object.entries(candidate)) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) continue;
    result[key] = Math.max(0, Math.round(numeric));
  }
  return result;
}

function safeWords(input, min = 4) {
  return String(input || "")
    .toLowerCase()
    .split(/[^a-z0-9\u0370-\u03ff]+/i)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= min);
}

function includesAny(text, candidates) {
  const hay = String(text || "").toLowerCase();
  return ensureArray(candidates)
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => hay.includes(entry));
}

function uniq(list) {
  return Array.from(new Set(ensureArray(list).filter(Boolean)));
}

function buildDeterministicJudgeResult({
  caseId,
  caseContext,
  config,
  storyText,
  qualityBar,
  reason = "Remote story judge unavailable; using deterministic local scoring."
}) {
  const text = String(storyText || "");
  const lower = text.toLowerCase();
  const truth = caseContext?.truth || {};
  const characters = ensureArray(caseContext?.characters).filter((character) => !character?.is_location_contact);
  const killerCharacter = characters.find((character) => character?.id === truth?.killer_id);
  const killerName = String(killerCharacter?.name || "").trim();
  const killerTerms = uniq([truth?.killer_id, killerName].concat(safeWords(killerName, 3)));
  const methodTerms = uniq([truth?.method].concat(safeWords(truth?.method)));
  const motiveTerms = uniq([truth?.motive].concat(safeWords(truth?.motive)));
  const timeline = ensureArray(truth?.timeline);
  const clueChain = ensureArray(config?.clue_chain);
  const truthLedger = ensureArray(config?.truth_ledger);

  const killerMentioned = includesAny(lower, killerTerms);
  const methodMentioned = includesAny(lower, methodTerms);
  const motiveMentioned = includesAny(lower, motiveTerms);

  let timelineHits = 0;
  const missingTimeline = [];
  for (const item of timeline) {
    const timelineTerms = safeWords(item);
    const hit = timelineTerms.length ? includesAny(lower, timelineTerms.slice(0, 6)) : false;
    if (hit) timelineHits += 1;
    else missingTimeline.push(String(item || "").trim());
  }
  const timelineRatio = timeline.length ? timelineHits / timeline.length : 1;

  let clueHits = 0;
  for (const step of clueChain) {
    if (includesAny(lower, ensureArray(step?.triggers).slice(0, 6))) clueHits += 1;
  }
  const clueRatio = clueChain.length ? clueHits / clueChain.length : 1;

  const characterMentions = characters.filter((character) => {
    const name = String(character?.name || "").trim();
    return name && lower.includes(name.toLowerCase());
  }).length;
  const characterRatio = characters.length ? characterMentions / characters.length : 1;

  const score = {
    internal_consistency: Math.max(0, Math.min(25, Math.round(14 + timelineRatio * 7 + clueRatio * 4))),
    mom_integrity: Math.max(
      0,
      Math.min(
        20,
        4 +
          (killerMentioned ? 5 : 0) +
          (methodMentioned ? 5 : 0) +
          (motiveMentioned ? 5 : 0) +
          Math.round(timelineRatio * 1)
      )
    ),
    clue_fairness: Math.max(0, Math.min(20, Math.round(10 + clueRatio * 8 + Math.min(2, timelineRatio * 2)))),
    character_relationship_coherence: Math.max(0, Math.min(15, Math.round(6 + characterRatio * 8))),
    investigative_plausibility: Math.max(0, Math.min(10, Math.round(5 + clueRatio * 4))),
    ending_payoff_and_closure: Math.max(
      0,
      Math.min(10, 4 + (killerMentioned ? 2 : 0) + (motiveMentioned ? 2 : 0) + (clueRatio >= 0.6 ? 2 : 0))
    )
  };
  score.total =
    score.internal_consistency +
    score.mom_integrity +
    score.clue_fairness +
    score.character_relationship_coherence +
    score.investigative_plausibility +
    score.ending_payoff_and_closure;

  const missingAnchors = [];
  if (!killerMentioned) missingAnchors.push("killer_identity");
  if (!methodMentioned) missingAnchors.push("method");
  if (!motiveMentioned) missingAnchors.push("motive");
  if (timelineRatio < 0.6) missingAnchors.push("timeline_coverage");
  if (clueRatio < 0.5) missingAnchors.push("clue_path");
  if (characterRatio < 0.4) missingAnchors.push("character_coverage");

  const fairClues = truthLedger.slice(0, 4).map((fact) => String(fact?.id || "").trim()).filter(Boolean);
  const missingClues = clueChain
    .filter((step) => !includesAny(lower, ensureArray(step?.triggers).slice(0, 6)))
    .slice(0, 4)
    .map((step) => `Missing clue path coverage for step "${step.id}".`);

  const normalized = {
    executive_verdict: [
      `Deterministic local judge used for ${caseId || "case"} (${reason}).`,
      score.total >= 80 ? "Story currently meets the quality bar." : "Story needs enrichment before publish."
    ],
    assumptions: ["Local deterministic scoring applied because remote judge response was unavailable."],
    critical_contradictions: [],
    fair_play_audit: {
      fair_clues: fairClues,
      missing_or_withheld_clues: missingClues,
      solvable_before_reveal: clueRatio >= 0.6 ? "yes" : "partial",
      notes: [
        `Timeline anchors covered: ${timelineHits}/${timeline.length || 0}.`,
        `Clue triggers covered: ${clueHits}/${clueChain.length || 0}.`
      ]
    },
    character_motive_audit: characters.slice(0, 5).map((character) => ({
      suspect: String(character?.name || character?.id || "").trim(),
      motive_strength: motiveMentioned ? "adequate" : "weak",
      contradiction_risk: "low",
      believability: characterMentions > 0 ? "medium" : "low",
      notes: [
        motiveMentioned
          ? "Motive language exists in story text."
          : "Add motive-specific language tied to this suspect."
      ]
    })),
    timeline_opportunity_audit: {
      murder_window: timeline[0] ? String(timeline[0]) : "",
      killer_access_viability: killerMentioned ? "plausible from story anchors" : "needs explicit killer timeline anchor",
      impossible_movements: [],
      opportunity_notes: [
        missingTimeline.length
          ? `Missing timeline beats: ${missingTimeline.slice(0, 3).join(" | ")}`
          : "All timeline beats referenced."
      ]
    },
    patch_plan_top5: missingAnchors.map((anchor) => `Add explicit narrative coverage for ${anchor}.`).slice(0, 5),
    final_score: score,
    publish_readiness_verdict:
      score.total >= qualityBar.total_min
        ? "Publish-ready under deterministic gate."
        : "Not publish-ready under deterministic gate.",
    report_markdown: [
      "### Executive Verdict",
      `- Deterministic local judge used (${reason}).`,
      `- Total score: ${score.total}/100.`,
      "",
      "### Coverage",
      `- Killer anchor: ${killerMentioned ? "present" : "missing"}`,
      `- Method anchor: ${methodMentioned ? "present" : "missing"}`,
      `- Motive anchor: ${motiveMentioned ? "present" : "missing"}`,
      `- Timeline coverage: ${timelineHits}/${timeline.length || 0}`,
      `- Clue coverage: ${clueHits}/${clueChain.length || 0}`
    ].join("\n"),
    deterministic_analysis: {
      missing_anchors: missingAnchors,
      killer_mentioned: killerMentioned,
      method_mentioned: methodMentioned,
      motive_mentioned: motiveMentioned,
      timeline_hits: timelineHits,
      timeline_total: timeline.length,
      clue_hits: clueHits,
      clue_total: clueChain.length
    }
  };

  const qualityGate = evaluateQualityGate(normalized, qualityBar);
  return {
    model_used: "deterministic-local",
    model_mock: true,
    quality_gate: qualityGate,
    ...normalized
  };
}

function fallbackJudgeResult(qualityBar, context = {}) {
  if (context?.caseContext && context?.config && context?.storyText) {
    return buildDeterministicJudgeResult({
      caseId: context.caseId || "",
      caseContext: context.caseContext,
      config: context.config,
      storyText: context.storyText,
      qualityBar,
      reason: context.reason || "Fallback path"
    });
  }
  return {
    model_used: "fallback",
    model_mock: true,
    quality_gate: {
      pass: false,
      verdict: "fail",
      thresholds: qualityBar,
      failed_checks: ["judge_unavailable"],
      reasons: ["Story judge unavailable. Provide OPENAI_API_KEY and retry."]
    },
    executive_verdict: ["Judge unavailable."],
    assumptions: [],
    critical_contradictions: [],
    fair_play_audit: {
      fair_clues: [],
      missing_or_withheld_clues: [],
      solvable_before_reveal: "partial",
      notes: []
    },
    character_motive_audit: [],
    timeline_opportunity_audit: {
      murder_window: "",
      killer_access_viability: "",
      impossible_movements: [],
      opportunity_notes: []
    },
    patch_plan_top5: ["Enable model access and rerun story audit."],
    final_score: {
      total: 0,
      internal_consistency: 0,
      mom_integrity: 0,
      clue_fairness: 0,
      character_relationship_coherence: 0,
      investigative_plausibility: 0,
      ending_payoff_and_closure: 0
    },
    publish_readiness_verdict: "Not publish-ready: judge unavailable.",
    report_markdown:
      "### Executive Verdict\n- Story judge unavailable.\n- Provide `OPENAI_API_KEY` and rerun.\n\n### Final Score\n- 0/100\n- Publish readiness: unavailable."
  };
}

function normalizeJudgeOutput(raw) {
  const result = raw && typeof raw === "object" ? raw : {};
  const finalScore = result.final_score || {};
  const normalized = {
    executive_verdict: normalizeStringList(result.executive_verdict).slice(0, 5),
    assumptions: normalizeStringList(result.assumptions),
    critical_contradictions: ensureArray(result.critical_contradictions)
      .map((entry) => ({
        issue: String(entry?.issue || "").trim(),
        severity: ["Critical", "Major", "Minor"].includes(entry?.severity)
          ? entry.severity
          : "Major",
        evidence: String(entry?.evidence || "").trim(),
        why_it_breaks_logic: String(entry?.why_it_breaks_logic || "").trim(),
        minimal_fix: String(entry?.minimal_fix || "").trim(),
        confidence: ["High", "Medium", "Low"].includes(entry?.confidence)
          ? entry.confidence
          : "Medium"
      }))
      .filter((entry) => entry.issue),
    fair_play_audit: {
      fair_clues: normalizeStringList(result.fair_play_audit?.fair_clues),
      missing_or_withheld_clues: normalizeStringList(result.fair_play_audit?.missing_or_withheld_clues),
      solvable_before_reveal: ["yes", "partial", "no"].includes(
        result.fair_play_audit?.solvable_before_reveal
      )
        ? result.fair_play_audit.solvable_before_reveal
        : "partial",
      notes: normalizeStringList(result.fair_play_audit?.notes)
    },
    character_motive_audit: ensureArray(result.character_motive_audit)
      .map((entry) => ({
        suspect: String(entry?.suspect || "").trim(),
        motive_strength: ["strong", "adequate", "weak", "missing"].includes(entry?.motive_strength)
          ? entry.motive_strength
          : "adequate",
        contradiction_risk: ["low", "medium", "high"].includes(entry?.contradiction_risk)
          ? entry.contradiction_risk
          : "medium",
        believability: ["high", "medium", "low"].includes(entry?.believability)
          ? entry.believability
          : "medium",
        notes: normalizeStringList(entry?.notes)
      }))
      .filter((entry) => entry.suspect),
    timeline_opportunity_audit: {
      murder_window: String(result.timeline_opportunity_audit?.murder_window || "").trim(),
      killer_access_viability: String(
        result.timeline_opportunity_audit?.killer_access_viability || ""
      ).trim(),
      impossible_movements: normalizeStringList(result.timeline_opportunity_audit?.impossible_movements),
      opportunity_notes: normalizeStringList(result.timeline_opportunity_audit?.opportunity_notes)
    },
    patch_plan_top5: normalizeStringList(result.patch_plan_top5).slice(0, 5),
    final_score: {
      total: Math.max(0, Math.min(100, Number(finalScore.total) || 0)),
      internal_consistency: Math.max(0, Math.min(25, Number(finalScore.internal_consistency) || 0)),
      mom_integrity: Math.max(0, Math.min(20, Number(finalScore.mom_integrity) || 0)),
      clue_fairness: Math.max(0, Math.min(20, Number(finalScore.clue_fairness) || 0)),
      character_relationship_coherence: Math.max(
        0,
        Math.min(15, Number(finalScore.character_relationship_coherence) || 0)
      ),
      investigative_plausibility: Math.max(
        0,
        Math.min(10, Number(finalScore.investigative_plausibility) || 0)
      ),
      ending_payoff_and_closure: Math.max(
        0,
        Math.min(10, Number(finalScore.ending_payoff_and_closure) || 0)
      )
    },
    publish_readiness_verdict: String(result.publish_readiness_verdict || "").trim(),
    report_markdown: String(result.report_markdown || "").trim()
  };

  if (!normalized.report_markdown) {
    normalized.report_markdown = [
      "### Executive Verdict",
      ...normalized.executive_verdict.map((line) => `- ${line}`),
      "",
      "### Final Score",
      `- ${normalized.final_score.total}/100`,
      `- ${normalized.publish_readiness_verdict || "No verdict provided."}`
    ].join("\n");
  }
  return normalized;
}

function evaluateQualityGate(judgeResult, qualityBar) {
  const thresholds = normalizeQualityBar(qualityBar);
  const score = judgeResult.final_score || {};
  const contradictions = ensureArray(judgeResult.critical_contradictions);
  const criticalCount = contradictions.filter((entry) => entry.severity === "Critical").length;
  const majorCount = contradictions.filter((entry) => entry.severity === "Major").length;
  const failedChecks = [];
  const reasons = [];

  if ((score.total || 0) < thresholds.total_min) {
    failedChecks.push("total_score");
    reasons.push(`Total score ${score.total || 0} is below ${thresholds.total_min}.`);
  }
  if ((score.internal_consistency || 0) < thresholds.internal_consistency_min) {
    failedChecks.push("internal_consistency");
    reasons.push(
      `Internal consistency ${score.internal_consistency || 0}/25 is below ${thresholds.internal_consistency_min}.`
    );
  }
  if ((score.mom_integrity || 0) < thresholds.mom_integrity_min) {
    failedChecks.push("mom_integrity");
    reasons.push(`Means/Opportunity/Motive integrity ${score.mom_integrity || 0}/20 is below ${thresholds.mom_integrity_min}.`);
  }
  if ((score.clue_fairness || 0) < thresholds.clue_fairness_min) {
    failedChecks.push("clue_fairness");
    reasons.push(`Clue fairness ${score.clue_fairness || 0}/20 is below ${thresholds.clue_fairness_min}.`);
  }
  if (criticalCount > thresholds.max_critical) {
    failedChecks.push("critical_contradictions");
    reasons.push(`Critical contradictions ${criticalCount} exceed allowed ${thresholds.max_critical}.`);
  }
  if (majorCount > thresholds.max_major) {
    failedChecks.push("major_contradictions");
    reasons.push(`Major contradictions ${majorCount} exceed allowed ${thresholds.max_major}.`);
  }

  return {
    pass: failedChecks.length === 0,
    verdict: failedChecks.length === 0 ? "pass" : "fail",
    thresholds,
    counts: {
      critical_contradictions: criticalCount,
      major_contradictions: majorCount,
      minor_contradictions: contradictions.filter((entry) => entry.severity === "Minor").length
    },
    failed_checks: failedChecks,
    reasons
  };
}

export async function runMurderMysteryJudge({
  caseId = "",
  caseContext = null,
  config = null,
  storyText = "",
  castList = "",
  timeline = "",
  clueList = "",
  solutionReveal = "",
  sourceLabel = "",
  language = "en",
  qualityBar = null
}) {
  const bar = normalizeQualityBar(qualityBar);
  const text = String(storyText || "").trim();
  if (!text) {
    return {
      error: "storyText is required"
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    return fallbackJudgeResult(bar, {
      caseId,
      caseContext,
      config,
      storyText: text,
      reason: "No OpenAI client"
    });
  }

  const context = buildJudgeContext({
    caseId,
    caseContext,
    config,
    storyText: text,
    castList,
    timeline,
    clueList,
    solutionReveal,
    sourceLabel,
    language
  });
  const prompt = loadPrompt("story_judge");
  const responseParams = {
    model: STORY_JUDGE_MODEL,
    input: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(context) }
    ],
    temperature: STORY_JUDGE_TEMPERATURE,
    max_output_tokens: STORY_JUDGE_MAX_OUTPUT_TOKENS,
    text: {
      format: {
        type: "json_schema",
        name: "MurderMysteryJudge",
        strict: true,
        schema: JUDGE_SCHEMA
      }
    }
  };

  if (isGpt5Model(STORY_JUDGE_MODEL)) {
    responseParams.reasoning = { effort: "minimal" };
    responseParams.text = { ...responseParams.text, verbosity: "low" };
  }

  try {
    const response = await createResponse(client, responseParams);
    const outputText = extractOutputText(response);
    if (!outputText) {
      return fallbackJudgeResult(bar, {
        caseId,
        caseContext,
        config,
        storyText: text,
        reason: "Empty model output"
      });
    }
    const parsed = JSON.parse(outputText);
    const normalized = normalizeJudgeOutput(parsed);
    const qualityGate = evaluateQualityGate(normalized, bar);
    return {
      model_used: STORY_JUDGE_MODEL,
      model_mock: false,
      quality_gate: qualityGate,
      ...normalized
    };
  } catch (error) {
    return fallbackJudgeResult(bar, {
      caseId,
      caseContext,
      config,
      storyText: text,
      reason: String(error?.message || error || "Model response failed")
    });
  }
}
