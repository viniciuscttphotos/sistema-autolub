/********************************************************************
 * AUTOLUB - LIVRO CAIXA - FRONT-END LOGIC
 *
 * IMPORTANTE: substitua a URL abaixo pela URL do seu Web App
 * publicado no Google Apps Script.
 ********************************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbznHIzPydVRdRNHMZHGHmPrsA-Qzil5PYaSluokuwZYKZvdNI_HOtW-M_8ggbLrzCaY/exec";

let NIVEL_ACESSO = ""; // "geral" ou "financeiro"

// ===================== INIT =====================
window.addEventListener("DOMContentLoaded", () => {
  const sessao = sessionStorage.getItem("autolub_nivel");
  if (sessao) {
    NIVEL_ACESSO = sessao;
    mostrarApp();
  }

  document.getElementById("formLancamento").addEventListener("submit", salvarLancamento);

  // Atalho: pressionar Enter no campo de senha do login
  document.getElementById("loginSenha").addEventListener("keypress", (e) => {
    if (e.key === "Enter") doLogin();
  });
  document.getElementById("senhaRelatorio").addEventListener("keypress", (e) => {
    if (e.key === "Enter") liberarRelatorios();
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
async function doLogin() {
  const senha = document.getElementById("loginSenha").value;
  const erroEl = document.getElementById("loginErro");

  if (!senha) {
    erroEl.textContent = "Digite a senha.";
    return;
  }

  erroEl.textContent = "Verificando...";

  const result = await apiRequest({ action: "login", senha: senha });

  if (result.success) {
    NIVEL_ACESSO = result.nivel;
    sessionStorage.setItem("autolub_nivel", NIVEL_ACESSO);
    mostrarApp();
  } else {
    erroEl.textContent = result.message || "Senha incorreta.";
  }
}

function logout() {
  sessionStorage.removeItem("autolub_nivel");
  sessionStorage.removeItem("autolub_financeiro");
  NIVEL_ACESSO = "";
  document.getElementById("app").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginSenha").value = "";
}

function mostrarApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  carregarLocadores();
  carregarHistorico();

  // Se já entrou direto com senha financeira, libera relatórios automaticamente
  if (NIVEL_ACESSO === "financeiro") {
    sessionStorage.setItem("autolub_financeiro", "true");
  }

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

  const msgEl = document.getElementById("lancamentoMsg");
  msgEl.textContent = "Salvando...";
  msgEl.className = "msg";

  let atendente = document.getElementById("atendenteSelect").value;
  if (atendente === "Outros") {
    atendente = document.getElementById("atendenteOutro").value.trim();
    if (!atendente) {
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
    msgEl.textContent = "Lançamento salvo com sucesso!";
    msgEl.className = "msg sucesso";
    document.getElementById("formLancamento").reset();
    document.getElementById("atendenteOutro").classList.add("hidden");
    document.getElementById("parcelasGroup").classList.add("hidden");
    document.getElementById("locadorGroup").classList.add("hidden");
    carregarHistorico();
  } else {
    msgEl.textContent = result.message || "Erro ao salvar.";
    msgEl.className = "msg erro";
  }
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
  document.getElementById("editSenha").value = "";
  document.getElementById("editMsg").textContent = "";

  document.getElementById("editModal").classList.remove("hidden");
}

function fecharModal() {
  document.getElementById("editModal").classList.add("hidden");
}

async function salvarEdicao() {
  const msgEl = document.getElementById("editMsg");
  msgEl.textContent = "Salvando...";
  msgEl.className = "msg";

  const senha = document.getElementById("editSenha").value;
  if (!senha) {
    msgEl.textContent = "Digite a senha financeira.";
    msgEl.className = "msg erro";
    return;
  }

  const result = await apiRequest({
    action: "editLancamento",
    id: document.getElementById("editId").value,
    atendente: document.getElementById("editAtendente").value,
    servico: document.getElementById("editServico").value,
    valor: document.getElementById("editValor").value,
    formaPagamento: document.getElementById("editFormaPagamento").value,
    parcelas: document.getElementById("editParcelas").value,
    senha: senha
  });

  if (result.success) {
    msgEl.textContent = "Atualizado com sucesso!";
    msgEl.className = "msg sucesso";
    setTimeout(() => {
      fecharModal();
      carregarHistorico();
    }, 800);
  } else {
    msgEl.textContent = result.message;
    msgEl.className = "msg erro";
  }
}

async function excluirLancamento() {
  const msgEl = document.getElementById("editMsg");

  if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

  msgEl.textContent = "Excluindo...";
  msgEl.className = "msg";

  const result = await apiRequest({
    action: "deleteLancamento",
    id: document.getElementById("editId").value
  });

  if (result.success) {
    msgEl.textContent = "Excluído com sucesso!";
    msgEl.className = "msg sucesso";
    setTimeout(() => {
      fecharModal();
      carregarHistorico();
    }, 800);
  } else {
    msgEl.textContent = result.message;
    msgEl.className = "msg erro";
  }
}

// ===================== RELATÓRIOS =====================
function verificarAcessoRelatorio() {
  const liberado = sessionStorage.getItem("autolub_financeiro") === "true";
  if (liberado) {
    document.getElementById("relatorioBloqueado").classList.add("hidden");
    document.getElementById("relatorioConteudo").classList.remove("hidden");
    gerarRelatorio("diario");
  } else {
    document.getElementById("relatorioBloqueado").classList.remove("hidden");
    document.getElementById("relatorioConteudo").classList.add("hidden");
  }
}

async function liberarRelatorios() {
  const senha = document.getElementById("senhaRelatorio").value;
  const erroEl = document.getElementById("relatorioErro");

  const result = await apiRequest({ action: "login", senha: senha });

  if (result.success && result.nivel === "financeiro") {
    sessionStorage.setItem("autolub_financeiro", "true");
    verificarAcessoRelatorio();
    erroEl.textContent = "";
    gerarRelatorio("diario");
  } else {
    erroEl.textContent = "Senha incorreta.";
  }
}

async function gerarRelatorio(tipo) {
  const resultadoDiv = document.getElementById("relatorioResultado");
  resultadoDiv.innerHTML = "<p>Gerando relatório...</p>";

  const senha = sessionStorage.getItem("autolub_financeiro_senha") || document.getElementById("senhaRelatorio").value;

  const params = {
    action: "relatorio",
    senha: senha || prompt("Confirme a senha financeira:")
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
  } else {
    params.tipo = tipo;
  }

  const result = await apiRequest(params);

  if (!result.success) {
    resultadoDiv.innerHTML = `<p class="erro">${result.message}</p>`;
    return;
  }

  // Salva senha para próximas requisições na sessão
  sessionStorage.setItem("autolub_financeiro_senha", params.senha);

  renderizarRelatorio(result.data);
}

function renderizarRelatorio(data) {
  const div = document.getElementById("relatorioResultado");

  const inicio = new Date(data.periodo.inicio).toLocaleDateString("pt-BR");
  const fim = new Date(data.periodo.fim).toLocaleDateString("pt-BR");

  let html = `
    <div class="relatorio-resumo">
      <div class="resumo-card">
        <div class="resumo-label">Período</div>
        <div class="resumo-valor" style="font-size:14px">${inicio} a ${fim}</div>
      </div>
      <div class="resumo-card">
        <div class="resumo-label">Total Faturado</div>
        <div class="resumo-valor">R$ ${data.total.toFixed(2).replace(".", ",")}</div>
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
          <span class="valor">R$ ${info.total.toFixed(2).replace(".", ",")}</span>
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
          <span class="valor">R$ ${info.total.toFixed(2).replace(".", ",")}</span>
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
          <span class="valor">R$ ${info.total.toFixed(2).replace(".", ",")}</span>
        </div>
      `;
    });
    html += `</div>`;
  }

  div.innerHTML = html;
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
