import { apiRequest } from "./apiClient";

export const studentProfileService = {
  async get() {
    return apiRequest("/api/student/profile", { method: "GET" });
  },

  // Backward-compatible aliases used across pages
  async getMyProfile() {
    return apiRequest("/api/student/profile", { method: "GET" });
  },

  async upsertMyProfile(dto) {
    return apiRequest("/api/student/profile", { method: "PUT", body: dto });
  },
};
