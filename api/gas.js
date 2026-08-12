"use strict";

const { allowMethods, HttpError, parseJsonBody, sendJson } = require("./_lib/http");
const { readSession } = require("./_lib/session");

const UPSTREAM_TIMEOUT_MS = 20_000;
const MAX_PARAMS = 30;
const MAX_VALUE_LENGTH = 2_000;
const PARAM_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

function normalizeParams(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Parâmetros inválidos.");
  }

  const source = body.params === undefined ? body : body.params;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new HttpError(400, "Parâmetros inválidos.");
  }

  const entries = Object.entries(source);
  if (entries.length === 0 || entries.length > MAX_PARAMS) {
    throw new HttpError(400, "Quantidade de parâmetros inválida.");
  }

  const normalized = {};
  for (const [key, value] of entries) {
    if (!PARAM_NAME_PATTERN.test(key)) {
      throw new HttpError(400, "Nome de parâmetro inválido.");
    }
    if (key.toLowerCase() === "senha" || key.toLowerCase() === "password") {
      continue;
    }
    if (!["string", "number", "boolean"].includes(typeof value)) {
      throw new HttpError(400, `Valor inválido para o parâmetro ${key}.`);
    }

    const stringValue = String(value);
    if (stringValue.length > MAX_VALUE_LENGTH) {
      throw new HttpError(400, `Valor muito longo para o parâmetro ${key}.`);
    }
    normalized[key] = stringValue;
  }

  if (!normalized.action) {
    throw new HttpError(400, "A ação é obrigatória.");
  }
  return normalized;
}

function buildUpstreamUrl(gasUrl, params, password) {
  let url;
  try {
    url = new URL(gasUrl);
  } catch (_) {
    throw new Error("AUTOLUB_GAS_URL inválida.");
  }
  if (url.protocol !== "https:") {
    throw new Error("AUTOLUB_GAS_URL deve usar HTTPS.");
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("senha", password);
  return url;
}

async function requestAppsScript(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || UPSTREAM_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new HttpError(502, `Serviço de dados indisponível (${response.status}).`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new HttpError(502, "O serviço de dados retornou uma resposta inválida.");
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new HttpError(504, "O serviço de dados demorou demais para responder.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const secret = process.env.AUTOLUB_SESSION_SECRET;
    if (!secret) {
      throw new Error("Configuração do servidor ausente.");
    }
    if (!readSession(req, secret)) {
      sendJson(res, 401, { success: false, message: "Sessão inválida ou expirada." });
      return;
    }

    const gasUrl = process.env.AUTOLUB_GAS_URL;
    const password = process.env.AUTOLUB_PASSWORD;
    if (!gasUrl || !password) {
      throw new Error("Configuração do servidor ausente.");
    }

    const body = await parseJsonBody(req);
    const params = normalizeParams(body);
    const upstreamUrl = buildUpstreamUrl(gasUrl, params, password);
    const data = await requestAppsScript(upstreamUrl);
    sendJson(res, 200, data);
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = statusCode < 500
      ? error.message
      : "Não foi possível acessar o serviço de dados.";
    sendJson(res, statusCode, { success: false, message });
  }
}

module.exports = handler;
module.exports.buildUpstreamUrl = buildUpstreamUrl;
module.exports.normalizeParams = normalizeParams;
module.exports.requestAppsScript = requestAppsScript;
