const RAW_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
const API_BASE_URL = (RAW_BASE_URL ? String(RAW_BASE_URL) : "").replace(/\/+$/, "");

function getAuthTokenFromStorage() {
  const rememberAuth = localStorage.getItem("rememberAuth") === "true";
  const storage = rememberAuth ? localStorage : sessionStorage;
  return storage.getItem("authToken");
}

export async function downloadDocument(documentId) {
  const token = getAuthTokenFromStorage();
  const res = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/download`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data?.title || data?.message || msg;
    } catch {
      // ignore
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename=\"?([^\";]+)\"?/i.exec(cd);
  const fileName = match?.[1] || `document-${documentId}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

