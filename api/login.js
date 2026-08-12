"use strict";

const { allowMethods, HttpError, parseJsonBody, sendJson } = require("./_lib/http");
const {
  createSessionToken,
  isProduction,
  safeEqual,
  sessionCookie
} = require("./_lib/session");

async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const configuredPassword = process.env.AUTOLUB_PASSWORD;
    const secret = process.env.AUTOLUB_SESSION_SECRET;
    if (!configuredPassword || !secret) {
      throw new Error("Configuração de autenticação ausente.");
    }

    const body = await parseJsonBody(req);
    const password = body && typeof body.password === "string" ? body.password : "";
    if (!password || !safeEqual(password, configuredPassword)) {
      sendJson(res, 401, { success: false, message: "Senha incorreta." });
      return;
    }

    const token = createSessionToken(secret);
    res.setHeader(
      "Set-Cookie",
      sessionCookie(token, { secure: isProduction(process.env) })
    );
    sendJson(res, 200, { success: true, authenticated: true });
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = statusCode < 500 ? error.message : "Não foi possível autenticar.";
    sendJson(res, statusCode, { success: false, message });
  }
}

module.exports = handler;
