import { apiRequest } from "./apiClient";

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

function getFileNameFromContentDisposition(headerValue) {
  const raw = String(headerValue || "").trim();
  if (!raw) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(raw);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = /filename="?([^";]+)"?/i.exec(raw);
  return quotedMatch?.[1] || null;
}

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
  const data = parseJsonSafely(text);

  if (!res.ok) {
    const msg = data?.title || data?.message || text || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  return data;
}

async function downloadBinary(path) {
  const token = getAuthTokenFromStorage();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    const data = parseJsonSafely(text);
    const msg = data?.title || data?.message || text || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  return {
    blob: await res.blob(),
    fileName: getFileNameFromContentDisposition(res.headers.get("content-disposition")) || "document",
    contentType: res.headers.get("content-type") || "application/octet-stream",
  };
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

  download(documentId) {
    return downloadBinary(`/api/documents/${encodeURIComponent(documentId)}/download`);
  },
};
