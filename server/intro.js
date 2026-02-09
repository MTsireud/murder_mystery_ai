import { getLocalized } from "./i18n.js";

const loc = (en, el = en) => ({ en, el });

function joinList(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function formatLine(content, fallback, language) {
  if (!content) return fallback;
  if (typeof content === "string") return content;
  return getLocalized(content, language) || fallback;
}

function buildCrimeLines(state, language) {
  const publicState = state.public_state;
  const name = getLocalized(publicState?.victim_name, language);
  const role = getLocalized(publicState?.victim_role, language);
  const location = getLocalized(publicState?.case_location, language);
  const time = getLocalized(publicState?.case_time, language);
  if (!name || !time || !location) return [];
  if (language === "el") {
    return [
      `${name} (${role}) εξαφανίστηκε κοντά στο ${location} γύρω στις ${time}.`
    ];
  }
  return [`${name} (${role}) was last seen at ${location} around ${time}.`];
}

function buildPoliceLines(state, language) {
  const publicState = state.public_state;
  const callTime = getLocalized(publicState?.police_call_time, language);
  if (!callTime) return [];
  const callers = Array.isArray(publicState?.initial_callers)
    ? publicState.initial_callers.map((person) => getLocalized(person, language)).filter(Boolean)
    : [];
  const who = callers.length ? `, alerted by ${joinList(callers)}` : "";
  if (language === "el") {
    const els = callers.length
      ? `, με ειδοποιήτριες ${joinList(callers)}`
      : "";
    return [`Η αστυνομία ενημερώθηκε περίπου στις ${callTime}${els}.`];
  }
  return [`Police were notified around ${callTime}${who}.`];
}

function buildReasonLines(state, language) {
  const publicState = state.public_state;
  const reason =
    formatLine(publicState?.case_intro_reason, "", language) ||
    formatLine(publicState?.case_briefing, "", language);
  if (!reason) return [];
  return [reason];
}

function buildRelationshipLines(state, language) {
  const characters = Array.isArray(state.characters) ? state.characters : [];
  const lines = [];
  characters.forEach((character) => {
    if (character?.is_location_contact) return;
    const name = character.name;
    const role = getLocalized(character.role, language);
    const summary = formatLine(character.relationship_summary, "", language);
    const relation = formatLine(character.relationship_to_victim, "", language);
    if (summary) {
      lines.push(`${name}, ${role} — ${summary}`);
    } else if (relation) {
      lines.push(`${name}, ${role} — ${relation}`);
    }
  });
  return lines.slice(0, 5);
}

function buildLocationLines(state, language) {
  const locations = Array.isArray(state?.public_state?.case_locations)
    ? state.public_state.case_locations
    : [];
  return locations
    .slice(0, 5)
    .map((entry) => {
      const name = getLocalized(entry?.name, language);
      const descriptor = getLocalized(entry?.descriptor, language);
      return [name, descriptor].filter(Boolean).join(" — ");
    })
    .filter(Boolean);
}

function buildSocialLines(state, language) {
  const note = formatLine(state.public_state?.social_notes, "", language);
  if (!note) return [];
  return [note];
}

function sectionTitle(key, language) {
  const titles = {
    crime: loc("Crime at a glance", "Το έγκλημα με μια ματιά"),
    reason: loc("Why you are called here", "Γιατί σας κάλεσαν"),
    relationships: loc("Key relationships", "Βασικές σχέσεις"),
    social: loc("Social context", "Κοινωνικό υπόβαθρο"),
    locations: loc("Locations to canvass", "Τοποθεσίες για έρευνα")
  };
  return titles[key][language === "el" ? "el" : "en"];
}

function buildSections(state, language) {
  const sections = [];
  const crimeLines = buildCrimeLines(state, language);
  const reasonLines = buildReasonLines(state, language);
  const relationLines = buildRelationshipLines(state, language);
  const socialLines = buildSocialLines(state, language);
  const locationLines = buildLocationLines(state, language);
  if (crimeLines.length) {
    sections.push({ title: sectionTitle("crime", language), lines: crimeLines });
  }
  if (reasonLines.length) {
    sections.push({ title: sectionTitle("reason", language), lines: reasonLines });
  }
  if (relationLines.length) {
    sections.push({ title: sectionTitle("relationships", language), lines: relationLines });
  }
  if (socialLines.length) {
    sections.push({ title: sectionTitle("social", language), lines: socialLines });
  }
  if (locationLines.length) {
    sections.push({ title: sectionTitle("locations", language), lines: locationLines });
  }
  return sections;
}

export function buildCaseIntro(state) {
  return {
    en: buildSections(state, "en"),
    el: buildSections(state, "el")
  };
}
