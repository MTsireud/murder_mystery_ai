/**
 * Manages in-memory sessions and provides serialization helpers between server state and client payloads.
 * It is the bridge between canonical case state and the trimmed public/client representations.
 */
import { randomUUID } from "crypto";
import { getLocalized, localizePublicState, normalizeLanguage } from "./i18n.js";
import { createStateFromCase, getCaseById, getCaseList } from "./cases.js";
import { createDefaultMemory, normalizeMemory } from "./memory.js";
import { createInvestigationState, normalizeInvestigationState } from "./investigation.js";

const sessions = new Map();

// Seeds a new runtime state from a selected case id.
function createSeedState(caseId) {
  return createStateFromCase(getCaseById(caseId));
}

// Creates a session envelope with id, timestamp, and seeded case state.
function createSession({ id, caseId } = {}) {
  const sessionId = id || randomUUID();
  return {
    id: sessionId,
    created_at: new Date().toISOString(),
    state: createSeedState(caseId)
  };
}

// Returns an existing session when present or creates and stores a new one.
export function getOrCreateSession(id, caseId) {
  if (id && sessions.has(id)) {
    return sessions.get(id);
  }
  const session = createSession({ id, caseId });
  sessions.set(session.id, session);
  return session;
}

// Reads a session by id and returns null for missing ids.
export function getSession(id) {
  if (!id) return null;
  return sessions.get(id) || null;
}

// Replaces a session state with a fresh seed while preserving/setting its id.
export function resetSession(id, caseId) {
  const session = createSession({ id, caseId });
  sessions.set(session.id, session);
  return session;
}

// Builds a localized, client-safe view of state for UI responses.
function buildPublicView(state, language, sessionId) {
  const lang = normalizeLanguage(language);
  return {
    sessionId,
    case_id: state.case_id,
    case_list: getCaseList(lang),
    public_state: localizePublicState(state.public_state, lang),
    characters: state.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: getLocalized(c.role, lang),
      portrait: c.portrait_path || "",
      is_location_contact: Boolean(c.is_location_contact),
      location_ids: Array.isArray(c?.presence?.location_ids)
        ? c.presence.location_ids.filter(Boolean)
        : []
    }))
  };
}

// Builds a public view directly from a stored session object.
export function getPublicView(session, language) {
  return buildPublicView(session.state, language, session.id);
}

// Builds a public view from a raw state object outside session storage.
export function getPublicViewForState(state, language, sessionId = null) {
  return buildPublicView(state, language, sessionId);
}

// Reconstructs trusted runtime state by overlaying allowed client fields onto a fresh case seed.
export function buildStateFromClient({ caseId, clientState }) {
  const effectiveCaseId = caseId || clientState?.case_id;
  const state = createStateFromCase(getCaseById(effectiveCaseId));
  if (!clientState || typeof clientState !== "object") return state;

  const publicState = clientState.public_state || {};
  if (Number.isFinite(publicState.time_minutes)) {
    state.public_state.time_minutes = publicState.time_minutes;
  }
  if (Array.isArray(publicState.discovered_evidence)) {
    state.public_state.discovered_evidence = publicState.discovered_evidence;
  }
  if (Array.isArray(publicState.public_accusations)) {
    state.public_state.public_accusations = publicState.public_accusations;
  }
  if (Array.isArray(publicState.tensions)) {
    state.public_state.tensions = publicState.tensions;
  }
  if (typeof publicState.current_location_id === "string") {
    state.public_state.current_location_id = publicState.current_location_id;
  }
  if (Array.isArray(publicState.visited_location_ids)) {
    state.public_state.visited_location_ids = publicState.visited_location_ids;
  }
  if (Array.isArray(publicState.location_intel_ids)) {
    state.public_state.location_intel_ids = publicState.location_intel_ids;
  }
  if (Array.isArray(publicState.introduced_character_ids)) {
    state.public_state.introduced_character_ids = publicState.introduced_character_ids;
  }

  if (Array.isArray(clientState.events)) {
    state.events = clientState.events;
  }
  if (Array.isArray(clientState.detective_knowledge)) {
    state.detective_knowledge = clientState.detective_knowledge;
  }

  const knowledgeById = new Map();
  const memoryById = new Map();
  if (Array.isArray(clientState.characters)) {
    clientState.characters.forEach((character) => {
      if (character?.id) {
        knowledgeById.set(character.id, Array.isArray(character.knowledge) ? character.knowledge : []);
        if (character.memory) {
          memoryById.set(character.id, normalizeMemory(character.memory));
        }
      }
    });
  }
  state.characters = state.characters.map((character) => {
    if (knowledgeById.has(character.id)) {
      character.knowledge = knowledgeById.get(character.id);
    }
    if (memoryById.has(character.id)) {
      character.memory = memoryById.get(character.id);
    } else {
      character.memory = normalizeMemory(character.memory || createDefaultMemory());
    }
    return character;
  });

  const incomingInvestigationState = clientState.investigation_state || state.investigation_state;
  state.investigation_state = normalizeInvestigationState(incomingInvestigationState, state.case_id);
  if (!state.investigation_state) {
    state.investigation_state = createInvestigationState(state.case_id);
  }

  return state;
}

// Extracts the minimal client payload shape from full runtime state.
export function extractClientState(state) {
  return {
    case_id: state.case_id,
    public_state: {
      time_minutes: state.public_state.time_minutes,
      discovered_evidence: state.public_state.discovered_evidence,
      public_accusations: state.public_state.public_accusations,
      tensions: state.public_state.tensions,
      current_location_id: state.public_state.current_location_id || "",
      visited_location_ids: Array.isArray(state.public_state.visited_location_ids)
        ? state.public_state.visited_location_ids
        : [],
      location_intel_ids: Array.isArray(state.public_state.location_intel_ids)
        ? state.public_state.location_intel_ids
        : [],
      introduced_character_ids: Array.isArray(state.public_state.introduced_character_ids)
        ? state.public_state.introduced_character_ids
        : []
    },
    characters: state.characters.map((character) => ({
      id: character.id,
      knowledge: Array.isArray(character.knowledge) ? character.knowledge : [],
      memory: normalizeMemory(character.memory || createDefaultMemory())
    })),
    investigation_state: normalizeInvestigationState(
      state.investigation_state || createInvestigationState(state.case_id),
      state.case_id
    ),
    events: Array.isArray(state.events) ? state.events : [],
    detective_knowledge: Array.isArray(state.detective_knowledge) ? state.detective_knowledge : []
  };
}
