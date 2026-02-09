/**
 * Enriches raw case state with consistent public context, character frame data, and location contacts.
 * This module normalizes story-facing structures so interrogation prompts have stable narrative inputs.
 */
import { buildCaseIntro } from "./intro.js";
import { getLocalized } from "./i18n.js";

const loc = (en, el = en) => ({ en, el });

// Safely unwraps localized or plain values into a single language string.
function unwrap(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value[lang]) return value[lang];
  if (value.en) return value.en;
  return "";
}

// Deduplicates values while filtering empty entries.
function unique(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

// Ensures each character has a baseline story pack for last-seen and last-contact facts.
function ensureStoryPack(character, publicState) {
  if (character.story_pack && typeof character.story_pack === "object") {
    return character.story_pack;
  }
  const victimName = publicState?.victim_name || loc("the victim", "το θύμα");
  character.story_pack = {
    last_seen: {
      mode: "none",
      time: "",
      location_id: "",
      note: loc(
        "I did not see the victim in person that day.",
        "Δεν είδα το θύμα από κοντά εκείνη την ημέρα."
      )
    },
    last_contact: {
      mode: "none",
      time: "",
      with: victimName,
      note: loc(
        "No direct contact was made.",
        "Δεν υπήρξε άμεση επαφή."
      )
    }
  };
  return character.story_pack;
}

// Builds a localized frame line from story pack data for prompt-ready truth fields.
function buildFrameTextFromStory({ storyPack, key }) {
  if (!storyPack) return "";
  if (key === "last_seen" && storyPack.last_seen) {
    const note = storyPack.last_seen.note || "";
    const time = storyPack.last_seen.time || "";
    const noteEn = typeof note === "string" ? note : note.en;
    const noteEl = typeof note === "string" ? note : note.el;
    const timeEn = typeof time === "string" ? time : time.en;
    const timeEl = typeof time === "string" ? time : time.el;
    return loc(
      noteEn
        ? `${noteEn}${timeEn ? ` (time: ${timeEn})` : ""}`
        : "I did not see the victim in person.",
      noteEl
        ? `${noteEl}${timeEl ? ` (ώρα: ${timeEl})` : ""}`
        : "Δεν είδα το θύμα από κοντά."
    );
  }
  if (key === "last_contact" && storyPack.last_contact) {
    const note = storyPack.last_contact.note || "";
    const time = storyPack.last_contact.time || "";
    const noteEn = typeof note === "string" ? note : note.en;
    const noteEl = typeof note === "string" ? note : note.el;
    const timeEn = typeof time === "string" ? time : time.en;
    const timeEl = typeof time === "string" ? time : time.el;
    return loc(
      noteEn
        ? `${noteEn}${timeEn ? ` (time: ${timeEn})` : ""}`
        : "No direct contact.",
      noteEl
        ? `${noteEl}${timeEl ? ` (ώρα: ${timeEl})` : ""}`
        : "Δεν υπήρξε άμεση επαφή."
    );
  }
  return loc("I cannot confirm that time.", "Δεν μπορώ να το επιβεβαιώσω.");
}

// Ensures core interrogation frames exist and default to non-lie placeholders.
function ensureFrames(character, publicState) {
  if (!character.frames || typeof character.frames !== "object") {
    character.frames = {};
  }
  const storyPack = character.story_pack;
  if (!character.frames.last_seen) {
    character.frames.last_seen = {
      truth: { text: buildFrameTextFromStory({ storyPack, key: "last_seen" }) },
      lie_allowed: false
    };
  }
  if (!character.frames.last_contact) {
    character.frames.last_contact = {
      truth: { text: buildFrameTextFromStory({ storyPack, key: "last_contact" }) },
      lie_allowed: false
    };
  }
  if (!character.frames.alibi_at_time) {
    character.frames.alibi_at_time = {
      truth: {
        text: loc(
          "I can’t place myself precisely at that minute; check the logs or cameras.",
          "Δεν μπορώ να τοποθετήσω τον εαυτό μου με ακρίβεια· ελέγξτε logs ή κάμερες."
        )
      },
      lie_allowed: false
    };
  }
}

// Normalizes location id arrays into trimmed, unique values.
function normalizeLocationIds(value) {
  return unique((Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()));
}

// Ensures every character has a normalized presence block.
function ensurePresence(character) {
  const current = character?.presence && typeof character.presence === "object" ? character.presence : {};
  const ids = normalizeLocationIds(current.location_ids);
  character.presence = {
    location_ids: ids
  };
}

// Resolves the active location id against known case locations.
function normalizeCurrentLocation(publicState) {
  const locations = Array.isArray(publicState?.case_locations) ? publicState.case_locations : [];
  if (!locations.length) return "";
  const validIds = new Set(locations.map((entry) => entry.id).filter(Boolean));
  let currentId = String(publicState.current_location_id || "").trim();
  if (!currentId || !validIds.has(currentId)) {
    currentId = String(locations[0].id || "").trim();
  }
  return currentId;
}

// Keeps location navigation fields coherent and initialized for gameplay.
function ensureLocationState(publicState) {
  if (!publicState) return;
  const currentId = normalizeCurrentLocation(publicState);
  publicState.current_location_id = currentId;

  const visited = normalizeLocationIds(publicState.visited_location_ids);
  if (currentId && !visited.includes(currentId)) visited.unshift(currentId);
  publicState.visited_location_ids = visited;

  publicState.location_intel_ids = normalizeLocationIds(publicState.location_intel_ids);
  publicState.introduced_character_ids = normalizeLocationIds(publicState.introduced_character_ids);
}

// Derives a practical contact role label from location naming hints.
function pickContactRole(location) {
  const label = `${getLocalized(location?.name, "en")} ${getLocalized(location?.descriptor, "en")}`.toLowerCase();
  if (label.includes("office")) return loc("Office Clerk", "Υπάλληλος Γραφείου");
  if (label.includes("warehouse")) return loc("Warehouse Guard", "Φύλακας Αποθήκης");
  if (label.includes("cafe") || label.includes("kiosk")) return loc("Cafe Staff", "Προσωπικό Καφέ");
  if (label.includes("clinic")) return loc("Reception Nurse", "Υποδοχή Κλινικής");
  if (label.includes("villa") || label.includes("house")) return loc("House Steward", "Οικονόμος");
  return loc("Site Guard", "Φύλακας Σημείου");
}

// Creates a synthetic location contact character tied to one scene.
function buildLocationContact({ location, fallbackSuspectId }) {
  const locationNameEn = getLocalized(location?.name, "en") || "Scene";
  const locationNameEl = getLocalized(location?.name, "el") || locationNameEn;
  const hintEn = getLocalized(location?.hint, "en") || "Something about this spot is worth a second look.";
  const hintEl = getLocalized(location?.hint, "el") || hintEn;
  const contactRole = pickContactRole(location);
  return {
    id: `contact-${location.id}`,
    name: `${locationNameEn} Contact`,
    role: contactRole,
    is_location_contact: true,
    presence: {
      location_ids: [location.id]
    },
    psycho: [loc("observant"), loc("guarded"), loc("practical")],
    goals: [loc("share what was directly observed"), loc("avoid speculation")],
    secrets: [loc("keeps quiet about regular visitors")],
    private_facts: {
      true_alibi: loc(
        `on duty at ${locationNameEn} around the key timeline`,
        `σε υπηρεσία στο ${locationNameEl} στο κρίσιμο χρονικό παράθυρο`
      ),
      lie_alibi: loc(
        `taking a short break away from ${locationNameEn}`,
        `σε σύντομο διάλειμμα μακριά από ${locationNameEl}`
      ),
      motive: loc("none"),
      suspicion_id: fallbackSuspectId || "",
      observation: {
        text: loc(
          `Something at ${locationNameEn} felt off: ${hintEn}`,
          `Κάτι στο ${locationNameEl} μου φάνηκε λάθος: ${hintEl}`
        ),
        evidence: loc(
          `${locationNameEn} duty note`,
          `σημείωση υπηρεσίας ${locationNameEl}`
        )
      },
      leverage: loc(
        `tracks routine movement around ${locationNameEn}`,
        `παρακολουθεί τη ρουτίνα γύρω από ${locationNameEl}`
      )
    },
    knowledge: [loc(hintEn, hintEl)],
    lie_strategy_tags: ["deflect_mistakes"],
    story_pack: {
      last_seen: {
        mode: "in_person",
        time: loc("during shift", "κατά τη βάρδια"),
        location_id: location.id,
        note: loc(
          `I stayed posted at ${locationNameEn}.`,
          `Έμεινα στη θέση μου στο ${locationNameEl}.`
        )
      },
      last_contact: {
        mode: "none",
        time: "",
        with: loc("the victim", "το θύμα"),
        note: loc("No direct contact.", "Καμία άμεση επαφή.")
      }
    },
    relationship_summary: loc(
      `Local contact stationed at ${locationNameEn}.`,
      `Τοπική επαφή που βρίσκεται στο ${locationNameEl}.`
    ),
    relationship_to_victim: loc(
      "location witness with no close tie",
      "μάρτυρας σημείου χωρίς στενή σχέση"
    )
  };
}

// Adds missing location contact characters so each location can surface witness-style intel.
function ensureLocationContacts(state) {
  const publicState = state?.public_state;
  if (!publicState) return;
  const locations = Array.isArray(publicState.case_locations) ? publicState.case_locations : [];
  if (!locations.length) return;
  const existingIds = new Set((state.characters || []).map((character) => character.id));
  const fallbackSuspectId = (state.characters || []).find((character) => !character.is_location_contact)?.id || "";
  for (const location of locations) {
    if (!location?.id) continue;
    const contactId = `contact-${location.id}`;
    if (existingIds.has(contactId)) continue;
    const contact = buildLocationContact({ location, fallbackSuspectId });
    state.characters.push(contact);
    existingIds.add(contactId);
  }
}

// Fills missing public context blocks required by narration and UI.
function ensurePublicContext(state) {
  if (!state.public_state) return;
  if (!state.public_state.case_locations) {
    const location = state.public_state.case_location || loc("Unknown location", "Άγνωστη τοποθεσία");
    state.public_state.case_locations = [
      {
        id: "primary-location",
        name: location,
        descriptor: loc("Primary scene", "Κύρια σκηνή"),
        hint: loc("Use this label consistently.", "Χρησιμοποίησε αυτή την ετικέτα.")
      }
    ];
  }
  if (!state.public_state.victim_dossier) {
    const victimName = state.public_state.victim_name || loc("Victim", "Θύμα");
    const victimRole = state.public_state.victim_role || loc("Unknown role", "Άγνωστος ρόλος");
    const victimNameEn = unwrap(victimName, "en");
    const victimNameEl = unwrap(victimName, "el");
    const victimRoleEn = unwrap(victimRole, "en");
    const victimRoleEl = unwrap(victimRole, "el");
    state.public_state.victim_dossier = {
      bio: loc(
        `${victimNameEn} (${victimRoleEn})`,
        `${victimNameEl} (${victimRoleEl})`
      ),
      last_seen: loc("Last seen at the main scene.", "Τελευταία εμφάνιση στο κύριο σημείο."),
      relationship_summary: loc("Details vary by witness.", "Οι λεπτομέρειες ποικίλλουν ανά μάρτυρα.")
    };
  }
  if (!Array.isArray(state.public_state.relationship_history)) {
    state.public_state.relationship_history = [];
  }
  ensureLocationState(state.public_state);
}

// Applies all story enrichments needed before a case state is used in play.
export function enrichStateFromCase(state) {
  ensurePublicContext(state);
  ensureLocationContacts(state);
  state.characters = (state.characters || []).map((character) => {
    ensureStoryPack(character, state.public_state);
    ensureFrames(character, state.public_state);
    ensurePresence(character);
    return character;
  });
  state.public_state.case_intro = buildCaseIntro(state);
  return state;
}
