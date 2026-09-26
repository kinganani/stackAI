const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_ROOT}${path}`;
}

let accessToken = "";

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers, credentials: "include" });
  } catch {
    throw new Error("Le serveur est injoignable. Réessaie dans un instant.");
  }
  if (response.status === 401 && accessToken && !path.includes("/api/auth/")) {
    const refreshed = await fetch(apiUrl("/api/auth/refresh/"), { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const data = await refreshed.json();
      accessToken = data.access;
      headers.Authorization = `Bearer ${accessToken}`;
      response = await fetch(apiUrl(path), { ...options, headers, credentials: "include" });
    }
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    const fallback = response.status >= 500
      ? "Le serveur n’a pas pu parler à la base. Sur Vercel, ajoute DATABASE_URL (URI Supabase)."
      : "Requête impossible.";
    const error = new Error(detail || fallback);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

const USER_KEY = "lm_user";

export function setAccessToken(token) {
  accessToken = token || "";
}

export function saveSession(session) {
  accessToken = session?.access || "";
  if (session?.user) sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function currentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  accessToken = "";
  sessionStorage.removeItem(USER_KEY);
}

export async function restoreSession() {
  try {
    const data = await request("/api/auth/refresh/", { method: "POST" });
    saveSession(data);
    return data.user || null;
  } catch {
    clearSession();
    return null;
  }
}

export function currentToken() {
  return accessToken;
}

export const api = {
  register: (body) => request("/api/auth/register/", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login/", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/api/auth/logout/", { method: "POST" }),
  me: () => request("/api/me/"),
  patchMe: (body) => request("/api/me/", { method: "PATCH", body: JSON.stringify(body) }),
  myStocks: () => request("/api/stocks/mine/"),
  analyzeLot: (body) => request("/api/stocks/analyze/", { method: "POST", body }),
  createStock: (body) => request("/api/stocks/", { method: "POST", body: JSON.stringify(body) }),
  updateStock: (id, body) => request(`/api/stocks/${id}/`, { method: "PATCH", body: JSON.stringify(body) }),
  applyPromo: (id) => request(`/api/stocks/${id}/promo/`, { method: "POST" }),
  cancelStock: (id) => request(`/api/stocks/${id}/cancel/`, { method: "POST" }),
  catalog: () => request("/api/stocks/public/"),
  nearby: () => request("/api/stocks/nearby/"),
  reserve: (body) => request("/api/reservations/", { method: "POST", body: JSON.stringify(body) }),
  myReservations: () => request("/api/reservations/mine/"),
  acceptReservation: (id, body) => request(`/api/reservations/${id}/accept/`, { method: "POST", body: JSON.stringify(body || {}) }),
  reservation: (id) => request(`/api/reservations/${id}/`),
  guideRoute: (body) => request("/api/reservations/guide/", { method: "POST", body: JSON.stringify(body) }),
  voiceDeclare: (transcript) => request("/api/stocks/voice/", { method: "POST", body: JSON.stringify({ transcript }) }),
  pushPublicKey: () => request("/api/push/vapid/"),
  pushSubscribe: (body) => request("/api/push/subscribe/", { method: "POST", body: JSON.stringify(body) }),
  pushUnsubscribe: (endpoint) => request("/api/push/subscribe/", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
};
