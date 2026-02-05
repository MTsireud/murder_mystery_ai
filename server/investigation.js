import { getLocalized, normalizeLanguage } from "./i18n.js";
import { createResponse, getOpenAIClient } from "./openai.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const loc = (en, el = en) => ({ en, el });
const MAX_STRATEGY_LOG = 24;
const CONSTRUCTOR_MODEL = process.env.OPENAI_MODEL_CONSTRUCTOR || process.env.OPENAI_MODEL_ROUTINE || "gpt-5";
const CONSTRUCTOR_ENABLED = String(process.env.CASE_CONSTRUCTOR_ENABLED || "true").toLowerCase() !== "false";
const CONSTRUCTOR_MAX_OUTPUT_TOKENS = Math.max(Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 220), 700);
const constructorCache = new Map();
const constructorInFlight = new Map();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_CASEPACK_DIR = path.join(__dirname, "generated_casepacks");

const CONSTRUCTOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fact_extensions", "step_extensions"],
  properties: {
    fact_extensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fact_id", "micro_details", "contradiction_tests"],
        properties: {
          fact_id: { type: "string" },
          micro_details: { type: "array", items: { type: "string" } },
          contradiction_tests: { type: "array", items: { type: "string" } }
        }
      }
    },
    step_extensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["step_id", "extra_evidence", "extra_leads"],
        properties: {
          step_id: { type: "string" },
          extra_evidence: { type: "array", items: { type: "string" } },
          extra_leads: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
};

const DETECTIVE_STRATEGY_KEYWORDS = {
  bluff: [
    "i know",
    "we know",
    "we have proof",
    "we have evidence",
    "confess",
    "tell the truth",
    "this is your last chance",
    "ξερω",
    "ξέρω",
    "ομολογησε",
    "ομολόγησε",
    "πες την αληθεια",
    "πες την αλήθεια"
  ],
  pressure: [
    "police",
    "arrest",
    "charges",
    "jail",
    "warrant",
    "αστυνομ",
    "συλληψ",
    "σύλληψ",
    "κατηγορ",
    "φυλακ"
  ],
  empathy: [
    "help me understand",
    "i get it",
    "i understand",
    "take your time",
    "its hard",
    "it is hard",
    "καταλαβαινω",
    "καταλαβαίνω",
    "παρε τον χρονο σου",
    "πάρε τον χρόνο σου",
    "βοηθησε με",
    "βοήθησε με"
  ],
  evidence_push: [
    "camera",
    "cctv",
    "footage",
    "plate",
    "license plate",
    "car",
    "trunk",
    "glove box",
    "call log",
    "κάμερα",
    "βιντεο",
    "βίντεο",
    "πινακ",
    "αυτοκινητ",
    "πορτ μπαγκαζ",
    "πορτμπαγκαζ",
    "κλήσ",
    "αρχειο κλησ",
    "αρχεία κλήσ"
  ]
};

