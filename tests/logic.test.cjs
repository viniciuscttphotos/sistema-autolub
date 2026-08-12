const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { projectPath } = require("./helpers.cjs");

const importProjectModule = file => import(`${pathToFileURL(projectPath(file)).href}?test=${Date.now()}-${Math.random()}`);

test("datas locais não retrocedem um dia e intervalos inválidos são rejeitados", async () => {
  const utils = await importProjectModule("js/utils.js");
  assert.equal(utils.formatDateShort("2026-08-12"), "12/08/26");
  assert.equal(utils.toDateInputValue(new Date(2026, 7, 12)), "2026-08-12");
  assert.equal(utils.validateDateRange("2026-08-13", "2026-08-12").valid, false);
  assert.equal(utils.validateDateRange("2026-08-12", "2026-08-12").valid, true);
});

test("validação de lançamento cobre valor, crédito, locador e limites", async () => {
  const { validateEntry } = await importProjectModule("js/utils.js");
  const base = { attendant: "Ana", service: "Troca de óleo", value: "125,50", paymentMethod: "Pix", installments: 0, isRental: false, renter: "" };
  assert.deepEqual(validateEntry(base), { valid: true, value: "125.50", installments: 0 });
  assert.equal(validateEntry({ ...base, value: 0 }).valid, false);
  assert.equal(validateEntry({ ...base, value: -1 }).valid, false);
  assert.equal(validateEntry({ ...base, value: "abc" }).valid, false);
  assert.equal(validateEntry({ ...base, paymentMethod: "Crédito", installments: 0 }).valid, false);
  assert.equal(validateEntry({ ...base, paymentMethod: "Crédito", installments: 13 }).valid, false);
  assert.equal(validateEntry({ ...base, paymentMethod: "Crédito", installments: 3 }).valid, true);
  assert.equal(validateEntry({ ...base, isRental: true, renter: "" }).valid, false);
  assert.equal(validateEntry({ ...base, service: "x".repeat(501) }).valid, false);
});

test("fila remove pelo ID correto mesmo quando a posição muda", async () => {
  global.localStorage = { getItem: () => null, setItem: () => {} };
  const { removeQueueItemById } = await importProjectModule("js/queue.js");
  const changedQueue = [{ id: "novo" }, { id: "concluir" }, { id: "outro" }];
  assert.deepEqual(removeQueueItemById(changedQueue, "concluir").map(item => item.id), ["novo", "outro"]);
});

test("cliente distingue timeout de mutação e cancela leitura anterior", async () => {
  global.window = { dispatchEvent() {} };
  global.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
  const { apiRequest } = await importProjectModule("js/api.js");

  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
  });
  const timeout = await apiRequest({ action: "addLancamento" }, { mutation: true, timeoutMs: 5 });
  assert.equal(timeout.timeout, true);
  assert.equal(timeout.indeterminate, true);

  let resolveFirst;
  global.fetch = (_url, options) => new Promise((resolve, reject) => {
    resolveFirst ||= resolve;
    options.signal.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "AbortError" })));
    if (resolveFirst !== resolve) resolve({ ok: true, json: async () => ({ success: true, data: ["novo"] }) });
  });
  const first = apiRequest({ action: "listLancamentos" }, { requestKey: "history-test", timeoutMs: 100 });
  const second = apiRequest({ action: "listLancamentos" }, { requestKey: "history-test", timeoutMs: 100 });
  assert.equal((await first).stale, true);
  assert.equal((await second).success, true);
});
