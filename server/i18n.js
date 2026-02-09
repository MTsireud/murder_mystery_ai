const DICT = {
  en: {
    alibi_line: "I was {alibi}.",
    accusation_line: "If you're asking me, look at {name}.",
    secret_line: "I am not here to confess to rumors.",
    default_line: "I am {trait}, not reckless. Ask something concrete.",
    public_accusation: "{name} points to {target}",
    tension_evasive: "{name} is evasive",
    tension_suspect: "{name} is drawing suspicion",
    tension_lie: "{name} is likely hiding details",
    detective_said: "Detective said: {text}",
    character_said: "{name} said: {text}",
    no_one_specific: "no one specific"
  },
  el: {
    alibi_line: "Ήμουν {alibi}.",
    accusation_line: "Αν με ρωτάς, κοίτα {name}.",
    secret_line: "Δεν είμαι εδώ για να ομολογήσω φήμες.",
    default_line: "Είμαι {trait}, όχι απερίσκεπτος. Ρώτα κάτι συγκεκριμένο.",
    public_accusation: "{name} δείχνει προς {target}",
    tension_evasive: "{name} αποφεύγει να απαντήσει",
    tension_suspect: "{name} μπαίνει στο στόχαστρο",
    tension_lie: "{name} πιθανόν κρύβει λεπτομέρειες",
    detective_said: "Ο ντετέκτιβ είπε: {text}",
    character_said: "{name} είπε: {text}",
    no_one_specific: "κανέναν συγκεκριμένο"
  }
};

export function normalizeLanguage(input) {
  if (!input) return "en";
  const value = String(input).toLowerCase();
  return value.startsWith("el") ? "el" : "en";
}

function interpolate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : ""));
}

export function t(lang, key, vars) {
  const language = normalizeLanguage(lang);
  const template = DICT[language]?.[key] || DICT.en[key] || "";
  return interpolate(template, vars);
}

export function tAll(key, vars) {
  return {
    en: t("en", key, vars),
    el: t("el", key, vars)
  };
}

export function getLocalized(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  const language = normalizeLanguage(lang);
  if (typeof value[language] === "string") return value[language];
  if (typeof value.en === "string") return value.en;
  return "";
}

export function localizeList(list, lang) {
  if (!Array.isArray(list)) return [];
  return list.map((value) => getLocalized(value, lang));
}

