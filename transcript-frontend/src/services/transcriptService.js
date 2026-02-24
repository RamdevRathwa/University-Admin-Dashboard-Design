import { apiRequest } from "./apiClient";

export const transcriptService = {
  async createDraft() {
    return apiRequest("/api/transcripts/draft", { method: "POST" });
  },

  async myRequests() {
    return apiRequest("/api/transcripts/my", { method: "GET" });
  },

  async submitRequest(id) {
    return apiRequest(`/api/transcripts/${id}/submit`, { method: "POST" });
  },
};

