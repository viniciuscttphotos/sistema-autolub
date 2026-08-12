const test = require("node:test");
const assert = require("node:assert/strict");
const { createEsmMirror } = require("./helpers.cjs");

async function withClientApi(callback) {
  const mirror = createEsmMirror();
  const originalFetch = global.fetch;
  try {
    const api = await mirror.importModule("js/api.js");
    await callback(api);
  } finally {
    global.fetch = originalFetch;
    mirror.cleanup();
  }
}

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => data };
}

function abortError() {
  const error = new Error("Abortada");
  error.name = "AbortError";
  return error;
}

test("cliente diferencia timeout indeterminado de falha confirmada", async () => {
  await withClientApi(async ({ apiRequest }) => {
    global.fetch = (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(abortError()), { once: true });
    });
    const result = await apiRequest(
      { action: "addLancamento" },
      { mutation: true, timeoutMs: 5 }
    );
    assert.equal(result.success, false);
    assert.equal(result.timeout, true);
    assert.equal(result.indeterminate, true);
    assert.match(result.message, /confirmar|confira/i);
  });
});

test("cliente trata JSON inválido sem expor exceção", async () => {
  await withClientApi(async ({ apiRequest }) => {
    global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new Error("parse"); } });
    const result = await apiRequest({ action: "listLocadores" });
    assert.equal(result.success, false);
    assert.match(result.message, /resposta inválida/i);
  });
});

test("requisição mais nova cancela resposta antiga com a mesma chave", async () => {
  await withClientApi(async ({ apiRequest }) => {
    let calls = 0;
    global.fetch = (_url, options) => {
      calls += 1;
      if (calls === 2) return Promise.resolve(jsonResponse({ success: true, data: ["novo"] }));
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(abortError()), { once: true });
      });
    };

    const oldRequest = apiRequest({ action: "listLancamentos", filtro: "antigo" }, { requestKey: "history" });
    const newRequest = apiRequest({ action: "listLancamentos", filtro: "novo" }, { requestKey: "history" });
    const [oldResult, newResult] = await Promise.all([oldRequest, newRequest]);
    assert.equal(oldResult.stale, true);
    assert.deepEqual(newResult, { success: true, data: ["novo"] });
  });
});
