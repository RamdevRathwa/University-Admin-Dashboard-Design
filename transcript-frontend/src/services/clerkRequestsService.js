import { apiRequest } from "./apiClient";

export const clerkRequestsService = {
  async queue() {
    return apiRequest("/api/clerk/transcript-requests/queue", { method: "GET" });
  },

  async returned() {
    return apiRequest("/api/clerk/transcript-requests/returned", { method: "GET" });
  },
};

