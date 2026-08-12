import { apiRequest, getSession, login, logout as logoutRequest } from "./js/api.js";
import { setupQueue } from "./js/queue.js";
import {
  clearElement,
  element,
  formatCurrency,
  formatDateShort,
  formatDateTime,
  setMessage,
  toDateInputValue,
  toFiniteNumber,
  validateDateRange,
  validateEntry
} from "./js/utils.js";

let lastFocusedElement = null;
let currentReport = null;
let monthlyZoom = 12;

const byId = id => document.getElementById(id);

function setBusy(elementNode, busy) {
  if (!elementNode) return;
  elementNode.setAttribute("aria-busy", String(busy));
}

function initTheme() {
  applyTheme(localStorage.getItem("autolub_theme") || "dark");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("autolub_theme", theme);
  const isLight = theme === "light";
  const label = isLight ? "Usar tema escuro" : "Usar tema claro";
  const text = isLight ? "Tema Escuro" : "Tema Claro";
  [byId("themeToggleBtn"), byId("loginThemeBtn")].forEach(button => button?.setAttribute("aria-label", label));
  if (byId("themeText")) byId("themeText").textContent = text;
  if (byId("loginThemeText")) byId("loginThemeText").textContent = text;
  if (currentReport) requestAnimationFrame(() => drawMonthlyChart(currentReport.graficoMensal));
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
}

function showLogin() {
  byId("app").classList.add("hidden");
  byId("loginScreen").classList.remove("hidden");
  byId("loginSenha")?.focus();
}

function showApp() {
  byId("loginScreen").classList.add("hidden");
  byId("app").classList.remove("hidden");
  loadRenters();
  loadHistory();
}

async function handleLogin() {
  const password = byId("loginSenha").value;
  const message = byId("loginErro");
  if (!password) return setMessage(message, "Digite a senha.", "erro");
  const button = byId("loginBtn");
  button.disabled = true;
  setMessage(message, "Entrando...");
  try {
    const result = await login(password);
    if (!result.success) throw new Error(result.message || "Senha incorreta.");
    byId("loginSenha").value = "";
    setMessage(message);
    showApp();
  } catch (error) {
    setMessage(message, error.message || "Não foi possível entrar.", "erro");
  } finally {
    button.disabled = false;
  }
}

async function handleLogout() {
  try { await logoutRequest(); } finally { showLogin(); }
}

function togglePassword() {
  const input = byId("loginSenha");
  const button = byId("loginPasswordToggleBtn");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  button?.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  button?.setAttribute("aria-pressed", String(show));
}

function selectTab(button, focus = false) {
  document.querySelectorAll('[role="tab"]').forEach(tab => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[role="tabpanel"]').forEach(panel => panel.classList.remove("active"));
  const panel = byId(button.getAttribute("aria-controls"));
  panel?.classList.add("active");
  if (focus) button.focus();
  const tab = button.dataset.tab;
  if (tab === "locadores") loadRenterList();
  if (tab === "relatorios") generateReport("diario");
  if (tab === "lancamento") loadRenters();
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let target = index;
      if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = tabs.length - 1;
      selectTab(tabs[target], true);
    });
  });
}

function syncConditionalFields() {
  const other = byId("atendenteSelect").value === "Outros";
  byId("atendenteOutro").classList.toggle("hidden", !other);
  byId("atendenteOutro").required = other;
  const credit = byId("formaPagamento").value === "Crédito";
  byId("parcelasGroup").classList.toggle("hidden", !credit);
  byId("parcelas").required = credit;
  const rental = byId("locadoraCheck").checked;
  byId("locadorGroup").classList.toggle("hidden", !rental);
  byId("locadorSelect").required = rental;
}

async function loadRenters() {
  const result = await apiRequest({ action: "listLocadores" }, { requestKey: "renters-select" });
  if (!result.success || result.stale) return;
  const select = byId("locadorSelect");
  clearElement(select);
  (Array.isArray(result.data) ? result.data : []).forEach(name => select.append(new Option(String(name), String(name))));
}

