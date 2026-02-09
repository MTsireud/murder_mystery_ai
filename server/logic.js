import { generateCharacterResponse, extractEvidenceFromClaims } from "./llm.js";
import { getLocalized, localizeList, localizePublicState, normalizeLanguage, t, tAll } from "./i18n.js";
import {
  createDefaultMemory,
  normalizeMemory,
  pushMemoryItem,
  trimText,
  updateAffect,
  updateHeat
} from "./memory.js";
import { selectAnswerFrame } from "./router.js";
import {
  applyInvestigationTurn,
  createInvestigationState,
  normalizeInvestigationState
} from "./investigation.js";

const loc = (en, el = en) => ({ en, el });

function canonicalValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.en === "string") return value.en;
  return JSON.stringify(value);
}

function addUnique(list, value) {
  if (!value) return;
  const key = canonicalValue(value);
  if (!list.some((item) => canonicalValue(item) === key)) {
    list.push(value);
  }
}

function addManyUnique(list, values) {
  for (const value of values) addUnique(list, value);
}

function uniqueStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim())))
    .filter(Boolean);
}

function pushEvent(state, event) {
  if (!Array.isArray(state.events)) {
    state.events = [];
  }
  state.events.push(event);
  return event;
}

function addKnowledge(state, characterId, fact) {
  if (!characterId || characterId === "detective") {
    addUnique(state.detective_knowledge, fact);
    return;
  }
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) return;
  addUnique(character.knowledge, fact);
}

function ensureCharacterMemory(character) {
  if (!character) return createDefaultMemory();
  character.memory = normalizeMemory(character.memory || createDefaultMemory());
  return character.memory;
}

function recordCommitment(memory, text, timeMinutes) {
  if (!memory || !text) return;
  pushMemoryItem(memory.commitments, {
    text: trimText(text),
    time_minutes: timeMinutes,
    source: "dialogue"
  });
}

function recordClaim(list, claim, timeMinutes) {
  if (!list || !claim) return;
  const text = trimText(claim.content || claim.evidence || "");
  if (!text) return;
  pushMemoryItem(list, {
    text,
    type: claim.type || "other",
    confidence: claim.confidence || "low",
    evidence: trimText(claim.evidence || ""),
    time_minutes: timeMinutes
  });
}

function recordHeard(memory, text, timeMinutes) {
  if (!memory || !text) return;
  pushMemoryItem(memory.heard_claims, {
    text: trimText(text),
    type: "detective_message",
    confidence: "medium",
    time_minutes: timeMinutes
  });
}

function getCaseLocations(state) {
  const locations = Array.isArray(state?.public_state?.case_locations)
    ? state.public_state.case_locations
    : [];
  return locations.filter((entry) => entry && entry.id);
}

function ensureLocationState(state) {
  if (!state?.public_state) return;
  if (!Array.isArray(state.public_state.discovered_evidence)) {
    state.public_state.discovered_evidence = [];
  }
  if (!Array.isArray(state.public_state.public_accusations)) {
    state.public_state.public_accusations = [];
  }
  if (!Array.isArray(state.public_state.tensions)) {
    state.public_state.tensions = [];
  }
  const locations = getCaseLocations(state);
  if (!locations.length) return;
  const locationIds = new Set(locations.map((entry) => entry.id));
  let currentId = String(state.public_state.current_location_id || "").trim();
  if (!currentId || !locationIds.has(currentId)) {
    currentId = locations[0].id;
  }
  state.public_state.current_location_id = currentId;

  const visited = uniqueStrings(state.public_state.visited_location_ids);
  if (!visited.includes(currentId)) visited.unshift(currentId);
  state.public_state.visited_location_ids = visited;
  state.public_state.location_intel_ids = uniqueStrings(state.public_state.location_intel_ids);
  state.public_state.introduced_character_ids = uniqueStrings(state.public_state.introduced_character_ids);
}

function getCurrentLocationId(state) {
  ensureLocationState(state);
  return String(state?.public_state?.current_location_id || "").trim();
}

function getLocationById(state, locationId) {
  return getCaseLocations(state).find((entry) => entry.id === locationId) || null;
}

function getCharacterLocationIds(character) {
  return uniqueStrings(character?.presence?.location_ids);
}

function isCharacterAvailableAtLocation(character, locationId) {
  const locationIds = getCharacterLocationIds(character);
  if (!locationIds.length) return true;
  if (!locationId) return true;
  return locationIds.includes(locationId);
}

