const characterListEl = document.getElementById("characterList");
const chatLogEl = document.getElementById("chatLog");
const messageInput = document.getElementById("messageInput");
const chatForm = document.getElementById("chatForm");
const timeElapsedEl = document.getElementById("timeElapsed");
const accusationsListEl = document.getElementById("accusationsList");
const tensionsListEl = document.getElementById("tensionsList");
const resetBtn = document.getElementById("resetBtn");
const languageSelect = document.getElementById("languageSelect");
const caseSelect = document.getElementById("caseSelect");
const modelModeSelect = document.getElementById("modelModeSelect");
const modelUsedValue = document.getElementById("modelUsedValue");
const solutionKillerInput = document.getElementById("solutionKiller");
const solutionMethodInput = document.getElementById("solutionMethod");
const solutionMotiveInput = document.getElementById("solutionMotive");
const solutionTimelineInput = document.getElementById("solutionTimeline");
const solutionCharacterNotesInput = document.getElementById("solutionCharacterNotes");
const revealToggle = document.getElementById("revealToggle");
const checkSolutionBtn = document.getElementById("checkSolutionBtn");
const solutionResultEl = document.getElementById("solutionResult");
const caseHeadlineEl = document.getElementById("caseHeadline");
const chatTabCase = document.getElementById("chatTabCase");
const chatTabWatson = document.getElementById("chatTabWatson");
const watsonCard = document.getElementById("watsonCard");
const skillsToggle = document.getElementById("skillsToggle");
const skillsDrawer = document.getElementById("skillsDrawer");
const skillsDrawerTab = document.getElementById("skillsDrawerTab");
const skillsCloseBtn = document.getElementById("skillsCloseBtn");
const skillsCardsEl = document.getElementById("skillsCards");
const skillsViewToggle = document.getElementById("skillsViewToggle");
const relationshipListEl = document.getElementById("relationshipList");
const relationshipCountEl = document.getElementById("relationshipCount");
const timelineListEl = document.getElementById("timelineList");
const timelineCountEl = document.getElementById("timelineCount");
const evidenceLockerListEl = document.getElementById("evidenceLockerList");
const evidenceCountEl = document.getElementById("evidenceCount");
const contradictionListEl = document.getElementById("contradictionList");
const contradictionCountEl = document.getElementById("contradictionCount");
const watsonFrequencySelect = document.getElementById("watsonFrequency");
const watsonStyleSelect = document.getElementById("watsonStyle");
const watsonQualityRange = document.getElementById("watsonQuality");
const watsonSuggestionEl = document.getElementById("watsonSuggestion");
const watsonChipBtn = document.getElementById("watsonChip");
const watsonEmptyEl = document.getElementById("watsonEmpty");

const appState = {
  sessionId: null,
  caseId: null,
  caseList: [],
  clientState: null,
  activeCharacterId: null,
  characters: [],
  publicState: null,
  language: "en",
  modelMode: "auto",
  chatMode: "case",
  watsonLog: [],
  skillsEnabled: false,
  skillsDrawerOpen: false,
  skillsView: "stack",
  expandedSkillId: null,
  watsonFrequency: "off",
  watsonStyle: "questions",
  watsonQuality: 70
};

const SKILL_PHASE_LABELS = {
  early: "skillsPhaseEarly",
  mid: "skillsPhaseMid",
  late: "skillsPhaseLate"
};

const SKILL_BEST_FOR_LABELS = {
  anyone: "skillsBestForAnyone",
  witness: "skillsBestForWitness",
  suspect: "skillsBestForSuspect"
};

const SKILL_OUTPUT_LABELS = {
  timeline: "skillsOutputTimeline",
  relationship: "skillsOutputRelationship",
  contradiction: "skillsOutputContradiction",
  motive: "skillsOutputMotive",
  evidence: "skillsOutputEvidence",
  theory: "skillsOutputTheory"
};

