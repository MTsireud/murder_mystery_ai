import { getLocalized, normalizeLanguage } from "./i18n.js";

function buildAnswerText({ language, parts }) {
  return parts.filter(Boolean).join(" ");
}

function formatLocation(locationId, publicState, lang) {
  const locations = Array.isArray(publicState?.case_locations)
    ? publicState.case_locations
    : [];
  const match = locations.find((loc) => loc.id === locationId);
  if (!match) return "";
  const name = getLocalized(match.name, lang);
  const descriptor = getLocalized(match.descriptor, lang);
  return [name, descriptor].filter(Boolean).join(" — ");
}

function buildLastSeenFrame({ character, publicState, language }) {
  const lang = normalizeLanguage(language);
  const lastSeen = character.story_pack?.last_seen;
  if (!lastSeen) return null;
  if (lastSeen.mode === "none") {
    const line =
      lang === "el"
        ? "Δεν τον έχω δει από κοντά."
        : "I have not seen him in person.";
    const contact = buildLastContactFrame({ character, publicState, language });
    const text = contact?.text ? `${line} ${contact.text}` : line;
    return { key: "last_seen", text, force: true, anchors: [] };
  }
  const time = getLocalized(lastSeen.time, lang);
  const location = formatLocation(lastSeen.location_id, publicState, lang);
  const note = getLocalized(lastSeen.note, lang);
  const timeClause = time ? (lang === "el" ? `Γύρω στις ${time}` : `Around ${time}`) : "";
  const locationClause = location
    ? lang === "el"
      ? `στο ${location}`
      : `at ${location}`
    : "";
  const text = buildAnswerText({
    language: lang,
    parts: [
      lang === "el" ? "Τον είδα τελευταία φορά" : "The last time I saw him was",
      [timeClause, locationClause].filter(Boolean).join(" "),
      note ? `(${note})` : ""
    ]
  }).replace(/\s+/g, " ").trim();
  return {
    key: "last_seen",
    text,
    force: true,
    anchors: [time, location].filter(Boolean)
  };
}

function buildLastContactFrame({ character, publicState, language }) {
  const lang = normalizeLanguage(language);
  const lastContact = character.story_pack?.last_contact;
  if (!lastContact) return null;
  if (lastContact.mode === "none") {
    const line =
      lang === "el"
        ? "Δεν είχα άμεση επικοινωνία μαζί του."
        : "I did not have direct contact with him.";
    return { key: "last_contact", text: line, force: true, anchors: [] };
  }
  const time = getLocalized(lastContact.time, lang);
  const withWhom = getLocalized(lastContact.with, lang);
  const note = getLocalized(lastContact.note, lang);
  const timeClause = time ? (lang === "el" ? `στις ${time}` : `at ${time}`) : "";
  const withClause = withWhom ? (lang === "el" ? `με ${withWhom}` : `with ${withWhom}`) : "";
  const modeClause =
    lastContact.mode === "phone"
      ? lang === "el"
        ? "τηλεφωνικά"
        : "by phone"
      : lastContact.mode === "text"
        ? lang === "el"
          ? "με μήνυμα"
          : "by text"
        : "";
  const text = buildAnswerText({
    language: lang,
    parts: [
      lang === "el" ? "Η τελευταία επαφή ήταν" : "The last contact was",
      [timeClause, modeClause, withClause].filter(Boolean).join(" "),
      note ? `(${note})` : ""
    ]
  }).replace(/\s+/g, " ").trim();
  return {
    key: "last_contact",
    text,
    force: true,
    anchors: [time, withWhom].filter(Boolean)
  };
}

function buildPoliceCallFrame({ publicState, language }) {
  const lang = normalizeLanguage(language);
  const time = getLocalized(publicState?.police_call_time, lang);
  if (!time) return null;
  const text =
    lang === "el"
      ? `Η αστυνομία κλήθηκε περίπου στις ${time}.`
      : `The police were called around ${time}.`;
  return {
    key: "police_call_time",
    text,
    force: true,
    anchors: [time]
  };
}

function buildRelationshipFrame({ character, publicState, language }) {
  const lang = normalizeLanguage(language);
  const rel = character.relationship_to_victim || publicState?.victim_dossier?.relationship_summary;
  const relText = getLocalized(rel, lang);
  if (!relText) return null;
  const text =
    lang === "el"
      ? `Η σχέση μου με το θύμα: ${relText}.`
      : `My relationship to the victim: ${relText}.`;
  return { key: "relationship_to_victim", text, force: false, anchors: [] };
}

function buildWorkplaceFrame({ character, language }) {
  const lang = normalizeLanguage(language);
  const workplace = getLocalized(character.background?.workplace, lang);
  if (!workplace) return null;
  const text =
    lang === "el" ? `Δουλεύω στο ${workplace}.` : `I work at ${workplace}.`;
  return { key: "workplace", text, force: false, anchors: [workplace] };
}

function buildFrameFromData({ frameData, key, variant, language }) {
  if (!frameData || !key) return null;
  const lang = normalizeLanguage(language);
  const content = frameData?.[variant]?.text || frameData?.[variant] || "";
  const text = getLocalized(content, lang);
  if (!text) return null;
  return {
    key,
    variant,
    text,
    force: true,
    anchors: []
  };
}