function buildLocationIntelEvidence(location) {
  const nameEn = getLocalized(location?.name, "en") || location?.id || "scene";
  const nameEl = getLocalized(location?.name, "el") || nameEn;
  const hintEn = getLocalized(location?.hint, "en") || `Something at ${nameEn} needs a closer look.`;
  const hintEl = getLocalized(location?.hint, "el") || hintEn;
  return loc(
    `Scene note (${nameEn}): ${hintEn}`,
    `Σημείωση σκηνής (${nameEl}): ${hintEl}`
  );
}

function revealLocationIntel(state, location) {
  if (!state?.public_state || !location?.id) return [];
  ensureLocationState(state);
  if (state.public_state.location_intel_ids.includes(location.id)) return [];
  state.public_state.location_intel_ids.push(location.id);
  state.public_state.location_intel_ids = uniqueStrings(state.public_state.location_intel_ids);
  const evidenceEntry = buildLocationIntelEvidence(location);
  const beforeCount = Array.isArray(state.public_state.discovered_evidence)
    ? state.public_state.discovered_evidence.length
    : 0;
  addUnique(state.public_state.discovered_evidence, evidenceEntry);
  const afterCount = Array.isArray(state.public_state.discovered_evidence)
    ? state.public_state.discovered_evidence.length
    : 0;
  return afterCount > beforeCount ? [evidenceEntry] : [];
}

function buildLocationContactIntro(character, location, lang) {
  const locationName = getLocalized(location?.name, lang) || location?.id || "this location";
  const role = getLocalized(character?.role, lang) || "contact";
  if (lang === "el") {
    return `${character.name} (${role}) είναι διαθέσιμος/η για ερωτήσεις στο ${locationName}.`;
  }
  return `${character.name} (${role}) is now available for questions at ${locationName}.`;
}

function revealLocationContacts(state, location, lang) {
  if (!state?.public_state || !location?.id) return [];
  ensureLocationState(state);
  const introduced = new Set(state.public_state.introduced_character_ids);
  const lines = [];
  for (const character of state.characters || []) {
    if (!character?.is_location_contact) continue;
    if (!isCharacterAvailableAtLocation(character, location.id)) continue;
    if (introduced.has(character.id)) continue;
    introduced.add(character.id);
    lines.push(buildLocationContactIntro(character, location, lang));
  }
  state.public_state.introduced_character_ids = Array.from(introduced);
  return lines;
}

