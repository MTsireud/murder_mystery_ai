import { getLocalized, normalizeLanguage } from "./i18n.js";
import {
  constructCaseConfig,
  createInvestigationState,
  normalizeInvestigationState
} from "./investigation.js";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values) {
  return Array.from(new Set(ensureArray(values).map((value) => String(value || "").trim()).filter(Boolean)));
}

function buildHotspotReason({ lang, pendingStepIds, revealFactIds }) {
  if (pendingStepIds.length) {
    if (lang === "el") {
      return `Συνδέεται με εκκρεμή βήματα: ${pendingStepIds.join(", ")}`;
    }
    return `Linked to pending clue steps: ${pendingStepIds.join(", ")}`;
  }
  if (revealFactIds.length) {
    if (lang === "el") {
      return `Συνδέεται με δεμένα facts: ${revealFactIds.join(", ")}`;
    }
    return `Linked to ledger facts: ${revealFactIds.join(", ")}`;
  }
  return "";
}

export async function buildWatsonEvidenceContext({ state, language }) {
  const lang = normalizeLanguage(language);
  const caseId = String(state?.case_id || "").trim();
  const publicState = state?.public_state || {};
  const caseLocations = ensureArray(publicState.case_locations);
  const observedHotspotSet = new Set(uniqueStrings(publicState.observed_hotspot_ids));
  const activeLocationId = String(publicState.current_location_id || "").trim();
  const activeLocationName = String(getLocalized(publicState.current_location_name, lang) || "").trim()
    || String(getLocalized(publicState.case_location, lang) || "").trim()
    || activeLocationId
    || "-";

  const normalizedInvestigationState = normalizeInvestigationState(state?.investigation_state, caseId)
    || createInvestigationState(caseId)
    || { completed_step_ids: [] };

  const config = await constructCaseConfig(caseId, {
    truth: state?.truth || {},
    public_state: state?.public_state || {},
    characters: state?.characters || []
  });
  const openStepIds = ensureArray(config?.clue_chain)
    .filter((step) => !ensureArray(normalizedInvestigationState.completed_step_ids).includes(step.id))
    .map((step) => step.id);
  const openStepIdSet = new Set(openStepIds);

  const hotspotEntries = [];
  for (const location of caseLocations) {
    const locationId = String(location?.id || "").trim();
    if (!locationId) continue;
    const locationName = getLocalized(location?.name, lang) || locationId;
    const hotspots = ensureArray(location?.scene?.hotspots);
    for (const hotspot of hotspots) {
      const hotspotId = String(hotspot?.id || "").trim();
      if (!hotspotId) continue;
      const hotspotLabel = getLocalized(hotspot?.label, lang) || hotspotId;
      const unlockStepIds = uniqueStrings(hotspot?.unlock_step_ids);
      const pendingStepIds = unlockStepIds.filter((stepId) => openStepIdSet.has(stepId));
      const revealFactIds = uniqueStrings(hotspot?.reveal_fact_ids);
      const suggestedPrompt = getLocalized(ensureArray(hotspot?.suggested_questions)[0], lang) || "";
      const observed = observedHotspotSet.has(hotspotId);
      const critical = pendingStepIds.length > 0 || revealFactIds.length > 0;
      hotspotEntries.push({
        hotspot_id: hotspotId,
        hotspot_label: hotspotLabel,
        location_id: locationId,
        location_name: locationName,
        object_type: String(hotspot?.object_type || "scene_detail"),
        observed,
        critical,
        pending_step_ids: pendingStepIds,
        reveal_fact_ids: revealFactIds,
        reason: buildHotspotReason({
          lang,
          pendingStepIds,
          revealFactIds
        }),
        suggested_prompt: suggestedPrompt
      });
    }
  }

  const observedHotspots = hotspotEntries
    .filter((entry) => entry.observed)
    .slice(0, 8);
  const unexploredCriticalHotspots = hotspotEntries
    .filter((entry) => !entry.observed && entry.critical)
    .sort((a, b) => {
      const aActive = a.location_id === activeLocationId ? 1 : 0;
      const bActive = b.location_id === activeLocationId ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      if (a.pending_step_ids.length !== b.pending_step_ids.length) {
        return b.pending_step_ids.length - a.pending_step_ids.length;
      }
      return a.hotspot_label.localeCompare(b.hotspot_label);
    })
    .slice(0, 8);
  const recommendedNextHotspots = unexploredCriticalHotspots.slice(0, 3);

  return {
    current_location_id: activeLocationId,
    current_location_name: activeLocationName,
    open_step_ids: openStepIds.slice(0, 10),
    observed_hotspots: observedHotspots,
    unexplored_critical_hotspots: unexploredCriticalHotspots,
    recommended_next_hotspots: recommendedNextHotspots,
    recommended_next_location: recommendedNextHotspots[0]?.location_name || "",
    recommended_next_object: recommendedNextHotspots[0]?.hotspot_label || ""
  };
}
