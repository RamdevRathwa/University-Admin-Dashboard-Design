const RAW_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
const API_BASE_URL = (RAW_BASE_URL ? String(RAW_BASE_URL) : "").replace(/\/+$/, "");

function parseJsonSafely(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getAuthTokenFromStorage() {
  const rememberAuth = localStorage.getItem("rememberAuth") === "true";
  const storage = rememberAuth ? localStorage : sessionStorage;
  return storage.getItem("authToken");
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const authToken = token || getAuthTokenFromStorage();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = parseJsonSafely(text);

  if (!res.ok) {
    const msg = data?.title || data?.message || text || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code;
    err.traceId = data?.traceId;
    throw err;
  }

  return data;
}
