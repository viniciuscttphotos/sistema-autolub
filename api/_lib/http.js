"use strict";

const MAX_BODY_BYTES = 32 * 1024;

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function sendJson(res, statusCode, body) {
  setSecurityHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;

  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { success: false, message: "Método não permitido." });
  return false;
}

function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return parseBuffer(req.body);
    if (typeof req.body === "string") return parseBuffer(Buffer.from(req.body));
    if (typeof req.body === "object") return req.body;
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Corpo da requisição muito grande."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(parseBuffer(Buffer.concat(chunks)));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function parseBuffer(buffer) {
  if (buffer.length > MAX_BODY_BYTES) {
    throw new HttpError(413, "Corpo da requisição muito grande.");
  }
  if (buffer.length === 0) return {};

  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch (_) {
    throw new HttpError(400, "JSON inválido.");
  }
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

module.exports = {
  HttpError,
  MAX_BODY_BYTES,
  allowMethods,
  parseJsonBody,
  sendJson,
  setSecurityHeaders
};
