export function toFiniteNumber(value) {
  if (typeof value === "string") value = value.replace(",", ".").trim();
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function formatCurrency(value) {
  const number = toFiniteNumber(value);
  return (number ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function parseLocalDate(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }
  return new Date(value);
}

export function formatDateShort(value) {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(date);
}

export function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validateDateRange(start, end) {
  if (!start || !end) return { valid: false, message: "Selecione data inicial e final." };
  if (start > end) return { valid: false, message: "A data inicial não pode ser posterior à data final." };
  return { valid: true };
}

export function validateEntry({ attendant, service, value, paymentMethod, installments, isRental, renter }) {
  if (!String(attendant || "").trim()) return { valid: false, message: "Informe o atendente." };
  if (!String(service || "").trim()) return { valid: false, message: "Informe o serviço ou produto." };
  if (String(attendant).trim().length > 80) return { valid: false, message: "O nome do atendente é muito longo." };
  if (String(service).trim().length > 500) return { valid: false, message: "A descrição deve ter no máximo 500 caracteres." };

  const numericValue = toFiniteNumber(value);
  if (numericValue === null || numericValue <= 0) return { valid: false, message: "Informe um valor maior que zero." };

  let numericInstallments = 0;
  if (paymentMethod === "Crédito") {
    numericInstallments = Number(installments);
    if (!Number.isInteger(numericInstallments) || numericInstallments < 1 || numericInstallments > 12) {
      return { valid: false, message: "Informe de 1 a 12 parcelas para crédito." };
    }
  }

  if (isRental && !String(renter || "").trim()) return { valid: false, message: "Selecione um locador." };

  return { valid: true, value: numericValue.toFixed(2), installments: numericInstallments };
}

export function setMessage(element, message = "", type = "") {
  if (!element) return;
  element.textContent = message;
  element.className = `msg${type ? ` ${type}` : ""}`;
}

export function clearElement(element) {
  while (element?.firstChild) element.removeChild(element.firstChild);
}

export function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.type) node.type = options.type;
  if (options.id) node.id = options.id;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  }
  for (const child of children) node.append(child);
  return node;
}

export function createStableId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
