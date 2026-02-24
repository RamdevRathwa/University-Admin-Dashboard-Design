import { apiRequest } from "./apiClient";

export const studentProfileService = {
  async getMyProfile() {
    return apiRequest("/api/student/profile", { method: "GET" });
  },

  async upsertMyProfile(dto) {
    return apiRequest("/api/student/profile", { method: "PUT", body: dto });
  },

  async isComplete() {
    return apiRequest("/api/student/profile/complete", { method: "GET" });
  },
};