const INVESTIGATION_LIBRARY = {
  "athens-2012-kidnapping": {
    clue_chain: [
      {
        id: "camera_evidence",
        requires: [],
        triggers: [
          "camera",
          "cctv",
          "footage",
          "video",
          "gate 2",
          "κάμερα",
          "βιντεο",
          "βίντεο"
        ],
        reveal_fact_ids: [
          "F_CAM_1940_VAN",
          "F_SHADOW_POSITION",
          "F_LIGHT_ANGLE_1940",
          "F_OCCLUSION_WINDOW_GATE2",
          "F_LANE_GEOMETRY_C"
        ],
        evidence: [loc("gate 2 cctv clip"), loc("exit lane shadow timestamp")],
        leads: [loc("check the visible plate frame in the camera freeze")]
      },
      {
        id: "plate_check",
        requires: ["camera_evidence"],
        triggers: [
          "plate",
          "license",
          "registry",
          "registration",
          "number plate",
          "πινακ",
          "αδεια",
          "άδεια"
        ],
        reveal_fact_ids: ["F_PLATE_ALIAS", "F_PLATE_TO_TASOS", "F_REGISTRY_EDIT_WINDOW"],
        evidence: [loc("plate registry extract"), loc("fleet assignment memo")],
        leads: [loc("search the linked vehicle interior for restraint evidence")]
      },
      {
        id: "car_item",
        requires: ["plate_check"],
        triggers: [
          "search car",
          "inside the car",
          "inside car",
          "trunk",
          "glove box",
          "zip tie",
          "zip ties",
          "look in car",
          "ψαξε το αμαξι",
          "ψάξε το αμάξι",
          "πορτ μπαγκαζ",
          "πορτμπαγκαζ",
          "δεματικ",
          "δεματικά"
        ],
        reveal_fact_ids: ["F_ZIP_TIE_BRAND", "F_SEDATIVE_TRACE", "F_CAR_INTERIOR_HIDE_METHOD"],
        evidence: [loc("industrial zip ties from trunk"), loc("sedative vial trace in glove box")],
        leads: [loc("link the zip tie brand to warehouse inventory and loading bay cameras")]
      },
      {
        id: "warehouse_link",
        requires: ["car_item"],
        triggers: [
          "warehouse",
          "loading bay",
          "inventory",
          "storage",
          "voss",
          "αποθηκ",
          "φορτωση",
          "φόρτωση",
          "inventory"
        ],
        reveal_fact_ids: ["F_WAREHOUSE_LOG", "F_REAR_DOOR_SHADOW", "F_LOADING_BAY_BLIND_SPOT"],
        evidence: [loc("warehouse inventory ledger line"), loc("rear loading bay camera still")],
        leads: [loc("check call logs between spiros and tasos around 7:35 to 7:45 pm")]
      },
      {
        id: "killer_link",
        requires: ["warehouse_link"],
        triggers: [
          "call log",
          "calls",
          "order",
          "who planned",
          "who ordered",
          "mastermind",
          "spiros",
          "αρχειο κλησ",
          "αρχεία κλήσ",
          "εντολη",
          "εντολή",
          "ποιος το σχεδιασε",
          "ποιος το σχεδίασε"
        ],
        reveal_fact_ids: ["F_SPIROS_ORDER", "F_ESCAPE_ROUTE", "F_MINUTE_CONTRADICTION_GRID"],
        evidence: [loc("phone call overlap chart"), loc("route sketch from marina to holding site")],
        leads: [loc("pressure each accomplice with statement requests and contradictions")]
      }
    ],
    truth_ledger: [
      {
        id: "F_CAM_1940_VAN",
        summary: loc("7:40 PM gate camera shows a dark van tailing Nikos's sedan out of lane C."),
        detail: loc(
          "Vehicle enters from a blind angle and tracks Nikos at low speed, then cuts lights before the corner."
        ),
        micro_details: [
          loc("Frame counter jump at 19:40:12 indicates manual camera focus correction."),
          loc("Rear bumper reflection confirms marine-fuel dock lights were on.")
        ],
        contradiction_tests: [
          loc("Any claim that no second vehicle was present at 19:40 conflicts with frame 19:40:13."),
          loc("Any alibi placing Tasos continuously inside the villa at 19:40 conflicts with camera silhouette timing.")
        ]
      },
      {
        id: "F_SHADOW_POSITION",
        summary: loc("The driver shadow is offset to the left pillar, consistent with Tasos's seat habit."),
        detail: loc("Frame contrast marks the same shoulder tilt Tasos has in prior marina footage."),
        micro_details: [
          loc("Shoulder drop of roughly 6 degrees matches Tasos's habitual steering posture."),
          loc("Headrest notch lines up with Tasos's documented seat setting from fleet service photos.")
        ],
        contradiction_tests: [
          loc("A claim that an unknown taller driver operated the van conflicts with seat-height geometry.")
        ]
      },
      {
        id: "F_LIGHT_ANGLE_1940",
        summary: loc("Fuel-dock floodlight angle places the shadow origin at the van driver side at 19:40."),
        detail: loc("The 32-degree light angle excludes shadows cast from sidewalk pedestrians."),
        micro_details: [
          loc("Dock mast light #3 casts a hard edge matching the driver window frame."),
          loc("The shadow edge shortens exactly as the van moves past bay marker C-7.")
        ],
        contradiction_tests: [
          loc("Any claim that the shadow came from a passerby conflicts with dock-light vector geometry.")
        ]
      },
      {
        id: "F_OCCLUSION_WINDOW_GATE2",
        summary: loc("Gate 2 camera has a 2.8-second occlusion window when buses pass lane B."),
        detail: loc("The van uses this exact occlusion to hide plate transition before exit."),
        micro_details: [
          loc("Occlusion begins at 19:40:16 and clears at 19:40:19."),
          loc("Wheel blur at reappearance indicates acceleration, not idle waiting.")
        ],
        contradiction_tests: [
          loc("A narrative of continuous full visibility is false because of the known occlusion window.")
        ]
      },
      {
        id: "F_LANE_GEOMETRY_C",
        summary: loc("Lane C geometry allows a blind merge from service ramp to exit in under 5 seconds."),
        detail: loc("The abductor route uses the blind merge to avoid kiosk line-of-sight."),
        micro_details: [
          loc("Concrete divider blocks kiosk visibility for 14 meters of approach."),
          loc("Exit lane curvature hides rear plate view beyond marker C-9.")
        ],
        contradiction_tests: [
          loc("Any claim that kiosk witnesses had full uninterrupted sight of lane C is geometrically impossible.")
        ]
      },
      {
        id: "F_PLATE_ALIAS",
        summary: loc("The visible plate belongs to a shell fleet vehicle and was reassigned that afternoon."),
        detail: loc("Registry edit is time stamped less than 90 minutes before the abduction window."),
        micro_details: [
          loc("Registry terminal ID maps to marina office workstation A2-03."),
          loc("Edit log notes 'temporary maintenance swap' with no maintenance ticket.")
        ],
        contradiction_tests: [
          loc("A claim that the plate mapping was old or routine conflicts with same-day registry audit logs.")
        ]
      },
      {
        id: "F_PLATE_TO_TASOS",
        summary: loc("Fleet assignment memo maps the temporary plate to Tasos's vehicle slot."),
        detail: loc("Manual signature is Spiros's office mark, not a marina admin signoff."),
        micro_details: [
          loc("Memo ink stamp corresponds to the Asteri villa study seal."),
          loc("Slot code T-2 appears only on Tasos weekly dispatch sheets.")
        ],
        contradiction_tests: [
          loc("Any claim that Spiros had no involvement in vehicle reassignment conflicts with signature evidence.")
        ]
      },
      {
        id: "F_REGISTRY_EDIT_WINDOW",
        summary: loc("Plate registry was edited between 18:22 and 18:27, then locked from edits."),
        detail: loc("The lockout pattern indicates deliberate pre-incident preparation."),
        micro_details: [
          loc("No further edits occurred until after midnight."),
          loc("The editor used a privileged credential not assigned to marina clerks.")
        ],
        contradiction_tests: [
          loc("Claims of a spontaneous plate change during the incident are inconsistent with lockout timing.")
        ]
      },
      {
        id: "F_ZIP_TIE_BRAND",
        summary: loc("Zip tie lot code from the trunk matches Voss warehouse restraint stock."),
        detail: loc("Batch code and cut profile align with pallet M-14 issued the previous week."),
        micro_details: [
          loc("The ties show flush-cut marks from a ratchet cutter used in loading bay prep."),
          loc("Two unused ties in the trunk share sequential batch numbering.")
        ],
        contradiction_tests: [
          loc("Any claim the ties were generic retail stock conflicts with warehouse batch sequencing.")
        ]
      },
      {
        id: "F_SEDATIVE_TRACE",
        summary: loc("A sedative residue vial in the glove box links to clinic-grade supply."),
        detail: loc("Trace signature matches stock Elena reported missing from locked storage."),
        micro_details: [
          loc("Residual concentration indicates transfer from recently opened medical vial."),
          loc("Cap thread residue matches disposable syringe kits used in controlled sedation.")
        ],
        contradiction_tests: [
          loc("Claims that no chemical restraint was available conflict with clinic stock and glove-box trace.")
        ]
      },
      {
        id: "F_CAR_INTERIOR_HIDE_METHOD",
        summary: loc("Interior arrangement suggests a restrained passenger was hidden below rear sightline."),
        detail: loc("Seat tilt and blanket fold pattern create concealment from external view."),
        micro_details: [
          loc("Rear bench angle was locked one notch lower than standard."),
          loc("Fiber transfer from cargo blanket appears on restraint ties.")
        ],
        contradiction_tests: [
          loc("Any claim that transport happened without concealment conflicts with seat-angle and fiber evidence.")
        ]
      },
      {
        id: "F_WAREHOUSE_LOG",
        summary: loc("Warehouse ledger logs after-hours rear-door access tied to Spiros's authorization."),
        detail: loc("Entry is masked under maintenance but aligns with call and vehicle movement timing."),
        micro_details: [
          loc("Access tag was cloned from daytime loader account and reused after closing."),
          loc("Door-open duration of 4m12s exceeds normal maintenance checks.")
        ],
        contradiction_tests: [
          loc("A claim that the warehouse stayed closed conflicts with authenticated rear-door telemetry.")
        ]
      },
      {
        id: "F_REAR_DOOR_SHADOW",
        summary: loc("Loading bay camera captures two figures transferring a restrained person."),
        detail: loc("One figure matches Tasos's gait; second figure wears Spiros-style overcoat silhouette."),
        micro_details: [
          loc("The second figure pauses exactly at blind pillar P3 before re-entering frame."),
          loc("Ground shadow length indicates the transfer occurred shortly after 21:00.")
        ],
        contradiction_tests: [
          loc("Any claim that only one person handled transfer conflicts with dual-shadow frame analysis.")
        ]
      },
      {
        id: "F_LOADING_BAY_BLIND_SPOT",
        summary: loc("A fixed blind spot at loading bay pillar P3 allows face concealment for 1.6 seconds."),
        detail: loc("The route through P3 was used to avoid direct facial capture."),
        micro_details: [
          loc("Camera sweep delay at P3 is consistent across archived nights."),
          loc("Footstep spacing indicates preplanned movement through the blind corridor.")
        ],
        contradiction_tests: [
          loc("A claim that camera coverage guaranteed identification at all times is technically false.")
        ]
      },
      {
        id: "F_SPIROS_ORDER",
        summary: loc("Call logs show Spiros issuing timing instructions to Tasos before and after the abduction."),
        detail: loc("Two short calls bracket the capture window and one call confirms drop-site relocation."),
        micro_details: [
          loc("Call bursts occur at 19:37, 19:44, and 20:11 with low-duration command cadence."),
          loc("Language pattern shows imperative verbs and route shorthand, not casual speech.")
        ],
        contradiction_tests: [
          loc("A claim that Spiros had no command role conflicts with timing and cadence of outbound calls.")
        ]
      },
      {
        id: "F_ESCAPE_ROUTE",
        summary: loc("Route sketch and toll timing place Spiros near the holding site corridor."),
        detail: loc("Travel timing is incompatible with his claimed villa-only timeline."),
        micro_details: [
          loc("Toll-camera timestamp at 20:52 leaves insufficient time for a continuous villa stay."),
          loc("Route turn sequence matches notes found in folded glove-compartment map.")
        ],
        contradiction_tests: [
          loc("Any villa-only alibi for Spiros between 20:45 and 21:05 fails route-timing constraints.")
        ]
      },
      {
        id: "F_MINUTE_CONTRADICTION_GRID",
        summary: loc("Minute-by-minute contradiction grid shows impossible overlap across key alibis."),
        detail: loc("Tasos movement, Spiros calls, and warehouse door telemetry cannot all be innocent together."),
        micro_details: [
          loc("At 19:44 Tasos receives command call while van is already on the route segment."),
          loc("At 20:11 Spiros call overlaps with declared villa paperwork window."),
          loc("At 21:03 warehouse transfer timing collides with claimed separate whereabouts.")
        ],
        contradiction_tests: [
          loc("If Tasos was at villa, plate-linked van movement is unexplained."),
          loc("If Spiros never left villa, toll and call sequencing is unexplained."),
          loc("If warehouse was empty, rear-door open telemetry and shadow transfer are unexplained.")
        ]
      }
    ],
    statement_scripts: [
      {
        id: "ST_TASOS_PLATE",
        character_id: "tasos",
        strategies: ["bluff", "pressure", "evidence_push"],
        require_fact_ids: ["F_PLATE_TO_TASOS"],
        text: loc("Fine. Spiros told me to swap the plate before dusk and keep quiet about lane C."),
        evidence_label: loc("recorded statement: plate swap order")
      },
      {
        id: "ST_KATERINA_ZIP",
        character_id: "katerina",
        strategies: ["bluff", "evidence_push"],
        require_fact_ids: ["F_ZIP_TIE_BRAND"],
        text: loc(
          "Those restraints came from warehouse stock. I did not plan the grab, but Spiros asked for unlogged access."
        ),
        evidence_label: loc("recorded statement: unlogged warehouse access request")
      },
      {
        id: "ST_ELENA_CALL",
        character_id: "elena",
        strategies: ["empathy", "bluff", "pressure"],
        require_fact_ids: ["F_SPIROS_ORDER"],
        text: loc(
          "I heard Spiros direct Tasos on timing and location. I wanted this contained, but not like this."
        ),
        evidence_label: loc("recorded statement: call timing acknowledgment")
      },
      {
        id: "ST_SPIROS_BREAK",
        character_id: "spiros",
        strategies: ["bluff", "pressure"],
        require_fact_ids: ["F_SPIROS_ORDER", "F_ESCAPE_ROUTE"],
        text: loc(
          "I orchestrated the pickup for ransom leverage. The plan was control, not murder, and it collapsed in the warehouse."
        ),
        evidence_label: loc("recorded admission: orchestration and control plan")
      }
    ]
  }
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(list) {
  return Array.from(new Set(ensureArray(list).filter(Boolean)));
}

function includesAny(lower, terms) {
  return ensureArray(terms).some((term) => lower.includes(String(term).toLowerCase()));
}

function localizeList(list, lang) {
  return ensureArray(list)
    .map((item) => getLocalized(item, lang))
    .filter(Boolean);
}

function localizeFacts(config, factIds, lang) {
  const index = new Map(ensureArray(config?.truth_ledger).map((fact) => [fact.id, fact]));
  return unique(factIds)
    .map((factId) => {
      const entry = index.get(factId);
      if (!entry) return null;
      const summary = getLocalized(entry.summary, lang);
      const detail = getLocalized(entry.detail, lang);
      const microDetails = localizeList(entry.micro_details || [], lang);
      const contradictionTests = localizeList(entry.contradiction_tests || [], lang);
      const testLine = contradictionTests.length
        ? [`contradiction tests: ${contradictionTests.join(" | ")}`]
        : [];
      return [summary, detail, ...microDetails, ...testLine].filter(Boolean).join(" ");
    })
    .filter(Boolean);
}

function getCaseConfig(caseId) {
  return INVESTIGATION_LIBRARY[caseId] || null;
}

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeStringList(list) {
  return unique(ensureArray(list).map((item) => String(item || "").trim()).filter(Boolean));
}

function buildConstructorContext(caseContext, baseConfig) {
  const truth = caseContext?.truth || {};
  const publicState = caseContext?.public_state || {};
  const characters = ensureArray(caseContext?.characters).map((character) => ({
    id: character.id,
    name: character.name,
    role: character.role,
    background: character.background || {},
    goals: character.goals || [],
    secrets: character.secrets || []
  }));
  return {
    truth: {
      killer_id: truth.killer_id || "",
      method: truth.method || "",
      motive: truth.motive || "",
      timeline: ensureArray(truth.timeline),
      planted_evidence: ensureArray(truth.planted_evidence)
    },
    public_state: {
      victim_name: publicState.victim_name || "",
      case_time: publicState.case_time || "",
      case_location: publicState.case_location || "",
      case_locations: ensureArray(publicState.case_locations).map((locEntry) => ({
        id: locEntry.id,
        name: locEntry.name,
        descriptor: locEntry.descriptor,
        hint: locEntry.hint
      }))
    },
    characters,
    clue_chain: ensureArray(baseConfig?.clue_chain).map((step) => ({
      id: step.id,
      requires: ensureArray(step.requires),
      evidence: ensureArray(step.evidence).map((value) => getLocalized(value, "en")),
      leads: ensureArray(step.leads).map((value) => getLocalized(value, "en"))
    })),
    truth_ledger: ensureArray(baseConfig?.truth_ledger).map((fact) => ({
      id: fact.id,
      summary: getLocalized(fact.summary, "en"),
      detail: getLocalized(fact.detail, "en")
    }))
  };
}

async function buildConstructorExtensions({ caseId, caseContext, baseConfig }) {
  if (!CONSTRUCTOR_ENABLED) return null;
  const client = getOpenAIClient();
  if (!client) return null;

  const context = buildConstructorContext(caseContext, baseConfig);
  const prompt = [
    `You are a case constructor for ${caseId}.`,
    "Generate only additive micro-facts and contradiction tests.",
    "Do not alter killer, method, motive, or timeline truth anchors.",
    "Keep output practical for interrogation gameplay.",
    "Provide scene-specific details: light angle, camera occlusion windows, lane geometry, hide route logic, minute-by-minute contradiction tests.",
    "For each fact extension, target an existing fact_id only.",
    "For each step extension, target an existing step_id only.",
    "Return valid JSON matching the schema."
  ].join("\n");

  const responseParams = {
    model: CONSTRUCTOR_MODEL,
    input: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify(context) }
    ],
    max_output_tokens: CONSTRUCTOR_MAX_OUTPUT_TOKENS,
    text: {
      format: {
        type: "json_schema",
        name: "CaseConstructorExtensions",
        strict: true,
        schema: CONSTRUCTOR_SCHEMA
      }
    }
  };

  const response = await createResponse(client, responseParams);
  const text = response?.output_text || "";
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mergeConstructorExtensions(baseConfig, extensions) {
  if (!extensions || typeof extensions !== "object") return baseConfig;
  const merged = deepClone(baseConfig);
  const factMap = new Map(ensureArray(merged.truth_ledger).map((fact) => [fact.id, fact]));
  const stepMap = new Map(ensureArray(merged.clue_chain).map((step) => [step.id, step]));

  ensureArray(extensions.fact_extensions).forEach((extension) => {
    const fact = factMap.get(extension?.fact_id);
    if (!fact) return;
    const microDetails = normalizeStringList(extension.micro_details).map((line) => loc(line));
    const contradictionTests = normalizeStringList(extension.contradiction_tests).map((line) => loc(line));
    fact.micro_details = unique(ensureArray(fact.micro_details).concat(microDetails));
    fact.contradiction_tests = unique(ensureArray(fact.contradiction_tests).concat(contradictionTests));
  });

  ensureArray(extensions.step_extensions).forEach((extension) => {
    const step = stepMap.get(extension?.step_id);
    if (!step) return;
    const extraEvidence = normalizeStringList(extension.extra_evidence).map((line) => loc(line));
    const extraLeads = normalizeStringList(extension.extra_leads).map((line) => loc(line));
    step.evidence = unique(ensureArray(step.evidence).concat(extraEvidence));
    step.leads = unique(ensureArray(step.leads).concat(extraLeads));
  });

  return merged;
}

