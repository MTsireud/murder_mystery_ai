const DEFAULT_AFFECT = {
  rapport: 50,
  trust: 50,
  irritation: 0,
  fear: 0
};

const DEFAULT_HEAT = 0;

const MAX_MEMORY_ITEMS = Number(process.env.MEMORY_MAX_ITEMS || 12);

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeAffect(input = {}) {
  return {
    rapport: clampNumber(
      Number.isFinite(input.rapport) ? input.rapport : DEFAULT_AFFECT.rapport,
      0,
      100
    ),
    trust: clampNumber(
      Number.isFinite(input.trust) ? input.trust : DEFAULT_AFFECT.trust,
      0,
      100
    ),
    irritation: clampNumber(
      Number.isFinite(input.irritation) ? input.irritation : DEFAULT_AFFECT.irritation,
      0,
      100
    ),
    fear: clampNumber(
      Number.isFinite(input.fear) ? input.fear : DEFAULT_AFFECT.fear,
      0,
      100
    )
  };
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(Boolean).slice(-MAX_MEMORY_ITEMS);
}

export function createDefaultMemory() {
  return {
    affect: normalizeAffect(),
    heat: DEFAULT_HEAT,
    answer_frames: {},
    last_question: "",
    commitments: [],
    self_claims: [],
    heard_claims: [],
    notes: []
  };
}

export function normalizeMemory(input = {}) {
  const memory = input && typeof input === "object" ? input : {};
  return {
    affect: normalizeAffect(memory.affect || {}),
    heat: clampNumber(
      Number.isFinite(memory.heat) ? memory.heat : DEFAULT_HEAT,
      0,
      100
    ),
    answer_frames: memory.answer_frames && typeof memory.answer_frames === "object"
      ? memory.answer_frames
      : {},
    last_question: typeof memory.last_question === "string" ? memory.last_question : "",
    commitments: normalizeList(memory.commitments),
    self_claims: normalizeList(memory.self_claims),
    heard_claims: normalizeList(memory.heard_claims),
    notes: normalizeList(memory.notes)
  };
}

export function pushMemoryItem(list, item, maxItems = MAX_MEMORY_ITEMS, keyFn = (entry) => entry?.text) {
  if (!item || typeof item !== "object") return;
  const key = keyFn(item);
  if (!key) return;
  if (list.some((entry) => keyFn(entry) === key)) return;
  list.push(item);
  if (list.length > maxItems) {
    list.splice(0, list.length - maxItems);
  }
}

export function updateAffect(affect, message) {
  if (!message || !affect) return normalizeAffect(affect || {});
  const lower = message.toLowerCase();

  const rudeSignals = [
    "shut up",
    "idiot",
    "stupid",
    "liar",
    "lying",
    "answer me",
    "just answer",
    "waste of time",
    "βλάκ",
    "ηλίθ",
    "ψεύτη",
    "ψέμα",
    "απάντα",
    "σκάσε"
  ];
  const politeSignals = [
    "please",
    "thank",
    "appreciate",
    "sorry",
    "apologize",
    "could you",
    "would you",
    "i understand",
    "i know this is hard",
    "παρακαλώ",
    "ευχαριστώ",
    "συγγνώμη",
    "καταλαβαίνω",
    "εκτιμώ"
  ];
  const threatSignals = [
    "arrest",
    "charges",
    "prison",
    "jail",
    "suspect",
    "implicate",
    "culpable",
    "warrant",
    "σύλληψη",
    "κατηγορίες",
    "φυλακή",
    "ύποπτ",
    "ενοχο",
    "ένταλμα"
  ];

  const includesAny = (signals) => signals.some((signal) => lower.includes(signal));

  let next = { ...normalizeAffect(affect) };

  if (includesAny(rudeSignals)) {
    next = {
      ...next,
      irritation: next.irritation + 8,
      rapport: next.rapport - 6,
      trust: next.trust - 4
    };
  }

  if (includesAny(politeSignals)) {
    next = {
      ...next,
      irritation: next.irritation - 4,
      rapport: next.rapport + 6,
      trust: next.trust + 4
    };
  }

  if (includesAny(threatSignals)) {
    next = {
      ...next,
      fear: next.fear + 8,
      trust: next.trust - 6,
      rapport: next.rapport - 3
    };
  }

  return normalizeAffect(next);
}

export function updateHeat(currentHeat, { intent, message } = {}) {
  let heat = Number.isFinite(currentHeat) ? currentHeat : DEFAULT_HEAT;
  const lower = String(message || "").toLowerCase();
  const pressureSignals = [
    "police",
    "arrest",
    "charges",
    "suspect",
    "warrant",
    "you have to answer",
    "answer now",
    "αστυνομ",
    "σύλληψη",
    "κατηγορ",
    "ύποπτ",
    "ένταλμα",
    "πρέπει να απαντήσεις"
  ];
  if (intent === "deflect" || intent === "stall") {
    heat += 8;
  } else if (intent === "reveal" || intent === "comply") {
    heat -= 4;
  }
  if (pressureSignals.some((signal) => lower.includes(signal))) {
    heat += 4;
  }
  return clampNumber(heat, 0, 100);
}

export function summarizeAffect(affect, heat = DEFAULT_HEAT) {
  const safe = normalizeAffect(affect || {});
  const notes = [];
  if (safe.irritation >= 60) notes.push("irritated by the detective");
  if (safe.rapport >= 65) notes.push("open to cooperation");
  if (safe.trust <= 35) notes.push("distrustful");
  if (safe.fear >= 60) notes.push("pressured or guarded");
  if (heat >= 60) notes.push("feels under scrutiny");
  if (notes.length === 0) return "neutral, cautious";
  return notes.join(", ");
}

export function trimText(text, maxLength = 240) {
  if (typeof text !== "string") return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}…`;
}
