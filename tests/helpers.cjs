const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");

function projectPath(...parts) {
  return path.join(ROOT, ...parts);
}

function readProjectFile(...parts) {
  return fs.readFileSync(projectPath(...parts), "utf8");
}

function listFiles(directory, predicate = () => true) {
  const absoluteDirectory = projectPath(directory);
  if (!fs.existsSync(absoluteDirectory)) return [];

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(relativePath, predicate);
    return predicate(relativePath) ? [relativePath] : [];
  });
}

function extractAttributes(tag) {
  const attributes = new Map();
  const body = tag.replace(/^<[^\s>]+|\/?\s*>$/g, "");
  const pattern = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function createRequest({ method = "GET", body = {}, headers = {}, query = {} } = {}) {
  return { method, body, headers, query };
}

function createResponse() {
  let responseStatusCode = 200;
  let body;
  const headers = new Map();

  return {
    get statusCode() {
      return responseStatusCode;
    },
    set statusCode(code) {
      responseStatusCode = code;
    },
    status(code) {
      responseStatusCode = code;
      return this;
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
      return this;
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    json(value) {
      body = value;
      return this;
    },
    send(value) {
      body = value;
      return this;
    },
    end(value) {
      if (value !== undefined) {
        try { body = JSON.parse(value); } catch (_) { body = value; }
      }
      return this;
    },
    result() {
      return { statusCode: responseStatusCode, headers, body };
    }
  };
}

function loadHandler(relativePath) {
  const absolutePath = projectPath(relativePath);
  assert.ok(fs.existsSync(absolutePath), `Endpoint ausente: ${relativePath}`);
  delete require.cache[require.resolve(absolutePath)];
  const moduleValue = require(absolutePath);
  const handler = moduleValue.default || moduleValue;
  assert.equal(typeof handler, "function", `${relativePath} deve exportar um handler`);
  return { handler, moduleValue };
}

function cookiePair(setCookie) {
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.equal(typeof value, "string", "A resposta deve emitir Set-Cookie");
  return value.split(";", 1)[0];
}

function createEsmMirror() {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "autolub-tests-"));
  for (const relativePath of listFiles("js", file => file.endsWith(".js"))) {
    const destination = path.join(temporaryDirectory, relativePath.replace(/\.js$/, ".mjs"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const source = readProjectFile(relativePath).replace(
      /(from\s+["']\.\/.+?)\.js(["'])/g,
      "$1.mjs$2"
    );
    fs.writeFileSync(destination, source);
  }
  return {
    importModule(relativePath) {
      const mirroredPath = path.join(temporaryDirectory, relativePath.replace(/\.js$/, ".mjs"));
      return import(`${pathToFileURL(mirroredPath).href}?test=${Date.now()}`);
    },
    cleanup() {
      assert.ok(temporaryDirectory.startsWith(os.tmpdir()), "Diretório temporário inválido");
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  };
}

module.exports = {
  ROOT,
  cookiePair,
  createEsmMirror,
  createRequest,
  createResponse,
  extractAttributes,
  listFiles,
  loadHandler,
  projectPath,
  readProjectFile
};
