const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.AUTOLUB_TEST_PORT || 4173);
const sessions = new Set();
let renters = ["Localiza", "Movida"];
let entries = [
  { ID: "1", DataHora: "2026-08-12T10:00:00-03:00", Atendente: "Paulinho", Servico: "Troca de óleo", Valor: 150, FormaPagamento: "Pix", Parcelas: 0, Locadora: "NÃO", Locador: "" }
];

const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
};
const readBody = req => new Promise((resolve, reject) => {
  let raw = "";
  req.on("data", chunk => { raw += chunk; });
  req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch (error) { reject(error); } });
  req.on("error", reject);
});
const cookieValue = req => /(?:^|; )autolub_test=([^;]+)/.exec(req.headers.cookie || "")?.[1];

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/login" && req.method === "POST") {
      const body = await readBody(req);
      if (body.password !== "teste-local") return json(res, 401, { success: false, message: "Senha incorreta." });
      const token = `session-${Date.now()}`; sessions.add(token);
      return json(res, 200, { success: true }, { "Set-Cookie": `autolub_test=${token}; Path=/; HttpOnly; SameSite=Strict` });
    }
    if (req.url === "/api/logout" && req.method === "POST") {
      sessions.delete(cookieValue(req));
      return json(res, 200, { success: true }, { "Set-Cookie": "autolub_test=; Path=/; Max-Age=0" });
    }
    if (req.url === "/api/session") return json(res, sessions.has(cookieValue(req)) ? 200 : 401, { authenticated: sessions.has(cookieValue(req)) });
    if (req.url === "/api/gas" && req.method === "POST") {
      if (!sessions.has(cookieValue(req))) return json(res, 401, { success: false, message: "Sessão inválida." });
      const params = await readBody(req);
      if (params.action === "listLocadores") return json(res, 200, { success: true, data: renters });
      if (params.action === "addLocador") { renters.push(params.nome); return json(res, 200, { success: true }); }
      if (params.action === "deleteLocador") { renters = renters.filter(name => name !== params.nome); return json(res, 200, { success: true }); }
      if (params.action === "listLancamentos") return json(res, 200, { success: true, data: entries });
      if (params.action === "addLancamento") {
        entries.unshift({ ID: String(Date.now()), DataHora: new Date().toISOString(), Atendente: params.atendente, Servico: params.servico, Valor: params.valor, FormaPagamento: params.formaPagamento, Parcelas: params.parcelas, Locadora: params.locadora === true || params.locadora === "true" ? "SIM" : "NÃO", Locador: params.locador });
        return json(res, 200, { success: true });
      }
      if (params.action === "editLancamento") { const item = entries.find(entry => entry.ID === params.id); if (item) Object.assign(item, { Atendente: params.atendente, Servico: params.servico, Valor: params.valor, FormaPagamento: params.formaPagamento, Parcelas: params.parcelas }); return json(res, 200, { success: true }); }
      if (params.action === "deleteLancamento") { entries = entries.filter(entry => entry.ID !== params.id); return json(res, 200, { success: true }); }
      if (params.action === "relatorio") return json(res, 200, { success: true, data: { periodo: { inicio: "2026-08-01", fim: "2026-08-31" }, total: entries.reduce((sum, entry) => sum + Number(entry.Valor), 0), quantidade: entries.length, porAtendente: { Paulinho: { total: 150, quantidade: 1 } }, porPagamento: { Pix: { total: 150, quantidade: 1 } }, porLocador: {}, graficoMensal: [{ mes: "Ago", total: 150 }] } });
      return json(res, 400, { success: false, message: "Ação desconhecida." });
    }

    const pathname = decodeURIComponent(req.url.split("?")[0]);
    const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(root, requested);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return json(res, 404, { message: "Não encontrado." });
    res.writeHead(200, { "Content-Type": `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`, "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'" });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    json(res, 500, { success: false, message: error.message });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Autolub local: http://127.0.0.1:${port}`));
