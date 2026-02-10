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
const solutionNarrativeInput = document.getElementById("solutionNarrative");
const checkSolutionBtn = document.getElementById("checkSolutionBtn");
const revealSolutionBtn = document.getElementById("revealSolutionBtn");
const solutionResultEl = document.getElementById("solutionResult");
const caseHeadlineEl = document.getElementById("caseHeadline");
const openBriefingBtn = document.getElementById("openBriefingBtn");
const openNarrationBtn = document.getElementById("openNarrationBtn");
const chatTabCase = document.getElementById("chatTabCase");
const chatTabWatson = document.getElementById("chatTabWatson");
const watsonHintBtn = document.getElementById("watsonHintBtn");
const chatThreadTabs = document.getElementById("chatThreadTabs");
const chatThreadCharacterBtn = document.getElementById("chatThreadCharacterBtn");
const chatThreadCaseBtn = document.getElementById("chatThreadCaseBtn");
const watsonCard = document.getElementById("watsonCard");
const currentLocationValueEl = document.getElementById("currentLocationValue");
const locationSelectEl = document.getElementById("locationSelect");
const moveLocationBtn = document.getElementById("moveLocationBtn");
const inspectLocationBtn = document.getElementById("inspectLocationBtn");
const visitedLocationsListEl = document.getElementById("visitedLocationsList");
const locationContactsListEl = document.getElementById("locationContactsList");
const sceneImageEl = document.getElementById("sceneImage");
const sceneFallbackEl = document.getElementById("sceneFallback");
const sceneHotspotsEl = document.getElementById("sceneHotspots");
const sceneTransitionOverlayEl = document.getElementById("sceneTransitionOverlay");
const sceneMetaEl = document.getElementById("sceneMeta");
const mainGridEl = document.getElementById("mainGrid");
const mobileDockEl = document.getElementById("mobileDock");
const scenePinListEl = document.getElementById("scenePinList");
const observationListEl = document.getElementById("observationList");
const observationPromptListEl = document.getElementById("observationPromptList");
const analyzeToggle = document.getElementById("analyzeToggle");
const hapticsToggle = document.getElementById("hapticsToggle");
const soundToggle = document.getElementById("soundToggle");
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
const briefingModalEl = document.getElementById("briefingModal");
const briefingCloseBtn = document.getElementById("briefingCloseBtn");
const briefingFolderTab = document.getElementById("briefingFolderTab");
const briefingWatsonTab = document.getElementById("briefingWatsonTab");
const briefingFolderView = document.getElementById("briefingFolderView");
const briefingWatsonView = document.getElementById("briefingWatsonView");
const observationSheetEl = document.getElementById("observationSheet");
const observationSheetCloseBtn = document.getElementById("observationSheetCloseBtn");
const observationSheetTitleEl = document.getElementById("observationSheetTitle");
const observationSheetNoteEl = document.getElementById("observationSheetNote");
const observationSheetMetaEl = document.getElementById("observationSheetMeta");
const observationSheetObserveBtn = document.getElementById("observationSheetObserveBtn");
const observationSheetUsePromptBtn = document.getElementById("observationSheetUsePromptBtn");
const observationSheetJumpBtn = document.getElementById("observationSheetJumpBtn");
const observationSheetPromptListEl = document.getElementById("observationSheetPromptList");
const debugRouteEnabled = window.location.pathname === "/debug" || window.location.search.includes("debug=1");
if (debugRouteEnabled) {
  localStorage.setItem("debugOverlay", "true");
} else {
  localStorage.removeItem("debugOverlay");
}
const debugModeEnabled = debugRouteEnabled || localStorage.getItem("debugOverlay") === "true";
document.body.classList.toggle("debug-mode", debugModeEnabled);
document.querySelectorAll("[data-debug-only]").forEach((el) => {
  el.hidden = !debugModeEnabled;
});

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
  caseThreadMode: "character",
  watsonLog: [],
  skillsEnabled: false,
  skillsDrawerOpen: false,
  skillsView: "stack",
  expandedSkillId: null,
  watsonFrequency: "off",
  watsonStyle: "questions",
  watsonQuality: 70,
  briefingMode: "folder",
  reducedMotion: false,
  selectedHotspotId: null,
  observationSheetHotspotId: null,
  hapticsEnabled: false,
  soundEnabled: false,
  analyzeMode: false
};

let caseRequestEpoch = 0;
let stateLoadRequestId = 0;
let sceneTransitionPending = false;
let sceneTransitionShownAt = 0;
let sceneTransitionMinVisibleMs = 220;
let sceneTransitionClearTimer = null;
let uiAudioContext = null;
const chatScrollPositions = new Map();
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileLayoutQuery = window.matchMedia("(max-width: 980px)");
let mobilePanelScrollRaf = null;

function invalidateCaseRequests() {
  caseRequestEpoch += 1;
  stateLoadRequestId += 1;
}

function createCaseRequestContext() {
  return {
    caseId: appState.caseId || null,
    epoch: caseRequestEpoch
  };
}

function getResponseCaseId(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.case_id === "string" && data.case_id) return data.case_id;
  const clientCaseId = data.client_state?.case_id;
  if (typeof clientCaseId === "string" && clientCaseId) return clientCaseId;
  return null;
}

function shouldIgnoreCaseResponse(context, data = null) {
  if (!context) return false;
  if (context.epoch !== caseRequestEpoch) return true;
  if (context.caseId && appState.caseId && context.caseId !== appState.caseId) return true;
  const responseCaseId = getResponseCaseId(data);
  if (responseCaseId && context.caseId && responseCaseId !== context.caseId) return true;
  return false;
}

let debugOverlayEl = null;

function isDebugOverlayEnabled() {
  return debugModeEnabled;
}

function ensureDebugOverlay() {
  if (!isDebugOverlayEnabled()) return;
  if (debugOverlayEl) return;
  debugOverlayEl = document.createElement("div");
  debugOverlayEl.id = "debugOverlay";
  debugOverlayEl.style.position = "fixed";
  debugOverlayEl.style.right = "12px";
  debugOverlayEl.style.bottom = "12px";
  debugOverlayEl.style.maxWidth = "360px";
  debugOverlayEl.style.background = "rgba(20, 20, 20, 0.9)";
  debugOverlayEl.style.color = "#e6e6e6";
  debugOverlayEl.style.fontSize = "12px";
  debugOverlayEl.style.padding = "10px";
  debugOverlayEl.style.borderRadius = "8px";
  debugOverlayEl.style.zIndex = "9999";
  debugOverlayEl.style.whiteSpace = "pre-wrap";
  debugOverlayEl.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  debugOverlayEl.textContent = "Debug overlay enabled. Waiting for /api/turn...";
  document.body.appendChild(debugOverlayEl);
}

function updateDebugOverlay(data) {
  if (!isDebugOverlayEnabled()) return;
  ensureDebugOverlay();
  if (!debugOverlayEl) return;
  const debug = data?.debug_meta || {};
  const lines = [
    `model_used: ${data?.model_used || "-"}`,
    `model_mock: ${data?.model_mock ? "true" : "false"}`,
    `intent: ${debug.intent || "-"}`,
    `style: ${debug.response_style || "-"}`,
    `fallback: ${debug.used_fallback ? "yes" : "no"}`,
    `prompt_chars: ${debug.prompt_chars ?? "-"}`,
    `must_include: ${debug.must_include_count ?? 0}`,
    `dialogue_len: ${data?.dialogue ? data.dialogue.length : 0}`
  ];
  debugOverlayEl.textContent = lines.join("\n");
}

function syncReducedMotionPreference() {
  appState.reducedMotion = Boolean(reducedMotionQuery.matches);
}

function isMobileLayout() {
  return Boolean(mobileLayoutQuery.matches);
}

function getMobilePanelElements() {
  if (!mainGridEl) return [];
  return Array.from(mainGridEl.querySelectorAll("[data-mobile-panel]"));
}

function getMobilePanelById(panelId) {
  if (!panelId || !mainGridEl) return null;
  return mainGridEl.querySelector(`[data-mobile-panel="${panelId}"]`);
}

