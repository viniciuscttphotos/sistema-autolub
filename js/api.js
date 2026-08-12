const activeRequests = new Map();

async function parseJsonResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }
  if (!response.ok) {
    const error = new Error(data?.message || `Servidor indisponível (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function apiRequest(params, options = {}) {
  const { requestKey, mutation = false, timeoutMs = 20000 } = options;
  if (requestKey) activeRequests.get(requestKey)?.abort();

  const controller = new AbortController();
  if (requestKey) activeRequests.set(requestKey, controller);
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch("/api/gas", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal
    });
    return await parseJsonResponse(response);
  } catch (error) {
    if (error.name === "AbortError") {
      if (controller.signal.reason !== "timeout") return { success: false, stale: true };
      return {
        success: false,
        timeout: true,
        indeterminate: mutation,
        message: mutation
          ? "A resposta demorou demais e não foi possível confirmar a operação. Confira os dados antes de tentar novamente."
          : "A solicitação demorou demais. Tente novamente."
      };
    }
    if (error.status === 401) {
      window.dispatchEvent(new CustomEvent("autolub:unauthorized"));
    }
    return { success: false, message: error.message || "Erro de conexão." };
  } finally {
    clearTimeout(timeout);
    if (requestKey && activeRequests.get(requestKey) === controller) activeRequests.delete(requestKey);
  }
}

async function authRequest(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  return parseJsonResponse(response);
}

export function login(password) {
  return authRequest("/api/login", { password });
}

export function logout() {
  return authRequest("/api/logout");
}

export async function getSession() {
  try {
    const response = await fetch("/api/session", { credentials: "same-origin" });
    if (!response.ok) return { authenticated: false };
    return await response.json();
  } catch {
    return { authenticated: false };
  }
}
