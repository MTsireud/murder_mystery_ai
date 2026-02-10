import assert from "node:assert/strict";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const CASE_ID = process.env.SMOKE_CASE_ID || "athens-2012-kidnapping";
const LANGUAGE = process.env.SMOKE_LANG || "en";

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function assertObject(value, message) {
  assert.equal(typeof value, "object", message);
  assert.ok(value !== null, message);
  assert.ok(!Array.isArray(value), message);
}

async function postJson(path, body) {
  let lastError = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch (error) {
      lastError = error;
      if (attempt === 6) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError || new Error(`Request failed: ${path}`);
}

function pickHotspotId(publicState, currentScene) {
  const sceneFromPayload = currentScene && typeof currentScene === "object" ? currentScene : null;
  const hotspotsFromPayload = Array.isArray(sceneFromPayload?.hotspots) ? sceneFromPayload.hotspots : [];
  if (hotspotsFromPayload.length) {
    return String(hotspotsFromPayload[0]?.id || "").trim();
  }
  const currentLocationId = String(publicState?.current_location_id || "").trim();
  const locations = Array.isArray(publicState?.case_locations) ? publicState.case_locations : [];
  const currentLocation = locations.find((entry) => entry?.id === currentLocationId) || null;
  const hotspots = Array.isArray(currentLocation?.scene?.hotspots) ? currentLocation.scene.hotspots : [];
  return String(hotspots[0]?.id || "").trim();
}

async function main() {
  const stateResult = await postJson("/api/state", {
    caseId: CASE_ID,
    language: LANGUAGE
  });
  assert.equal(stateResult.res.status, 200, "POST /api/state should return 200");
  const stateData = stateResult.data;
  assert.equal(typeof stateData.sessionId, "string", "state.sessionId must be a string");
  assert.ok(stateData.sessionId.length > 0, "state.sessionId must be non-empty");
  assert.equal(stateData.case_id, CASE_ID, "state.case_id should match requested case");
  assertObject(stateData.public_state, "state.public_state must be an object");
  assertObject(stateData.client_state, "state.client_state must be an object");
  assert.ok(Array.isArray(stateData.public_state.case_locations), "state.case_locations must be an array");

  const locations = stateData.public_state.case_locations;
  assert.ok(locations.length > 0, "state.case_locations must include at least one location");
  const currentLocationId = String(stateData.public_state.current_location_id || "").trim();
  const fallbackLocationId = String(locations[0]?.id || "").trim();
  const moveTargetId = String(
    locations.find((entry) => entry?.id && entry.id !== currentLocationId)?.id || fallbackLocationId
  ).trim();
  assert.ok(moveTargetId, "move target location id must be available");

  const actionResult = await postJson("/api/action", {
    sessionId: stateData.sessionId,
    caseId: CASE_ID,
    language: LANGUAGE,
    actionType: "move",
    locationId: moveTargetId,
    client_state: stateData.client_state
  });
  assert.equal(actionResult.res.status, 200, "POST /api/action should return 200");
  const actionData = actionResult.data;
  assert.equal(actionData.action, "move", "action.action must be move");
  assertObject(actionData.public_state, "action.public_state must be an object");
  assertObject(actionData.client_state, "action.client_state must be an object");
  assert.ok(hasOwn(actionData, "current_scene"), "action response must include current_scene");
  assert.ok(hasOwn(actionData, "transition"), "action response must include transition");
  assert.ok(Array.isArray(actionData.event_delta), "action.event_delta must be an array");
  assert.ok(Array.isArray(actionData.evidence_delta), "action.evidence_delta must be an array");

  const observeLocationId = String(actionData.public_state?.current_location_id || moveTargetId).trim();
  const hotspotId = pickHotspotId(actionData.public_state, actionData.current_scene);
  assert.ok(hotspotId, "observe hotspot id must be available");

  const observeResult = await postJson("/api/observe", {
    sessionId: stateData.sessionId,
    caseId: CASE_ID,
    language: LANGUAGE,
    locationId: observeLocationId,
    hotspotId,
    client_state: actionData.client_state
  });
  assert.equal(observeResult.res.status, 200, "POST /api/observe should return 200");
  const observeData = observeResult.data;
  assert.equal(observeData.action, "observe", "observe.action must be observe");
  assertObject(observeData.observation, "observe.observation must be an object");
  assertObject(observeData.public_state, "observe.public_state must be an object");
  assertObject(observeData.client_state, "observe.client_state must be an object");
  assert.ok(hasOwn(observeData, "current_scene"), "observe response must include current_scene");
  assert.ok(Array.isArray(observeData.event_delta), "observe.event_delta must be an array");
  assert.ok(Array.isArray(observeData.evidence_delta), "observe.evidence_delta must be an array");
  assert.ok(Array.isArray(observeData.suggested_prompts), "observe.suggested_prompts must be an array");

  const solveResult = await postJson("/api/solve", {
    sessionId: stateData.sessionId,
    caseId: CASE_ID,
    language: LANGUAGE,
    reveal: false,
    solution: {
      full_text: "I think Rowan attacked Edmund at the stage door and the missing pass plus timeline support it."
    },
    client_state: observeData.client_state
  });
  assert.equal(solveResult.res.status, 200, "POST /api/solve (submit) should return 200");
  const solveData = solveResult.data;
  assertObject(solveData.result, "solve.result must be an object");
  assert.ok(typeof solveData.result.verdict === "string", "solve.result.verdict must be a string");
  assert.ok(hasOwn(solveData.result, "checks"), "solve.result must include checks");
  assert.ok(hasOwn(solveData.result, "reveal_requested"), "solve.result must include reveal_requested");
  assert.ok(hasOwn(solveData.result, "reveal"), "solve.result must include reveal payload");

  const revealResult = await postJson("/api/solve", {
    sessionId: stateData.sessionId,
    caseId: CASE_ID,
    language: LANGUAGE,
    reveal: true,
    solution: {
      full_text: ""
    },
    client_state: solveData.client_state
  });
  assert.equal(revealResult.res.status, 200, "POST /api/solve (reveal) should return 200");
  const revealData = revealResult.data;
  assertObject(revealData.result, "reveal.result must be an object");
  assert.equal(revealData.result.reveal_requested, true, "reveal.result.reveal_requested must be true");
  assertObject(revealData.result.reveal, "reveal.result.reveal must be an object");
  assert.ok(typeof revealData.result.reveal.killer_name === "string", "reveal.killer_name must be a string");
  assert.ok(typeof revealData.result.reveal.method === "string", "reveal.method must be a string");
  assert.ok(Array.isArray(revealData.result.reveal.timeline), "reveal.timeline must be an array");

  console.log("API smoke checks passed:");
  console.log("- POST /api/state contract");
  console.log("- POST /api/action contract");
  console.log("- POST /api/observe contract");
  console.log("- POST /api/solve submit contract");
  console.log("- POST /api/solve reveal contract");
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  if (error?.cause) {
    console.error("cause:", error.cause);
  }
  process.exit(1);
});
