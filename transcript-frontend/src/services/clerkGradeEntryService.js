import { apiRequest } from "./apiClient";

export const clerkGradeEntryService = {
  async ready() {
    return apiRequest("/api/clerk/grade-entry/ready", {
      method: "GET",
    });
  },

  async getByPrn(prn) {
    return apiRequest(`/api/clerk/grade-entry/by-prn/${encodeURIComponent(String(prn || "").trim())}`, {
      method: "GET",
    });
  },

  async preview(prn, items, electives = []) {
    const p = encodeURIComponent(String(prn || "").trim());
    return apiRequest(`/api/clerk/grade-entry/by-prn/${p}/preview`, {
      method: "POST",
      body: { items: Array.isArray(items) ? items : [], electives: Array.isArray(electives) ? electives : [] },
    });
  },

  async saveDraft(prn, items, electives = []) {
    const p = encodeURIComponent(String(prn || "").trim());
    return apiRequest(`/api/clerk/grade-entry/by-prn/${p}/save-draft`, {
      method: "POST",
      body: { items: Array.isArray(items) ? items : [], electives: Array.isArray(electives) ? electives : [] },
    });
  },

  async submitToHod(prn, items, remarks, electives = []) {
    const p = encodeURIComponent(String(prn || "").trim());
    return apiRequest(`/api/clerk/grade-entry/by-prn/${p}/submit-to-hod`, {
      method: "POST",
      body: { items: Array.isArray(items) ? items : [], remarks: remarks || "", electives: Array.isArray(electives) ? electives : [] },
    });
  },
};
