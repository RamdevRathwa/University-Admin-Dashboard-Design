import { apiRequest } from "./apiClient";

function getAuthTokenFromStorage() {
  const rememberAuth = localStorage.getItem("rememberAuth") === "true";
  const storage = rememberAuth ? localStorage : sessionStorage;
  return storage.getItem("authToken");
}

const RAW_BASE_URL = import.meta.env?.VITE_API_BASE_URL;
const API_BASE_URL = (RAW_BASE_URL ? String(RAW_BASE_URL) : "").replace(/\/+$/, "");

export const studentTranscriptsService = {
  async approved() {
    return apiRequest("/api/student/transcripts/approved", { method: "GET" });
  },

  async downloadPdf(transcriptId) {
    const id = String(transcriptId || "").trim();
    if (!id) throw new Error("Transcript id is required");

    const token = getAuthTokenFromStorage();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE_URL}/api/student/transcripts/${encodeURIComponent(id)}/download`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
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
      throw new Error(msg);
    }

    const blob = await res.blob();

    const cd = res.headers.get("content-disposition") || "";
    const nameMatch = cd.match(/filename\\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
    const fileName = decodeURIComponent(nameMatch?.[1] || nameMatch?.[2] || `Transcript_${id}.pdf`);

    return { blob, fileName };
  },
};