export async function runTurn({ state, characterId, message, language, modelMode }) {
  const lang = normalizeLanguage(language);
  ensureLocationState(state);
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) {
    return {
      error: `Unknown character: ${characterId}`
    };
  }

  const currentLocationId = getCurrentLocationId(state);
  if (!isCharacterAvailableAtLocation(character, currentLocationId)) {
    const location = getLocationById(state, currentLocationId);
    const locationName = getLocalized(location?.name, lang) || "that location";
    return {
      error:
        lang === "el"
          ? `${character.name} δεν βρίσκεται αυτή τη στιγμή στο ${locationName}.`
          : `${character.name} is not currently at ${locationName}.`
    };
  }

  const memory = ensureCharacterMemory(character);
  state.investigation_state = normalizeInvestigationState(state.investigation_state, state.case_id);
  if (!state.investigation_state) {
    state.investigation_state = createInvestigationState(state.case_id);
  }
  const investigationTurn = await applyInvestigationTurn({
    caseId: state.case_id,
    investigationState: state.investigation_state,
    message,
    characterId,
    language: lang,
    caseContext: {
      truth: state.truth,
      public_state: state.public_state,
      characters: state.characters
    }
  });
  if (investigationTurn?.state) {
    state.investigation_state = investigationTurn.state;
  }
  const routedFrame = selectAnswerFrame({
    message,
    language: lang,
    character,
    publicState: state.public_state,
    memory
  });
  const activeFrame = routedFrame || null;
  const characterResponse = await generateCharacterResponse({
    character,
    message,
    language: lang,
    allCharacters: state.characters,
    publicState: state.public_state,
    modelMode,
    answerFrame: activeFrame,
    runtimeContext: investigationTurn?.prompt_context || null
  });
  if (investigationTurn?.forced_statement?.text) {
    characterResponse.dialogue = investigationTurn.forced_statement.text;
    characterResponse.intent = "reveal";
    const currentClaims = Array.isArray(characterResponse.claims) ? characterResponse.claims : [];
    characterResponse.claims = currentClaims.concat([
      {
        type: "observation",
        content: investigationTurn.forced_statement.text,
        confidence: "medium",
        evidence: investigationTurn.forced_statement.evidence_label || ""
      }
    ]);
  }

  const now = state.public_state.time_minutes;
  const timeAdvance = 10;

  const eventDelta = [];
  eventDelta.push(
    pushEvent(state, {
      type: "detective_message",
      content: message,
      visibility: ["detective", characterId],
      time_minutes: now,
      location_id: currentLocationId
    })
  );

  eventDelta.push(
    pushEvent(state, {
      type: "character_response",
      content: characterResponse.dialogue,
      visibility: ["detective", characterId],
      time_minutes: now,
      location_id: currentLocationId
    })
  );

  addKnowledge(state, characterId, t(lang, "detective_said", { text: message }));
  addKnowledge(
    state,
    "detective",
    t(lang, "character_said", { name: character.name, text: characterResponse.dialogue })
  );

  memory.affect = updateAffect(memory.affect, message);
  memory.heat = updateHeat(memory.heat, { intent: characterResponse.intent, message });
  recordHeard(memory, message, now);
  recordCommitment(memory, characterResponse.dialogue, now);
  if (Array.isArray(characterResponse.claims)) {
    characterResponse.claims.forEach((claim) => recordClaim(memory.self_claims, claim, now));
  }
  if (activeFrame?.key) {
    memory.answer_frames[activeFrame.key] = activeFrame;
  }
  if (activeFrame?.variant === "lie") {
    addUnique(state.public_state.tensions, tAll("tension_lie", { name: character.name }));
  }
  memory.last_question = message;

  if (memory.heat >= 60) {
    addUnique(state.public_state.tensions, tAll("tension_suspect", { name: character.name }));
  }

  const newAccusations = [];
  if (characterResponse.intent === "accuse") {
    for (const claim of characterResponse.claims) {
      if (claim.type !== "accusation") continue;
      newAccusations.push(
        tAll("public_accusation", {
          name: character.name,
          target: claim.content
        })
      );
    }
  }

  const evidence = extractEvidenceFromClaims(characterResponse.claims);
  const chainEvidence = Array.isArray(investigationTurn?.evidence_delta)
    ? investigationTurn.evidence_delta
    : [];
  const chainAccusations = Array.isArray(investigationTurn?.accusations_delta)
    ? investigationTurn.accusations_delta
    : [];

  if (characterResponse.intent === "deflect") {
    addUnique(state.public_state.tensions, tAll("tension_evasive", { name: character.name }));
  }

  addManyUnique(state.public_state.public_accusations, newAccusations);
  addManyUnique(state.public_state.public_accusations, chainAccusations);
  addManyUnique(state.public_state.discovered_evidence, evidence);
  addManyUnique(state.public_state.discovered_evidence, chainEvidence);

  state.public_state.time_minutes += timeAdvance;

  const combinedEvidence = evidence.concat(chainEvidence);
  const combinedAccusations = newAccusations.concat(chainAccusations);

  return {
    character_response: characterResponse,
    event_delta: eventDelta,
    time_advance_minutes: timeAdvance,
    public_state: localizePublicState(state.public_state, lang),
    evidence_delta: localizeList(combinedEvidence, lang),
    accusations_delta: localizeList(combinedAccusations, lang),
    model_used: characterResponse._meta?.model_used || "unknown",
    model_selected: characterResponse._meta?.model_selected || "unknown",
    model_mode: characterResponse._meta?.model_mode || "auto",
    model_mock: Boolean(characterResponse._meta?.mock)
  };
}

