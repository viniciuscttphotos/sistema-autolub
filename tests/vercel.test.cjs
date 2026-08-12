const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile } = require("./helpers.cjs");

const config = JSON.parse(readProjectFile("vercel.json"));

function normalizedHeaders() {
  assert.ok(Array.isArray(config.headers), "vercel.json deve definir headers");
  return config.headers.map(rule => ({
    source: rule.source,
    headers: new Map((rule.headers || []).map(header => [header.key.toLowerCase(), header.value]))
  }));
}

function findHeader(name) {
  const key = name.toLowerCase();
  return normalizedHeaders().map(rule => rule.headers.get(key)).find(Boolean);
}

test("vercel.json não mantém rewrite sem efeito", () => {
  assert.ok(!config.rewrites || config.rewrites.length === 0, "Remova rewrites que apontam uma rota para ela mesma");
});

test("headers de segurança obrigatórios estão configurados", () => {
  const expected = [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security"
  ];
  for (const name of expected) assert.ok(findHeader(name), `Header ausente: ${name}`);
  assert.equal(findHeader("X-Content-Type-Options").toLowerCase(), "nosniff");
  assert.match(findHeader("Strict-Transport-Security"), /max-age=\d+/i);
});

test("CSP restringe scripts, objetos, frames e conexões", () => {
  const csp = findHeader("Content-Security-Policy");
  assert.match(csp, /(?:^|;)\s*default-src\s+'self'/i);
  assert.match(csp, /(?:^|;)\s*script-src\s+'self'/i);
  assert.match(csp, /(?:^|;)\s*object-src\s+'none'/i);
  assert.match(csp, /(?:^|;)\s*frame-ancestors\s+'none'/i);
  assert.match(csp, /(?:^|;)\s*connect-src\s+'self'/i);
  assert.doesNotMatch(csp, /'unsafe-inline'|'unsafe-eval'|script\.google\.com/i);
});

test("HTML e assets recebem políticas de cache explícitas", () => {
  const rules = normalizedHeaders();
  const cacheRules = rules.filter(rule => rule.headers.has("cache-control"));
  assert.ok(cacheRules.length >= 2, "Defina cache separado para HTML e assets");

  const htmlRule = cacheRules.find(rule => /index|html/.test(rule.source));
  assert.ok(htmlRule, "Regra de cache do HTML ausente");
  assert.match(htmlRule.headers.get("cache-control"), /no-cache|no-store|max-age=0/i);

  const assetRule = cacheRules.find(rule => /css|js|asset/.test(rule.source));
  assert.ok(assetRule, "Regra de cache dos assets ausente");
  assert.match(assetRule.headers.get("cache-control"), /max-age=\d+/i);
});