const SKILLS = [
  {
    id: "build-timeline",
    nameKey: "skillTimelineName",
    quipKey: "skillTimelineQuip",
    whatKey: "skillTimelineWhat",
    whyKey: "skillTimelineWhy",
    anchorKey: "skillTimelineAnchor",
    stepsKeys: ["skillTimelineStep1", "skillTimelineStep2", "skillTimelineStep3"],
    promptKeys: [
      "skillTimelinePrompt1",
      "skillTimelinePrompt2",
      "skillTimelinePrompt3",
      "skillTimelinePrompt4"
    ],
    criteria: [
      { key: "skillTimelineCriteria1", check: (metrics) => metrics.timelineAnchors >= 2 },
      { key: "skillTimelineCriteria2", check: (metrics) => metrics.timelineGaps > 0 }
    ],
    suggestionKey: "skillTimelineSuggestion",
    phase: "early",
    bestFor: "anyone",
    output: "timeline",
    risks: ["riskHeatLow", "riskRapportNeutral"],
    unlock: () => true,
    baseOrder: 1
  },
  {
    id: "relationship-mapping",
    nameKey: "skillRelationshipName",
    quipKey: "skillRelationshipQuip",
    whatKey: "skillRelationshipWhat",
    whyKey: "skillRelationshipWhy",
    anchorKey: "skillRelationshipAnchor",
    stepsKeys: ["skillRelationshipStep1", "skillRelationshipStep2", "skillRelationshipStep3"],
    promptKeys: [
      "skillRelationshipPrompt1",
      "skillRelationshipPrompt2",
      "skillRelationshipPrompt3",
      "skillRelationshipPrompt4"
    ],
    criteria: [
      { key: "skillRelationshipCriteria1", check: (metrics) => metrics.relationshipLinks > 0 }
    ],
    suggestionKey: "skillRelationshipSuggestion",
    phase: "early",
    bestFor: "anyone",
    output: "relationship",
    risks: ["riskHeatLow", "riskRapportNeutral"],
    unlock: () => true,
    baseOrder: 2
  },
  {
    id: "motive-probe",
    nameKey: "skillMotiveName",
    quipKey: "skillMotiveQuip",
    whatKey: "skillMotiveWhat",
    whyKey: "skillMotiveWhy",
    anchorKey: "skillMotiveAnchor",
    stepsKeys: ["skillMotiveStep1", "skillMotiveStep2", "skillMotiveStep3"],
    promptKeys: [
      "skillMotivePrompt1",
      "skillMotivePrompt2",
      "skillMotivePrompt3",
      "skillMotivePrompt4"
    ],
    criteria: [{ key: "skillMotiveCriteria1", check: (metrics) => metrics.motiveSignals > 0 }],
    suggestionKey: "skillMotiveSuggestion",
    phase: "early",
    bestFor: "suspect",
    output: "motive",
    risks: ["riskHeatLow", "riskRapportNeutral"],
    unlock: () => true,
    baseOrder: 3
  },
  {
    id: "alibi-lock",
    nameKey: "skillAlibiName",
    quipKey: "skillAlibiQuip",
    whatKey: "skillAlibiWhat",
    whyKey: "skillAlibiWhy",
    anchorKey: "skillAlibiAnchor",
    stepsKeys: ["skillAlibiStep1", "skillAlibiStep2", "skillAlibiStep3"],
    promptKeys: ["skillAlibiPrompt1", "skillAlibiPrompt2", "skillAlibiPrompt3", "skillAlibiPrompt4"],
    criteria: [
      { key: "skillAlibiCriteria1", check: (metrics) => metrics.alibiClaims > 0 }
    ],
    suggestionKey: "skillAlibiSuggestion",
    phase: "mid",
    bestFor: "suspect",
    output: "timeline",
    risks: ["riskHeatMedium", "riskRapportLow"],
    unlock: (metrics) => metrics.alibiClaims > 0,
    baseOrder: 4
  },
  {
    id: "cognitive-interview",
    nameKey: "skillCognitiveName",
    quipKey: "skillCognitiveQuip",
    whatKey: "skillCognitiveWhat",
    whyKey: "skillCognitiveWhy",
    anchorKey: "skillCognitiveAnchor",
    stepsKeys: ["skillCognitiveStep1", "skillCognitiveStep2", "skillCognitiveStep3"],
    promptKeys: [
      "skillCognitivePrompt1",
      "skillCognitivePrompt2",
      "skillCognitivePrompt3",
      "skillCognitivePrompt4"
    ],
    criteria: [
      { key: "skillCognitiveCriteria1", check: (metrics) => metrics.sensoryPrompts > 0 }
    ],
    suggestionKey: "skillCognitiveSuggestion",
    phase: "mid",
    bestFor: "witness",
    output: "evidence",
    risks: ["riskHeatLow", "riskRapportHigh"],
    unlock: () => true,
    baseOrder: 5
  },
  {
    id: "strategic-evidence",
    nameKey: "skillSUEName",
    quipKey: "skillSUEQuip",
    whatKey: "skillSUEWhat",
    whyKey: "skillSUEWhy",
    anchorKey: "skillSUEAnchor",
    stepsKeys: ["skillSUEStep1", "skillSUEStep2", "skillSUEStep3"],
    promptKeys: ["skillSUEPrompt1", "skillSUEPrompt2", "skillSUEPrompt3", "skillSUEPrompt4"],
    criteria: [
      { key: "skillSUECriteria1", check: (metrics) => metrics.evidenceCount >= 2 }
    ],
    suggestionKey: "skillSUESuggestion",
    phase: "mid",
    bestFor: "suspect",
    output: "contradiction",
    risks: ["riskHeatMedium", "riskRapportLow"],
    unlock: (metrics) => metrics.evidenceCount >= 2,
    baseOrder: 6
  },
  {
    id: "contradiction-press",
    nameKey: "skillContradictionName",
    quipKey: "skillContradictionQuip",
    whatKey: "skillContradictionWhat",
    whyKey: "skillContradictionWhy",
    anchorKey: "skillContradictionAnchor",
    stepsKeys: [
      "skillContradictionStep1",
      "skillContradictionStep2",
      "skillContradictionStep3"
    ],
    promptKeys: [
      "skillContradictionPrompt1",
      "skillContradictionPrompt2",
      "skillContradictionPrompt3",
      "skillContradictionPrompt4"
    ],
    criteria: [
      { key: "skillContradictionCriteria1", check: (metrics) => metrics.contradictions > 0 }
    ],
    suggestionKey: "skillContradictionSuggestion",
    phase: "late",
    bestFor: "anyone",
    output: "contradiction",
    risks: ["riskHeatHigh", "riskRapportLow"],
    unlock: (metrics) => metrics.contradictions > 0,
    baseOrder: 7
  },
  {
    id: "theory-builder",
    nameKey: "skillTheoryName",
    quipKey: "skillTheoryQuip",
    whatKey: "skillTheoryWhat",
    whyKey: "skillTheoryWhy",
    anchorKey: "skillTheoryAnchor",
    stepsKeys: ["skillTheoryStep1", "skillTheoryStep2", "skillTheoryStep3"],
    promptKeys: ["skillTheoryPrompt1", "skillTheoryPrompt2", "skillTheoryPrompt3", "skillTheoryPrompt4"],
    criteria: [
      { key: "skillTheoryCriteria1", check: (metrics) => metrics.evidenceCount >= 2 }
    ],
    suggestionKey: "skillTheorySuggestion",
    phase: "late",
    bestFor: "anyone",
    output: "theory",
    risks: ["riskHeatLow", "riskRapportNeutral"],
    unlock: (metrics) => metrics.evidenceCount >= 2,
    baseOrder: 8
  }
];

