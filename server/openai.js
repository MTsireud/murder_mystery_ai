import OpenAI from "openai";

let client = null;
const temperatureUnsupportedModels = new Set();

function normalizeModelName(model) {
  return String(model || "").trim().toLowerCase();
}

function isUnsupportedTemperatureError(error) {
  const param = error?.param || error?.error?.param;
  if (param === "temperature") return true;
  const message = error?.error?.message || error?.message || "";
  return message.toLowerCase().includes("unsupported parameter") && message.includes("temperature");
}

function supportsTemperature(model) {
  const normalized = normalizeModelName(model);
  if (!normalized) return true;
  if (temperatureUnsupportedModels.has(normalized)) return false;
  if (normalized.startsWith("gpt-5")) return false;
  return true;
}

function stripTemperature(params) {
  if (!params || typeof params !== "object") return params;
  if (!Object.prototype.hasOwnProperty.call(params, "temperature")) return params;
  const { temperature, ...rest } = params;
  return rest;
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function createResponse(clientInstance, params) {
  if (!clientInstance) throw new Error("OpenAI client unavailable.");
  const model = params?.model;
  const shouldStrip = !supportsTemperature(model);
  const request = shouldStrip ? stripTemperature(params) : params;

  try {
    return await clientInstance.responses.create(request);
  } catch (error) {
    if (!shouldStrip && isUnsupportedTemperatureError(error)) {
      const normalized = normalizeModelName(model);
      if (normalized) temperatureUnsupportedModels.add(normalized);
      return await clientInstance.responses.create(stripTemperature(params));
    }
    throw error;
  }
}