async function getResolvedCaseConfig(caseId, caseContext) {
  const baseConfig = getCaseConfig(caseId);
  if (!baseConfig) return null;
  if (!CONSTRUCTOR_ENABLED) return baseConfig;
  if (constructorCache.has(caseId)) return constructorCache.get(caseId);

  const prebuiltPath = path.join(GENERATED_CASEPACK_DIR, `${caseId}.json`);
  if (fs.existsSync(prebuiltPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(prebuiltPath, "utf8"));
      if (parsed && typeof parsed === "object") {
        constructorCache.set(caseId, parsed);
        return parsed;
      }
    } catch {
      // ignore malformed prebuilt pack and fall through to model construction
    }
  }

  if (constructorInFlight.has(caseId)) return constructorInFlight.get(caseId);

  const pending = (async () => {
    try {
      const extensions = await buildConstructorExtensions({ caseId, caseContext, baseConfig });
      const merged = mergeConstructorExtensions(baseConfig, extensions);
      constructorCache.set(caseId, merged);
      return merged;
    } catch {
      constructorCache.set(caseId, baseConfig);
      return baseConfig;
    } finally {
      constructorInFlight.delete(caseId);
    }
  })();

  constructorInFlight.set(caseId, pending);
  return pending;
}

function stepAvailable(step, completedSet) {
  return ensureArray(step.requires).every((stepId) => completedSet.has(stepId));
}