function loadStoredClientState() {
  const raw = localStorage.getItem("clientState");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeClientState(state) {
  if (!state) return;
  localStorage.setItem("clientState", JSON.stringify(state));
}

function loadActiveCharacterByCase() {
  const raw = localStorage.getItem("activeCharacterByCase");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function storeActiveCharacter(caseId, characterId) {
  if (!caseId || !characterId) return;
  const map = loadActiveCharacterByCase();
  map[caseId] = characterId;
  localStorage.setItem("activeCharacterByCase", JSON.stringify(map));
}

function getStoredActiveCharacter(caseId) {
  if (!caseId) return null;
  const map = loadActiveCharacterByCase();
  return map[caseId] || null;
}

function t(key, vars) {
  return I18N.t(appState.language, key, vars);
}

function formatPrompt(template, context) {
  if (!template) return "";
  return template
    .replace(/\{(\w+)\}/g, (_, key) => (key in context ? context[key] : ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTimeAnchors(text) {
  if (!text) return [];
  const anchors = [];
  const seen = new Set();
  const timeRegex = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(AM|PM)?\b/gi;
  const shortRegex = /\b(1[0-2]|0?[1-9])\s*(AM|PM)\b/gi;
  const addAnchor = (match) => {
    const label = match.trim();
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const minutes = timeLabelToMinutes(label);
    anchors.push({ label, minutes });
  };
  let match;
  while ((match = timeRegex.exec(text))) {
    addAnchor(match[0]);
  }
  while ((match = shortRegex.exec(text))) {
    addAnchor(match[0]);
  }
  return anchors;
}

function timeLabelToMinutes(label) {
  if (!label) return null;
  const match = label.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(AM|PM)?\b/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (meridiem) {
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (meridiem === "PM" && hours < 12) hours += 12;
  }
  return hours * 60 + minutes;
}

function uniqueByKey(list, keyFn) {
  const seen = new Set();
  return list.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSpeakerNameForEvent(event) {
  if (!event) return null;
  if (event.type === "detective_message") {
    return t("skillsSpeakerDetective");
  }
  if (event.type === "character_response") {
    const characterId = Array.isArray(event.visibility)
      ? event.visibility.find((id) => id !== "detective")
      : null;
    const character = appState.characters.find((item) => item.id === characterId);
    return character?.name || t("skillsSpeakerCharacter");
  }
  return t("skillsSpeakerUnknown");
}

function buildSkillsContext(board) {
  const activeName = appState.characters.find((c) => c.id === appState.activeCharacterId)?.name;
  const caseTime = appState.publicState?.case_time || t("skillsPlaceholderTime");
  const location = appState.publicState?.case_location || t("skillsPlaceholderLocation");
  const victim = appState.publicState?.victim_name || t("skillsPlaceholderVictim");
  const timeWindow = board.timelineGaps[0]
    ? `${board.timelineGaps[0].start}-${board.timelineGaps[0].end}`
    : appState.publicState?.case_time || t("skillsPlaceholderTime");
  return {
    name: activeName || t("skillsPlaceholderName"),
    caseTime,
    location,
    victim,
    timeWindow
  };
}

function buildBoardState() {
  const publicState = appState.publicState || {};
  const events = Array.isArray(appState.clientState?.events) ? appState.clientState.events : [];
  const evidence = Array.isArray(publicState.discovered_evidence) ? publicState.discovered_evidence : [];
  const accusations = Array.isArray(publicState.public_accusations) ? publicState.public_accusations : [];
  const tensions = Array.isArray(publicState.tensions) ? publicState.tensions : [];
  const names = appState.characters.map((character) => character.name);

  const anchors = [];
  const anchorKeys = new Set();
  const addAnchor = (label, source, speaker) => {
    if (!label) return;
    const key = `${label}`.toLowerCase();
    if (anchorKeys.has(key)) return;
    anchorKeys.add(key);
    anchors.push({
      label,
      source,
      speaker,
      minutes: timeLabelToMinutes(label)
    });
  };

  if (publicState.case_time) {
    addAnchor(publicState.case_time, t("skillsSourceCaseFile"), t("skillsSpeakerCaseFile"));
  }

  events.forEach((event) => {
    const speaker = getSpeakerNameForEvent(event);
    extractTimeAnchors(event.content).forEach((anchor) => {
      addAnchor(anchor.label, t("skillsSourceConversation"), speaker);
    });
  });

  const anchorsSorted = anchors
    .slice()
    .sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));

  const gaps = [];
  for (let i = 1; i < anchorsSorted.length; i += 1) {
    const prev = anchorsSorted[i - 1];
    const current = anchorsSorted[i];
    if (prev.minutes == null || current.minutes == null) continue;
    const diff = current.minutes - prev.minutes;
    if (diff >= 15) {
      gaps.push({
        label: t("skillsTimelineGapLabel", { start: prev.label, end: current.label }),
        start: prev.label,
        end: current.label,
        minutes: diff
      });
    }
  }

  const relationshipLinks = [];
  const accusationSeparator = t("skillsAccusationSeparator");
  const accusationPattern = new RegExp(
    `^(.+?)\\s+${escapeRegExp(accusationSeparator)}\\s+(.+)$`,
    "i"
  );
  accusations.forEach((accusation) => {
    const match = accusation.match(accusationPattern);
    if (!match) return;
    relationshipLinks.push({
      from: match[1].trim(),
      to: match[2].trim(),
      type: t("relationshipTypeAccusation"),
      status: t("relationshipStatusClaimed")
    });
  });

  events.forEach((event) => {
    if (!event.content) return;
    const mentions = names.filter((name) => event.content.includes(name));
    if (mentions.length < 2) return;
    for (let i = 0; i < mentions.length - 1; i += 1) {
      for (let j = i + 1; j < mentions.length; j += 1) {
        relationshipLinks.push({
          from: mentions[i],
          to: mentions[j],
          type: t("relationshipTypeAssociation"),
          status: t("relationshipStatusInferred")
        });
      }
    }
  });

  const relationships = uniqueByKey(relationshipLinks, (link) => `${link.from}|${link.to}|${link.type}`);

  const conflictSignals = [];
  const conflictRegex = /(conflict|contradict|inconsistent|disagree|doesn\'t match)/i;
  tensions.forEach((item) => {
    if (conflictRegex.test(item)) {
      conflictSignals.push(item);
    }
  });
  events.forEach((event) => {
    if (conflictRegex.test(event.content || "")) {
      conflictSignals.push(event.content);
    }
  });
  const contradictions = uniqueByKey(
    conflictSignals.map((text) => ({ text })),
    (item) => item.text
  );

  const alibiRegex = /(alibi|i was|i\'m at)/i;
  const motiveRegex = /(motive|moved by|because|owed|debt|jealous|fear|wanted)/i;
  const sensoryRegex = /(saw|heard|smell|noticed|sensed)/i;

  const alibiClaims = events.filter((event) => alibiRegex.test(event.content || "")).length;
  const motiveSignals = events.filter((event) => motiveRegex.test(event.content || "")).length;
  const sensoryPrompts = events.filter((event) => sensoryRegex.test(event.content || "")).length;

  return {
    evidence,
    accusations,
    tensions,
    anchors: anchorsSorted,
    timelineGaps: gaps,
    relationships,
    contradictions,
    metrics: {
      evidenceCount: evidence.length,
      relationshipLinks: relationships.length,
      timelineAnchors: anchorsSorted.length,
      timelineGaps: gaps.length,
      contradictions: contradictions.length,
      alibiClaims,
      motiveSignals,
      sensoryPrompts
    }
  };
}

function appendMessage(text, type) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
  chatLogEl.appendChild(messageEl);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function loadWatsonLog() {
  const raw = localStorage.getItem("watsonLog");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeWatsonLog() {
  localStorage.setItem("watsonLog", JSON.stringify(appState.watsonLog));
}

function appendWatsonMessage(text, type) {
  appState.watsonLog.push({ text, type });
  storeWatsonLog();
  appendMessage(text, type);
}

function buildCaseBriefingText() {
  if (!appState.publicState) return "";
  const time = appState.publicState.case_time || "-";
  const location = appState.publicState.case_location || "-";
  const briefing = appState.publicState.case_briefing || "";
  const lines = [
    I18N.t(appState.language, "caseBriefingTitle"),
    I18N.t(appState.language, "caseBriefingTime", { time }),
    I18N.t(appState.language, "caseBriefingLocation", { location }),
    "",
    briefing
  ];
  return lines.filter(Boolean).join("\n");
}

function appendCaseBriefing({ force = false } = {}) {
  if (!appState.publicState) return;
  if (!force && chatLogEl.childElementCount > 0) return;
  const text = buildCaseBriefingText();
  if (!text) return;
  appendMessage(text, "system");
}

function renderCaseHeader() {
  const titleEl = document.querySelector("[data-i18n=\"caseTitle\"]");
  const subtitleEl = document.querySelector("[data-i18n=\"caseSubtitle\"]");
  const title = appState.publicState?.case_title || I18N.t(appState.language, "caseTitle");
  const subtitle = appState.publicState?.case_subtitle || I18N.t(appState.language, "caseSubtitle");
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (caseHeadlineEl) {
    caseHeadlineEl.textContent = appState.publicState?.case_headline || "";
  }
  document.title = title;
}

function renderCaseChatLog({ forceBriefing = false } = {}) {
  const events = appState.clientState?.events || [];
  chatLogEl.innerHTML = "";
  appendCaseBriefing({ force: forceBriefing });
  if (!Array.isArray(events) || events.length === 0) return;
  events.forEach((event) => {
    if (!event || typeof event.content !== "string") return;
    if (event.type === "detective_message") {
      appendMessage(event.content, "detective");
      return;
    }
    if (event.type === "character_response") {
      appendMessage(event.content, "character");
    }
  });
}

function renderWatsonChatLog() {
  chatLogEl.innerHTML = "";
  if (!Array.isArray(appState.watsonLog) || appState.watsonLog.length === 0) {
    appendMessage(t("watsonChatIntro"), "system");
    return;
  }
  appState.watsonLog.forEach((entry) => {
    appendMessage(entry.text, entry.type);
  });
}

function renderChatLog({ forceBriefing = false } = {}) {
  if (appState.chatMode === "watson") {
    renderWatsonChatLog();
  } else {
    renderCaseChatLog({ forceBriefing });
  }
}

function renderCharacters() {
  characterListEl.innerHTML = "";
  appState.characters.forEach((character) => {
    const card = document.createElement("div");
    card.className = "character-card";
    if (character.id === appState.activeCharacterId) {
      card.classList.add("active");
    }

    if (character.portrait) {
      const portrait = document.createElement("img");
      portrait.className = "character-avatar";
      portrait.src = character.portrait;
      portrait.alt = character.name;
      portrait.loading = "lazy";
      portrait.addEventListener("error", () => {
        portrait.remove();
        card.classList.add("no-avatar");
      });
      card.appendChild(portrait);
    }

    const textWrap = document.createElement("div");
    textWrap.className = "character-meta";

    const name = document.createElement("div");
    name.className = "character-name";
    name.textContent = character.name;

    const role = document.createElement("div");
    role.className = "character-role";
    role.textContent = character.role;

    textWrap.appendChild(name);
    textWrap.appendChild(role);
    card.appendChild(textWrap);
    card.addEventListener("click", () => {
      appState.activeCharacterId = character.id;
      storeActiveCharacter(appState.caseId, character.id);
      setChatMode("case");
      renderCharacters();
      appendMessage(
        I18N.t(appState.language, "nowSpeaking", { name: character.name }),
        "detective"
      );
    });

    characterListEl.appendChild(card);
  });

  if (watsonCard) {
    watsonCard.classList.toggle("active", appState.chatMode === "watson");
  }
  renderSkillsUI();
}

function renderPublicState() {
  if (!appState.publicState) return;
  timeElapsedEl.textContent = `${appState.publicState.time_minutes} ${I18N.t(
    appState.language,
    "minutes"
  )}`;

  accusationsListEl.innerHTML = "";
  appState.publicState.public_accusations.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    accusationsListEl.appendChild(li);
  });

  tensionsListEl.innerHTML = "";
  appState.publicState.tensions.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    tensionsListEl.appendChild(li);
  });

  renderSkillsUI();
}

function setSkillsFeatureEnabled(enabled) {
  appState.skillsEnabled = Boolean(enabled);
  localStorage.setItem("skillsEnabled", appState.skillsEnabled);
  if (skillsDrawerTab) {
    skillsDrawerTab.hidden = !appState.skillsEnabled;
  }
  if (skillsDrawer) {
    skillsDrawer.hidden = !appState.skillsEnabled;
  }
  if (watsonCard) {
    watsonCard.hidden = !appState.skillsEnabled;
  }
  if (!appState.skillsEnabled) {
    closeSkillsDrawer();
    if (chatTabWatson) chatTabWatson.hidden = true;
    if (appState.chatMode === "watson") {
      setChatMode("case");
    }
  } else if (!appState.skillsDrawerOpen) {
    closeSkillsDrawer({ persist: false });
    if (chatTabWatson) chatTabWatson.hidden = false;
    const board = buildBoardState();
    const focusSkill = selectWatsonSkill(board.metrics);
    openSkillsDrawer({ focusSkillId: focusSkill?.id });
    flashDrawerTab();
  }
  renderSkillsUI();
}

function openSkillsDrawer({ focusSkillId } = {}) {
  if (!skillsDrawer || !appState.skillsEnabled) return;
  appState.skillsDrawerOpen = true;
  localStorage.setItem("skillsDrawerOpen", "true");
  skillsDrawer.classList.add("open");
  skillsDrawer.setAttribute("aria-hidden", "false");
  if (skillsDrawerTab) {
    skillsDrawerTab.setAttribute("aria-expanded", "true");
  }
  if (focusSkillId) {
    appState.skillsView = "all";
    appState.expandedSkillId = focusSkillId;
    renderSkillsUI();
  }
  if (focusSkillId) {
    requestAnimationFrame(() => {
      const target = skillsDrawer.querySelector(`[data-skill-id="${focusSkillId}"]`);
      if (!target) return;
      skillsDrawer.querySelectorAll(".skill-card.highlight").forEach((card) => {
        card.classList.remove("highlight");
      });
      target.classList.add("highlight");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function closeSkillsDrawer({ persist = true } = {}) {
  if (!skillsDrawer) return;
  appState.skillsDrawerOpen = false;
  if (persist) {
    localStorage.setItem("skillsDrawerOpen", "false");
  }
  skillsDrawer.classList.remove("open");
  skillsDrawer.setAttribute("aria-hidden", "true");
  if (skillsDrawerTab) {
    skillsDrawerTab.setAttribute("aria-expanded", "false");
  }
  skillsDrawer.querySelectorAll(".skill-card.highlight").forEach((card) => {
    card.classList.remove("highlight");
  });
}

function toggleSkillsDrawer() {
  if (!appState.skillsEnabled) return;
  if (appState.skillsDrawerOpen) {
    closeSkillsDrawer();
  } else {
    openSkillsDrawer();
  }
}

let drawerAttentionTimer = null;

function flashDrawerTab() {
  if (!skillsDrawerTab) return;
  skillsDrawerTab.classList.add("attention");
  if (drawerAttentionTimer) {
    window.clearTimeout(drawerAttentionTimer);
  }
  drawerAttentionTimer = window.setTimeout(() => {
    skillsDrawerTab.classList.remove("attention");
  }, 6000);
}

function setChatMode(mode) {
  const nextMode = mode === "watson" ? "watson" : "case";
  appState.chatMode = nextMode;
  if (chatTabCase) {
    chatTabCase.classList.toggle("active", nextMode === "case");
  }
  if (chatTabWatson) {
    chatTabWatson.classList.toggle("active", nextMode === "watson");
  }
  messageInput.placeholder = t(nextMode === "watson" ? "watsonPlaceholder" : "placeholder");
  renderChatLog({ forceBriefing: true });
}

function getSkillPriority(skill, metrics) {
  let priority = skill.baseOrder + 10;
  if (!skill.unlock(metrics)) {
    priority += 20;
  }
  if (skill.id === "build-timeline" && metrics.timelineAnchors < 2) {
    priority = 0;
  }
  if (skill.id === "relationship-mapping" && metrics.relationshipLinks === 0) {
    priority = Math.min(priority, 1);
  }
  if (skill.id === "contradiction-press" && metrics.contradictions > 0) {
    priority = Math.min(priority, 2);
  }
  if (skill.id === "alibi-lock" && metrics.alibiClaims > 0) {
    priority = Math.min(priority, 3);
  }
  return priority;
}

function getSkillBadges(skill, metrics) {
  const badges = [];
  if (skill.id === "build-timeline") {
    badges.push({
      text: `${t("skillsBadgeAnchors")}: ${metrics.timelineAnchors}`,
      tone: metrics.timelineAnchors < 2 ? "alert" : "neutral"
    });
    if (metrics.timelineGaps > 0) {
      badges.push({ text: t("skillsBadgeGap"), tone: "alert" });
    }
  }
  if (skill.id === "relationship-mapping" && metrics.relationshipLinks === 0) {
    badges.push({ text: t("skillsBadgeNew"), tone: "good" });
  }
  if (skill.id === "alibi-lock" && metrics.relationshipLinks === 0 && metrics.alibiClaims > 0) {
    badges.push({ text: t("skillsBadgeCorroboratorMissing"), tone: "alert" });
  }
  if (skill.id === "strategic-evidence") {
    badges.push({
      text: `${t("skillsBadgeEvidence")}: ${metrics.evidenceCount}`,
      tone: metrics.evidenceCount < 2 ? "alert" : "neutral"
    });
  }
  if (skill.id === "contradiction-press" && metrics.contradictions > 0) {
    badges.push({
      text: `${t("skillsBadgeConflicts")}: ${metrics.contradictions}`,
      tone: "alert"
    });
  }
  return badges;
}

function renderSkillsBoard(board) {
  if (!relationshipListEl) return;

  relationshipCountEl.textContent = board.relationships.length;
  relationshipListEl.innerHTML = "";
  if (board.relationships.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("skillsEmptyRelationships");
    relationshipListEl.appendChild(empty);
  } else {
    board.relationships.forEach((link) => {
      const li = document.createElement("li");
      li.textContent = `${link.from} <-> ${link.to} - ${link.type} (${link.status})`;
      relationshipListEl.appendChild(li);
    });
  }

  timelineCountEl.textContent = board.anchors.length;
  timelineListEl.innerHTML = "";
  if (board.anchors.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("skillsEmptyTimeline");
    timelineListEl.appendChild(empty);
  } else {
    board.anchors.forEach((anchor) => {
      const li = document.createElement("li");
      const source = anchor.source ? ` - ${anchor.source}` : "";
      const speaker = anchor.speaker ? ` - ${anchor.speaker}` : "";
      li.textContent = `${anchor.label}${speaker}${source}`;
      timelineListEl.appendChild(li);
    });
  }
  board.timelineGaps.forEach((gap) => {
    const li = document.createElement("li");
    li.classList.add("gap");
    li.textContent = gap.label;
    timelineListEl.appendChild(li);
  });

  evidenceCountEl.textContent = board.evidence.length;
  evidenceLockerListEl.innerHTML = "";
  if (board.evidence.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("skillsEmptyEvidence");
    evidenceLockerListEl.appendChild(empty);
  } else {
    board.evidence.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      evidenceLockerListEl.appendChild(li);
    });
  }

  contradictionCountEl.textContent = board.contradictions.length;
  contradictionListEl.innerHTML = "";
  if (board.contradictions.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("skillsEmptyContradictions");
    contradictionListEl.appendChild(empty);
  } else {
    board.contradictions.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.text;
      contradictionListEl.appendChild(li);
    });
  }
}

function renderSkillsCards(metrics, context) {
  if (!skillsCardsEl) return;
  skillsCardsEl.innerHTML = "";
  skillsCardsEl.classList.toggle("stack", appState.skillsView === "stack");
  const ordered = SKILLS.slice().sort(
    (a, b) => getSkillPriority(a, metrics) - getSkillPriority(b, metrics)
  );
  const visibleSkills =
    appState.skillsView === "all" ? ordered : ordered.slice(0, 4);

  visibleSkills.forEach((skill) => {
    const unlocked = skill.unlock(metrics);
    const card = document.createElement("article");
    card.className = "skill-card";
    card.dataset.skillId = skill.id;
    if (appState.expandedSkillId === skill.id) {
      card.classList.add("expanded");
    }
    if (!unlocked) {
      card.classList.add("locked");
    }

    const header = document.createElement("div");
    header.className = "skill-header";

    const title = document.createElement("div");
    title.className = "skill-title";
    title.textContent = t(skill.nameKey);

    const badgesEl = document.createElement("div");
    badgesEl.className = "skill-badges";
    if (!unlocked) {
      const lockedBadge = document.createElement("span");
      lockedBadge.className = "skill-badge alert";
      lockedBadge.textContent = t("skillsLocked");
      badgesEl.appendChild(lockedBadge);
    }
    getSkillBadges(skill, metrics).forEach((badge) => {
      const badgeEl = document.createElement("span");
      const toneClass = badge.tone === "alert" ? " alert" : badge.tone === "good" ? " good" : "";
      badgeEl.className = `skill-badge${toneClass}`;
      badgeEl.textContent = badge.text;
      badgesEl.appendChild(badgeEl);
    });

    header.appendChild(title);
    header.appendChild(badgesEl);
    card.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "skill-meta";
    meta.textContent = `${t(SKILL_PHASE_LABELS[skill.phase])} - ${t("skillsBestForLabel")}: ${t(
      SKILL_BEST_FOR_LABELS[skill.bestFor]
    )} - ${t("skillsOutputLabel")}: ${t(SKILL_OUTPUT_LABELS[skill.output])}`;
    card.appendChild(meta);

    const summary = document.createElement("div");
    summary.className = "skill-summary";
    summary.textContent = t(skill.whatKey);
    card.appendChild(summary);

    const body = document.createElement("div");
    body.className = "skill-body";

    const quip = document.createElement("div");
    quip.className = "skill-quip";
    quip.textContent = t(skill.quipKey);
    body.appendChild(quip);

    const whySection = document.createElement("div");
    whySection.className = "skill-section";
    const whyTitle = document.createElement("h5");
    whyTitle.textContent = t("skillsWhy");
    const whyBody = document.createElement("p");
    whyBody.textContent = t(skill.whyKey);
    whySection.appendChild(whyTitle);
    whySection.appendChild(whyBody);
    body.appendChild(whySection);

    const stepsSection = document.createElement("div");
    stepsSection.className = "skill-section";
    const stepsTitle = document.createElement("h5");
    stepsTitle.textContent = t("skillsSteps");
    const stepsList = document.createElement("ol");
    stepsList.className = "skill-steps";
    skill.stepsKeys.forEach((key) => {
      const li = document.createElement("li");
      li.textContent = t(key);
      stepsList.appendChild(li);
    });
    stepsSection.appendChild(stepsTitle);
    stepsSection.appendChild(stepsList);
    body.appendChild(stepsSection);

    const promptsSection = document.createElement("div");
    promptsSection.className = "skill-section";
    const promptsTitle = document.createElement("h5");
    promptsTitle.textContent = t("skillsPrompts");
    const promptsWrap = document.createElement("div");
    promptsWrap.className = "prompt-chips";
    skill.promptKeys.forEach((key) => {
      const button = document.createElement("button");
      button.className = "prompt-chip";
      button.type = "button";
      button.disabled = !unlocked;
      button.dataset.prompt = formatPrompt(t(key), context);
      button.textContent = formatPrompt(t(key), context);
      promptsWrap.appendChild(button);
    });
    promptsSection.appendChild(promptsTitle);
    promptsSection.appendChild(promptsWrap);
    body.appendChild(promptsSection);

    const criteriaSection = document.createElement("div");
    criteriaSection.className = "skill-section";
    const criteriaTitle = document.createElement("h5");
    criteriaTitle.textContent = t("skillsCriteria");
    const criteriaList = document.createElement("div");
    criteriaList.className = "criteria-list";
    skill.criteria.forEach((criteria) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = true;
      checkbox.checked = criteria.check(metrics);
      const span = document.createElement("span");
      span.textContent = t(criteria.key);
      label.appendChild(checkbox);
      label.appendChild(span);
      criteriaList.appendChild(label);
    });
    criteriaSection.appendChild(criteriaTitle);
    criteriaSection.appendChild(criteriaList);
    body.appendChild(criteriaSection);

    const riskSection = document.createElement("div");
    riskSection.className = "skill-section";
    const riskTitle = document.createElement("h5");
    riskTitle.textContent = t("skillsRisk");
    const riskRow = document.createElement("div");
    riskRow.className = "risk-row";
    skill.risks.forEach((riskKey) => {
      const span = document.createElement("span");
      span.textContent = t(riskKey);
      riskRow.appendChild(span);
    });
    riskSection.appendChild(riskTitle);
    riskSection.appendChild(riskRow);
    body.appendChild(riskSection);

    const anchorNote = document.createElement("div");
    anchorNote.className = "skill-meta";
    anchorNote.textContent = `${t("skillsAnchor")}: ${t(skill.anchorKey)}`;
    body.appendChild(anchorNote);

    if (!unlocked) {
      const hint = document.createElement("div");
      hint.className = "skill-meta";
      hint.textContent = t("skillsLockedHint");
      body.appendChild(hint);
    }

    card.appendChild(body);
    skillsCardsEl.appendChild(card);
  });
}

function toggleSkillExpansion(skillId) {
  if (!skillId) return;
  if (appState.expandedSkillId === skillId) {
    appState.expandedSkillId = null;
  } else {
    appState.expandedSkillId = skillId;
  }
  renderSkillsUI();
}

function toggleSkillsView() {
  appState.skillsView = appState.skillsView === "stack" ? "all" : "stack";
  if (appState.skillsView === "stack") {
    appState.expandedSkillId = null;
  }
  renderSkillsUI();
}

function selectWatsonSkill(metrics) {
  if (appState.watsonFrequency === "off") return null;
  const unlocked = SKILLS.filter((skill) => skill.unlock(metrics));
  if (unlocked.length === 0) return null;
  const ordered = unlocked.slice().sort(
    (a, b) => getSkillPriority(a, metrics) - getSkillPriority(b, metrics)
  );

  let pool = ordered;
  if (appState.watsonFrequency === "rare") {
    pool = ordered.filter((skill) => getSkillPriority(skill, metrics) <= 3);
  } else if (appState.watsonFrequency === "normal") {
    const focused = ordered.filter((skill) => getSkillPriority(skill, metrics) <= 4);
    pool = focused.length ? focused : ordered;
  }

  if (pool.length === 0) return null;

  if (appState.watsonQuality < 40) {
    return pool[pool.length - 1];
  }
  if (appState.watsonQuality < 70) {
    return pool[Math.floor(pool.length / 2)];
  }
  return pool[0];
}

function renderWatsonSuggestion(metrics) {
  if (!watsonSuggestionEl || !watsonChipBtn || !watsonEmptyEl) return;
  if (appState.watsonFrequency === "off") {
    watsonSuggestionEl.hidden = true;
    watsonEmptyEl.hidden = true;
    return;
  }
  const skill = selectWatsonSkill(metrics);
  if (!skill) {
    watsonSuggestionEl.hidden = true;
    watsonEmptyEl.hidden = false;
    return;
  }
  const suggestionText =
    appState.watsonStyle === "hypothesis"
      ? t("watsonTemplateHypothesis", { suggestion: t(skill.suggestionKey) })
      : t("watsonTemplateQuestion", { skill: t(skill.nameKey) });
  watsonChipBtn.textContent = suggestionText;
  watsonChipBtn.dataset.skillId = skill.id;
  watsonSuggestionEl.hidden = false;
  watsonEmptyEl.hidden = true;
}

function renderSkillsUI() {
  if (!appState.skillsEnabled) return;
  const board = buildBoardState();
  const context = buildSkillsContext(board);
  if (skillsViewToggle) {
    const viewKey = appState.skillsView === "stack" ? "skillsViewAll" : "skillsViewStack";
    skillsViewToggle.textContent = t(viewKey);
  }
  renderSkillsBoard(board);
  renderSkillsCards(board.metrics, context);
  renderWatsonSuggestion(board.metrics);
}

function buildWatsonTools(context) {
  return SKILLS.map((skill) => ({
    id: skill.id,
    name: t(skill.nameKey),
    output: t(SKILL_OUTPUT_LABELS[skill.output]),
    summary: t(skill.whatKey),
    prompt: formatPrompt(t(skill.promptKeys[0]), context)
  }));
}

function applyTranslations() {
  const lang = appState.language;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = I18N.t(lang, key);
  });
  messageInput.placeholder = I18N.t(
    lang,
    appState.chatMode === "watson" ? "watsonPlaceholder" : "placeholder"
  );
  renderSkillsUI();
}

