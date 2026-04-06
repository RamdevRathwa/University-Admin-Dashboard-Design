import { apiRequest } from "./apiClient";

export const accountService = {
  getProfile() {
    return apiRequest("/api/account/profile");
  },

  getPreferences() {
    return apiRequest("/api/account/preferences");
  },

  updateProfile(payload) {
    return apiRequest("/api/account/profile", {
      method: "PUT",
      body: payload,
    });
  },

  updatePreferences(payload) {
    return apiRequest("/api/account/preferences", {
      method: "PUT",
      body: payload,
    });
  },
};