export async function runLocationAction({ state, actionType, locationId, language }) {
  const lang = normalizeLanguage(language);
  ensureLocationState(state);
  const locations = getCaseLocations(state);
  if (!locations.length) {
    return {
      error: lang === "el" ? "Δεν υπάρχουν διαθέσιμες τοποθεσίες." : "No locations are available for this case."
    };
  }

  const action = String(actionType || "move").toLowerCase() === "inspect" ? "inspect" : "move";
  const currentLocationId = getCurrentLocationId(state);
  const targetLocationId = String(locationId || currentLocationId || "").trim();
  const targetLocation = getLocationById(state, targetLocationId);
  if (!targetLocation) {
    return {
      error:
        lang === "el"
          ? "Μη έγκυρη τοποθεσία. Δοκίμασε ξανά."
          : "Invalid location. Please choose a valid destination."
    };
  }
  if (action === "inspect" && targetLocation.id !== currentLocationId) {
    const currentLocation = getLocationById(state, currentLocationId);
    const currentName = getLocalized(currentLocation?.name, lang) || currentLocationId || "current location";
    return {
      error:
        lang === "el"
          ? `Πρέπει πρώτα να μετακινηθείς. Βρίσκεσαι στο ${currentName}.`
          : `Move there first. You are currently at ${currentName}.`
    };
  }

  const targetName = getLocalized(targetLocation.name, lang) || targetLocation.id;
  const targetHint = getLocalized(targetLocation.hint, lang);
  const eventDelta = [];
  let evidenceDelta = [];
  let timeAdvance = 0;
  let dialogue = "";

  if (action === "move") {
    if (targetLocation.id === currentLocationId) {
      dialogue =
        lang === "el"
          ? `Βρίσκεσαι ήδη στο ${targetName}.`
          : `You're already at ${targetName}.`;
      eventDelta.push(
        pushEvent(state, {
          type: "location_note",
          content: dialogue,
          visibility: ["detective"],
          time_minutes: state.public_state.time_minutes,
          location_id: targetLocation.id
        })
      );
    } else {
      state.public_state.current_location_id = targetLocation.id;
      if (!state.public_state.visited_location_ids.includes(targetLocation.id)) {
        state.public_state.visited_location_ids.push(targetLocation.id);
      }
      timeAdvance = 7;
      state.public_state.time_minutes += timeAdvance;
      dialogue =
        lang === "el"
          ? `Μετακινήθηκες στο ${targetName}.`
          : `You move to ${targetName}.`;
      eventDelta.push(
        pushEvent(state, {
          type: "detective_move",
          content: dialogue,
          visibility: ["detective"],
          time_minutes: state.public_state.time_minutes,
          location_id: targetLocation.id
        })
      );
    }

    evidenceDelta = revealLocationIntel(state, targetLocation);
    if (evidenceDelta.length && targetHint) {
      eventDelta.push(
        pushEvent(state, {
          type: "location_note",
          content:
            lang === "el"
              ? `Σημείωση σημείου: ${targetHint}`
              : `Scene note logged: ${targetHint}`,
          visibility: ["detective"],
          time_minutes: state.public_state.time_minutes,
          location_id: targetLocation.id
        })
      );
    }
  } else {
    timeAdvance = 4;
    state.public_state.time_minutes += timeAdvance;
    evidenceDelta = revealLocationIntel(state, targetLocation);
    if (evidenceDelta.length) {
      dialogue =
        lang === "el"
          ? `Επιθεωρείς το ${targetName}. Κάτι ξεχωρίζει: ${targetHint || "υπάρχει λεπτομέρεια που αξίζει πίεση."}`
          : `You inspect ${targetName}. Something stands out: ${targetHint || "there is a detail worth pressing."}`;
    } else {
      dialogue =
        lang === "el"
          ? `Ξανακοίταξες το ${targetName}. Δεν βρήκες νέο στοιχείο.`
          : `You re-check ${targetName}. No new scene clue appears yet.`;
    }
    eventDelta.push(
      pushEvent(state, {
        type: "location_note",
        content: dialogue,
        visibility: ["detective"],
        time_minutes: state.public_state.time_minutes,
        location_id: targetLocation.id
      })
    );
  }

  const introductions = revealLocationContacts(state, targetLocation, lang);
  for (const line of introductions) {
    eventDelta.push(
      pushEvent(state, {
        type: "character_intro",
        content: line,
        visibility: ["detective"],
        time_minutes: state.public_state.time_minutes,
        location_id: targetLocation.id
      })
    );
  }

  return {
    action,
    location_id: targetLocation.id,
    dialogue,
    event_delta: eventDelta,
    time_advance_minutes: timeAdvance,
    public_state: localizePublicState(state.public_state, lang),
    evidence_delta: localizeList(evidenceDelta, lang),
    accusations_delta: [],
    model_used: "system",
    model_selected: "system",
    model_mode: "action",
    model_mock: true
  };
}