function getEntryFromForm(edit = false) {
  if (edit) {
    return {
      attendant: byId("editAtendente").value,
      service: byId("editServico").value,
      value: byId("editValor").value,
      paymentMethod: byId("editFormaPagamento").value,
      installments: byId("editParcelas").value,
      isRental: false,
      renter: ""
    };
  }
  const attendant = byId("atendenteSelect").value === "Outros" ? byId("atendenteOutro").value : byId("atendenteSelect").value;
  return {
    attendant,
    service: byId("servico").value,
    value: byId("valor").value,
    paymentMethod: byId("formaPagamento").value,
    installments: byId("parcelas").value,
    isRental: byId("locadoraCheck").checked,
    renter: byId("locadorSelect").value
  };
}

function showPopup(text, success = false) {
  byId("popupTexto").textContent = text;
  byId("popupSalvando").classList.toggle("popup-sucesso", success);
  byId("popupSalvando").classList.remove("hidden");
  byId("popupSalvando").setAttribute("aria-hidden", "false");
}

function closePopup() {
  byId("popupSalvando").classList.add("hidden");
  byId("popupSalvando").setAttribute("aria-hidden", "true");
}

async function saveEntry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = getEntryFromForm();
  const validation = validateEntry(data);
  if (!validation.valid) return setMessage(byId("lancamentoMsg"), validation.message, "erro");
  setMessage(byId("lancamentoMsg"));
  const button = event.submitter || form.querySelector('[type="submit"]');
  button.disabled = true;
  showPopup("Salvando...");
  const result = await apiRequest({
    action: "addLancamento",
    atendente: data.attendant.trim(), servico: data.service.trim(), valor: validation.value,
    formaPagamento: data.paymentMethod, parcelas: validation.installments,
    locadora: data.isRental, locador: data.isRental ? data.renter : ""
  }, { mutation: true });
  if (result.success) {
    showPopup("Salvo", true);
    setTimeout(() => closePopup(), 900);
    form.reset();
    syncConditionalFields();
    setMessage(byId("lancamentoMsg"), "Lançamento salvo.", "sucesso");
    loadHistory();
  } else {
    closePopup();
    setMessage(byId("lancamentoMsg"), result.message || "Erro ao salvar.", "erro");
    if (result.indeterminate) loadHistory();
  }
  button.disabled = false;
}

function validateRange(startId, endId, messageNode) {
  const start = byId(startId).value;
  const end = byId(endId).value;
  if (!start && !end) return true;
  const validation = validateDateRange(start, end);
  if (!validation.valid) setMessage(messageNode, validation.message, "erro");
  return validation.valid;
}

async function loadHistory() {
  const container = byId("historicoLista");
  if (!validateRange("histDataInicio", "histDataFim", container)) return;
  setBusy(container, true);
  clearElement(container);
  container.append(element("p", { text: "Carregando..." }));
  const params = { action: "listLancamentos" };
  if (byId("histDataInicio").value) params.dataInicio = byId("histDataInicio").value;
  if (byId("histDataFim").value) params.dataFim = byId("histDataFim").value;
  if (byId("histAtendente").value) params.atendente = byId("histAtendente").value;
  const result = await apiRequest(params, { requestKey: "history" });
  if (result.stale) return;
  setBusy(container, false);
  clearElement(container);
  if (!result.success) return container.append(element("p", { className: "erro", text: result.message || "Erro ao carregar." }));
  const entries = Array.isArray(result.data) ? result.data : [];
  if (!entries.length) return container.append(element("p", { text: "Nenhum lançamento encontrado." }));
  entries.forEach(item => container.append(createEntryCard(item)));
}