function setMobileDockActive(panelId) {
  if (!mobileDockEl) return;
  const target = String(panelId || "");
  mobileDockEl.querySelectorAll("[data-mobile-target]").forEach((button) => {
    const isActive = button.dataset.mobileTarget === target;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function scrollToMobilePanel(panelId, { behavior } = {}) {
  if (!isMobileLayout()) return;
  const panel = getMobilePanelById(panelId);
  if (!panel) return;
  panel.scrollIntoView({
    behavior: behavior || getScrollBehavior(),
    block: "nearest",
    inline: "start"
  });
  setMobileDockActive(panelId);
}

function syncMobileDockFromScroll() {
  if (!isMobileLayout() || !mainGridEl) return;
  const panels = getMobilePanelElements();
  if (!panels.length) return;
  const viewportCenter = mainGridEl.scrollLeft + mainGridEl.clientWidth / 2;
  let nearestId = panels[0].dataset.mobilePanel || "scene";
  let nearestDistance = Number.POSITIVE_INFINITY;
  panels.forEach((panel) => {
    const panelCenter = panel.offsetLeft + panel.clientWidth / 2;
    const distance = Math.abs(panelCenter - viewportCenter);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = panel.dataset.mobilePanel || nearestId;
    }
  });
  setMobileDockActive(nearestId);
}

const CLIENT_STATE_KEY = "clientState";
const CLIENT_STATE_STORAGE_VERSION = 2;
const CLIENT_STATE_TTL_DAYS = 365;

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

function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

function getStoredClientStatePayload() {
  const raw = localStorage.getItem(CLIENT_STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isClientStateExpired(payload) {
  if (!payload || typeof payload !== "object") return false;
  const anchor = payload.savedAt || payload.createdAt;
  if (!anchor) return false;
  const anchorMs = Date.parse(anchor);
  if (!Number.isFinite(anchorMs)) return false;
  return Date.now() - anchorMs > daysToMs(CLIENT_STATE_TTL_DAYS);
}

function loadStoredClientState() {
  const payload = getStoredClientStatePayload();
  if (!payload) return null;
  if (payload.state && (payload.savedAt || payload.createdAt)) {
    if (isClientStateExpired(payload)) {
      localStorage.removeItem(CLIENT_STATE_KEY);
      return null;
    }
    return payload.state || null;
  }
  return payload;
}

function storeClientState(state) {
  if (!state) return;
  const existing = getStoredClientStatePayload();
  const createdAt = existing?.createdAt || new Date().toISOString();
  const payload = {
    version: CLIENT_STATE_STORAGE_VERSION,
    createdAt,
    savedAt: new Date().toISOString(),
    state
  };
  localStorage.setItem(CLIENT_STATE_KEY, JSON.stringify(payload));
}

function clearStoredClientState() {
  localStorage.removeItem(CLIENT_STATE_KEY);
}

function shouldClearOnSolve(result) {
  if (!result) return false;
  if (result.verdict === "correct") return true;
  if (result.reveal_requested) return true;
  return false;
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

function loadBriefingSeenByCase() {
  const raw = localStorage.getItem("briefingSeenByCase");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function storeBriefingSeenByCase(map) {
  localStorage.setItem("briefingSeenByCase", JSON.stringify(map || {}));
}

function markBriefingSeen(caseId) {
  if (!caseId) return;
  const map = loadBriefingSeenByCase();
  map[caseId] = true;
  storeBriefingSeenByCase(map);
}

function hasSeenBriefing(caseId) {
  if (!caseId) return false;
  return Boolean(loadBriefingSeenByCase()[caseId]);
}

function t(key, vars) {
  return I18N.t(appState.language, key, vars);
}

function getMotionDuration(durationMs) {
  if (appState.reducedMotion) return 0;
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 220;
}

function getScrollBehavior() {
  return appState.reducedMotion ? "auto" : "smooth";
}

function triggerHapticCue(duration = 14) {
  if (!appState.hapticsEnabled) return;
  if (!navigator?.vibrate) return;
  navigator.vibrate(duration);
}

function playSoundCue(kind = "tap") {
  if (!appState.soundEnabled) return;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    if (!uiAudioContext) {
      uiAudioContext = new AudioContextCtor();
    }
    if (uiAudioContext.state === "suspended") {
      uiAudioContext.resume();
    }
    const oscillator = uiAudioContext.createOscillator();
    const gain = uiAudioContext.createGain();
    const now = uiAudioContext.currentTime;
    const frequency = kind === "success" ? 820 : 680;
    const length = kind === "success" ? 0.06 : 0.045;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(gain);
    gain.connect(uiAudioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + length + 0.01);
  } catch {
    // Audio cues are optional and should fail silently.
  }
}

function getActiveThreadKey() {
  if (appState.chatMode === "watson") {
    return `watson:${appState.caseId || "default"}`;
  }
  if (appState.caseThreadMode === "case") {
    return `case:${appState.caseId || "default"}:system`;
  }
  return `case:${appState.caseId || "default"}:character:${appState.activeCharacterId || "none"}`;
}

function saveActiveThreadScroll() {
  if (!chatLogEl) return;
  chatScrollPositions.set(getActiveThreadKey(), chatLogEl.scrollTop);
}

function restoreActiveThreadScroll() {
  if (!chatLogEl) return;
  const key = getActiveThreadKey();
  if (chatScrollPositions.has(key)) {
    chatLogEl.scrollTop = chatScrollPositions.get(key);
    return;
  }
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function scrollObservationSourceIntoView(hotspotId) {
  if (!hotspotId) return;
  const target = observationListEl?.querySelector(`[data-observation-source="${hotspotId}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: getScrollBehavior(), block: "nearest" });
}

function clearSceneTransitionTimer() {
  if (!sceneTransitionClearTimer) return;
  clearTimeout(sceneTransitionClearTimer);
  sceneTransitionClearTimer = null;
}

function showSceneTransitionOverlay(label, { durationMs = 220 } = {}) {
  if (!sceneTransitionOverlayEl) return;
  clearSceneTransitionTimer();
  sceneTransitionPending = true;
  sceneTransitionShownAt = Date.now();
  sceneTransitionMinVisibleMs = getMotionDuration(durationMs);
  sceneTransitionOverlayEl.textContent = String(label || "").trim();
  sceneTransitionOverlayEl.hidden = false;
  if (appState.reducedMotion) {
    sceneTransitionOverlayEl.classList.add("active");
    return;
  }
  requestAnimationFrame(() => {
    sceneTransitionOverlayEl.classList.add("active");
  });
}

function hideSceneTransitionOverlay({ delay = 0 } = {}) {
  if (!sceneTransitionOverlayEl || !sceneTransitionPending) return;
  clearSceneTransitionTimer();
  const elapsedMs = Date.now() - sceneTransitionShownAt;
  const minRemainingMs = Math.max(0, sceneTransitionMinVisibleMs - elapsedMs);
  const extraDelayMs = Number.isFinite(delay) && delay > 0 ? delay : 0;
  const waitMs = Math.max(minRemainingMs, extraDelayMs);
  const finalize = () => {
    sceneTransitionPending = false;
    sceneTransitionOverlayEl.classList.remove("active");
    sceneTransitionOverlayEl.hidden = true;
    sceneTransitionOverlayEl.textContent = "";
    sceneTransitionMinVisibleMs = 220;
  };
  if (appState.reducedMotion) {
    finalize();
    return;
  }
  if (waitMs > 0) {
    sceneTransitionClearTimer = setTimeout(finalize, waitMs);
    return;
  }
  finalize();
}

function maybeCompleteSceneTransitionForRenderedScene() {
  if (!sceneTransitionPending) return;
  const scene = getCurrentScene();
  const hasImage = Boolean(scene?.asset_path);
  if (!hasImage || !sceneImageEl) {
    hideSceneTransitionOverlay();
    return;
  }
  if (sceneImageEl.complete && sceneImageEl.naturalWidth > 0) {
    hideSceneTransitionOverlay();
  }
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const location = appState.publicState?.current_location_name
    || appState.publicState?.case_location
    || t("skillsPlaceholderLocation");
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

function getLocationById(locationId) {
  const locations = Array.isArray(appState.publicState?.case_locations)
    ? appState.publicState.case_locations
    : [];
  return locations.find((entry) => entry.id === locationId) || null;
}

function getCurrentLocation() {
  const currentId = appState.publicState?.current_location_id || "";
  return getLocationById(currentId);
}

function getCurrentScene() {
  const sceneFromState = appState.publicState?.current_scene;
  if (sceneFromState && typeof sceneFromState === "object") return sceneFromState;
  const currentLocation = getCurrentLocation();
  return currentLocation?.scene || null;
}

function getSceneHotspots() {
  const scene = getCurrentScene();
  return Array.isArray(scene?.hotspots) ? scene.hotspots : [];
}

function getObservedEventsForCurrentLocation() {
  const currentId = appState.publicState?.current_location_id || "";
  const events = Array.isArray(appState.publicState?.observation_events)
    ? appState.publicState.observation_events
    : [];
  return events
    .filter((entry) => entry.location_id === currentId)
    .sort((a, b) => (b.time_minutes || 0) - (a.time_minutes || 0));
}

function uniqueStringsByValue(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim())))
    .filter(Boolean);
}

function getHotspotById(hotspotId) {
  if (!hotspotId) return null;
  return getSceneHotspots().find((entry) => entry.id === hotspotId) || null;
}

function getObservationEventByHotspotId(hotspotId) {
  if (!hotspotId) return null;
  return getObservedEventsForCurrentLocation().find((entry) => entry.hotspot_id === hotspotId) || null;
}

function buildHotspotDetail(hotspotId) {
  if (!hotspotId) return null;
  const hotspot = getHotspotById(hotspotId);
  const observation = getObservationEventByHotspotId(hotspotId);
  if (!hotspot && !observation) return null;
  const label = observation?.label || hotspot?.label || hotspotId;
  const note = observation?.note || hotspot?.observation_note || "";
  const prompts = uniqueStringsByValue([
    ...(Array.isArray(observation?.suggested_questions) ? observation.suggested_questions : []),
    ...(Array.isArray(hotspot?.suggested_questions) ? hotspot.suggested_questions : [])
  ]);
  const observed = Boolean(observation || hotspot?.observed);
  const timeMinutes = Number.isFinite(observation?.time_minutes) ? observation.time_minutes : null;
  return {
    hotspotId,
    hotspot,
    observation,
    label,
    note,
    prompts,
    observed,
    timeMinutes
  };
}

function selectHotspot(hotspotId) {
  if (!hotspotId) return;
  if (appState.selectedHotspotId === hotspotId) return;
  appState.selectedHotspotId = hotspotId;
  renderCurrentScene();
}

function renderScenePinList(hotspots) {
  if (!scenePinListEl) return;
  scenePinListEl.innerHTML = "";
  if (!hotspots.length) {
    const empty = document.createElement("span");
    empty.className = "watson-empty";
    empty.textContent = t("scenePinsEmpty");
    scenePinListEl.appendChild(empty);
    return;
  }
  hotspots.forEach((hotspot) => {
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "scene-pin";
    if (hotspot.observed) {
      pin.classList.add("observed");
    }
    if (hotspot.id === appState.selectedHotspotId) {
      pin.classList.add("active");
    }
    pin.dataset.hotspotId = hotspot.id;
    pin.dataset.pinAction = "observe";

    const label = document.createElement("span");
    label.className = "scene-pin-label";
    label.textContent = hotspot.label || hotspot.id;
    pin.appendChild(label);

    const meta = document.createElement("span");
    meta.className = "scene-pin-meta";
    const statusKey = hotspot.observed ? "scenePinObserved" : "scenePinUnobserved";
    const typeLabel = appState.analyzeMode && hotspot.object_type ? ` - ${hotspot.object_type}` : "";
    meta.textContent = `${t(statusKey)}${typeLabel}`;
    pin.appendChild(meta);

    scenePinListEl.appendChild(pin);
  });
}

function renderObservationSheet() {
  if (!observationSheetEl) return;
  const detail = buildHotspotDetail(appState.observationSheetHotspotId);
  if (!detail) {
    if (observationSheetTitleEl) observationSheetTitleEl.textContent = t("observationSheetEmptyTitle");
    if (observationSheetNoteEl) observationSheetNoteEl.textContent = t("observationSheetNoSelection");
    if (observationSheetMetaEl) observationSheetMetaEl.textContent = "";
    if (observationSheetPromptListEl) {
      observationSheetPromptListEl.innerHTML = "";
    }
    if (observationSheetObserveBtn) observationSheetObserveBtn.disabled = true;
    if (observationSheetUsePromptBtn) observationSheetUsePromptBtn.disabled = true;
    if (observationSheetJumpBtn) observationSheetJumpBtn.disabled = true;
    return;
  }

  if (observationSheetTitleEl) observationSheetTitleEl.textContent = detail.label;
  if (observationSheetNoteEl) observationSheetNoteEl.textContent = detail.note || t("observationSheetNoNote");
  if (observationSheetMetaEl) {
    const status = detail.observed ? t("scenePinObserved") : t("scenePinUnobserved");
    const timeLabel = Number.isFinite(detail.timeMinutes) ? ` - T+${detail.timeMinutes}m` : "";
    observationSheetMetaEl.textContent = `${status}${timeLabel}`;
  }
  if (observationSheetObserveBtn) {
    observationSheetObserveBtn.disabled = detail.observed;
    observationSheetObserveBtn.dataset.hotspotId = detail.hotspotId;
    observationSheetObserveBtn.textContent = detail.observed
      ? t("observationAlreadyObserved")
      : t("observeAction");
  }
  const primaryPrompt = detail.prompts[0] || "";
  if (observationSheetUsePromptBtn) {
    observationSheetUsePromptBtn.disabled = !primaryPrompt;
    observationSheetUsePromptBtn.dataset.prompt = primaryPrompt;
  }
  if (observationSheetJumpBtn) {
    observationSheetJumpBtn.disabled = !detail.observed;
    observationSheetJumpBtn.dataset.hotspotId = detail.hotspotId;
  }

  if (observationSheetPromptListEl) {
    observationSheetPromptListEl.innerHTML = "";
    if (!detail.prompts.length) {
      const empty = document.createElement("span");
      empty.className = "watson-empty";
      empty.textContent = t("sceneNoPrompts");
      observationSheetPromptListEl.appendChild(empty);
    } else {
      detail.prompts.forEach((prompt) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "prompt-chip";
        button.dataset.observationPrompt = prompt;
        button.textContent = prompt;
        observationSheetPromptListEl.appendChild(button);
      });
    }
  }
}

function openObservationSheet(hotspotId) {
  if (!observationSheetEl || !hotspotId) return;
  appState.observationSheetHotspotId = hotspotId;
  renderObservationSheet();
  observationSheetEl.hidden = false;
  observationSheetEl.setAttribute("aria-hidden", "false");
  observationSheetEl.classList.add("open");
}

function closeObservationSheet() {
  if (!observationSheetEl) return;
  observationSheetEl.hidden = true;
  observationSheetEl.setAttribute("aria-hidden", "true");
  observationSheetEl.classList.remove("open");
}

function insertPromptInComposer(prompt) {
  const text = String(prompt || "").trim();
  if (!text) return;
  messageInput.value = text;
  messageInput.focus();
  if (appState.chatMode !== "case") {
    setChatMode("case");
  }
  if (appState.caseThreadMode !== "character") {
    setCaseThreadMode("character");
  }
  triggerHapticCue(10);
  playSoundCue("tap");
}

function renderCurrentScene() {
  const scene = getCurrentScene();
  const currentLocation = getCurrentLocation();
  const locationName = currentLocation?.name || appState.publicState?.current_location_name || "-";
  const descriptor = currentLocation?.descriptor || "";
  const hint = currentLocation?.hint || t("sceneNoVisual");
  const sceneMetaLine = [locationName, descriptor].filter(Boolean).join(" - ");
  if (sceneMetaEl) {
    sceneMetaEl.textContent = `${sceneMetaLine || locationName}: ${hint}`;
  }

  if (sceneImageEl) {
    const hasImage = Boolean(scene?.asset_path);
    if (hasImage) {
      sceneImageEl.src = scene.asset_path;
      sceneImageEl.alt = `${locationName} scene`;
      sceneImageEl.hidden = false;
    } else {
      sceneImageEl.hidden = true;
      sceneImageEl.removeAttribute("src");
      sceneImageEl.alt = "";
    }
  }

  if (sceneFallbackEl) {
    sceneFallbackEl.textContent = `${locationName}${descriptor ? ` - ${descriptor}` : ""}`;
    sceneFallbackEl.hidden = Boolean(scene?.asset_path);
  }

  const hotspots = getSceneHotspots();
  const hotspotIds = new Set(hotspots.map((entry) => entry.id));
  if (appState.selectedHotspotId && !hotspotIds.has(appState.selectedHotspotId)) {
    appState.selectedHotspotId = null;
  }
  if (!appState.selectedHotspotId && hotspots[0]?.id) {
    appState.selectedHotspotId = hotspots[0].id;
  }
  if (sceneHotspotsEl) {
    sceneHotspotsEl.innerHTML = "";
    hotspots.forEach((hotspot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `scene-hotspot${hotspot.observed ? " observed" : ""}`;
      if (hotspot.id === appState.selectedHotspotId) {
        button.classList.add("active");
      }
      if (appState.analyzeMode) {
        button.classList.add("analyze");
      }
      button.dataset.hotspotId = hotspot.id;
      button.style.left = `${Number(hotspot?.anchor?.x) || 50}%`;
      button.style.top = `${Number(hotspot?.anchor?.y) || 50}%`;
      button.title = hotspot.label || hotspot.id;
      button.setAttribute("aria-label", hotspot.label || hotspot.id);
      const marker = document.createElement("span");
      marker.className = "scene-hotspot-marker";
      marker.textContent = hotspot.observed ? "✓" : "•";
      button.appendChild(marker);
      if (appState.analyzeMode) {
        const tag = document.createElement("span");
        tag.className = "scene-hotspot-tag";
        tag.textContent = hotspot.label || hotspot.id;
        button.appendChild(tag);
      }
      sceneHotspotsEl.appendChild(button);
    });
  }
  renderScenePinList(hotspots);

  const observedEvents = getObservedEventsForCurrentLocation();
  if (observationListEl) {
    observationListEl.innerHTML = "";
    if (!observedEvents.length) {
      const li = document.createElement("li");
      li.textContent = t("sceneNoObservations");
      observationListEl.appendChild(li);
    } else {
      observedEvents.slice(0, 6).forEach((entry) => {
        const li = document.createElement("li");
        const hotspotId = entry.hotspot_id || "";
        if (hotspotId) {
          li.dataset.observationSource = hotspotId;
        }
        const timeLabel = Number.isFinite(entry.time_minutes) ? `T+${entry.time_minutes}m` : "T+";
        const summary = document.createElement("div");
        summary.className = "observation-summary";
        summary.textContent = `${timeLabel} - ${entry.label || t("sceneObservedPrefix")}: ${entry.note || ""}`;
        li.appendChild(summary);

        const actions = document.createElement("div");
        actions.className = "observation-actions";
        const expandBtn = document.createElement("button");
        expandBtn.type = "button";
        expandBtn.className = "ghost-inline observation-action";
        expandBtn.dataset.observationExpand = hotspotId;
        expandBtn.textContent = t("observationExpand");
        actions.appendChild(expandBtn);

        const firstPrompt = uniqueStringsByValue(entry.suggested_questions || [])[0];
        if (firstPrompt) {
          const useBtn = document.createElement("button");
          useBtn.type = "button";
          useBtn.className = "ghost-inline observation-action";
          useBtn.dataset.observationPrompt = firstPrompt;
          useBtn.textContent = t("observationUsePrompt");
          actions.appendChild(useBtn);
        }
        li.appendChild(actions);
        observationListEl.appendChild(li);
      });
    }
  }

  if (observationPromptListEl) {
    observationPromptListEl.innerHTML = "";
    const promptList = uniqueStringsByValue(
      observedEvents.flatMap((entry) => (
        Array.isArray(entry.suggested_questions) ? entry.suggested_questions : []
      ))
    );
    if (!promptList.length) {
      const empty = document.createElement("span");
      empty.className = "watson-empty";
      empty.textContent = t("sceneNoPrompts");
      observationPromptListEl.appendChild(empty);
    } else {
      promptList.slice(0, 6).forEach((prompt) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "prompt-chip";
        button.dataset.observationPrompt = prompt;
        button.textContent = prompt;
        observationPromptListEl.appendChild(button);
      });
    }
  }

  if (observationSheetEl && !observationSheetEl.hidden) {
    renderObservationSheet();
  }
  maybeCompleteSceneTransitionForRenderedScene();
}

function isCharacterVisibleAtCurrentLocation(character) {
  if (!character) return false;
  const locationIds = Array.isArray(character.location_ids)
    ? character.location_ids.filter(Boolean)
    : [];
  if (!locationIds.length) return true;
  const currentId = appState.publicState?.current_location_id || "";
  if (!currentId) return true;
  return locationIds.includes(currentId);
}

function getVisibleCharacters() {
  return appState.characters.filter((character) => isCharacterVisibleAtCurrentLocation(character));
}

function getOnSiteContacts() {
  return getVisibleCharacters().filter((character) => character.is_location_contact);
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

function getLocalizedField(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[appState.language] || value.en || "";
}

function renderCaseIntro() {
  const introEl = document.getElementById("caseIntro");
  if (!introEl || !appState.publicState) return;
  const state = appState.publicState;
  const snapshot = [
    {
      label: I18N.t(appState.language, "caseIntroVictim"),
      value: [
        getLocalizedField(state.victim_name),
        getLocalizedField(state.victim_role)
      ]
        .filter(Boolean)
        .join(" — ")
    },
    {
      label: I18N.t(appState.language, "caseIntroScene"),
      value: [
        getLocalizedField(state.case_location),
        getLocalizedField(state.case_time)
      ]
        .filter(Boolean)
        .join(" · ")
    },
    {
      label: I18N.t(appState.language, "caseIntroPolice"),
      value: getLocalizedField(state.police_call_time)
    }
  ].filter((item) => item.value);

  const reason = getLocalizedField(state.case_intro_reason) || getLocalizedField(state.case_briefing);
  const social = getLocalizedField(state.social_notes);
  const recentHistory = (state.relationship_history || [])
    .slice(0, 3)
    .map((entry) => {
      const time = getLocalizedField(entry.time);
      const event = getLocalizedField(entry.event);
      return [time, event].filter(Boolean).join(" — ");
    })
    .filter(Boolean);

  introEl.innerHTML = `
    <div class="intro-grid">
      <article class="intro-card">
        <h4>${I18N.t(appState.language, "caseIntroSnapshot")}</h4>
        ${snapshot
          .map(
            (item) =>
              `<p class="intro-meta"><span class="intro-meta-label">${item.label}</span>${item.value}</p>`
          )
          .join("")}
      </article>
      <article class="intro-card">
        <h4>${I18N.t(appState.language, "caseIntroReason")}</h4>
        <p>${reason || I18N.t(appState.language, "caseIntroNoReason")}</p>
        ${social ? `<p class="intro-meta small">${social}</p>` : ""}
      </article>
      <article class="intro-card">
        <h4>${I18N.t(appState.language, "caseIntroHistory")}</h4>
        ${
          recentHistory.length
            ? `<ul class="intro-history">${recentHistory.map((line) => `<li>${line}</li>`).join("")}</ul>`
            : `<p>${I18N.t(appState.language, "caseIntroHistoryEmpty")}</p>`
        }
      </article>
    </div>
  `;
}

function getBriefingSections() {
  const sections = appState.publicState?.case_intro?.[appState.language];
  if (Array.isArray(sections) && sections.length) return sections;
  return [];
}

function buildWatsonNarrationLines() {
  const state = appState.publicState || {};
  const victim = state.victim_name || t("skillsPlaceholderVictim");
  const scene = state.current_location_name || state.case_location || t("skillsPlaceholderLocation");
  const caseTime = state.case_time || t("skillsPlaceholderTime");
  const contacts = getOnSiteContacts().map((character) => character.name).slice(0, 2);
  const contactsText = contacts.length ? contacts.join(", ") : null;
  if (appState.language === "el") {
    return [
      `Ο φάκελος ανοίγει ήσυχα. Το θύμα είναι ο/η ${victim}.`,
      `Η σκηνή που μας καίει τώρα: ${scene}, γύρω στις ${caseTime}.`,
      contactsText
        ? `Κράτα κοντά τις τοπικές επαφές, ειδικά ${contactsText}.`
        : "Αν κολλήσεις, γύρνα στη σκηνή και κοίτα το πιο απλό στοιχείο πρώτα.",
      "Μικρό αίνιγμα, καθαρό βήμα: το δωμάτιο μιλά όταν το ρωτήσεις σωστά."
    ];
  }
  return [
    `The case folder opens quietly. The victim is ${victim}.`,
    `Our pressure point right now is ${scene}, around ${caseTime}.`,
    contactsText
      ? `Keep your local contacts close, especially ${contactsText}.`
      : "If you get stuck, return to the scene and check the simplest detail first.",
    "Light riddle, clear move: a room tells the truth when pressed the right way."
  ];
}

function renderBriefingFolderView() {
  if (!briefingFolderView) return;
  const sections = getBriefingSections();
  const pagesHtml = sections
    .map((section, index) => {
      const title = escapeHtml(section?.title || `Section ${index + 1}`);
      const lines = Array.isArray(section?.lines) ? section.lines : [];
      const lineItems = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
      return `
        <article class="briefing-page" style="animation-delay:${Math.min(index * 0.05, 0.25)}s">
          <h4>${title}</h4>
          <ul>${lineItems || `<li>${escapeHtml(I18N.t(appState.language, "caseIntroNoReason"))}</li>`}</ul>
        </article>
      `;
    })
    .join("");
  const cast = appState.characters
    .filter((character) => !character.is_location_contact)
    .slice(0, 6)
    .map((character) => `
      <div class="briefing-cast-item">
        <strong>${escapeHtml(character.name)}</strong>
        <span>${escapeHtml(character.role || "")}</span>
      </div>
    `)
    .join("");

  briefingFolderView.innerHTML = `
    <div class="briefing-book">
      ${pagesHtml}
      <article class="briefing-page">
        <h4>${escapeHtml(I18N.t(appState.language, "characters"))}</h4>
        <div class="briefing-cast">
          ${cast || `<p>${escapeHtml(I18N.t(appState.language, "skillsEmptyRelationships"))}</p>`}
        </div>
      </article>
    </div>
  `;
}

function renderBriefingWatsonView() {
  if (!briefingWatsonView) return;
  const lines = buildWatsonNarrationLines();
  briefingWatsonView.innerHTML = `
    <div class="briefing-narration">
      <span class="narrator">Watson</span>
      ${lines.map((line) => `<p class="line">${escapeHtml(line)}</p>`).join("")}
    </div>
  `;
}

function setBriefingMode(mode) {
  const next = mode === "watson" ? "watson" : "folder";
  appState.briefingMode = next;
  if (briefingFolderTab) {
    briefingFolderTab.classList.toggle("active", next === "folder");
  }
  if (briefingWatsonTab) {
    briefingWatsonTab.classList.toggle("active", next === "watson");
  }
  if (briefingFolderView) {
    briefingFolderView.hidden = next !== "folder";
  }
  if (briefingWatsonView) {
    briefingWatsonView.hidden = next !== "watson";
  }
}

function openBriefingModal(mode = "folder") {
  if (!briefingModalEl) return;
  renderBriefingFolderView();
  renderBriefingWatsonView();
  setBriefingMode(mode);
  briefingModalEl.hidden = false;
  markBriefingSeen(appState.caseId);
}

function closeBriefingModal() {
  if (!briefingModalEl) return;
  briefingModalEl.hidden = true;
}

function maybeAutoOpenBriefing() {
  if (!appState.caseId) return;
  if (hasSeenBriefing(appState.caseId)) return;
  openBriefingModal("folder");
}

function isConversationEvent(event) {
  return event?.type === "detective_message" || event?.type === "character_response";
}

function isCaseSystemEvent(event) {
  return (
    event?.type === "detective_move"
    || event?.type === "location_note"
    || event?.type === "character_intro"
    || event?.type === "location_observation"
  );
}

function eventCharacterId(event) {
  if (event?.character_id) return String(event.character_id);
  const visibility = Array.isArray(event?.visibility) ? event.visibility : [];
  return visibility.find((entry) => entry && entry !== "detective") || "";
}

function setCaseThreadMode(mode) {
  const nextMode = mode === "case" ? "case" : "character";
  const changed = appState.caseThreadMode !== nextMode;
  if (changed) {
    saveActiveThreadScroll();
  }
  appState.caseThreadMode = nextMode;
  if (chatThreadCharacterBtn) {
    chatThreadCharacterBtn.classList.toggle("active", appState.caseThreadMode === "character");
  }
  if (chatThreadCaseBtn) {
    chatThreadCaseBtn.classList.toggle("active", appState.caseThreadMode === "case");
  }
  if (appState.chatMode === "case") {
    renderCaseChatLog();
    if (changed) {
      triggerHapticCue(8);
    }
  }
  if (isMobileLayout()) {
    setMobileDockActive("chat");
  }
}

function renderCaseChatLog() {
  const events = appState.clientState?.events || [];
  chatLogEl.innerHTML = "";
  if (!Array.isArray(events) || events.length === 0) {
    appendMessage(I18N.t(appState.language, "caseChatIntro"), "system");
    restoreActiveThreadScroll();
    return;
  }
  const threadMode = appState.caseThreadMode === "case" ? "case" : "character";
  const activeCharacterId = appState.activeCharacterId;

  if (threadMode === "character") {
    if (!activeCharacterId) {
      appendMessage(t("characterThreadSelect"), "system");
      restoreActiveThreadScroll();
      return;
    }
    const activeCharacter = appState.characters.find((entry) => entry.id === activeCharacterId);
    const activeName = activeCharacter?.name || I18N.t(appState.language, "characters");
    const threadEvents = events.filter((event) => (
      isConversationEvent(event) && eventCharacterId(event) === activeCharacterId
    ));
    if (!threadEvents.length) {
      appendMessage(t("characterThreadEmpty", { name: activeName }), "system");
      restoreActiveThreadScroll();
      return;
    }
    threadEvents.forEach((event) => {
      if (!event || typeof event.content !== "string") return;
      if (event.type === "detective_message") {
        appendMessage(event.content, "detective");
        return;
      }
      if (event.type === "character_response") {
        appendMessage(event.content, "character");
      }
    });
    restoreActiveThreadScroll();
    return;
  }

  const caseEvents = events.filter((event) => isCaseSystemEvent(event));
  if (!caseEvents.length) {
    appendMessage(I18N.t(appState.language, "caseChatIntro"), "system");
    restoreActiveThreadScroll();
    return;
  }
  caseEvents.forEach((event) => {
    if (!event || typeof event.content !== "string") return;
    appendMessage(event.content, "system");
  });
  restoreActiveThreadScroll();
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
  restoreActiveThreadScroll();
}

function renderChatLog() {
  if (appState.chatMode === "watson") {
    renderWatsonChatLog();
  } else {
    if (chatThreadTabs) {
      chatThreadTabs.hidden = false;
    }
    renderCaseChatLog();
  }
}

function renderCharacters() {
  characterListEl.innerHTML = "";
  const visibleCharacters = getVisibleCharacters();
  visibleCharacters.forEach((character) => {
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
    if (character.is_location_contact) {
      const badge = document.createElement("span");
      badge.className = "character-badge";
      badge.textContent = t("contactBadge");
      textWrap.appendChild(badge);
    }
    card.appendChild(textWrap);
    card.addEventListener("click", () => {
      saveActiveThreadScroll();
      appState.activeCharacterId = character.id;
      storeActiveCharacter(appState.caseId, character.id);
      setChatMode("case");
      setCaseThreadMode("character");
      renderCharacters();
      playSoundCue("tap");
      triggerHapticCue(10);
    });

    characterListEl.appendChild(card);
  });

  if (visibleCharacters.length === 0) {
    const empty = document.createElement("div");
    empty.className = "character-role";
    empty.textContent = t("locationContactsEmpty");
    characterListEl.appendChild(empty);
  }

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

  renderLocationPanel();
  renderSkillsUI();
}

function renderLocationPanel() {
  if (!appState.publicState) return;
  const locations = Array.isArray(appState.publicState.case_locations)
    ? appState.publicState.case_locations
    : [];
  const currentId = appState.publicState.current_location_id || "";
  const currentLocation = getLocationById(currentId);
  if (currentLocationValueEl) {
    currentLocationValueEl.textContent =
      currentLocation?.name
      || appState.publicState.current_location_name
      || appState.publicState.case_location
      || "-";
  }

  if (locationSelectEl) {
    locationSelectEl.innerHTML = "";
    locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location.id;
      const descriptor = location.descriptor ? ` - ${location.descriptor}` : "";
      option.textContent = `${location.name}${descriptor}`;
      locationSelectEl.appendChild(option);
    });
    if (currentId) {
      locationSelectEl.value = currentId;
    }
  }

  if (visitedLocationsListEl) {
    visitedLocationsListEl.innerHTML = "";
    const visitedIds = Array.isArray(appState.publicState.visited_location_ids)
      ? appState.publicState.visited_location_ids
      : [];
    const visitedNames = visitedIds
      .map((locationId) => getLocationById(locationId)?.name || locationId)
      .filter(Boolean);
    if (!visitedNames.length) {
      const li = document.createElement("li");
      li.textContent = "-";
      visitedLocationsListEl.appendChild(li);
    } else {
      visitedNames.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        visitedLocationsListEl.appendChild(li);
      });
    }
  }

  if (locationContactsListEl) {
    locationContactsListEl.innerHTML = "";
    const contacts = getOnSiteContacts();
    if (!contacts.length) {
      const li = document.createElement("li");
      li.textContent = t("locationContactsEmpty");
      locationContactsListEl.appendChild(li);
    } else {
      contacts.forEach((contact) => {
        const li = document.createElement("li");
        li.textContent = `${contact.name} - ${contact.role}`;
        locationContactsListEl.appendChild(li);
      });
    }
  }

  renderCurrentScene();
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
  if (!appState.skillsEnabled) {
    closeSkillsDrawer();
  } else if (!appState.skillsDrawerOpen) {
    closeSkillsDrawer({ persist: false });
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
      target.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
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
  if (appState.chatMode !== nextMode) {
    saveActiveThreadScroll();
  }
  appState.chatMode = nextMode;
  if (chatTabCase) {
    chatTabCase.classList.toggle("active", nextMode === "case");
  }
  if (chatTabWatson) {
    chatTabWatson.classList.toggle("active", nextMode === "watson");
  }
  if (chatThreadTabs) {
    chatThreadTabs.hidden = nextMode !== "case";
  }
  if (nextMode === "case") {
    setCaseThreadMode(appState.caseThreadMode);
  }
  messageInput.placeholder = t(nextMode === "watson" ? "watsonPlaceholder" : "placeholder");
  renderChatLog();
  if (isMobileLayout()) {
    setMobileDockActive("chat");
  }
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
  if (solutionNarrativeInput) {
    solutionNarrativeInput.placeholder = I18N.t(lang, "solutionNarrativePlaceholder");
  }
  renderLocationPanel();
  if (briefingModalEl && !briefingModalEl.hidden) {
    renderBriefingFolderView();
    renderBriefingWatsonView();
    setBriefingMode(appState.briefingMode);
  }
  renderSkillsUI();
}

function renderSolutionResult(result) {
  if (!result) {
    solutionResultEl.textContent = "";
    solutionResultEl.dataset.variant = "";
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
  solutionResultEl.dataset.variant =
    result.verdict === "correct" ? "correct" : result.verdict === "insufficient" ? "insufficient" : "default";

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
    solutionResultEl.dataset.variant = "reveal";
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

function clearSolutionComposer() {
  if (solutionNarrativeInput) {
    solutionNarrativeInput.value = "";
  }
}

function setSolutionBusy(isBusy) {
  const busy = Boolean(isBusy);
  if (checkSolutionBtn) checkSolutionBtn.disabled = busy;
  if (revealSolutionBtn) revealSolutionBtn.disabled = busy;
}

function buildSolutionPayload() {
  const narrative = solutionNarrativeInput?.value?.trim() || "";
  return {
    killer: "",
    method: "",
    motive: "",
    timeline: "",
    character_notes: "",
    full_text: narrative
  };
}

async function submitSolution({ reveal }) {
  if (!appState.caseId) return;
  const requestContext = createCaseRequestContext();
  const solution = buildSolutionPayload();
  if (!reveal && !solution.full_text) {
    solutionResultEl.dataset.variant = "insufficient";
    solutionResultEl.textContent = I18N.t(appState.language, "solutionNeedText");
    return;
  }

  solutionResultEl.dataset.variant = "loading";
  solutionResultEl.textContent = I18N.t(appState.language, "solutionChecking");
  setSolutionBusy(true);

  try {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: appState.sessionId,
        language: appState.language,
        reveal: Boolean(reveal),
        solution,
        caseId: appState.caseId,
        client_state: appState.clientState
      })
    });

    const data = await res.json().catch(() => ({}));
    if (shouldIgnoreCaseResponse(requestContext, data)) return;
    if (!res.ok) {
      solutionResultEl.dataset.variant = "error";
      solutionResultEl.textContent = data.error || I18N.t(appState.language, "errorGeneric");
      return;
    }

    renderSolutionResult(data.result);
    const endOfGame = shouldClearOnSolve(data.result);
    if (endOfGame) {
      clearStoredClientState();
      appState.clientState = null;
    } else if (data.client_state) {
      appState.clientState = data.client_state;
      storeClientState(appState.clientState);
    }
  } catch {
    solutionResultEl.dataset.variant = "error";
    solutionResultEl.textContent = I18N.t(appState.language, "errorGeneric");
  } finally {
    setSolutionBusy(false);
  }
}

async function loadState(sessionId) {
  const requestId = stateLoadRequestId + 1;
  stateLoadRequestId = requestId;
  const requestContext = createCaseRequestContext();
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
  if (requestId !== stateLoadRequestId) return;
  if (shouldIgnoreCaseResponse(requestContext, data)) return;
  applyState(data, { rehydrateChat: true });
}

function ensureActiveCharacterSelection() {
  const visible = getVisibleCharacters();
  const visibleIds = new Set(visible.map((character) => character.id));
  if (appState.activeCharacterId && visibleIds.has(appState.activeCharacterId)) return;
  const storedId = getStoredActiveCharacter(appState.caseId);
  const nextId = storedId && visibleIds.has(storedId) ? storedId : visible[0]?.id || null;
  appState.activeCharacterId = nextId;
  if (appState.caseId && nextId) {
    storeActiveCharacter(appState.caseId, nextId);
  }
}

function applyState(data, { clearChat = false, rehydrateChat = false } = {}) {
  if (!data || typeof data !== "object") return;
  const incomingCaseId = getResponseCaseId(data);
  if (incomingCaseId && appState.caseId && incomingCaseId !== appState.caseId) return;
  appState.sessionId = data.sessionId;
  appState.caseId = incomingCaseId || appState.caseId;
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
  ensureActiveCharacterSelection();
  if (clearChat) {
    chatLogEl.innerHTML = "";
  }
  renderCharacters();
  renderPublicState();
  renderCaseHeader();
  renderCaseIntro();
  if (rehydrateChat) {
    renderChatLog();
  } else if (clearChat) {
    renderChatLog();
  }
  renderCaseSelect();
  maybeAutoOpenBriefing();
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

async function sendWatsonMessage(message, { autoSwitch = false } = {}) {
  const text = String(message || "").trim();
  if (!text) return;
  if (autoSwitch) {
    setChatMode("watson");
  }
  appendWatsonMessage(text, "watson-user");
  const board = buildBoardState();
  const context = buildSkillsContext(board);
  const requestContext = createCaseRequestContext();
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
        message: text,
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
    if (shouldIgnoreCaseResponse(requestContext, data)) return;
    if (!res.ok) {
      appendWatsonMessage(data.error || t("watsonChatError"), "watson");
      return;
    }
    appendWatsonMessage(data.dialogue || t("watsonChatNoSuggestion"), "watson");
  } catch (error) {
    appendWatsonMessage(t("watsonChatError"), "watson");
  }
}

async function sendLocationAction(actionType, locationId = "") {
  if (!appState.caseId) return;
  if (isMobileLayout()) {
    setMobileDockActive("scene");
  }
  const requestContext = createCaseRequestContext();
  const currentLocationId = appState.publicState?.current_location_id || "";
  const isMoveRequest = actionType === "move";
  const willChangeLocation = isMoveRequest && locationId && locationId !== currentLocationId;
  closeObservationSheet();
  if (willChangeLocation) {
    const targetLocation = getLocationById(locationId);
    const selectedLabel = locationSelectEl?.selectedOptions?.[0]?.textContent || "";
    const targetName = (targetLocation?.name || selectedLabel || locationId || "").trim();
    showSceneTransitionOverlay(t("sceneTransitionMoving", { location: targetName }), {
      durationMs: getMotionDuration(220)
    });
  }
  try {
    const res = await fetch("/api/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: appState.sessionId,
        language: appState.language,
        caseId: appState.caseId,
        actionType,
        locationId,
        client_state: appState.clientState
      })
    });
    const data = await res.json();
    if (shouldIgnoreCaseResponse(requestContext, data)) {
      hideSceneTransitionOverlay();
      return;
    }
    if (!res.ok) {
      hideSceneTransitionOverlay();
      appendMessage(data.error || I18N.t(appState.language, "errorGeneric"), "system");
      return;
    }

    const transitionDurationMs = Number(data?.transition?.duration_ms);
    if (Number.isFinite(transitionDurationMs) && transitionDurationMs > 0) {
      sceneTransitionMinVisibleMs = getMotionDuration(transitionDurationMs);
    }

    appState.publicState = data.public_state;
    if (data.client_state) {
      appState.clientState = data.client_state;
      storeClientState(appState.clientState);
    }
    ensureActiveCharacterSelection();
    renderCharacters();
    renderPublicState();
    renderCaseIntro();
    if (appState.chatMode === "case") {
      renderCaseChatLog();
    }
    if (data.model_used) {
      modelUsedValue.textContent = data.model_used;
    }
  } catch (error) {
    hideSceneTransitionOverlay();
    appendMessage(I18N.t(appState.language, "errorGeneric"), "system");
  }
}

async function sendObserveAction(hotspotId, { openSheet = true } = {}) {
  if (!appState.caseId || !hotspotId) return;
  if (isMobileLayout()) {
    setMobileDockActive("scene");
  }
  const locationId = appState.publicState?.current_location_id || "";
  if (!locationId) return;
  const requestContext = createCaseRequestContext();
  appState.selectedHotspotId = hotspotId;
  try {
    const res = await fetch("/api/observe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: appState.sessionId,
        language: appState.language,
        caseId: appState.caseId,
        locationId,
        hotspotId,
        client_state: appState.clientState
      })
    });
    const data = await res.json();
    if (shouldIgnoreCaseResponse(requestContext, data)) return;
    if (!res.ok) {
      appendMessage(data.error || I18N.t(appState.language, "errorGeneric"), "system");
      return;
    }
    appState.publicState = data.public_state;
    if (data.client_state) {
      appState.clientState = data.client_state;
      storeClientState(appState.clientState);
    }
    ensureActiveCharacterSelection();
    renderCharacters();
    renderPublicState();
    renderCaseIntro();
    if (appState.chatMode === "case") {
      renderCaseChatLog();
    }
    if (data.model_used) {
      modelUsedValue.textContent = data.model_used;
    }
    playSoundCue("success");
    triggerHapticCue(14);
    if (openSheet) {
      openObservationSheet(hotspotId);
    }
  } catch {
    appendMessage(I18N.t(appState.language, "errorGeneric"), "system");
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  if (appState.chatMode === "watson") {
    messageInput.value = "";
    await sendWatsonMessage(message);
    return;
  }
  if (!appState.activeCharacterId) {
    appendMessage(I18N.t(appState.language, "selectCharacter"), "detective");
    return;
  }

  if (appState.caseThreadMode !== "character") {
    setCaseThreadMode("character");
  }
  appendMessage(message, "detective");
  messageInput.value = "";
  const requestContext = createCaseRequestContext();

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
  if (shouldIgnoreCaseResponse(requestContext, data)) return;
  if (!res.ok) {
    appendMessage(data.error || I18N.t(appState.language, "errorGeneric"), "character");
    return;
  }

  appendMessage(data.dialogue, "character");
  updateDebugOverlay(data);
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
  closeObservationSheet();
  invalidateCaseRequests();
  const requestContext = createCaseRequestContext();
  const res = await fetch("/api/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      language: appState.language,
      caseId: appState.caseId,
      client_state: null
    })
  });
  const data = await res.json();
  if (shouldIgnoreCaseResponse(requestContext, data)) return;
  if (!res.ok) {
    appendMessage(data.error || I18N.t(appState.language, "errorGeneric"), "system");
    return;
  }
  clearStoredClientState();
  appState.clientState = null;
  applyState(data, { clearChat: true });
  appendMessage(I18N.t(appState.language, "caseReset"), "detective");
  modelUsedValue.textContent = "-";
  renderSolutionResult(null);
  clearSolutionComposer();
});

const storedLang = localStorage.getItem("language");
const storedModelMode = localStorage.getItem("modelMode");
const browserLang = navigator.language || "en";
syncReducedMotionPreference();
appState.language = I18N.normalizeLanguage(storedLang || browserLang);
appState.modelMode = storedModelMode || "auto";
appState.skillsEnabled = debugModeEnabled && localStorage.getItem("skillsEnabled") === "true";
appState.skillsDrawerOpen = debugModeEnabled && localStorage.getItem("skillsDrawerOpen") === "true";
appState.watsonFrequency = localStorage.getItem("watsonFrequency") || "normal";
appState.watsonStyle = localStorage.getItem("watsonStyle") || "questions";
appState.watsonQuality = Number(localStorage.getItem("watsonQuality")) || 70;
appState.hapticsEnabled = debugModeEnabled && localStorage.getItem("hapticsEnabled") === "true";
appState.soundEnabled = debugModeEnabled && localStorage.getItem("soundEnabled") === "true";
appState.analyzeMode = debugModeEnabled && localStorage.getItem("analyzeMode") === "true";
if (!debugModeEnabled) {
  localStorage.removeItem("skillsEnabled");
  localStorage.removeItem("skillsDrawerOpen");
  localStorage.removeItem("hapticsEnabled");
  localStorage.removeItem("soundEnabled");
  localStorage.removeItem("analyzeMode");
}
appState.watsonLog = loadWatsonLog();
languageSelect.value = appState.language;
modelModeSelect.value = appState.modelMode;
if (skillsToggle) skillsToggle.checked = appState.skillsEnabled;
if (watsonFrequencySelect) watsonFrequencySelect.value = appState.watsonFrequency;
if (watsonStyleSelect) watsonStyleSelect.value = appState.watsonStyle;
if (watsonQualityRange) watsonQualityRange.value = String(appState.watsonQuality);
if (hapticsToggle) hapticsToggle.checked = appState.hapticsEnabled;
if (soundToggle) soundToggle.checked = appState.soundEnabled;
if (analyzeToggle) analyzeToggle.checked = appState.analyzeMode;
applyTranslations();
setSkillsFeatureEnabled(appState.skillsEnabled);
if (appState.skillsEnabled && appState.skillsDrawerOpen) {
  openSkillsDrawer();
}
setChatMode(appState.chatMode);
setMobileDockActive("scene");
ensureDebugOverlay();
appState.clientState = loadStoredClientState();
if (appState.clientState?.case_id) {
  appState.caseId = appState.clientState.case_id;
}
loadState();
if (isMobileLayout()) {
  requestAnimationFrame(() => {
    scrollToMobilePanel("scene", { behavior: "auto" });
  });
}

if (mobileLayoutQuery?.addEventListener) {
  mobileLayoutQuery.addEventListener("change", () => {
    syncMobileDockFromScroll();
  });
} else if (mobileLayoutQuery?.addListener) {
  mobileLayoutQuery.addListener(() => {
    syncMobileDockFromScroll();
  });
}

if (reducedMotionQuery?.addEventListener) {
  reducedMotionQuery.addEventListener("change", () => {
    syncReducedMotionPreference();
    renderCurrentScene();
  });
} else if (reducedMotionQuery?.addListener) {
  reducedMotionQuery.addListener(() => {
    syncReducedMotionPreference();
    renderCurrentScene();
  });
}

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
  const previousCaseId = appState.caseId;
  invalidateCaseRequests();
  appState.caseId = nextCaseId;
  closeBriefingModal();
  closeObservationSheet();
  const requestContext = createCaseRequestContext();
  const res = await fetch("/api/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId: appState.sessionId,
      language: appState.language,
      caseId: nextCaseId,
      client_state: null
    })
  });
  const data = await res.json();
  if (shouldIgnoreCaseResponse(requestContext, data)) return;
  if (!res.ok) {
    appState.caseId = previousCaseId;
    renderCaseSelect();
    appendMessage(data.error || I18N.t(appState.language, "errorGeneric"), "system");
    return;
  }
  clearStoredClientState();
  appState.clientState = null;
  applyState(data, { clearChat: true });
  appendMessage(
    I18N.t(appState.language, "caseSwitched", { title: appState.publicState?.case_title || nextCaseId }),
    "detective"
  );
  modelUsedValue.textContent = "-";
  renderSolutionResult(null);
  clearSolutionComposer();
});

checkSolutionBtn.addEventListener("click", async () => {
  await submitSolution({ reveal: false });
});

if (revealSolutionBtn) {
  revealSolutionBtn.addEventListener("click", async () => {
    await submitSolution({ reveal: true });
  });
}

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

if (chatThreadCharacterBtn) {
  chatThreadCharacterBtn.addEventListener("click", () => {
    setCaseThreadMode("character");
  });
}

if (chatThreadCaseBtn) {
  chatThreadCaseBtn.addEventListener("click", () => {
    setCaseThreadMode("case");
  });
}

if (chatTabWatson) {
  chatTabWatson.addEventListener("click", () => {
    setChatMode("watson");
  });
}

if (watsonCard) {
  watsonCard.addEventListener("click", () => {
    setChatMode("watson");
  });
}

if (watsonHintBtn) {
  watsonHintBtn.addEventListener("click", async () => {
    const prompt = appState.language === "el"
      ? "Έχω κολλήσει. Δώσε μου μια σύντομη υπόδειξη."
      : "I'm stuck. Give me one short hint.";
    await sendWatsonMessage(prompt, { autoSwitch: true });
  });
}

if (moveLocationBtn) {
  moveLocationBtn.addEventListener("click", async () => {
    const targetId = locationSelectEl?.value || appState.publicState?.current_location_id || "";
    triggerHapticCue(10);
    playSoundCue("tap");
    await sendLocationAction("move", targetId);
  });
}

if (inspectLocationBtn) {
  inspectLocationBtn.addEventListener("click", async () => {
    const currentId = appState.publicState?.current_location_id || locationSelectEl?.value || "";
    triggerHapticCue(10);
    playSoundCue("tap");
    await sendLocationAction("inspect", currentId);
  });
}

if (sceneImageEl) {
  sceneImageEl.addEventListener("load", () => {
    hideSceneTransitionOverlay();
  });
  sceneImageEl.addEventListener("error", () => {
    hideSceneTransitionOverlay();
  });
}

if (sceneHotspotsEl) {
  sceneHotspotsEl.addEventListener("click", async (event) => {
    const hotspotBtn = event.target.closest("[data-hotspot-id]");
    if (!hotspotBtn) return;
    const hotspotId = hotspotBtn.dataset.hotspotId;
    selectHotspot(hotspotId);
    triggerHapticCue(10);
    playSoundCue("tap");
    await sendObserveAction(hotspotId);
  });
}

if (scenePinListEl) {
  scenePinListEl.addEventListener("click", async (event) => {
    const pinBtn = event.target.closest("[data-hotspot-id]");
    if (!pinBtn) return;
    const hotspotId = String(pinBtn.dataset.hotspotId || "");
    if (!hotspotId) return;
    selectHotspot(hotspotId);
    triggerHapticCue(10);
    playSoundCue("tap");
    await sendObserveAction(hotspotId);
  });
}

if (observationListEl) {
  observationListEl.addEventListener("click", (event) => {
    const promptBtn = event.target.closest("[data-observation-prompt]");
    if (promptBtn) {
      insertPromptInComposer(promptBtn.dataset.observationPrompt);
      return;
    }
    const expandBtn = event.target.closest("[data-observation-expand]");
    if (expandBtn) {
      const hotspotId = String(expandBtn.dataset.observationExpand || "");
      if (!hotspotId) return;
      selectHotspot(hotspotId);
      openObservationSheet(hotspotId);
      triggerHapticCue(10);
      playSoundCue("tap");
      return;
    }
    const row = event.target.closest("[data-observation-source]");
    if (!row) return;
    const hotspotId = String(row.dataset.observationSource || "");
    if (!hotspotId) return;
    selectHotspot(hotspotId);
    openObservationSheet(hotspotId);
  });
}

if (observationPromptListEl) {
  observationPromptListEl.addEventListener("click", (event) => {
    const promptBtn = event.target.closest("[data-observation-prompt]");
    if (!promptBtn) return;
    insertPromptInComposer(promptBtn.dataset.observationPrompt);
  });
}

if (observationSheetEl) {
  observationSheetEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-observation-sheet-close]")) {
      closeObservationSheet();
    }
  });
}

if (observationSheetCloseBtn) {
  observationSheetCloseBtn.addEventListener("click", () => {
    closeObservationSheet();
  });
}

if (observationSheetObserveBtn) {
  observationSheetObserveBtn.addEventListener("click", async () => {
    const hotspotId = String(observationSheetObserveBtn.dataset.hotspotId || "");
    if (!hotspotId || observationSheetObserveBtn.disabled) return;
    await sendObserveAction(hotspotId, { openSheet: true });
  });
}

if (observationSheetUsePromptBtn) {
  observationSheetUsePromptBtn.addEventListener("click", () => {
    const prompt = String(observationSheetUsePromptBtn.dataset.prompt || "");
    if (!prompt) return;
    insertPromptInComposer(prompt);
    closeObservationSheet();
  });
}

if (observationSheetJumpBtn) {
  observationSheetJumpBtn.addEventListener("click", () => {
    const hotspotId = String(observationSheetJumpBtn.dataset.hotspotId || "");
    if (!hotspotId) return;
    scrollObservationSourceIntoView(hotspotId);
    closeObservationSheet();
  });
}

if (observationSheetPromptListEl) {
  observationSheetPromptListEl.addEventListener("click", (event) => {
    const promptBtn = event.target.closest("[data-observation-prompt]");
    if (!promptBtn) return;
    insertPromptInComposer(promptBtn.dataset.observationPrompt);
    closeObservationSheet();
  });
}

if (openBriefingBtn) {
  openBriefingBtn.addEventListener("click", () => {
    openBriefingModal("folder");
  });
}

if (openNarrationBtn) {
  openNarrationBtn.addEventListener("click", () => {
    openBriefingModal("watson");
  });
}

if (briefingCloseBtn) {
  briefingCloseBtn.addEventListener("click", () => {
    closeBriefingModal();
  });
}

if (briefingFolderTab) {
  briefingFolderTab.addEventListener("click", () => {
    setBriefingMode("folder");
  });
}

if (briefingWatsonTab) {
  briefingWatsonTab.addEventListener("click", () => {
    setBriefingMode("watson");
  });
}

if (briefingModalEl) {
  briefingModalEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-briefing-close]")) {
      closeBriefingModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (observationSheetEl && !observationSheetEl.hidden) {
    event.preventDefault();
    closeObservationSheet();
    return;
  }
  if (briefingModalEl && !briefingModalEl.hidden) {
    event.preventDefault();
    closeBriefingModal();
  }
});

if (analyzeToggle) {
  analyzeToggle.addEventListener("change", () => {
    appState.analyzeMode = Boolean(analyzeToggle.checked);
    localStorage.setItem("analyzeMode", appState.analyzeMode);
    renderCurrentScene();
  });
}

if (hapticsToggle) {
  hapticsToggle.addEventListener("change", () => {
    appState.hapticsEnabled = Boolean(hapticsToggle.checked);
    localStorage.setItem("hapticsEnabled", appState.hapticsEnabled);
  });
}

if (soundToggle) {
  soundToggle.addEventListener("change", () => {
    appState.soundEnabled = Boolean(soundToggle.checked);
    localStorage.setItem("soundEnabled", appState.soundEnabled);
    playSoundCue("tap");
  });
}

if (mobileDockEl) {
  mobileDockEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-mobile-target]");
    if (!btn) return;
    const target = String(btn.dataset.mobileTarget || "");
    if (!target) return;
    scrollToMobilePanel(target);
    triggerHapticCue(9);
    playSoundCue("tap");
  });
}

if (mainGridEl) {
  mainGridEl.addEventListener("scroll", () => {
    if (mobilePanelScrollRaf) return;
    mobilePanelScrollRaf = requestAnimationFrame(() => {
      mobilePanelScrollRaf = null;
      syncMobileDockFromScroll();
    });
  }, { passive: true });
}

if (chatLogEl) {
  chatLogEl.addEventListener("scroll", () => {
    chatScrollPositions.set(getActiveThreadKey(), chatLogEl.scrollTop);
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