function pushStrategyLog(log, entry) {
  log.push(entry);
  if (log.length > MAX_STRATEGY_LOG) {
    log.splice(0, log.length - MAX_STRATEGY_LOG);
  }
}

export function detectDetectiveStrategy(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();

  const signals = Object.entries(DETECTIVE_STRATEGY_KEYWORDS).reduce((acc, [key, terms]) => {
    acc[key] = includesAny(lower, terms);
    return acc;
  }, {});

  if (signals.bluff) return { primary: "bluff", signals };
  if (signals.evidence_push) return { primary: "evidence_push", signals };
  if (signals.pressure) return { primary: "pressure", signals };
  if (signals.empathy) return { primary: "empathy", signals };
  return { primary: "neutral", signals };
}

export function createInvestigationState(caseId) {
  const config = getCaseConfig(caseId);
  if (!config) return null;
  return {
    case_id: caseId,
    completed_step_ids: [],
    revealed_fact_ids: [],
    statement_ids: [],
    strategy_log: [],
    last_strategy: "neutral"
  };
}

export function normalizeInvestigationState(input, caseId) {
  const config = getCaseConfig(caseId);
  if (!config) return null;
  const safe = input && typeof input === "object" ? input : {};
  return {
    case_id: caseId,
    completed_step_ids: unique(safe.completed_step_ids),
    revealed_fact_ids: unique(safe.revealed_fact_ids),
    statement_ids: unique(safe.statement_ids),
    strategy_log: ensureArray(safe.strategy_log)
      .filter((entry) => entry && typeof entry === "object")
      .slice(-MAX_STRATEGY_LOG),
    last_strategy: typeof safe.last_strategy === "string" ? safe.last_strategy : "neutral"
  };
}

