import { generateCharacterResponse, extractEvidenceFromClaims } from "./llm.js";
import { localizeList, localizePublicState, normalizeLanguage, t, tAll } from "./i18n.js";

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

function pushEvent(state, event) {
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

export async function runTurn({ state, characterId, message, language, modelMode }) {
  const character = state.characters.find((c) => c.id === characterId);
  if (!character) {
    return {
      error: `Unknown character: ${characterId}`
    };
  }

  const lang = normalizeLanguage(language);
  const characterResponse = await generateCharacterResponse({
    character,
    message,
    language: lang,
    allCharacters: state.characters,
    publicState: state.public_state,
    modelMode
  });

  const now = state.public_state.time_minutes;
  const timeAdvance = 10;

  const eventDelta = [];
  eventDelta.push(
    pushEvent(state, {
      type: "detective_message",
      content: message,
      visibility: ["detective", characterId],
      time_minutes: now
    })
  );

  eventDelta.push(
    pushEvent(state, {
      type: "character_response",
      content: characterResponse.dialogue,
      visibility: ["detective", characterId],
      time_minutes: now
    })
  );

  addKnowledge(state, characterId, t(lang, "detective_said", { text: message }));
  addKnowledge(
    state,
    "detective",
    t(lang, "character_said", { name: character.name, text: characterResponse.dialogue })
  );

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

  if (characterResponse.intent === "deflect") {
    addUnique(state.public_state.tensions, tAll("tension_evasive", { name: character.name }));
  }

  addManyUnique(state.public_state.public_accusations, newAccusations);
  addManyUnique(state.public_state.discovered_evidence, evidence);

  state.public_state.time_minutes += timeAdvance;

  return {
    character_response: characterResponse,
    event_delta: eventDelta,
    time_advance_minutes: timeAdvance,
    public_state: localizePublicState(state.public_state, lang),
    evidence_delta: localizeList(evidence, lang),
    accusations_delta: localizeList(newAccusations, lang),
    model_used: characterResponse._meta?.model_used || "unknown",
    model_selected: characterResponse._meta?.model_selected || "unknown",
    model_mode: characterResponse._meta?.model_mode || "auto",
    model_mock: Boolean(characterResponse._meta?.mock)
  };
}