function renderSolutionResult(result) {
  if (!result) {
    solutionResultEl.textContent = "";
    return;
  }

  const lines = [];
  const verdictKeyMap = {
    correct: "solutionVerdictCorrect",
    partially_correct: "solutionVerdictPartial",
    incorrect: "solutionVerdictIncorrect",
    insufficient: "solutionVerdictInsufficient"
  };
  const verdictKey = verdictKeyMap[result.verdict] || "solutionVerdictInsufficient";
  lines.push(I18N.t(appState.language, verdictKey));

  if (Array.isArray(result.missing_characters) && result.missing_characters.length > 0) {
    lines.push(`${I18N.t(appState.language, "solutionMissingCharacters")}:`);
    result.missing_characters.forEach((item) => lines.push(`- ${item}`));
  }

  if (Array.isArray(result.inconsistencies) && result.inconsistencies.length > 0) {
    lines.push(`${I18N.t(appState.language, "solutionInconsistencies")}:`);
    result.inconsistencies.forEach((item) => lines.push(`- ${item}`));
  }

  if (Array.isArray(result.advice) && result.advice.length > 0) {
    lines.push(`${I18N.t(appState.language, "solutionAdvice")}:`);
    result.advice.forEach((item) => lines.push(`- ${item}`));
  }

  if (result.reveal_requested && result.reveal) {
    lines.push(I18N.t(appState.language, "solutionRevealTitle"));
    lines.push(I18N.t(appState.language, "solutionRevealKiller", { name: result.reveal.killer_name }));
    lines.push(I18N.t(appState.language, "solutionRevealMethod", { method: result.reveal.method }));
    lines.push(I18N.t(appState.language, "solutionRevealMotive", { motive: result.reveal.motive }));
    if (Array.isArray(result.reveal.timeline) && result.reveal.timeline.length > 0) {
      lines.push(
        I18N.t(appState.language, "solutionRevealTimeline", {
          timeline: result.reveal.timeline.join(" | ")
        })
      );
    }
    if (Array.isArray(result.reveal.planted_evidence) && result.reveal.planted_evidence.length > 0) {
      lines.push(
        I18N.t(appState.language, "solutionRevealEvidence", {
          evidence: result.reveal.planted_evidence.join(", ")
        })
      );
    }
  }

  solutionResultEl.textContent = lines.join("\n");
}

