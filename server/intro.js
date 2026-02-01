import { getLocalized } from "./i18n.js";

const loc = (en, el = en) => ({ en, el });

function joinList(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function buildVictimSection(state) {
  const publicState = state.public_state;
  if (!publicState) return loc("", "");
  const name = getLocalized(publicState.victim_name, "en");
  const role = getLocalized(publicState.victim_role, "en");
  const location = getLocalized(publicState.case_location, "en");
  const time = getLocalized(publicState.case_time, "en");
  const en = `${name} (${role}) was last seen at ${location} around ${time}.`;
  const elName = getLocalized(publicState.victim_name, "el");
  const elRole = getLocalized(publicState.victim_role, "el");
  const elLocation = getLocalized(publicState.case_location, "el");
  const elTime = getLocalized(publicState.case_time, "el");
  const el = `${elName} (${elRole}) εξαφανίστηκε κοντά στο ${elLocation} γύρω στις ${elTime}.`;
  return loc(en, el);
}

function buildPoliceSection(state) {
  const publicState = state.public_state;
  if (!publicState) return loc("", "");
  const time = getLocalized(publicState.police_call_time, "en");
  if (!time) return loc("", "");
  const callers = Array.isArray(publicState.initial_callers)
    ? publicState.initial_callers.map((person) => getLocalized(person, "en")).filter(Boolean)
    : [];
  const who = callers.length ? `, alerted by ${joinList(callers)}` : "";
  const en = `Police were notified around ${time}${who}.`;
  const callersEl = Array.isArray(publicState.initial_callers)
    ? publicState.initial_callers.map((person) => getLocalized(person, "el")).filter(Boolean)
    : [];
  const els = callersEl.length ? `, με ειδοποιήτριες ${joinList(callersEl)}` : "";
  const el = `Η αστυνομία ενημερώθηκε περίπου στις ${getLocalized(
    publicState.police_call_time,
    "el"
  )}${els}.`;
  return loc(en, el);
}

function buildPeopleSection(state) {
  const characters = Array.isArray(state.characters) ? state.characters : [];
  const keyPeople = characters
    .filter((character) => character.relationship_to_victim || character.role)
    .map((character) => {
      const role = getLocalized(character.role, "en");
      const relation = getLocalized(character.relationship_to_victim, "en");
      const name = character.name;
      const details = relation ? ` (${relation})` : "";
      return `${name}, ${role}${details}`;
    })
    .slice(0, 4);
  const en = keyPeople.length
    ? `Key people involved: ${joinList(keyPeople)}.`
    : "";
  const keyPeopleEl = characters
    .filter((character) => character.relationship_to_victim || character.role)
    .map((character) => {
      const role = getLocalized(character.role, "el");
      const relation = getLocalized(character.relationship_to_victim, "el");
      const name = character.name;
      const details = relation ? ` (${relation})` : "";
      return `${name}, ${role}${details}`;
    })
    .slice(0, 4);
  const el = keyPeopleEl.length ? `Κύριοι εμπλεκόμενοι: ${joinList(keyPeopleEl)}.` : "";
  return loc(en, el);
}

export function buildCaseIntro(state) {
  const victimSection = buildVictimSection(state);
  const policeSection = buildPoliceSection(state);
  const peopleSection = buildPeopleSection(state);
  return {
    en: [victimSection.en, policeSection.en, peopleSection.en].filter(Boolean),
    el: [victimSection.el, policeSection.el, peopleSection.el].filter(Boolean)
  };
}
