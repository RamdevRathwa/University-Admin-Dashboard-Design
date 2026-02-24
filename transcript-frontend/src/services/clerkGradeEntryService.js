import { apiRequest } from "./apiClient";

export const clerkGradeEntryService = {
  async getByPrn(prn) {
    return apiRequest(`/api/clerk/grade-entry/by-prn/${encodeURIComponent(String(prn || "").trim())}`, {
      method: "GET",
    });
  },
};

