const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { createEsmMirror, listFiles, projectPath } = require("./helpers.cjs");

test("todos os arquivos JavaScript possuem sintaxe válida", () => {
  const files = [
    "script.js",
    ...listFiles("js", file => file.endsWith(".js")),
    ...listFiles("api", file => file.endsWith(".js"))
  ].filter(file => fs.existsSync(projectPath(file)));

  assert.ok(files.length > 0, "Nenhum JavaScript encontrado");
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", projectPath(file)], { encoding: "utf8" });
    assert.equal(result.status, 0, `${file} tem erro de sintaxe:\n${result.stderr || result.stdout}`);
  }
});

test("módulos puros essenciais podem ser importados fora do navegador", async () => {
  const mirror = createEsmMirror();
  try {
    for (const file of ["js/utils.js", "js/queue.js"]) {
      assert.ok(fs.existsSync(projectPath(file)), `Módulo obrigatório ausente: ${file}`);
      const moduleValue = await mirror.importModule(file);
      assert.ok(Object.keys(moduleValue).length > 0, `${file} deve exportar sua API`);
    }
  } finally {
    mirror.cleanup();
  }
});

test("cliente de API usa somente o proxy local", () => {
  const file = "js/api.js";
  assert.ok(fs.existsSync(projectPath(file)), `Módulo obrigatório ausente: ${file}`);
  const source = fs.readFileSync(projectPath(file), "utf8");
  assert.match(source, /["'`]\/api\/gas["'`]/, "O cliente deve chamar /api/gas");
  assert.doesNotMatch(source, /script\.google\.com/i, "O cliente não pode conhecer a URL interna");
});