export async function applyInvestigationTurn({
  caseId,
  investigationState,
  message,
  characterId,
  language,
  caseContext
}) {
  const lang = normalizeLanguage(language);
  const config = await getResolvedCaseConfig(caseId, caseContext);
  if (!config) {
    return {
      state: null,
      evidence_delta: [],
      accusations_delta: [],
      prompt_context: null,
      forced_statement: null
    };
  }

  const nextState = normalizeInvestigationState(investigationState, caseId) || createInvestigationState(caseId);
  const strategy = detectDetectiveStrategy(message);
  nextState.last_strategy = strategy.primary;
  pushStrategyLog(nextState.strategy_log, {
    strategy: strategy.primary,
    message: String(message || "").slice(0, 180)
  });

  const lower = String(message || "").toLowerCase();
  const completedSet = new Set(nextState.completed_step_ids);
  let unlockedStep = null;
  let blockedStep = null;

  for (const step of ensureArray(config.clue_chain)) {
    if (completedSet.has(step.id)) continue;
    const matched = includesAny(lower, step.triggers);
    if (!matched) continue;
    if (stepAvailable(step, completedSet)) {
      unlockedStep = step;
      break;
    }
    if (!blockedStep) blockedStep = step;
  }

  let evidenceDelta = [];
  let accusationsDelta = [];

  if (unlockedStep) {
    nextState.completed_step_ids.push(unlockedStep.id);
    nextState.completed_step_ids = unique(nextState.completed_step_ids);
    nextState.revealed_fact_ids = unique(
      nextState.revealed_fact_ids.concat(ensureArray(unlockedStep.reveal_fact_ids))
    );
    evidenceDelta = ensureArray(unlockedStep.evidence);
    if (unlockedStep.id === "killer_link") {
      accusationsDelta = [loc("evidence chain now points to Spiros as operation lead")];
    }
  }

  const revealedSet = new Set(nextState.revealed_fact_ids);
  let forcedStatement = null;
  for (const statement of ensureArray(config.statement_scripts)) {
    if (statement.character_id !== characterId) continue;
    if (!ensureArray(statement.strategies).includes(strategy.primary)) continue;
    if (nextState.statement_ids.includes(statement.id)) continue;
    const requirementsMet = ensureArray(statement.require_fact_ids).every((factId) => revealedSet.has(factId));
    if (!requirementsMet) continue;
    nextState.statement_ids.push(statement.id);
    nextState.statement_ids = unique(nextState.statement_ids);
    forcedStatement = {
      text: getLocalized(statement.text, lang),
      evidence_label: getLocalized(statement.evidence_label, lang)
    };
    if (forcedStatement.evidence_label) {
      evidenceDelta = evidenceDelta.concat([statement.evidence_label]);
    }
    break;
  }

  const pending = ensureArray(config.clue_chain).find((step) => {
    if (nextState.completed_step_ids.includes(step.id)) return false;
    return stepAvailable(step, new Set(nextState.completed_step_ids));
  });

  const blockedHint = blockedStep
    ? [loc("that lead is blocked until earlier evidence is confirmed")]
    : [];
  const openLeads = localizeList((pending && pending.leads) || [], lang).concat(
    localizeList(blockedHint, lang)
  );

  const promptContext = {
    strategy: strategy.primary,
    chain_progress: `${nextState.completed_step_ids.length}/${ensureArray(config.clue_chain).length}`,
    revealed_facts: localizeFacts(config, nextState.revealed_fact_ids, lang),
    open_leads: openLeads,
    recent_strategies: ensureArray(nextState.strategy_log)
      .slice(-4)
      .map((entry) => entry.strategy)
  };

  return {
    state: nextState,
    evidence_delta: evidenceDelta,
    accusations_delta: accusationsDelta,
    prompt_context: promptContext,
    forced_statement: forcedStatement
  };
}

export async function constructCaseConfig(caseId, caseContext) {
  return getResolvedCaseConfig(caseId, caseContext);
}
