import { apiRequest } from "./apiClient";

export const accountService = {
  getProfile() {
    return apiRequest("/api/account/profile");
  },

  updateProfile(payload) {
    return apiRequest("/api/account/profile", {
      method: "PUT",
      body: payload,
    });
  },
};