async function loadState(sessionId) {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId,
      language: appState.language,
      caseId: appState.caseId,
      client_state: appState.clientState
    })
  });
  const data = await res.json();
  applyState(data, { rehydrateChat: true });
}

function applyState(data, { clearChat = false, rehydrateChat = false } = {}) {
  appState.sessionId = data.sessionId;
  appState.caseId = data.case_id || appState.caseId;
  appState.caseList = Array.isArray(data.case_list) ? data.case_list : appState.caseList;
  appState.clientState = data.client_state || appState.clientState;
  storeClientState(appState.clientState);
  appState.characters = data.characters || [];
  appState.publicState = data.public_state || null;
  const characterIds = new Set(appState.characters.map((character) => character.id));
  let desiredId = appState.activeCharacterId;
  if (!desiredId || !characterIds.has(desiredId)) {
    const storedId = getStoredActiveCharacter(appState.caseId);
    desiredId = storedId && characterIds.has(storedId) ? storedId : appState.characters[0]?.id || null;
  }
  appState.activeCharacterId = desiredId;
  if (appState.caseId && desiredId) {
    storeActiveCharacter(appState.caseId, desiredId);
  }
  if (clearChat) {
    chatLogEl.innerHTML = "";
  }
  renderCharacters();
  renderPublicState();
  renderCaseHeader();
  if (rehydrateChat) {
    renderChatLog({ forceBriefing: true });
  } else if (clearChat) {
    if (appState.chatMode === "watson") {
      renderChatLog();
    } else {
      appendCaseBriefing({ force: true });
    }
  }
  renderCaseSelect();
}

