const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cookiePair,
  createRequest,
  createResponse,
  loadHandler
} = require("./helpers.cjs");

const ORIGINAL_ENV = { ...process.env };

test.beforeEach(() => {
  process.env.AUTOLUB_PASSWORD = "senha-local-de-teste";
  process.env.AUTOLUB_SESSION_SECRET = "segredo-local-de-teste-com-32-caracteres";
  process.env.AUTOLUB_GAS_URL = "https://example.test/apps-script";
  process.env.VERCEL_ENV = "production";
});

test.after(() => {
  process.env = ORIGINAL_ENV;
});

async function call(relativePath, requestOptions) {
  const { handler } = loadHandler(relativePath);
  const req = createRequest(requestOptions);
  const res = createResponse();
  await handler(req, res);
  return res.result();
}

test("login rejeita método inadequado e senha inválida", async () => {
  const wrongMethod = await call("api/login.js", { method: "GET" });
  assert.equal(wrongMethod.statusCode, 405);

  const invalid = await call("api/login.js", {
    method: "POST",
    body: { password: "senha-incorreta" }
  });
  assert.equal(invalid.statusCode, 401);
  assert.notEqual(invalid.body?.success, true);
  assert.equal(invalid.headers.has("set-cookie"), false);
});

test("login válido cria cookie seguro sem revelar credenciais", async () => {
  const result = await call("api/login.js", {
    method: "POST",
    body: { password: process.env.AUTOLUB_PASSWORD }
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body?.success, true);

  const setCookie = Array.isArray(result.headers.get("set-cookie"))
    ? result.headers.get("set-cookie").join("; ")
    : result.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=(?:Strict|Lax)/i);
  assert.match(setCookie, /Path=\//i);
  assert.doesNotMatch(setCookie, new RegExp(process.env.AUTOLUB_PASSWORD));
  assert.doesNotMatch(setCookie, new RegExp(process.env.AUTOLUB_SESSION_SECRET));
});

test("sessão reconhece cookie válido e rejeita cookie adulterado", async () => {
  const login = await call("api/login.js", {
    method: "POST",
    body: { password: process.env.AUTOLUB_PASSWORD }
  });
  const cookie = cookiePair(login.headers.get("set-cookie"));

  const valid = await call("api/session.js", { method: "GET", headers: { cookie } });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.body?.authenticated, true);

  const separator = cookie.indexOf("=");
  const alteredCookie = `${cookie.slice(0, separator + 1)}${cookie.slice(separator + 1)}x`;
  const altered = await call("api/session.js", { method: "GET", headers: { cookie: alteredCookie } });
  assert.notEqual(altered.body?.authenticated, true);
});

test("logout invalida a sessão com cookie expirado", async () => {
  const result = await call("api/logout.js", { method: "POST" });
  assert.equal(result.statusCode, 200);
  const setCookie = Array.isArray(result.headers.get("set-cookie"))
    ? result.headers.get("set-cookie").join("; ")
    : result.headers.get("set-cookie");
  assert.match(setCookie, /(?:Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
  assert.match(setCookie, /HttpOnly/i);
});

test("proxy do Apps Script exige sessão e restringe métodos", async () => {
  const unauthorized = await call("api/gas.js", {
    method: "POST",
    body: { params: { action: "listLocadores" } }
  });
  assert.equal(unauthorized.statusCode, 401);

  const wrongMethod = await call("api/gas.js", { method: "GET" });
  assert.equal(wrongMethod.statusCode, 405);
});

test("helpers do proxy validam parâmetros e constroem URL server-side", () => {
  const { moduleValue } = loadHandler("api/gas.js");
  assert.equal(typeof moduleValue.normalizeParams, "function");
  assert.equal(typeof moduleValue.buildUpstreamUrl, "function");
  assert.equal(typeof moduleValue.requestAppsScript, "function");

  const params = moduleValue.normalizeParams({ params: { action: "listLocadores", page: 2 } });
  assert.deepEqual(params, { action: "listLocadores", page: "2" });
  const upstream = moduleValue.buildUpstreamUrl(process.env.AUTOLUB_GAS_URL, params, process.env.AUTOLUB_PASSWORD);
  const url = upstream instanceof URL ? upstream : new URL(upstream);
  assert.equal(url.origin, "https://example.test");
  assert.equal(url.searchParams.get("action"), "listLocadores");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("senha"), process.env.AUTOLUB_PASSWORD);
});

test("proxy autenticado encaminha ao Apps Script sem aceitar senha do cliente", async () => {
  const login = await call("api/login.js", {
    method: "POST",
    body: { password: process.env.AUTOLUB_PASSWORD }
  });
  const cookie = cookiePair(login.headers.get("set-cookie"));
  const originalFetch = global.fetch;
  let requestedUrl;
  global.fetch = async url => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: ["Locador teste"] })
    };
  };

  try {
    const result = await call("api/gas.js", {
      method: "POST",
      headers: { cookie },
      body: {
        params: {
          action: "listLocadores",
          senha: "senha-enviada-pelo-cliente",
          password: "outra-senha-do-cliente"
        }
      }
    });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, { success: true, data: ["Locador teste"] });
    assert.equal(requestedUrl.origin, "https://example.test");
    assert.equal(requestedUrl.searchParams.get("action"), "listLocadores");
    assert.equal(requestedUrl.searchParams.get("senha"), process.env.AUTOLUB_PASSWORD);
    assert.equal(requestedUrl.searchParams.has("password"), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("cliente recebe erro controlado quando Apps Script retorna JSON inválido", async () => {
  const login = await call("api/login.js", {
    method: "POST",
    body: { password: process.env.AUTOLUB_PASSWORD }
  });
  const cookie = cookiePair(login.headers.get("set-cookie"));
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, text: async () => "não-é-json" });

  try {
    const result = await call("api/gas.js", {
      method: "POST",
      headers: { cookie },
      body: { action: "listLocadores" }
    });
    assert.equal(result.statusCode, 502);
    assert.equal(result.body?.success, false);
  } finally {
    global.fetch = originalFetch;
  }
});
