/********************************************************************
 * AUTOLUB - LIVRO CAIXA - FRONT-END LOGIC
 *
 * IMPORTANTE: substitua a URL abaixo pela URL do seu Web App
 * publicado no Google Apps Script.
 ********************************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbznHIzPydVRdRNHMZHGHmPrsA-Qzil5PYaSluokuwZYKZvdNI_HOtW-M_8ggbLrzCaY/exec";

// ===================== TEMA =====================
function initTheme() {
  const savedTheme = localStorage.getItem("autolub_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeUI(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("autolub_theme", newTheme);
  updateThemeUI(newTheme);
}

function updateThemeUI(theme) {
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");
  const loginThemeIcon = document.getElementById("loginThemeIcon");
  const loginThemeText = document.getElementById("loginThemeText");
  
  if (theme === "light") {
    const sunIcon = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    themeIcon.innerHTML = sunIcon;
    themeText.textContent = "Tema Escuro";
    if (loginThemeIcon) loginThemeIcon.innerHTML = sunIcon;
    if (loginThemeText) loginThemeText.textContent = "Tema Escuro";
  } else {
    const moonIcon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    themeIcon.innerHTML = moonIcon;
    themeText.textContent = "Tema Claro";
    if (loginThemeIcon) loginThemeIcon.innerHTML = moonIcon;
    if (loginThemeText) loginThemeText.textContent = "Tema Claro";
  }
}



// ===================== INIT =====================
window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  
  if (sessionStorage.getItem("autolub_logado")) {
    mostrarApp();
  }

  document.getElementById("formLancamento").addEventListener("submit", salvarLancamento);

  document.getElementById("loginSenha").addEventListener("keypress", (e) => {
    if (e.key === "Enter") doLogin();
  });
});

// ===================== REQUISIÇÃO GENÉRICA =====================
async function apiRequest(params) {
  const url = new URL(API_URL);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url.toString());
    return await response.json();
  } catch (err) {
    return { success: false, message: "Erro de conexão: " + err.message };
  }
}

// ===================== LOGIN =====================
function doLogin() {
  const senha = document.getElementById("loginSenha").value;
  const erroEl = document.getElementById("loginErro");

  if (!senha) {
    erroEl.textContent = "Digite a senha.";
    return;
  }

  if (senha === "ricardo26") {
    sessionStorage.setItem("autolub_logado", "true");
    mostrarApp();
  } else {
    erroEl.textContent = "Senha incorreta.";
  }
}

function logout() {
  sessionStorage.removeItem("autolub_logado");
  sessionStorage.removeItem("autolub_financeiro");
  sessionStorage.removeItem("autolub_financeiro_senha");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginSenha").value = "";
}

function mostrarApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  carregarLocadores();
  carregarHistorico();
  setupTabs();
}

// ===================== UI HELPERS =====================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const oculto = input.type === "password";
  input.type = oculto ? "text" : "password";
  btn.innerHTML = oculto
    ? `<svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ===================== ABAS =====================
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.getElementById("tab-" + tab).classList.add("active");

      if (tab === "locadores") carregarListaLocadores();
      if (tab === "relatorios") verificarAcessoRelatorio();
      if (tab === "lancamento") carregarLocadores();
    });
  });
}

// ===================== FORM HELPERS =====================
function toggleOutroAtendente() {
  const select = document.getElementById("atendenteSelect");
  const outro = document.getElementById("atendenteOutro");
  if (select.value === "Outros") {
    outro.classList.remove("hidden");
    outro.required = true;
  } else {
    outro.classList.add("hidden");
    outro.required = false;
    outro.value = "";
  }
}

function togglePagamento() {
  const forma = document.getElementById("formaPagamento").value;
  const parcelasGroup = document.getElementById("parcelasGroup");
  if (forma === "Crédito") {
    parcelasGroup.classList.remove("hidden");
  } else {
    parcelasGroup.classList.add("hidden");
  }
}

function toggleLocador() {
  const checked = document.getElementById("locadoraCheck").checked;
  const group = document.getElementById("locadorGroup");
  if (checked) {
    group.classList.remove("hidden");
  } else {
    group.classList.add("hidden");
  }
}

// ===================== LOCADORES (carregar em selects) =====================
async function carregarLocadores() {
  const result = await apiRequest({ action: "listLocadores" });
  if (result.success) {
    const select = document.getElementById("locadorSelect");
    select.innerHTML = "";
    result.data.forEach(nome => {
      const opt = document.createElement("option");
      opt.value = nome;
      opt.textContent = nome;
      select.appendChild(opt);
    });
  }
}

// ===================== SALVAR LANÇAMENTO =====================
async function salvarLancamento(e) {
  e.preventDefault();

  let atendente = document.getElementById("atendenteSelect").value;
  if (atendente === "Outros") {
    atendente = document.getElementById("atendenteOutro").value.trim();
    if (!atendente) {
      const msgEl = document.getElementById("lancamentoMsg");
      msgEl.textContent = "Digite o nome do atendente.";
      msgEl.className = "msg erro";
      return;
    }
  }

  const servico = document.getElementById("servico").value.trim();
  const valor = document.getElementById("valor").value;
  const formaPagamento = document.getElementById("formaPagamento").value;
  const parcelas = formaPagamento === "Crédito" ? document.getElementById("parcelas").value : "0";
  const locadora = document.getElementById("locadoraCheck").checked;
  const locador = locadora ? document.getElementById("locadorSelect").value : "";

  mostrarPopup("Salvando...");

  const result = await apiRequest({
    action: "addLancamento",
    atendente: atendente,
    servico: servico,
    valor: valor,
    formaPagamento: formaPagamento,
    parcelas: parcelas,
    locadora: locadora,
    locador: locador
  });

  if (result.success) {
    setTimeout(() => {
      atualizarPopup("Salvo");
      setTimeout(() => {
        fecharPopup();
        document.getElementById("formLancamento").reset();
        document.getElementById("atendenteOutro").classList.add("hidden");
        document.getElementById("parcelasGroup").classList.add("hidden");
        document.getElementById("locadorGroup").classList.add("hidden");
        carregarHistorico();
      }, 2000);
    }, 5000);
  } else {
    fecharPopup();
    const msgEl = document.getElementById("lancamentoMsg");
    msgEl.textContent = result.message || "Erro ao salvar.";
    msgEl.className = "msg erro";
  }
}

// ===================== POPUP =====================
function mostrarPopup(texto) {
  const popup = document.getElementById("popupSalvando");
  const textoEl = document.getElementById("popupTexto");
  if (!popup) return;
  textoEl.textContent = texto;
  popup.classList.remove("hidden");
  popup.classList.remove("popup-sucesso");
}

function atualizarPopup(texto) {
  const textoEl = document.getElementById("popupTexto");
  if (!textoEl) return;
  textoEl.textContent = texto;
  const popup = document.getElementById("popupSalvando");
  if (popup) popup.classList.add("popup-sucesso");
}

function fecharPopup() {
  const popup = document.getElementById("popupSalvando");
  if (popup) popup.classList.add("hidden");
}

// ===================== HISTÓRICO =====================
async function carregarHistorico() {
  const lista = document.getElementById("historicoLista");
  lista.innerHTML = "<p>Carregando...</p>";

  const params = { action: "listLancamentos" };

  const dataInicio = document.getElementById("histDataInicio").value;
  const dataFim = document.getElementById("histDataFim").value;
  const atendente = document.getElementById("histAtendente").value;

  if (dataInicio) params.dataInicio = dataInicio;
  if (dataFim) params.dataFim = dataFim;
  if (atendente) params.atendente = atendente;

  const result = await apiRequest(params);

  if (!result.success) {
    lista.innerHTML = `<p class="erro">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    lista.innerHTML = "<p>Nenhum lançamento encontrado.</p>";
    return;
  }

  lista.innerHTML = "";
  result.data.forEach(item => {
    lista.appendChild(criarItemCard(item));
  });
}

function criarItemCard(item) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.onclick = () => abrirModalEdicao(item);

  const data = new Date(item.DataHora);
  const dataFormatada = data.toLocaleDateString("pt-BR") + " " + data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let pagamentoTexto = item.FormaPagamento;
  if (item.FormaPagamento === "Crédito" && item.Parcelas > 1) {
    pagamentoTexto += ` (${item.Parcelas}x)`;
  } else if (item.FormaPagamento === "Crédito") {
    pagamentoTexto += " (à vista)";
  }

  card.innerHTML = `
    <div class="item-info">
      <div class="item-servico">${escapeHtml(item.Servico)}</div>
      <div class="item-meta">
        ${dataFormatada} • ${escapeHtml(item.Atendente)} • ${pagamentoTexto}
        ${item.Locadora === "SIM" ? `<span class="item-tag locadora">${escapeHtml(item.Locador)}</span>` : ""}
      </div>
    </div>
    <div class="item-valor">R$ ${parseFloat(item.Valor).toFixed(2).replace(".", ",")}</div>
  `;

  return card;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// ===================== MODAL EDIÇÃO/EXCLUSÃO =====================
function abrirModalEdicao(item) {
  document.getElementById("editId").value = item.ID;
  document.getElementById("editAtendente").value = item.Atendente;
  document.getElementById("editServico").value = item.Servico;
  document.getElementById("editValor").value = item.Valor;
  document.getElementById("editFormaPagamento").value = item.FormaPagamento;
  document.getElementById("editParcelas").value = item.Parcelas || 0;
  document.getElementById("editMsg").textContent = "";

  document.getElementById("editModal").classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("editModal").classList.add("hidden");
}

async function salvarEdicao() {
  const msgEl = document.getElementById("editMsg");

  mostrarPopup("Salvando...");

  const result = await apiRequest({
    action: "editLancamento",
    id: document.getElementById("editId").value,
    atendente: document.getElementById("editAtendente").value,
    servico: document.getElementById("editServico").value,
    valor: document.getElementById("editValor").value,
    formaPagamento: document.getElementById("editFormaPagamento").value,
    parcelas: document.getElementById("editParcelas").value
  });

  if (result.success) {
    atualizarPopup("Salvo");
    setTimeout(() => {
      fecharPopup();
      fecharModal();
      carregarHistorico();
    }, 5000);
  } else {
    fecharPopup();
    msgEl.textContent = result.message;
    msgEl.className = "msg erro";
  }
}

async function excluirLancamento() {
  const msgEl = document.getElementById("editMsg");

  if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

  mostrarPopup("Excluindo...");

  const result = await apiRequest({
    action: "deleteLancamento",
    id: document.getElementById("editId").value
  });

  if (result.success) {
    atualizarPopup("Excluído");
    setTimeout(() => {
      fecharPopup();
      fecharModal();
      carregarHistorico();
    }, 5000);
  } else {
    fecharPopup();
    msgEl.textContent = result.message;
    msgEl.className = "msg erro";
  }
}

// ===================== RELATÓRIOS =====================
function verificarAcessoRelatorio() {
  if (!sessionStorage.getItem("autolub_logado")) {
    return;
  }
  gerarRelatorio("diario");
}

async function gerarRelatorio(tipo) {
  const resultadoDiv = document.getElementById("relatorioResultado");
  resultadoDiv.innerHTML = "<p>Gerando relatório...</p>";

  const params = {
    action: "relatorio",
    senha: "ricardo26"
  };

  if (tipo === "custom") {
    const dataInicio = document.getElementById("relDataInicio").value;
    const dataFim = document.getElementById("relDataFim").value;
    if (!dataInicio || !dataFim) {
      resultadoDiv.innerHTML = "<p class='erro'>Selecione data início e fim.</p>";
      return;
    }
    params.dataInicio = dataInicio;
    params.dataFim = dataFim;
  } else if (tipo === "estaSemana") {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const diff = diaSemana === 0 ? 6 : diaSemana - 1; // Segunda = 0
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() - diff);
    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    params.dataInicio = segunda.toISOString().split("T")[0];
    params.dataFim = domingo.toISOString().split("T")[0];
  } else if (tipo === "esteMes") {
    const hoje = new Date();
    const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    params.dataInicio = primeiro.toISOString().split("T")[0];
    params.dataFim = ultimo.toISOString().split("T")[0];
  } else {
    params.tipo = tipo;
  }

  const result = await apiRequest(params);

  if (!result.success) {
    resultadoDiv.innerHTML = `<p class="erro">${result.message}</p>`;
    return;
  }

  renderizarRelatorio(result.data);
}

// ===================== FORMATAÇÃO =====================
function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarDataCurta(data) {
  const d = new Date(data);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = String(d.getFullYear()).slice(-2);
  return `${dia}/${mes}/${ano}`;
}

function renderizarRelatorio(data) {
  const div = document.getElementById("relatorioResultado");

  const inicio = formatarDataCurta(data.periodo.inicio);
  const fim = formatarDataCurta(data.periodo.fim);

  let html = `
    <div class="relatorio-resumo">
      <div class="resumo-card">
        <div class="resumo-label">Período</div>
        <div class="resumo-valor" style="font-size:14px">${inicio} a ${fim}</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-label">Total Faturado</div>
        <div class="resumo-valor">R$ ${formatarMoeda(data.total)}</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-label">Quantidade</div>
        <div class="resumo-valor">${data.quantidade}</div>
      </div>
    </div>
  `;

  // Por atendente
  html += `<div class="relatorio-secao"><h3>Por Atendente</h3>`;
  if (Object.keys(data.porAtendente).length === 0) {
    html += "<p>Nenhum dado.</p>";
  } else {
    Object.entries(data.porAtendente).forEach(([nome, info]) => {
      html += `
        <div class="relatorio-linha">
          <span>${escapeHtml(nome)} (${info.quantidade} lanç.)</span>
          <span class="valor">R$ ${formatarMoeda(info.total)}</span>
        </div>
      `;
    });
  }
  html += `</div>`;

  // Por forma de pagamento
  html += `<div class="relatorio-secao"><h3>Por Forma de Pagamento</h3>`;
  if (Object.keys(data.porPagamento).length === 0) {
    html += "<p>Nenhum dado.</p>";
  } else {
    Object.entries(data.porPagamento).forEach(([nome, info]) => {
      html += `
        <div class="relatorio-linha">
          <span>${escapeHtml(nome)} (${info.quantidade} lanç.)</span>
          <span class="valor">R$ ${formatarMoeda(info.total)}</span>
        </div>
      `;
    });
  }
  html += `</div>`;

  // Por locador
  if (Object.keys(data.porLocador).length > 0) {
    html += `<div class="relatorio-secao"><h3>Carros de Locadora</h3>`;
    Object.entries(data.porLocador).forEach(([nome, info]) => {
      html += `
        <div class="relatorio-linha">
          <span>${escapeHtml(nome)} (${info.quantidade} lanç.)</span>
          <span class="valor">R$ ${formatarMoeda(info.total)}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Gráfico mês a mês
  html += gerarGraficoMensalHTML(data.graficoMensal);

  div.innerHTML = html;
  div.dataset.ultimoRelatorio = JSON.stringify(data);
}

// ===================== LOCADORES (gerenciamento) =====================
async function carregarListaLocadores() {
  const div = document.getElementById("locadoresLista");
  div.innerHTML = "<p>Carregando...</p>";

  const result = await apiRequest({ action: "listLocadores" });

  if (!result.success) {
    div.innerHTML = `<p class="erro">${result.message}</p>`;
    return;
  }

  if (result.data.length === 0) {
    div.innerHTML = "<p>Nenhum locador cadastrado.</p>";
    return;
  }

  div.innerHTML = "";
  result.data.forEach(nome => {
    const card = document.createElement("div");
    card.className = "locador-card";
    card.innerHTML = `
      <span>${escapeHtml(nome)}</span>
      <button onclick="removerLocador('${nome.replace(/'/g, "\\'")}')">Excluir</button>
    `;
    div.appendChild(card);
  });
}

async function adicionarLocador() {
  const input = document.getElementById("novoLocador");
  const msgEl = document.getElementById("locadorMsg");
  const nome = input.value.trim();

  if (!nome) {
    msgEl.textContent = "Digite um nome.";
    msgEl.className = "msg erro";
    return;
  }

  msgEl.textContent = "Adicionando...";
  msgEl.className = "msg";

  const result = await apiRequest({ action: "addLocador", nome: nome });

  if (result.success) {
    msgEl.textContent = "Locador adicionado!";
    msgEl.className = "msg sucesso";
    input.value = "";
    carregarListaLocadores();
    carregarLocadores();
  } else {
    msgEl.textContent = result.message;
    msgEl.className = "msg erro";
  }
}

async function removerLocador(nome) {
  if (!confirm(`Excluir o locador "${nome}"?`)) return;

  const result = await apiRequest({ action: "deleteLocador", nome: nome });

  if (result.success) {
    carregarListaLocadores();
    carregarLocadores();
  } else {
    alert(result.message);
  }
}

// ===================== FILA DIGITAL =====================
const FILA_STORAGE_KEY = "filaDigital";

function carregarFila() {
  try {
    const raw = localStorage.getItem(FILA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function salvarFila(fila) {
  localStorage.setItem(FILA_STORAGE_KEY, JSON.stringify(fila));
}

function renderizarFila() {
  const lista = document.getElementById("filaLista");
  if (!lista) return;
  const fila = carregarFila();
  lista.innerHTML = "";
  if (fila.length === 0) {
    lista.innerHTML = '<li class="fila-vazia">Fila vazia.</li>';
    return;
  }
  fila.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "fila-item" + (item.riscado ? " fila-item-riscado" : "");
    li.innerHTML = `
      <span class="fila-item-nome">${escapeHtml(item.nome)}</span>
      <span class="fila-item-indice">#${index + 1}</span>
    `;
    lista.appendChild(li);
  });
}

function confirmarFila() {
  const input = document.getElementById("filaInput");
  const msgEl = document.getElementById("filaMsg");
  const nome = input.value.trim();
  if (!nome) {
    msgEl.textContent = "Digite um nome para adicionar à fila.";
    msgEl.className = "msg erro";
    return;
  }
  const fila = carregarFila();
  fila.push({ nome: nome, criadoEm: Date.now(), riscado: false });
  salvarFila(fila);
  input.value = "";
  msgEl.textContent = "Adicionado à fila.";
  msgEl.className = "msg sucesso";
  setTimeout(() => {
    msgEl.textContent = "";
    msgEl.className = "msg";
  }, 2000);
  renderizarFila();
}

function riscarFila() {
  const msgEl = document.getElementById("filaMsg");
  const fila = carregarFila();
  if (fila.length === 0) {
    msgEl.textContent = "A fila está vazia.";
    msgEl.className = "msg erro";
    return;
  }
  // Encontrar o primeiro item não riscado
  const idx = fila.findIndex(item => !item.riscado);
  if (idx === -1) {
    msgEl.textContent = "Todos os itens já foram riscados.";
    msgEl.className = "msg erro";
    return;
  }
  fila[idx].riscado = true;
  // Após 1.2s, remover o item riscado da fila
  setTimeout(() => {
    const novaFila = carregarFila().filter((_, i) => i !== idx);
    salvarFila(novaFila);
    renderizarFila();
  }, 1200);
  salvarFila(fila);
  renderizarFila();
  msgEl.textContent = "Item riscado.";
  msgEl.className = "msg sucesso";
  setTimeout(() => {
    msgEl.textContent = "";
    msgEl.className = "msg";
  }, 2000);
}

function limparFila() {
  const msgEl = document.getElementById("filaMsg");
  const fila = carregarFila();
  if (fila.length === 0) {
    msgEl.textContent = "A fila já está vazia.";
    msgEl.className = "msg erro";
    return;
  }
  if (!confirm("Tem certeza que deseja limpar toda a fila?")) return;
  salvarFila([]);
  renderizarFila();
  msgEl.textContent = "Fila limpa.";
  msgEl.className = "msg sucesso";
  setTimeout(() => {
    msgEl.textContent = "";
    msgEl.className = "msg";
  }, 2000);
}

// Permitir adicionar com Enter
window.addEventListener("DOMContentLoaded", () => {
  const filaInput = document.getElementById("filaInput");
  if (filaInput) {
    filaInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmarFila();
      }
    });
  }
  renderizarFila();
});

// ===================== GRÁFICO MÊS A MÊS =====================
let zoomMensal = 12;

function gerarGraficoMensalHTML(dadosMensais) {
  if (!dadosMensais || dadosMensais.length === 0) return "";

  let html = `
    <div class="relatorio-secao grafico-mensal-secao">
      <h3>Mês a Mês</h3>
      <div class="grafico-zoom-actions">
        <button class="btn-sm ${zoomMensal === 12 ? 'btn-primary' : 'btn-secondary'}" onclick="alterarZoomMensal(12)">12 meses</button>
        <button class="btn-sm ${zoomMensal === 6 ? 'btn-primary' : 'btn-secondary'}" onclick="alterarZoomMensal(6)">6 meses</button>
        <button class="btn-sm ${zoomMensal === 3 ? 'btn-primary' : 'btn-secondary'}" onclick="alterarZoomMensal(3)">3 meses</button>
        <button class="btn-sm ${zoomMensal === 1 ? 'btn-primary' : 'btn-secondary'}" onclick="alterarZoomMensal(1)">1 mês</button>
      </div>
      <div class="grafico-mensal-container">
        <canvas id="graficoMensalCanvas"></canvas>
      </div>
    </div>
  `;

  // Agendar o desenho após inserir o HTML
  setTimeout(() => desenharGraficoMensal(dadosMensais), 50);

  return html;
}

function alterarZoomMensal(zoom) {
  zoomMensal = zoom;
  // Re-renderizar o relatório atual
  const resultadoDiv = document.getElementById("relatorioResultado");
  const dataStr = resultadoDiv.dataset.ultimoRelatorio;
  if (dataStr) {
    try {
      const data = JSON.parse(dataStr);
      desenharGraficoMensal(data.graficoMensal);
    } catch (e) {
      // ignorar
    }
  }
}

function desenharGraficoMensal(dadosMensais) {
  const canvas = document.getElementById("graficoMensalCanvas");
  if (!canvas || !dadosMensais || dadosMensais.length === 0) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  // Ajustar para telas de alta densidade
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = rect.width || 600;
  const height = 280;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.scale(dpr, dpr);

  // Aplicar zoom
  const dadosFiltrados = dadosMensais.slice(-zoomMensal);

  // Cores do tema
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const corTexto = isDark ? "#e5e5ea" : "#1c1c1e";
  const corGrade = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const corBarra = isDark ? "rgba(255,159,10,0.85)" : "rgba(255,159,10,0.9)";
  const corBarraHover = isDark ? "rgba(255,159,10,1)" : "rgba(255,159,10,1)";
  const corFundo = "transparent";

  const padding = { top: 20, right: 20, bottom: 50, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Limpar
  ctx.clearRect(0, 0, width, height);

  // Encontrar valor máximo
  const maxValor = Math.max(...dadosFiltrados.map(d => d.total), 1);

  // Desenhar linhas de grade
  ctx.strokeStyle = corGrade;
  ctx.lineWidth = 1;
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";
  ctx.fillStyle = corTexto;
  ctx.textAlign = "right";

  const numLinhas = 5;
  for (let i = 0; i <= numLinhas; i++) {
    const y = padding.top + (chartH / numLinhas) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const valor = maxValor - (maxValor / numLinhas) * i;
    ctx.fillText("R$ " + formatarMoeda(valor), padding.left - 8, y + 4);
  }

  // Largura das barras
  const barWidth = Math.min(40, (chartW / dadosFiltrados.length) * 0.6);
  const gap = (chartW - barWidth * dadosFiltrados.length) / (dadosFiltrados.length + 1);

  // Desenhar barras
  dadosFiltrados.forEach((d, i) => {
    const x = padding.left + gap + i * (barWidth + gap);
    const barH = (d.total / maxValor) * chartH;
    const y = padding.top + chartH - barH;

    // Sombra
    ctx.shadowColor = "rgba(255,159,10,0.2)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Barra com gradiente
    const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
    grad.addColorStop(0, corBarraHover);
    grad.addColorStop(1, corBarra);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Rótulo do mês
    ctx.fillStyle = corTexto;
    ctx.textAlign = "center";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";
    ctx.fillText(d.mes, x + barWidth / 2, padding.top + chartH + 18);

    // Valor acima da barra
    ctx.fillStyle = corBarraHover;
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";
    ctx.fillText("R$ " + formatarMoeda(d.total), x + barWidth / 2, y - 6);
  });
}

// Polyfill para roundRect se necessário
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    const r = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
    const [tl, tr, br, bl] = r.map(v => Math.min(v || 0, Math.min(w, h) / 2));
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}