function renderCaseSelect() {
  if (!caseSelect) return;
  caseSelect.innerHTML = "";
  appState.caseList.forEach((caseItem) => {
    const option = document.createElement("option");
    const subtitle = caseItem.subtitle ? ` - ${caseItem.subtitle}` : "";
    option.value = caseItem.id;
    option.textContent = `${caseItem.title}${subtitle}`;
    caseSelect.appendChild(option);
  });
  if (appState.caseId) {
    caseSelect.value = appState.caseId;
  }
}


chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  if (appState.chatMode === "watson") {
    appendWatsonMessage(message, "watson-user");
    messageInput.value = "";
    const board = buildBoardState();
    const context = buildSkillsContext(board);
    try {
      const history = appState.watsonLog.slice(0, -1).slice(-12);
      const res = await fetch("/api/watson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: appState.sessionId,
          caseId: appState.caseId,
          language: appState.language,
          message,
          watson_settings: {
            frequency: appState.watsonFrequency,
            style: appState.watsonStyle,
            quality: appState.watsonQuality
          },
          watson_history: history,
          board_state: {
            anchors: board.anchors.slice(0, 8),
            timeline_gaps: board.timelineGaps.slice(0, 4),
            evidence: board.evidence.slice(0, 8),
            contradictions: board.contradictions.slice(0, 6),
            relationships: board.relationships.slice(0, 6),
            metrics: board.metrics
          },
          watson_tools: buildWatsonTools(context),
          client_state: appState.clientState
        })
      });
      const data = await res.json();
      if (!res.ok) {
        appendWatsonMessage(data.error || t("watsonChatError"), "watson");
        return;
      }
      appendWatsonMessage(data.dialogue || t("watsonChatNoSuggestion"), "watson");
    } catch (error) {
      appendWatsonMessage(t("watsonChatError"), "watson");
    }
    return;
  }
  if (!appState.activeCharacterId) {
    appendMessage(I18N.t(appState.language, "selectCharacter"), "detective");
    return;
  }

  appendMessage(message, "detective");
  messageInput.value = "";

  const res = await fetch("/api/turn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      characterId: appState.activeCharacterId,
      message,
      language: appState.language,
      modelMode: appState.modelMode,
      caseId: appState.caseId,
      client_state: appState.clientState
    })
  });

  const data = await res.json();
  if (!res.ok) {
    appendMessage(data.error || I18N.t(appState.language, "errorGeneric"), "character");
    return;
  }

  appendMessage(data.dialogue, "character");
  appState.publicState = data.public_state;
  if (data.client_state) {
    appState.clientState = data.client_state;
    storeClientState(appState.clientState);
  }
  renderPublicState();
  if (data.model_used) {
    const suffix = data.model_mock && data.model_selected
      ? ` (mock -> ${data.model_selected})`
      : "";
    modelUsedValue.textContent = `${data.model_used}${suffix}`;
  }
});

