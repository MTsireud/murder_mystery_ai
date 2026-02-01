import { randomUUID } from "crypto";
import { getLocalized, localizePublicState, normalizeLanguage } from "./i18n.js";
import { createStateFromCase, getCaseById, getCaseList } from "./cases.js";
import { createDefaultMemory, normalizeMemory } from "./memory.js";

const sessions = new Map();

function createSeedState(caseId) {
  return createStateFromCase(getCaseById(caseId));
}

function createSession({ id, caseId } = {}) {
  const sessionId = id || randomUUID();
  return {
    id: sessionId,
    created_at: new Date().toISOString(),
    state: createSeedState(caseId)
  };
}

export function getOrCreateSession(id, caseId) {
  if (id && sessions.has(id)) {
    return sessions.get(id);
  }
  const session = createSession({ id, caseId });
  sessions.set(session.id, session);
  return session;
}

export function getSession(id) {
  if (!id) return null;
  return sessions.get(id) || null;
}

export function resetSession(id, caseId) {
  const session = createSession({ id, caseId });
  sessions.set(session.id, session);
  return session;
}

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
      portrait: c.portrait_path || ""
    }))
  };
}

export function getPublicView(session, language) {
  return buildPublicView(session.state, language, session.id);
}

export function getPublicViewForState(state, language, sessionId = null) {
  return buildPublicView(state, language, sessionId);
}

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

  return state;
}

export function extractClientState(state) {
  return {
    case_id: state.case_id,
    public_state: {
      time_minutes: state.public_state.time_minutes,
      discovered_evidence: state.public_state.discovered_evidence,
      public_accusations: state.public_state.public_accusations,
      tensions: state.public_state.tensions
    },
    characters: state.characters.map((character) => ({
      id: character.id,
      knowledge: Array.isArray(character.knowledge) ? character.knowledge : [],
      memory: normalizeMemory(character.memory || createDefaultMemory())
    })),
    events: Array.isArray(state.events) ? state.events : [],
    detective_knowledge: Array.isArray(state.detective_knowledge) ? state.detective_knowledge : []
  };
}
