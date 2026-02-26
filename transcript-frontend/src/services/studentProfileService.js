import { apiRequest } from "./apiClient";

export const studentProfileService = {
  async get() {
    return apiRequest("/api/student/profile", { method: "GET" });
  },
};

