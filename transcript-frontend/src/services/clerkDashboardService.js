import { apiRequest } from "./apiClient";

export const clerkDashboardService = {
  async get() {
    return apiRequest("/api/clerk/dashboard", { method: "GET" });
  },
};

