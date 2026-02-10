// Story Feedback Loop Service
// Run: `npm run dev` + `POST /api/story-loop`, or CLI `npm run story:loop -- <caseId> --file <story.txt>`.
// Purpose: judge/enrich loop for pasted stories, constructor merge, and backlog persistence.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createResponse, getOpenAIClient } from "./openai.js";
import { constructCaseConfig, getBaselineCaseConfig } from "./investigation.js";
import { getLocalized, normalizeLanguage } from "./i18n.js";
import { loadPrompt } from "./prompts.js";
import { applyGameplayPatch } from "./storylab.js";
import { runMurderMysteryJudge } from "./story_judge.js";

const STORY_FIXER_MODEL =
  process.env.OPENAI_MODEL_STORY_FIXER ||
  process.env.OPENAI_MODEL_CRITICAL ||
  "gpt-5";
const STORY_FIXER_MAX_OUTPUT_TOKENS = Math.max(
  Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 240),
  1200
);
const STORY_FIXER_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.2);
const STRATEGY_ENUM = ["bluff", "pressure", "empathy", "evidence_push"];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORY_BACKLOG_DIR = path.join(__dirname, "story_backlog");

const FIXER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["patch_summary", "gameplay_patch"],
  properties: {
    patch_summary: {
      type: "array",
      items: { type: "string" }
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

function summarizeConfig(config) {
  return {
    steps: ensureArray(config?.clue_chain).length,
    facts: ensureArray(config?.truth_ledger).length,
    statements: ensureArray(config?.statement_scripts).length
  };
}

function buildDeterministicStoryAddendum({ caseContext, config, judge }) {
  const truth = caseContext?.truth || {};
  const characters = ensureArray(caseContext?.characters).filter((character) => !character?.is_location_contact);
  const killer = characters.find((character) => character?.id === truth?.killer_id);
  const killerLabel = killer?.name
    ? `${killer.name} (${truth?.killer_id || "unknown"})`
    : truth?.killer_id || "unknown";
  const castLine = characters
    .map((character) => String(character?.name || "").trim())
    .filter(Boolean)
    .join(", ");
  const timeline = ensureArray(truth?.timeline).slice(0, 4);
  const clueSteps = ensureArray(config?.clue_chain).slice(0, 4).map((step) => step?.id).filter(Boolean);
  const missingAnchors = ensureArray(judge?.deterministic_analysis?.missing_anchors);
  if (!missingAnchors.length) return "";

  return [
    "",
    "### Canonical Enrichment Addendum",
    `Killer anchor: ${killerLabel}.`,
    castLine ? `Character roster anchors: ${castLine}.` : "",
    `Method anchor: ${String(truth?.method || "").trim()}.`,
    `Motive anchor: ${String(truth?.motive || "").trim()}.`,
    timeline.length ? `Timeline anchors:\n- ${timeline.join("\n- ")}` : "",
    clueSteps.length ? `Investigative clue path ids: ${clueSteps.join(", ")}.` : "",
    `Missing anchors addressed: ${missingAnchors.join(", ")}.`
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizePatchPayload(patch) {
  return {
    truth_ledger_additions: ensureArray(patch?.truth_ledger_additions),
    truth_ledger_updates: ensureArray(patch?.truth_ledger_updates),
    clue_step_updates: ensureArray(patch?.clue_step_updates),
    statement_scripts_additions: ensureArray(patch?.statement_scripts_additions)
  };
}

function mergePatchPayloads(basePatch, nextPatch) {
  const current = normalizePatchPayload(basePatch);
  const incoming = normalizePatchPayload(nextPatch);
  return {
    truth_ledger_additions: current.truth_ledger_additions.concat(incoming.truth_ledger_additions),
    truth_ledger_updates: current.truth_ledger_updates.concat(incoming.truth_ledger_updates),
    clue_step_updates: current.clue_step_updates.concat(incoming.clue_step_updates),
    statement_scripts_additions: current.statement_scripts_additions.concat(
      incoming.statement_scripts_additions
    )
  };
}

function storyBacklogId(caseId, storyText) {
  const hash = crypto
    .createHash("sha1")
    .update(`${String(caseId || "").trim()}\n${String(storyText || "").trim()}`)
    .digest("hex")
    .slice(0, 12);
  return `${String(caseId || "").trim() || "unknown-case"}-${hash}`;
}

function persistStoryBacklogEntry({
  caseId,
  storyInputText,
  storyFinalText,
  caseContext,
  loopResult,
  finalCasepack,
  sourceLabel
}) {
  const id = storyBacklogId(caseId, storyFinalText || storyInputText);
  const entry = {
    id,
    created_at: new Date().toISOString(),
    case_id: caseId,
    source_label: String(sourceLabel || "story-intake"),
    story_input_text: String(storyInputText || ""),
    story_final_text: String(storyFinalText || ""),
    quality_gate: loopResult?.rounds?.[loopResult.rounds.length - 1]?.judge?.quality_gate || {},
    rounds_completed: Number(loopResult?.rounds_completed || 0),
    final_score: Number(
      loopResult?.rounds?.[loopResult.rounds.length - 1]?.judge?.final_score?.total || 0
    ),
    final_casepack_summary: summarizeConfig(finalCasepack),
    final_casepack: finalCasepack,
    seed_characters: ensureArray(caseContext?.characters).map((character) => ({
      id: character?.id || "",
      name: character?.name || "",
      role: character?.role || "",
      relationship_to_victim: character?.relationship_to_victim || ""
    }))
  };
  fs.mkdirSync(STORY_BACKLOG_DIR, { recursive: true });
  const outputPath = path.join(STORY_BACKLOG_DIR, `${id}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(entry, null, 2));
  return {
    id,
    output_path: outputPath
  };
}

function buildFixerContext({
  caseId,
  caseContext,
  config,
  storyText,
  judge,
  round,
  language
}) {
  const lang = normalizeLanguage(language);
  const truth = caseContext?.truth || {};
  const publicState = caseContext?.public_state || {};
  return {
    response_language: lang,
    case_id: caseId,
    round,
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
      case_location: getLocalized(publicState.case_location, lang)
    },
    story_text: String(storyText || ""),
    judge_failures: {
      quality_gate: judge?.quality_gate || {},
      contradictions: ensureArray(judge?.critical_contradictions),
      fair_play_missing: ensureArray(judge?.fair_play_audit?.missing_or_withheld_clues),
      timeline_issues: ensureArray(judge?.timeline_opportunity_audit?.impossible_movements),
      patch_plan_top5: ensureArray(judge?.patch_plan_top5)
    },
    current_gameplay: {
      clue_chain: ensureArray(config?.clue_chain).map((step) => ({
        id: step.id,
        requires: ensureArray(step.requires),
        location_ids: ensureArray(step.location_ids),
        triggers: ensureArray(step.triggers),
        reveal_fact_ids: ensureArray(step.reveal_fact_ids),
        evidence: ensureArray(step.evidence).map((entry) => getLocalized(entry, lang)),
        leads: ensureArray(step.leads).map((entry) => getLocalized(entry, lang))
      })),
      truth_ledger: ensureArray(config?.truth_ledger).map((fact) => ({
        id: fact.id,
        summary: getLocalized(fact.summary, lang),
        detail: getLocalized(fact.detail, lang),
        micro_details: ensureArray(fact.micro_details).map((entry) => getLocalized(entry, lang)),
        contradiction_tests: ensureArray(fact.contradiction_tests).map((entry) => getLocalized(entry, lang))
      })),
      statement_scripts: ensureArray(config?.statement_scripts).map((entry) => ({
        id: entry.id,
        character_id: entry.character_id,
        strategies: ensureArray(entry.strategies),
        require_fact_ids: ensureArray(entry.require_fact_ids),
        text: getLocalized(entry.text, lang)
      }))
    }
  };
}

function normalizePatch(raw) {
  const fallback = {
    patch_summary: [],
    story_addendum: "",
    gameplay_patch: {
      truth_ledger_additions: [],
      truth_ledger_updates: [],
      clue_step_updates: [],
      statement_scripts_additions: []
    }
  };
  const data = raw && typeof raw === "object" ? raw : fallback;
  return {
    patch_summary: normalizeStringList(data.patch_summary),
    story_addendum: String(data.story_addendum || "").trim(),
    gameplay_patch: {
      truth_ledger_additions: ensureArray(data.gameplay_patch?.truth_ledger_additions),
      truth_ledger_updates: ensureArray(data.gameplay_patch?.truth_ledger_updates),
      clue_step_updates: ensureArray(data.gameplay_patch?.clue_step_updates),
      statement_scripts_additions: ensureArray(data.gameplay_patch?.statement_scripts_additions)
    }
  };
}

async function proposePatchFromJudge({
  caseId,
  caseContext,
  config,
  storyText,
  judge,
  round,
  language
}) {
  const client = getOpenAIClient();
  if (!client) {
    const storyAddendum = buildDeterministicStoryAddendum({ caseContext, config, judge });
    return {
      model_used: "deterministic-local",
      model_mock: true,
      patch_summary: storyAddendum
        ? ["Deterministic addendum generated to cover missing anchors."]
        : ["No deterministic addendum required."],
      story_addendum: storyAddendum,
      gameplay_patch: {
        truth_ledger_additions: [],
        truth_ledger_updates: [],
        clue_step_updates: [],
        statement_scripts_additions: []
      }
    };
  }

  const prompt = loadPrompt("story_fixer");
  const context = buildFixerContext({
    caseId,
    caseContext,
    config,
    storyText,
    judge,
    round,
    language
  });
  const responseParams = {
    model: STORY_FIXER_MODEL,
    input: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(context) }
    ],
    temperature: STORY_FIXER_TEMPERATURE,
    max_output_tokens: STORY_FIXER_MAX_OUTPUT_TOKENS,
    text: {
      format: {
        type: "json_schema",
        name: "StoryFixPatch",
        strict: true,
        schema: FIXER_SCHEMA
      }
    }
  };
  if (isGpt5Model(STORY_FIXER_MODEL)) {
    responseParams.reasoning = { effort: "minimal" };
    responseParams.text = { ...responseParams.text, verbosity: "low" };
  }

  try {
    const response = await createResponse(client, responseParams);
    const outputText = extractOutputText(response);
    if (!outputText) {
      const storyAddendum = buildDeterministicStoryAddendum({ caseContext, config, judge });
      return {
        model_used: "deterministic-local",
        model_mock: true,
        patch_summary: storyAddendum
          ? ["Model returned no patch; deterministic addendum generated instead."]
          : ["Model returned no patch; no deterministic addendum required."],
        story_addendum: storyAddendum,
        gameplay_patch: {
          truth_ledger_additions: [],
          truth_ledger_updates: [],
          clue_step_updates: [],
          statement_scripts_additions: []
        }
      };
    }
    const parsed = JSON.parse(outputText);
    return {
      model_used: STORY_FIXER_MODEL,
      model_mock: false,
      ...normalizePatch(parsed)
    };
  } catch {
    const storyAddendum = buildDeterministicStoryAddendum({ caseContext, config, judge });
    return {
      model_used: "deterministic-local",
      model_mock: true,
      patch_summary: storyAddendum
        ? ["Patch generator failed; deterministic addendum generated instead."]
        : ["Patch generator failed; no deterministic addendum required."],
      story_addendum: storyAddendum,
      gameplay_patch: {
        truth_ledger_additions: [],
        truth_ledger_updates: [],
        clue_step_updates: [],
        statement_scripts_additions: []
      }
    };
  }
}

export async function runStoryQualityFeedbackLoop({
  caseId,
  caseContext,
  storyText,
  castList = "",
  timeline = "",
  clueList = "",
  solutionReveal = "",
  sourceLabel = "",
  language = "en",
  qualityBar = null,
  maxRounds = 3,
  autoFix = true,
  includeConfig = false,
  persistBacklog = false
}) {
  if (!caseId) return { error: "caseId is required" };
  if (!storyText || !String(storyText).trim()) return { error: "storyText is required" };
  if (!caseContext || typeof caseContext !== "object") return { error: "caseContext is required" };

  const boundedRounds = Math.max(1, Math.min(8, Number(maxRounds) || 4));
  const baseConfig = getBaselineCaseConfig(caseId);
  if (!baseConfig) return { error: `No gameplay config found for case ${caseId}` };

  let workingConfig = baseConfig;
  let workingStoryText = String(storyText || "");
  const rounds = [];
  let cumulativePatch = {
    truth_ledger_additions: [],
    truth_ledger_updates: [],
    clue_step_updates: [],
    statement_scripts_additions: []
  };

  for (let round = 1; round <= boundedRounds; round += 1) {
    const judge = await runMurderMysteryJudge({
      caseId,
      caseContext,
      config: workingConfig,
      storyText: workingStoryText,
      castList,
      timeline,
      clueList,
      solutionReveal,
      sourceLabel,
      language,
      qualityBar
    });

    if (judge?.error) {
      return judge;
    }

    const roundResult = {
      round,
      judge
    };

    const shouldStop = judge.quality_gate?.pass || !autoFix || round >= boundedRounds;
    if (shouldStop) {
      rounds.push(roundResult);
      break;
    }

    const patchResult = await proposePatchFromJudge({
      caseId,
      caseContext,
      config: workingConfig,
      storyText: workingStoryText,
      judge,
      round,
      language
    });

    const patchedConfig = applyGameplayPatch(workingConfig, patchResult.gameplay_patch);
    const storyAddendum = String(patchResult.story_addendum || "").trim();
    const nextStoryText =
      storyAddendum && !workingStoryText.includes(storyAddendum)
        ? `${workingStoryText.trim()}\n\n${storyAddendum}`.trim()
        : workingStoryText;
    const storyChanged = nextStoryText !== workingStoryText;
    const changed =
      ensureArray(patchResult.gameplay_patch?.truth_ledger_additions).length +
        ensureArray(patchResult.gameplay_patch?.truth_ledger_updates).length +
        ensureArray(patchResult.gameplay_patch?.clue_step_updates).length +
        ensureArray(patchResult.gameplay_patch?.statement_scripts_additions).length >
      0;

    roundResult.patch = patchResult;
    roundResult.config_before = summarizeConfig(workingConfig);
    roundResult.config_after = summarizeConfig(patchedConfig);
    roundResult.story_before_chars = workingStoryText.length;
    roundResult.story_after_chars = nextStoryText.length;
    rounds.push(roundResult);
    cumulativePatch = mergePatchPayloads(cumulativePatch, patchResult.gameplay_patch);

    if ((!changed && !storyChanged) || !patchedConfig) {
      break;
    }
    workingConfig = patchedConfig;
    workingStoryText = nextStoryText;
  }

  const finalRound = rounds[rounds.length - 1] || null;
  const finalJudge = finalRound?.judge || null;
  const passed = Boolean(finalJudge?.quality_gate?.pass);

  let constructorRan = false;
  let constructedConfig = workingConfig;
  if (passed) {
    const constructorConfig = await constructCaseConfig(caseId, caseContext);
    if (constructorConfig) {
      constructorRan = true;
      constructedConfig = applyGameplayPatch(constructorConfig, cumulativePatch);
    }
  }

  let backlog = null;
  let backlogError = "";
  if (passed && persistBacklog) {
    try {
      backlog = persistStoryBacklogEntry({
        caseId,
        storyInputText: storyText,
        storyFinalText: workingStoryText,
        caseContext,
        loopResult: { rounds_completed: rounds.length, rounds },
        finalCasepack: constructedConfig,
        sourceLabel
      });
    } catch (error) {
      backlogError = String(error?.message || error || "");
    }
  }

  return {
    case_id: caseId,
    pass: passed,
    verdict: finalJudge?.quality_gate?.verdict || "fail",
    pipeline_order: ["judge", "enrich_loop", "constructor", "backlog"],
    rounds_completed: rounds.length,
    auto_fix: Boolean(autoFix),
    quality_bar_used: finalJudge?.quality_gate?.thresholds || qualityBar || null,
    base_config: summarizeConfig(baseConfig),
    constructor_ran: constructorRan,
    final_config: summarizeConfig(constructedConfig),
    rounds,
    final_story_text: workingStoryText,
    final_report_markdown: finalJudge?.report_markdown || "",
    final_publish_readiness_verdict: finalJudge?.publish_readiness_verdict || "",
    backlog,
    backlog_error: backlogError || undefined,
    final_casepack: includeConfig ? constructedConfig : undefined
  };
}
