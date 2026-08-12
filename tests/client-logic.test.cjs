const test = require("node:test");
const assert = require("node:assert/strict");
const { createEsmMirror } = require("./helpers.cjs");

async function withModules(callback) {
  const mirror = createEsmMirror();
  try {
    const utils = await mirror.importModule("js/utils.js");
    const queue = await mirror.importModule("js/queue.js");
    await callback({ utils, queue });
  } finally {
    mirror.cleanup();
  }
}

test("datas locais não sofrem deslocamento de fuso", async () => {
  await withModules(({ utils }) => {
    const date = utils.parseLocalDate("2026-08-12");
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 7);
    assert.equal(date.getDate(), 12);
    assert.equal(utils.toDateInputValue(date), "2026-08-12");
    assert.equal(utils.formatDateShort("2026-08-12"), "12/08/26");
  });
});

test("intervalos de data são validados", async () => {
  await withModules(({ utils }) => {
    assert.equal(utils.validateDateRange("2026-08-12", "2026-08-11").valid, false);
    assert.equal(utils.validateDateRange("2026-08-11", "2026-08-12").valid, true);
    assert.equal(utils.validateDateRange("", "2026-08-12").valid, false);
  });
});

test("lançamentos rejeitam valores, parcelas e locador inválidos", async () => {
  await withModules(({ utils }) => {
    const base = {
      attendant: "Luan",
      service: "Troca de óleo",
      value: "100,50",
      paymentMethod: "Pix",
      installments: 0,
      isRental: false,
      renter: ""
    };
    assert.equal(utils.validateEntry(base).valid, true);
    assert.equal(utils.validateEntry({ ...base, value: 0 }).valid, false);
    assert.equal(utils.validateEntry({ ...base, value: -1 }).valid, false);
    assert.equal(utils.validateEntry({ ...base, value: "inválido" }).valid, false);
    assert.equal(utils.validateEntry({ ...base, paymentMethod: "Crédito", installments: 0 }).valid, false);
    assert.equal(utils.validateEntry({ ...base, paymentMethod: "Crédito", installments: 13 }).valid, false);
    assert.equal(utils.validateEntry({ ...base, isRental: true, renter: "" }).valid, false);
  });
});

test("fila remove pelo ID estável mesmo após mudança de posição", async () => {
  await withModules(({ queue }) => {
    const original = [{ id: "a", nome: "Ana" }, { id: "b", nome: "Beto" }];
    const reordered = [{ id: "c", nome: "Caio" }, ...original];
    assert.deepEqual(queue.removeQueueItemById(reordered, "a"), [
      { id: "c", nome: "Caio" },
      { id: "b", nome: "Beto" }
    ]);
  });
});

test("fila recupera armazenamento corrompido com segurança", async () => {
  await withModules(({ queue }) => {
    const corruptStorage = { getItem: () => "{não-é-json" };
    assert.deepEqual(queue.loadQueue(corruptStorage), []);
  });
});