function chooseFrameVariant({ key, frameData, character, memory }) {
  if (!frameData) return "truth";
  if (!frameData.lie_allowed || !frameData.lie) return "truth";
  const heat = Number.isFinite(memory?.heat) ? memory.heat : 0;
  const trust = Number.isFinite(memory?.affect?.trust) ? memory.affect.trust : 50;
  const tags = new Set(character?.lie_strategy_tags || []);
  const denyWhere = tags.has("deny_where_when") && (key === "last_seen" || key === "alibi_at_time");
  const denyTiming = tags.has("deny_timing") && key === "alibi_at_time";
  const preferLie = heat >= 60 || trust <= 35 || denyWhere || denyTiming;
  return preferLie ? "lie" : "truth";
}

function matchAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function selectAnswerFrame({ message, language, character, publicState, memory }) {
  if (!message) return null;
  const lang = normalizeLanguage(language);
  const text = String(message).toLowerCase();

  if (memory?.answer_frames) {
    const existingKeys = Object.keys(memory.answer_frames);
    for (const key of existingKeys) {
      const stored = memory.answer_frames[key];
      if (stored?.text) {
        // If the same question type is asked again, reuse stored frame.
        // Caller will still pick exact frame if routed.
      }
    }
  }

  const lastSeenPatterns = [
    /last\s+time\s+you\s+saw/,
    /when\s+did\s+you\s+see/,
    /τελευταία\s+φορά\s+.*είδες/,
    /πότε\s+τον\s+είδες/,
    /πότε\s+την\s+είδες/,
    /τελευταία\s+φορά\s+τον\s+είδες/
  ];
  const lastContactPatterns = [
    /last\s+time\s+you\s+spoke/,
    /last\s+contact/,
    /when\s+did\s+you\s+talk/,
    /μίλησ/,
    /τηλεφων/
  ];
  const policeCallPatterns = [
    /call(ed)?\s+the\s+police/,
    /when\s+did\s+you\s+call/,
    /πότε\s+καλέσ/,
    /αστυνομ/
  ];
  const relationshipPatterns = [
    /relationship\s+to\s+the\s+victim/,
    /how\s+do\s+you\s+know/,
    /πώς\s+τον\s+γνωρίζεις/,
    /ποια\s+η\s+σχέση/
  ];
  const workplacePatterns = [
    /where\s+do\s+you\s+work/,
    /δουλεύεις/,
    /εργάζεσαι/
  ];

  const timeRegex = /\b([01]?\d|2[0-3])[:\.]([0-5]\d)\b/;
  const alibiPatterns = [
    /where\s+were\s+you/,
    /where\s+was\s+you/,
    /place\s+you/,
    /timeline/,
    /πού\s+ήσουν/,
    /ποιος\s+μπορεί\s+να\s+σε\s+τοποθετήσει/,
    /τοποθετ/
  ];

  if (timeRegex.test(text) && matchAny(text, alibiPatterns)) {
    const frameData = character?.frames?.alibi_at_time;
    if (memory?.answer_frames?.alibi_at_time) {
      return memory.answer_frames.alibi_at_time;
    }
    if (frameData) {
      const variant = chooseFrameVariant({
        key: "alibi_at_time",
        frameData,
        character,
        memory
      });
      return buildFrameFromData({ frameData, key: "alibi_at_time", variant, language: lang });
    }
  }

  if (matchAny(text, alibiPatterns)) {
    const frameData = character?.frames?.alibi_at_time;
    if (memory?.answer_frames?.alibi_at_time) {
      return memory.answer_frames.alibi_at_time;
    }
    if (frameData) {
      const variant = chooseFrameVariant({
        key: "alibi_at_time",
        frameData,
        character,
        memory
      });
      return buildFrameFromData({ frameData, key: "alibi_at_time", variant, language: lang });
    }
  }

  if (matchAny(text, lastSeenPatterns)) {
    if (memory?.answer_frames?.last_seen) {
      return memory.answer_frames.last_seen;
    }
    const frameData = character?.frames?.last_seen;
    if (frameData) {
      const variant = chooseFrameVariant({
        key: "last_seen",
        frameData,
        character,
        memory
      });
      return buildFrameFromData({ frameData, key: "last_seen", variant, language: lang });
    }
    return buildLastSeenFrame({ character, publicState, language: lang });
  }
  if (matchAny(text, lastContactPatterns)) {
    if (memory?.answer_frames?.last_contact) {
      return memory.answer_frames.last_contact;
    }
    const frameData = character?.frames?.last_contact;
    if (frameData) {
      const variant = chooseFrameVariant({
        key: "last_contact",
        frameData,
        character,
        memory
      });
      return buildFrameFromData({ frameData, key: "last_contact", variant, language: lang });
    }
    return buildLastContactFrame({ character, publicState, language: lang });
  }
  if (matchAny(text, policeCallPatterns)) {
    return buildPoliceCallFrame({ publicState, language: lang });
  }
  if (matchAny(text, relationshipPatterns)) {
    return buildRelationshipFrame({ character, publicState, language: lang });
  }
  if (matchAny(text, workplacePatterns)) {
    return buildWorkplaceFrame({ character, language: lang });
  }

  return null;
}
