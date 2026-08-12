"use strict";

const crypto = require("crypto");

const COOKIE_NAME = "autolub_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left, right) {
  const leftDigest = crypto.createHash("sha256").update(String(left)).digest();
  const rightDigest = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function createSessionToken(secret, options = {}) {
  assertSecret(secret);
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const ttlSeconds = Number.isFinite(options.ttlSeconds)
    ? options.ttlSeconds
    : SESSION_TTL_SECONDS;
  const issuedAt = Math.floor(now / 1000);
  const payload = {
    v: 1,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    nonce: crypto.randomBytes(16).toString("base64url")
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

function verifySessionToken(token, secret, options = {}) {
  try {
    assertSecret(secret);
    if (typeof token !== "string" || token.length > 2048) return null;

    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const expectedSignature = signPayload(parts[0], secret);
    if (!safeEqual(parts[1], expectedSignature)) return null;

    const payload = JSON.parse(decodeBase64Url(parts[0]));
    const now = Math.floor(
      (Number.isFinite(options.now) ? options.now : Date.now()) / 1000
    );
    if (
      payload.v !== 1 ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      typeof payload.nonce !== "string" ||
      payload.iat > now + 60 ||
      payload.exp <= now ||
      payload.exp - payload.iat > SESSION_TTL_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch (_) {
    return null;
  }
}

function parseCookies(cookieHeader = "") {
  const cookies = {};
  for (const part of String(cookieHeader).split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch (_) {
      cookies[key] = value;
    }
  }
  return cookies;
}

function readSession(req, secret, options) {
  const cookies = parseCookies(req.headers && req.headers.cookie);
  return verifySessionToken(cookies[COOKIE_NAME], secret, options);
}

function isProduction(env = process.env) {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

function sessionCookie(token, options = {}) {
  const maxAge = Number.isFinite(options.maxAge)
    ? Math.max(0, Math.floor(options.maxAge))
    : SESSION_TTL_SECONDS;
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict"
  ];
  if (options.secure) attributes.push("Secure");
  return attributes.join("; ");
}

function clearSessionCookie(options = {}) {
  return sessionCookie("", { maxAge: 0, secure: options.secure });
}

function assertSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("AUTOLUB_SESSION_SECRET deve ter pelo menos 32 caracteres.");
  }
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  clearSessionCookie,
  createSessionToken,
  isProduction,
  parseCookies,
  readSession,
  safeEqual,
  sessionCookie,
  signPayload,
  verifySessionToken
};
