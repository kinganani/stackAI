const PREFIX = "/api";

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

async function parse(res) {
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text.slice(0, 200) };
    }
  }
  if (!res.ok) {
    const err = new Error(flattenError(data) || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function flattenError(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map(flattenError).join(" ");
  }
  if (typeof data === "object") {
    return Object.entries(data)
      .map(([k, v]) => {
        if (k === "detail") return flattenError(v);
        const msg = Array.isArray(v) ? v.map(flattenError).join(" ") : flattenError(v) || String(v);
        return msg;
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

async function request(path, { method = "GET", body, headers, retry = true } = {}) {
  const opts = {
    method,
    credentials: "include",
    cache: "no-store",
    headers: { ...(headers || {}) },
  };
  if (accessToken) opts.headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  let res = await fetch(`${PREFIX}${path}`, opts);
  if (res.status === 401 && retry && path !== "/auth/refresh/" && path !== "/auth/login/") {
    const ok = await refreshAccess();
    if (ok) return request(path, { method, body, headers, retry: false });
  }
  return parse(res);
}

export async function refreshAccess() {
  const res = await fetch(`${PREFIX}/auth/refresh/`, { method: "POST", credentials: "include" });
  if (!res.ok) {
    setAccessToken(null);
    return false;
  }
  const data = await parse(res);
  setAccessToken(data.access);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  login: (body) => request("/auth/login/", { method: "POST", body, retry: false }),
  register: (body) => request("/auth/register/", { method: "POST", body, retry: false }),
  logout: () => request("/auth/logout/", { method: "POST", body: {} }),
  me: () => request("/me/"),
  nearby: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
    const s = q.toString();
    return request(`/stocks/nearby/${s ? `?${s}` : ""}`);
  },
  stock: (id) => request(`/stocks/${id}/`),
  mine: () => request("/stocks/mine/"),
  createStock: (body) => request("/stocks/", { method: "POST", body }),
  cancelStock: (id) => request(`/stocks/${id}/cancel/`, { method: "POST", body: {} }),
  analyze: (body) => request("/stocks/analyze/", { method: "POST", body }),
  reserve: (body) => request("/reservations/", { method: "POST", body }),
  reservation: (id) => request(`/reservations/${id}/`),
  reservations: () => request("/reservations/mine/"),
  accept: (id) => request(`/reservations/${id}/accept/`, { method: "POST", body: {} }),
  alerts: () => request("/notifications/"),
  readAlert: (id) => request(`/notifications/${id}/read/`, { method: "POST", body: {} }),
  readAllAlerts: () => request("/notifications/read/", { method: "POST", body: {} }),
};
