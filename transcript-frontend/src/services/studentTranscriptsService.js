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

  getDownloadUrl(transcriptId) {
    const id = String(transcriptId || "").trim();
    if (!id) throw new Error("Transcript id is required");

    const token = getAuthTokenFromStorage();
    if (!token) throw new Error("Not authenticated");

    const base = API_BASE_URL || window.location.origin;
    const cacheBust = Date.now();
    return `${base}/api/student/transcripts/${encodeURIComponent(id)}/download?access_token=${encodeURIComponent(token)}&v=${cacheBust}`;
  },
};