resetBtn.addEventListener("click", async () => {
  const res = await fetch("/api/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      language: appState.language,
      caseId: appState.caseId,
      client_state: appState.clientState
    })
  });
  const data = await res.json();
  applyState(data, { clearChat: true });
  appendMessage(I18N.t(appState.language, "caseReset"), "detective");
  modelUsedValue.textContent = "-";
  renderSolutionResult(null);
  solutionKillerInput.value = "";
  solutionMethodInput.value = "";
  solutionMotiveInput.value = "";
  solutionTimelineInput.value = "";
  solutionCharacterNotesInput.value = "";
  revealToggle.checked = false;
});

const storedLang = localStorage.getItem("language");
const storedModelMode = localStorage.getItem("modelMode");
const browserLang = navigator.language || "en";
appState.language = I18N.normalizeLanguage(storedLang || browserLang);
appState.modelMode = storedModelMode || "auto";
appState.skillsEnabled = localStorage.getItem("skillsEnabled") === "true";
appState.skillsDrawerOpen = localStorage.getItem("skillsDrawerOpen") === "true";
appState.watsonFrequency = localStorage.getItem("watsonFrequency") || "off";
appState.watsonStyle = localStorage.getItem("watsonStyle") || "questions";
appState.watsonQuality = Number(localStorage.getItem("watsonQuality")) || 70;
appState.watsonLog = loadWatsonLog();
languageSelect.value = appState.language;
modelModeSelect.value = appState.modelMode;
if (skillsToggle) skillsToggle.checked = appState.skillsEnabled;
if (watsonFrequencySelect) watsonFrequencySelect.value = appState.watsonFrequency;
if (watsonStyleSelect) watsonStyleSelect.value = appState.watsonStyle;
if (watsonQualityRange) watsonQualityRange.value = String(appState.watsonQuality);
applyTranslations();
setSkillsFeatureEnabled(appState.skillsEnabled);
if (appState.skillsEnabled && appState.skillsDrawerOpen) {
  openSkillsDrawer();
}
setChatMode(appState.chatMode);
appState.clientState = loadStoredClientState();
if (appState.clientState?.case_id) {
  appState.caseId = appState.clientState.case_id;
}
loadState();