function createEntryCard(item) {
  const value = toFiniteNumber(item.Valor) ?? 0;
  let payment = String(item.FormaPagamento || "");
  if (payment === "Crédito") payment += Number(item.Parcelas) > 1 ? ` (${Number(item.Parcelas)}x)` : " (à vista)";
  const meta = element("div", { className: "item-meta", text: `${formatDateTime(item.DataHora)} • ${item.Atendente || ""} • ${payment}` });
  if (item.Locadora === "SIM") meta.append(" ", element("span", { className: "item-tag locadora", text: item.Locador || "Locadora" }));
  const button = element("button", {
    className: "item-card", type: "button",
    attributes: { "aria-label": `Editar lançamento: ${item.Servico || "sem descrição"}` }
  }, [
    element("div", { className: "item-info" }, [element("div", { className: "item-servico", text: item.Servico || "" }), meta]),
    element("div", { className: "item-valor", text: `R$ ${formatCurrency(value)}` })
  ]);
  button.addEventListener("click", () => openEditModal(item, button));
  return button;
}

function openEditModal(item, source) {
  lastFocusedElement = source || document.activeElement;
  byId("editId").value = item.ID ?? "";
  byId("editAtendente").value = item.Atendente ?? "";
  byId("editServico").value = item.Servico ?? "";
  byId("editValor").value = item.Valor ?? "";
  byId("editFormaPagamento").value = item.FormaPagamento ?? "Dinheiro";
  byId("editParcelas").value = item.Parcelas || 1;
  setMessage(byId("editMsg"));
  byId("editModal").classList.remove("hidden");
  byId("editModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  byId("editAtendente").focus();
}

function closeEditModal() {
  const modal = byId("editModal");
  if (modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  lastFocusedElement?.focus();
}

async function saveEdit() {
  const data = getEntryFromForm(true);
  const validation = validateEntry(data);
  if (!validation.valid) return setMessage(byId("editMsg"), validation.message, "erro");
  const button = byId("editSalvarBtn");
  button.disabled = true;
  showPopup("Salvando...");
  const result = await apiRequest({
    action: "editLancamento", id: byId("editId").value,
    atendente: data.attendant.trim(), servico: data.service.trim(), valor: validation.value,
    formaPagamento: data.paymentMethod, parcelas: validation.installments
  }, { mutation: true });
  closePopup();
  button.disabled = false;
  if (!result.success) return setMessage(byId("editMsg"), result.message || "Erro ao editar.", "erro");
  closeEditModal();
  loadHistory();
}

async function deleteEntry() {
  if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
  const button = byId("editExcluirBtn");
  button.disabled = true;
  showPopup("Excluindo...");
  const result = await apiRequest({ action: "deleteLancamento", id: byId("editId").value }, { mutation: true });
  closePopup();
  button.disabled = false;
  if (!result.success) return setMessage(byId("editMsg"), result.message || "Erro ao excluir.", "erro");
  closeEditModal();
  loadHistory();
}

function trapModalFocus(event) {
  const modal = byId("editModal");
  if (modal.classList.contains("hidden")) return;
  if (event.key === "Escape") return closeEditModal();
  if (event.key !== "Tab") return;
  const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

async function generateReport(type) {
  const container = byId("relatorioResultado");
  const params = { action: "relatorio" };
  if (type === "custom") {
    const validation = validateDateRange(byId("relDataInicio").value, byId("relDataFim").value);
    if (!validation.valid) return setMessage(container, validation.message, "erro");
    params.dataInicio = byId("relDataInicio").value;
    params.dataFim = byId("relDataFim").value;
  } else if (type === "estaSemana" || type === "esteMes") {
    const today = new Date();
    let start, end;
    if (type === "estaSemana") {
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    params.dataInicio = toDateInputValue(start); params.dataFim = toDateInputValue(end);
  } else params.tipo = type;
  setBusy(container, true); clearElement(container); container.append(element("p", { text: "Gerando relatório..." }));
  const result = await apiRequest(params, { requestKey: "report" });
  if (result.stale) return;
  setBusy(container, false);
  if (!result.success) { clearElement(container); return container.append(element("p", { className: "erro", text: result.message || "Erro ao gerar relatório." })); }
  renderReport(result.data || {});
}

function reportSection(title, values = {}) {
  const section = element("section", { className: "relatorio-secao" }, [element("h3", { text: title })]);
  const entries = Object.entries(values || {});
  if (!entries.length) section.append(element("p", { text: "Nenhum dado." }));
  entries.forEach(([name, info]) => section.append(element("div", { className: "relatorio-linha" }, [
    element("span", { text: `${name} (${Number(info?.quantidade) || 0} lanç.)` }),
    element("span", { className: "valor", text: `R$ ${formatCurrency(info?.total)}` })
  ])));
  return section;
}

function renderReport(data) {
  currentReport = data;
  const container = byId("relatorioResultado"); clearElement(container);
  const period = data.periodo || {};
  const summary = element("div", { className: "relatorio-resumo" }, [
    summaryCard("Período", `${formatDateShort(period.inicio)} a ${formatDateShort(period.fim)}`),
    summaryCard("Total Faturado", `R$ ${formatCurrency(data.total)}`),
    summaryCard("Quantidade", Number(data.quantidade) || 0)
  ]);
  container.append(summary, reportSection("Por Atendente", data.porAtendente), reportSection("Por Forma de Pagamento", data.porPagamento));
  if (Object.keys(data.porLocador || {}).length) container.append(reportSection("Carros de Locadora", data.porLocador));
  if (Array.isArray(data.graficoMensal) && data.graficoMensal.length) container.append(createChartSection());
  requestAnimationFrame(() => drawMonthlyChart(data.graficoMensal));
}

function summaryCard(label, value) {
  return element("div", { className: "resumo-card" }, [element("div", { className: "resumo-label", text: label }), element("div", { className: "resumo-valor", text: value })]);
}

function createChartSection() {
  const actions = element("div", { className: "grafico-zoom-actions" });
  [12, 6, 3, 1].forEach(zoom => {
    const button = element("button", { className: `btn-sm ${monthlyZoom === zoom ? "btn-primary" : "btn-secondary"}`, type: "button", text: `${zoom} ${zoom === 1 ? "mês" : "meses"}` });
    button.addEventListener("click", () => { monthlyZoom = zoom; renderReport(currentReport); });
    actions.append(button);
  });
  return element("section", { className: "relatorio-secao grafico-mensal-secao" }, [
    element("h3", { text: "Mês a Mês" }), actions,
    element("div", { className: "grafico-mensal-container" }, [element("canvas", { id: "graficoMensalCanvas", attributes: { role: "img", "aria-label": "Gráfico de faturamento mensal" } })])
  ]);
}

function drawMonthlyChart(values) {
  const canvas = byId("graficoMensalCanvas");
  if (!canvas || !Array.isArray(values) || !values.length) return;
  const data = values.slice(-monthlyZoom).map(item => ({ mes: String(item.mes || ""), total: toFiniteNumber(item.total) ?? 0 }));
  const width = Math.max(canvas.parentElement.clientWidth, 560), height = 280, dpr = devicePixelRatio || 1;
  canvas.width = width * dpr; canvas.height = height * dpr; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const pad = { top: 28, right: 20, bottom: 48, left: 70 }, chartW = width - pad.left - pad.right, chartH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map(item => item.total), 1), dark = document.documentElement.dataset.theme !== "light";
  ctx.font = "11px system-ui"; ctx.strokeStyle = dark ? "#ffffff18" : "#00000018"; ctx.fillStyle = dark ? "#e5e5ea" : "#1c1c1e";
  for (let i = 0; i <= 5; i++) { const y = pad.top + chartH * i / 5; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke(); ctx.textAlign = "right"; ctx.fillText(`R$ ${formatCurrency(max - max * i / 5)}`, pad.left - 8, y + 4); }
  const slot = chartW / data.length, barWidth = Math.min(40, slot * .55);
  data.forEach((item, index) => { const x = pad.left + index * slot + (slot - barWidth) / 2, barH = item.total / max * chartH, y = pad.top + chartH - barH; ctx.fillStyle = "#e7aa19"; ctx.fillRect(x, y, barWidth, barH); ctx.textAlign = "center"; ctx.fillStyle = dark ? "#e5e5ea" : "#1c1c1e"; ctx.fillText(item.mes, x + barWidth / 2, pad.top + chartH + 20); });
}

async function loadRenterList() {
  const container = byId("locadoresLista"); setBusy(container, true); clearElement(container); container.append(element("p", { text: "Carregando..." }));
  const result = await apiRequest({ action: "listLocadores" }, { requestKey: "renters-list" });
  if (result.stale) return; setBusy(container, false); clearElement(container);
  if (!result.success) return container.append(element("p", { className: "erro", text: result.message || "Erro ao carregar." }));
  const names = Array.isArray(result.data) ? result.data : [];
  if (!names.length) return container.append(element("p", { text: "Nenhum locador cadastrado." }));
  names.forEach(name => {
    const button = element("button", { type: "button", text: "Excluir", attributes: { "aria-label": `Excluir locador ${name}` } });
    button.addEventListener("click", () => removeRenter(String(name), button));
    container.append(element("div", { className: "locador-card" }, [element("span", { text: name }), button]));
  });
}

async function addRenter() {
  const input = byId("novoLocador"), message = byId("locadorMsg"), name = input.value.trim(), button = byId("locadorAdicionarBtn");
  if (!name || name.length > 100) return setMessage(message, "Digite um nome com até 100 caracteres.", "erro");
  button.disabled = true; setMessage(message, "Adicionando...");
  const result = await apiRequest({ action: "addLocador", nome: name }, { mutation: true }); button.disabled = false;
  if (!result.success) return setMessage(message, result.message || "Erro ao adicionar.", "erro");
  input.value = ""; setMessage(message, "Locador adicionado.", "sucesso"); loadRenterList(); loadRenters();
}

async function removeRenter(name, button) {
  if (!window.confirm(`Excluir o locador “${name}”?`)) return;
  button.disabled = true;
  const result = await apiRequest({ action: "deleteLocador", nome: name }, { mutation: true });
  if (!result.success) { button.disabled = false; return setMessage(byId("locadorMsg"), result.message || "Erro ao excluir.", "erro"); }
  loadRenterList(); loadRenters();
}

function bindEvents() {
  byId("loginThemeBtn")?.addEventListener("click", toggleTheme);
  byId("themeToggleBtn")?.addEventListener("click", toggleTheme);
  byId("loginBtn")?.addEventListener("click", handleLogin);
  byId("logoutBtn")?.addEventListener("click", handleLogout);
  byId("loginPasswordToggleBtn")?.addEventListener("click", togglePassword);
  byId("loginSenha")?.addEventListener("keydown", event => { if (event.key === "Enter") handleLogin(); });
  byId("atendenteSelect")?.addEventListener("change", syncConditionalFields);
  byId("formaPagamento")?.addEventListener("change", syncConditionalFields);
  byId("locadoraCheck")?.addEventListener("change", syncConditionalFields);
  byId("formLancamento")?.addEventListener("submit", saveEntry);
  byId("historicoFiltrarBtn")?.addEventListener("click", loadHistory);
  document.querySelectorAll("[data-report-type]").forEach(button => button.addEventListener("click", () => generateReport(button.dataset.reportType)));
  byId("relatorioCustomBtn")?.addEventListener("click", () => generateReport("custom"));
  byId("locadorAdicionarBtn")?.addEventListener("click", addRenter);
  byId("editSalvarBtn")?.addEventListener("click", saveEdit);
  byId("editExcluirBtn")?.addEventListener("click", deleteEntry);
  byId("editCancelarBtn")?.addEventListener("click", closeEditModal);
  byId("editModal")?.addEventListener("click", event => { if (event.target === byId("editModal")) closeEditModal(); });
  document.addEventListener("keydown", trapModalFocus);
  window.addEventListener("autolub:unauthorized", showLogin);
}

document.addEventListener("DOMContentLoaded", async () => {
  initTheme(); bindEvents(); setupTabs(); setupQueue(); syncConditionalFields();
  const session = await getSession();
  if (session.authenticated) showApp(); else showLogin();
});