export function localizePublicState(publicState, lang) {
  if (!publicState) return null;
  const caseLocationsRaw = Array.isArray(publicState.case_locations)
    ? publicState.case_locations
    : [];
  const observedHotspotIds = Array.isArray(publicState.observed_hotspot_ids)
    ? publicState.observed_hotspot_ids.filter(Boolean)
    : [];
  const observedSet = new Set(observedHotspotIds);
  const caseLocations = caseLocationsRaw.map((loc) => {
    const scene = loc?.scene && typeof loc.scene === "object" ? loc.scene : {};
    const hotspots = Array.isArray(scene.hotspots) ? scene.hotspots : [];
    return {
      id: loc.id,
      name: getLocalized(loc.name, lang),
      descriptor: getLocalized(loc.descriptor, lang),
      hint: getLocalized(loc.hint, lang),
      scene: {
        asset_id: String(scene.asset_id || ""),
        asset_path: String(scene.asset_path || ""),
        asset_version: String(scene.asset_version || ""),
        hotspots: hotspots
          .filter((entry) => entry && entry.id)
          .map((entry) => ({
            id: String(entry.id),
            label: getLocalized(entry.label, lang),
            anchor: {
              x: Number.isFinite(entry?.anchor?.x) ? entry.anchor.x : 50,
              y: Number.isFinite(entry?.anchor?.y) ? entry.anchor.y : 50,
              radius: Number.isFinite(entry?.anchor?.radius) ? entry.anchor.radius : 18
            },
            object_type: String(entry.object_type || "scene_detail"),
            observation_note: getLocalized(entry.observation_note, lang),
            suggested_questions: localizeList(entry.suggested_questions, lang),
            reveal_fact_ids: Array.isArray(entry.reveal_fact_ids) ? entry.reveal_fact_ids.filter(Boolean) : [],
            unlock_step_ids: Array.isArray(entry.unlock_step_ids) ? entry.unlock_step_ids.filter(Boolean) : [],
            repeatable: Boolean(entry.repeatable),
            observed: observedSet.has(String(entry.id))
          }))
      }
    };
  });
  const currentLocationId = typeof publicState.current_location_id === "string"
    ? publicState.current_location_id
    : "";
  const currentLocationEntry = caseLocations.find((entry) => entry.id === currentLocationId) || null;
  const relationshipHistory = Array.isArray(publicState.relationship_history)
    ? publicState.relationship_history
    : [];
  const caseIntro = publicState.case_intro || null;
  return {
    victim_name: getLocalized(publicState.victim_name, lang),
    victim_role: getLocalized(publicState.victim_role, lang),
    case_title: getLocalized(publicState.case_title, lang),
    case_subtitle: getLocalized(publicState.case_subtitle, lang),
    case_headline: getLocalized(publicState.case_headline, lang),
    case_synopsis: getLocalized(publicState.case_synopsis, lang),
    case_time: getLocalized(publicState.case_time, lang),
    case_location: getLocalized(publicState.case_location, lang),
    case_briefing: getLocalized(publicState.case_briefing, lang),
    case_intro_reason: getLocalized(publicState.case_intro_reason, lang),
    social_notes: getLocalized(publicState.social_notes, lang),
    police_call_time: getLocalized(publicState.police_call_time, lang),
    victim_dossier: publicState.victim_dossier
      ? {
          bio: getLocalized(publicState.victim_dossier.bio, lang),
          last_seen: getLocalized(publicState.victim_dossier.last_seen, lang),
          relationship_summary: getLocalized(publicState.victim_dossier.relationship_summary, lang)
        }
      : null,
    case_locations: caseLocations,
    current_location_id: currentLocationId,
    current_location_name: currentLocationEntry ? getLocalized(currentLocationEntry.name, lang) : "",
    current_scene: currentLocationEntry?.scene || null,
    visited_location_ids: Array.isArray(publicState.visited_location_ids)
      ? publicState.visited_location_ids.filter(Boolean)
      : [],
    location_intel_ids: Array.isArray(publicState.location_intel_ids)
      ? publicState.location_intel_ids.filter(Boolean)
      : [],
    introduced_character_ids: Array.isArray(publicState.introduced_character_ids)
      ? publicState.introduced_character_ids.filter(Boolean)
      : [],
    observed_hotspot_ids: observedHotspotIds,
    observation_events: Array.isArray(publicState.observation_events)
      ? publicState.observation_events
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => ({
            id: String(entry.id || ""),
            hotspot_id: String(entry.hotspot_id || ""),
            location_id: String(entry.location_id || ""),
            time_minutes: Number.isFinite(entry.time_minutes) ? entry.time_minutes : null,
            note: getLocalized(entry.note, lang) || "",
            label: getLocalized(entry.label, lang) || "",
            suggested_questions: localizeList(entry.suggested_questions, lang)
          }))
          .filter((entry) => entry.hotspot_id && entry.location_id)
      : [],
    relationship_history: relationshipHistory.map((entry) => ({
      id: entry.id,
      time: getLocalized(entry.time, lang),
      event: getLocalized(entry.event, lang),
      location_id: entry.location_id || "",
      participants: Array.isArray(entry.participants) ? entry.participants : []
    })),
    case_intro: caseIntro
      ? {
          en: Array.isArray(caseIntro.en) ? caseIntro.en : [],
          el: Array.isArray(caseIntro.el) ? caseIntro.el : []
        }
      : null,
    time_minutes: publicState.time_minutes,
    discovered_evidence: localizeList(publicState.discovered_evidence, lang),
    public_accusations: localizeList(publicState.public_accusations, lang),
    tensions: localizeList(publicState.tensions, lang),
    public_bulletin: Array.isArray(publicState.public_bulletin)
      ? publicState.public_bulletin
      : [],
    case_state: publicState.case_state || null
  };
}