languageSelect.addEventListener("change", () => {
  appState.language = I18N.normalizeLanguage(languageSelect.value);
  localStorage.setItem("language", appState.language);
  applyTranslations();
  loadState(appState.sessionId);
  renderSolutionResult(null);
});

caseSelect.addEventListener("change", async () => {
  const nextCaseId = caseSelect.value;
  if (!nextCaseId || nextCaseId === appState.caseId) return;
  appState.caseId = nextCaseId;
  const res = await fetch("/api/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      language: appState.language,
      caseId: nextCaseId,
      client_state: appState.clientState
    })
  });
  const data = await res.json();
  applyState(data, { clearChat: true });
  appendMessage(
    I18N.t(appState.language, "caseSwitched", { title: appState.publicState?.case_title || nextCaseId }),
    "detective"
  );
  modelUsedValue.textContent = "-";
  renderSolutionResult(null);
  solutionKillerInput.value = "";
  solutionMethodInput.value = "";
  solutionMotiveInput.value = "";
  solutionTimelineInput.value = "";
  solutionCharacterNotesInput.value = "";
  revealToggle.checked = false;
});

checkSolutionBtn.addEventListener("click", async () => {
  if (!appState.caseId) return;
  const solution = {
    killer: solutionKillerInput.value.trim(),
    method: solutionMethodInput.value.trim(),
    motive: solutionMotiveInput.value.trim(),
    timeline: solutionTimelineInput.value.trim(),
    character_notes: solutionCharacterNotesInput.value.trim(),
    full_text: [
      solutionKillerInput.value.trim(),
      solutionMethodInput.value.trim(),
      solutionMotiveInput.value.trim(),
      solutionTimelineInput.value.trim(),
      solutionCharacterNotesInput.value.trim()
    ]
      .filter(Boolean)
      .join("\n")
  };

  solutionResultEl.textContent = I18N.t(appState.language, "solutionChecking");
  const res = await fetch("/api/solve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      language: appState.language,
      reveal: revealToggle.checked,
      solution,
      caseId: appState.caseId,
      client_state: appState.clientState
    })
  });

  const data = await res.json();
  if (!res.ok) {
    solutionResultEl.textContent = data.error || I18N.t(appState.language, "errorGeneric");
    return;
  }

  renderSolutionResult(data.result);
  if (data.client_state) {
    appState.clientState = data.client_state;
    storeClientState(appState.clientState);
  }
});

modelModeSelect.addEventListener("change", () => {
  appState.modelMode = modelModeSelect.value || "auto";
  localStorage.setItem("modelMode", appState.modelMode);
});

if (skillsToggle) {
  skillsToggle.addEventListener("change", () => {
    setSkillsFeatureEnabled(skillsToggle.checked);
  });
}

if (skillsDrawerTab) {
  skillsDrawerTab.addEventListener("click", () => {
    toggleSkillsDrawer();
  });
}

if (skillsCloseBtn) {
  skillsCloseBtn.addEventListener("click", () => {
    closeSkillsDrawer();
  });
}

if (skillsDrawer) {
  skillsDrawer.addEventListener("click", (event) => {
    const promptButton = event.target.closest(".prompt-chip");
    if (promptButton && promptButton.dataset.prompt) {
      messageInput.value = promptButton.dataset.prompt;
      messageInput.focus();
      return;
    }
    const skillTarget = event.target.closest("[data-skill-target]");
    if (skillTarget) {
      openSkillsDrawer({ focusSkillId: skillTarget.dataset.skillTarget });
    }
  });
}

if (skillsCardsEl) {
  skillsCardsEl.addEventListener("click", (event) => {
    if (event.target.closest(".prompt-chip")) return;
    const card = event.target.closest(".skill-card");
    if (!card || card.classList.contains("locked")) return;
    toggleSkillExpansion(card.dataset.skillId);
  });
}

if (skillsViewToggle) {
  skillsViewToggle.addEventListener("click", () => {
    toggleSkillsView();
  });
}

if (chatTabCase) {
  chatTabCase.addEventListener("click", () => {
    setChatMode("case");
  });
}

if (chatTabWatson) {
  chatTabWatson.addEventListener("click", () => {
    if (!appState.skillsEnabled) return;
    setChatMode("watson");
  });
}

if (watsonCard) {
  watsonCard.addEventListener("click", () => {
    if (!appState.skillsEnabled) return;
    setChatMode("watson");
  });
}

if (watsonChipBtn) {
  watsonChipBtn.addEventListener("click", () => {
    const skillId = watsonChipBtn.dataset.skillId;
    if (skillId) {
      openSkillsDrawer({ focusSkillId: skillId });
    }
  });
}

if (watsonFrequencySelect) {
  watsonFrequencySelect.addEventListener("change", () => {
    appState.watsonFrequency = watsonFrequencySelect.value;
    localStorage.setItem("watsonFrequency", appState.watsonFrequency);
    renderSkillsUI();
  });
}

if (watsonStyleSelect) {
  watsonStyleSelect.addEventListener("change", () => {
    appState.watsonStyle = watsonStyleSelect.value;
    localStorage.setItem("watsonStyle", appState.watsonStyle);
    renderSkillsUI();
  });
}

if (watsonQualityRange) {
  watsonQualityRange.addEventListener("input", () => {
    const value = Number(watsonQualityRange.value);
    appState.watsonQuality = Number.isNaN(value) ? 70 : value;
    localStorage.setItem("watsonQuality", String(appState.watsonQuality));
    renderSkillsUI();
  });
}
