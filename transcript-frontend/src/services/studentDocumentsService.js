import { apiRequest } from "./apiClient";

const RAW_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
const API_BASE_URL = (RAW_BASE_URL ? String(RAW_BASE_URL) : "").replace(/\/+$/, "");

function getAuthTokenFromStorage() {
  const rememberAuth = localStorage.getItem("rememberAuth") === "true";
  const storage = rememberAuth ? localStorage : sessionStorage;
  return storage.getItem("authToken");
}

async function uploadMultipart(path, formData) {
  const token = getAuthTokenFromStorage();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.title || data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  return data;
}

export const studentDocumentsService = {
  list(requestId) {
    return apiRequest(`/api/student/documents/${encodeURIComponent(requestId)}`);
  },

  async upload(requestId, type, files) {
    const fd = new FormData();
    (files || []).forEach((f) => fd.append("files", f));
    return uploadMultipart(`/api/student/documents/${encodeURIComponent(requestId)}/upload?type=${encodeURIComponent(type)}`, fd);
  },
};

