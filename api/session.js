"use strict";

const { allowMethods, sendJson } = require("./_lib/http");
const { readSession } = require("./_lib/session");

function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;

  const secret = process.env.AUTOLUB_SESSION_SECRET;
  if (!secret) {
    sendJson(res, 500, { success: false, authenticated: false });
    return;
  }

  const session = readSession(req, secret);
  if (!session) {
    sendJson(res, 401, { success: false, authenticated: false });
    return;
  }

  sendJson(res, 200, {
    success: true,
    authenticated: true,
    expiresAt: new Date(session.exp * 1000).toISOString()
  });
}

module.exports = handler;
