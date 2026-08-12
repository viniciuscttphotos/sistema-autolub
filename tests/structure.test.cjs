const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  extractAttributes,
  listFiles,
  projectPath,
  readProjectFile
} = require("./helpers.cjs");

const html = readProjectFile("index.html");

test("HTML não contém handlers inline", () => {
  const inlineHandlers = [...html.matchAll(/\s(on[a-z]+)\s*=/gi)].map(match => match[1]);
  assert.deepEqual(inlineHandlers, [], `Handlers inline encontrados: ${inlineHandlers.join(", ")}`);
});

test("assets públicos não expõem senha, segredo ou URL do Apps Script", () => {
  const publicFiles = ["index.html", "style.css", "script.js", ...listFiles("js", file => file.endsWith(".js"))]
    .filter(file => fs.existsSync(projectPath(file)));
  const forbidden = [
    { label: "senha embutida", pattern: /(?:password|senha)\s*[=:]\s*["'`][^"'`]{6,}["'`]/i },
    { label: "URL direta do Apps Script", pattern: /https:\/\/script\.google\.com\/macros\//i },
    { label: "segredo de sessão", pattern: /SESSION_SECRET\s*[=:]\s*["'`][^"'`]+/i }
  ];

  for (const file of publicFiles) {
    const source = readProjectFile(file);
    for (const { label, pattern } of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} expõe ${label}`);
    }
  }
});

test("IDs HTML são únicos e os IDs essenciais existem", () => {
  const ids = [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `IDs duplicados: ${duplicates.join(", ")}`);

  const required = [
    "loginScreen", "loginSenha", "loginErro", "app", "formLancamento", "servico", "valor",
    "filaLista", "historicoLista", "relatorioResultado", "locadoresLista", "editModal", "editMsg"
  ];
  for (const id of required) assert.ok(ids.includes(id), `ID essencial ausente: ${id}`);
});

test("campos visíveis possuem label associado", () => {
  const labelFors = new Set(
    [...html.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(match => match[1])
  );
  const wrappedControlIds = new Set();
  for (const label of html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)) {
    const control = label[1].match(/<(?:input|select|textarea)\b[^>]*\bid\s*=\s*["']([^"']+)["']/i);
    if (control) wrappedControlIds.add(control[1]);
  }

  const unlabeled = [];
  for (const match of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
    const attributes = extractAttributes(match[0]);
    const id = attributes.get("id");
    const type = (attributes.get("type") || "").toLowerCase();
    if (!id || type === "hidden") continue;
    if (!labelFors.has(id) && !wrappedControlIds.has(id) && !attributes.has("aria-label") && !attributes.has("aria-labelledby")) {
      unlabeled.push(id);
    }
  }
  assert.deepEqual(unlabeled, [], `Campos sem label: ${unlabeled.join(", ")}`);
});

test("abas têm semântica ARIA e associação com painéis", () => {
  assert.match(html, /<nav\b[^>]*\brole=["']tablist["']/i, "A navegação deve ter role=tablist");
  const tabs = [...html.matchAll(/<button\b[^>]*\bdata-tab\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  assert.ok(tabs.length >= 4, "As quatro abas principais devem existir");

  for (const tab of tabs) {
    const attributes = extractAttributes(tab[0]);
    const name = tab[1];
    assert.equal(attributes.get("role"), "tab", `A aba ${name} deve ter role=tab`);
    assert.ok(attributes.get("id"), `A aba ${name} deve possuir id`);
    assert.equal(attributes.get("aria-controls"), `tab-${name}`, `A aba ${name} deve controlar seu painel`);
    assert.match(attributes.get("aria-selected") || "", /^(true|false)$/, `A aba ${name} deve expor aria-selected`);

    const panelPattern = new RegExp(`<section\\b(?=[^>]*\\bid=["']tab-${name}["'])(?=[^>]*\\brole=["']tabpanel["'])(?=[^>]*\\baria-labelledby=["']${attributes.get("id")}["'])[^>]*>`, "i");
    assert.match(html, panelPattern, `Painel da aba ${name} deve apontar para a aba`);
  }
});

test("modal e mensagens essenciais são acessíveis", () => {
  const modal = html.match(/<div\b[^>]*\bid=["']editModal["'][^>]*>/i);
  assert.ok(modal, "Modal de edição ausente");
  const attributes = extractAttributes(modal[0]);
  assert.equal(attributes.get("role"), "dialog");
  assert.equal(attributes.get("aria-modal"), "true");
  assert.ok(attributes.get("aria-labelledby"), "Modal deve referenciar seu título");
  assert.match(html, new RegExp(`\\bid=["']${attributes.get("aria-labelledby")}["']`, "i"));

  for (const id of ["loginErro", "lancamentoMsg", "filaMsg", "locadorMsg", "editMsg"]) {
    const element = html.match(new RegExp(`<[^>]+\\bid=["']${id}["'][^>]*>`, "i"));
    assert.ok(element, `Região de mensagem ausente: ${id}`);
    const messageAttributes = extractAttributes(element[0]);
    assert.ok(
      messageAttributes.has("aria-live") || ["alert", "status"].includes(messageAttributes.get("role")),
      `${id} deve anunciar atualizações`
    );
  }
});

test("metadados essenciais estão presentes", () => {
  assert.match(html, /<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["'][^"']+["']/i);
  assert.match(html, /<meta\b[^>]*\bname=["']theme-color["'][^>]*\bcontent=["'][^"']+["']/i);
  assert.match(html, /<html\b[^>]*\blang=["']pt-BR["']/i);
});
