const DICT = {
  en: {
    alibi_line: "I was {alibi}.",
    accusation_line: "If you're asking me, look at {name}.",
    secret_line: "I am not here to confess to rumors.",
    default_line: "I am {trait}, not reckless. Ask something concrete.",
    public_accusation: "{name} points to {target}",
    tension_evasive: "{name} is evasive",
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
    time_minutes: publicState.time_minutes,
    discovered_evidence: localizeList(publicState.discovered_evidence, lang),
    public_accusations: localizeList(publicState.public_accusations, lang),
    tensions: localizeList(publicState.tensions, lang)
  };
}
