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

const appState = {
  sessionId: null,
  caseId: null,
  caseList: [],
  clientState: null,
  activeCharacterId: null,
  characters: [],
  publicState: null,
  language: "en",
  modelMode: "auto"
};

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

function appendMessage(text, type) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;
  chatLogEl.appendChild(messageEl);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
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

function hydrateChatLogFromEvents() {
  const events = appState.clientState?.events || [];
  chatLogEl.innerHTML = "";
  appendCaseBriefing({ force: true });
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
      renderCharacters();
      appendMessage(
        I18N.t(appState.language, "nowSpeaking", { name: character.name }),
        "detective"
      );
    });

    characterListEl.appendChild(card);
  });
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
}

function applyTranslations() {
  const lang = appState.language;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = I18N.t(lang, key);
  });
  messageInput.placeholder = I18N.t(lang, "placeholder");
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
    hydrateChatLogFromEvents();
  } else if (clearChat) {
    appendCaseBriefing({ force: true });
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
      ? ` (mock → ${data.model_selected})`
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
languageSelect.value = appState.language;
modelModeSelect.value = appState.modelMode;
applyTranslations();
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
