(function () {
  const DICT = {
    en: {
      caseFile: "Case File",
      caseTitle: "Backstage Silence",
      caseSubtitle: "Shared-world interrogation simulator",
      caseBriefingTitle: "Case Briefing",
      caseBriefingTime: "Time: {time}",
      caseBriefingLocation: "Location: {location}",
      caseSelect: "Case",
      timeElapsed: "Time Elapsed",
      minutes: "min",
      evidence: "Evidence",
      modelMode: "Model Mode",
      modelAuto: "Auto",
      modelRoutine: "Routine",
      modelCritical: "Critical",
      modelUsed: "Model Used",
      characters: "Characters",
      resetCase: "Reset Case",
      publicIntel: "Intelligence Collected",
      accusations: "Accusations",
      tensions: "Tensions",
      solutionTitle: "Case Resolution",
      solutionHint: "Submit your full theory and include every character.",
      solutionKillerLabel: "Killer",
      solutionMethodLabel: "Method",
      solutionMotiveLabel: "Motive",
      solutionTimelineLabel: "Timeline summary",
      solutionCharacterNotesLabel: "Character involvement",
      solutionReveal: "Reveal solution (you lose)",
      solutionCheck: "Check Solution",
      solutionChecking: "Checking...",
      solutionVerdictCorrect: "Verdict: Correct",
      solutionVerdictPartial: "Verdict: Partially correct",
      solutionVerdictIncorrect: "Verdict: Incorrect",
      solutionVerdictInsufficient: "Verdict: Insufficient detail",
      solutionMissingCharacters: "Missing characters",
      solutionInconsistencies: "Inconsistencies",
      solutionAdvice: "Advice",
      solutionRevealTitle: "Full solution",
      solutionRevealKiller: "Killer: {name}",
      solutionRevealMethod: "Method: {method}",
      solutionRevealMotive: "Motive: {motive}",
      solutionRevealTimeline: "Timeline: {timeline}",
      solutionRevealEvidence: "Planted evidence: {evidence}",
      placeholder: "Ask a question or confront a suspect...",
      send: "Send",
      language: "Language",
      selectCharacter: "Select a character before speaking.",
      nowSpeaking: "You are now speaking with {name}.",
      caseReset: "Case reset. Begin again.",
      caseSwitched: "Case loaded: {title}.",
      errorGeneric: "Something went wrong."
    },
    el: {
      caseFile: "Φάκελος Υπόθεσης",
      caseTitle: "Σιωπή στα Παρασκήνια",
      caseSubtitle: "Προσομοίωση ανάκρισης σε κοινό κόσμο",
      caseBriefingTitle: "Ενημέρωση Υπόθεσης",
      caseBriefingTime: "Ώρα: {time}",
      caseBriefingLocation: "Τοποθεσία: {location}",
      caseSelect: "Υπόθεση",
      timeElapsed: "Χρόνος που πέρασε",
      minutes: "λεπτά",
      evidence: "Αποδείξεις",
      modelMode: "Λειτουργία Μοντέλου",
      modelAuto: "Αυτόματο",
      modelRoutine: "Ρουτίνα",
      modelCritical: "Κρίσιμο",
      modelUsed: "Μοντέλο σε χρήση",
      characters: "Χαρακτήρες",
      resetCase: "Επαναφορά Υπόθεσης",
      publicIntel: "Συγκεντρωμένες Πληροφορίες",
      accusations: "Κατηγορίες",
      tensions: "Εντάσεις",
      solutionTitle: "Λύση Υπόθεσης",
      solutionHint: "Κατάθεσε ολόκληρη τη θεωρία σου και συμπεριέλαβε όλους τους χαρακτήρες.",
      solutionKillerLabel: "Δολοφόνος",
      solutionMethodLabel: "Μέθοδος",
      solutionMotiveLabel: "Κίνητρο",
      solutionTimelineLabel: "Περίληψη χρονολογίου",
      solutionCharacterNotesLabel: "Ρόλοι χαρακτήρων",
      solutionReveal: "Αποκάλυψη λύσης (χάνεις)",
      solutionCheck: "Έλεγχος Λύσης",
      solutionChecking: "Έλεγχος...",
      solutionVerdictCorrect: "Ετυμηγορία: Σωστό",
      solutionVerdictPartial: "Ετυμηγορία: Μερικώς σωστό",
      solutionVerdictIncorrect: "Ετυμηγορία: Λάθος",
      solutionVerdictInsufficient: "Ετυμηγορία: Ανεπαρκείς λεπτομέρειες",
      solutionMissingCharacters: "Χαρακτήρες που λείπουν",
      solutionInconsistencies: "Ασυνέπειες",
      solutionAdvice: "Συμβουλές",
      solutionRevealTitle: "Πλήρης λύση",
      solutionRevealKiller: "Δολοφόνος: {name}",
      solutionRevealMethod: "Μέθοδος: {method}",
      solutionRevealMotive: "Κίνητρο: {motive}",
      solutionRevealTimeline: "Χρονολόγιο: {timeline}",
      solutionRevealEvidence: "Τοποθετημένα στοιχεία: {evidence}",
      placeholder: "Κάνε μια ερώτηση ή αντιμετώπισε έναν ύποπτο...",
      send: "Αποστολή",
      language: "Γλώσσα",
      selectCharacter: "Επίλεξε χαρακτήρα πριν μιλήσεις.",
      nowSpeaking: "Μιλάς τώρα με {name}.",
      caseReset: "Η υπόθεση επαναφέρθηκε. Ξεκίνα ξανά.",
      caseSwitched: "Η υπόθεση φορτώθηκε: {title}.",
      errorGeneric: "Κάτι πήγε στραβά."
    }
  };

  function normalizeLanguage(input) {
    if (!input) return "en";
    const value = String(input).toLowerCase();
    return value.startsWith("el") ? "el" : "en";
  }

  function interpolate(template, vars = {}) {
    return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : ""));
  }

  function t(lang, key, vars) {
    const language = normalizeLanguage(lang);
    const template = DICT[language]?.[key] || DICT.en[key] || "";
    return interpolate(template, vars);
  }

  window.I18N = {
    t,
    normalizeLanguage,
    DICT
  };
})();
