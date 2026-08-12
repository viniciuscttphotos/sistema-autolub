"use strict";

const { allowMethods, sendJson } = require("./_lib/http");
const { clearSessionCookie, isProduction } = require("./_lib/session");

function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  res.setHeader(
    "Set-Cookie",
    clearSessionCookie({ secure: isProduction(process.env) })
  );
  sendJson(res, 200, { success: true, authenticated: false });
}

module.exports = handler;
