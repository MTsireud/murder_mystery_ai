import { buildCaseIntro } from "./intro.js";

const loc = (en, el = en) => ({ en, el });

function unwrap(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value[lang]) return value[lang];
  if (value.en) return value.en;
  return "";
}

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
}

export function enrichStateFromCase(state) {
  ensurePublicContext(state);
  state.characters = (state.characters || []).map((character) => {
    ensureStoryPack(character, state.public_state);
    ensureFrames(character, state.public_state);
    return character;
  });
  state.public_state.case_intro = buildCaseIntro(state);
  return state;
}
