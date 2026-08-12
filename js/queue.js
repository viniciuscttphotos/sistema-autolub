import { clearElement, createStableId, element, setMessage } from "./utils.js";

export const QUEUE_STORAGE_KEY = "autolub_fila_digital_v2";

export function loadQueue(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(QUEUE_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item.nome === "string")
      .map(item => ({ ...item, id: item.id || createStableId(), riscado: Boolean(item.riscado) }));
  } catch {
    return [];
  }
}

export function saveQueue(queue, storage = localStorage) {
  storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export function removeQueueItemById(queue, id) {
  return queue.filter(item => item.id !== id);
}

export function setupQueue() {
  const input = document.getElementById("filaInput");
  const list = document.getElementById("filaLista");
  const message = document.getElementById("filaMsg");
  const addButton = document.getElementById("filaConfirmarBtn");
  const strikeButton = document.getElementById("filaRiscarBtn");
  const clearButton = document.getElementById("filaLimparBtn");

  function render() {
    const queue = loadQueue();
    clearElement(list);
    if (!queue.length) {
      list.append(element("li", { className: "fila-vazia", text: "Fila vazia." }));
      return;
    }
    queue.forEach((item, index) => {
      const li = element("li", { className: `fila-item${item.riscado ? " fila-item-riscado" : ""}` }, [
        element("span", { className: "fila-item-nome", text: item.nome }),
        element("span", { className: "fila-item-indice", text: `#${index + 1}` })
      ]);
      list.append(li);
    });
  }

  function add() {
    const name = input.value.trim();
    if (!name) return setMessage(message, "Digite um nome para adicionar à fila.", "erro");
    if (name.length > 100) return setMessage(message, "O nome deve ter no máximo 100 caracteres.", "erro");
    const queue = loadQueue();
    queue.push({ id: createStableId(), nome: name, criadoEm: Date.now(), riscado: false });
    saveQueue(queue);
    input.value = "";
    setMessage(message, "Adicionado à fila.", "sucesso");
    render();
  }

  function strike() {
    const queue = loadQueue();
    const item = queue.find(entry => !entry.riscado);
    if (!item) return setMessage(message, queue.length ? "Todos os itens já foram riscados." : "A fila está vazia.", "erro");
    item.riscado = true;
    saveQueue(queue);
    render();
    setMessage(message, "Item concluído.", "sucesso");
    setTimeout(() => {
      saveQueue(removeQueueItemById(loadQueue(), item.id));
      render();
    }, 1200);
  }

  function clear() {
    if (!loadQueue().length) return setMessage(message, "A fila já está vazia.", "erro");
    if (!window.confirm("Tem certeza que deseja limpar toda a fila?")) return;
    saveQueue([]);
    render();
    setMessage(message, "Fila limpa.", "sucesso");
  }

  addButton?.addEventListener("click", add);
  strikeButton?.addEventListener("click", strike);
  clearButton?.addEventListener("click", clear);
  input?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  });
  render();
}
