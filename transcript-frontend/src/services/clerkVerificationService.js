import { apiRequest } from "./apiClient";

export const clerkVerificationService = {
  pending(q) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiRequest(`/api/clerk/verification/pending${qs}`);
  },
  approved(q) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiRequest(`/api/clerk/verification/approved${qs}`);
  },
  review(requestId) {
    return apiRequest(`/api/clerk/verification/${encodeURIComponent(requestId)}`);
  },
  approve(requestId, remarks) {
    return apiRequest(`/api/clerk/verification/${encodeURIComponent(requestId)}/approve`, {
      method: "POST",
      body: { remarks: remarks || "" },
    });
  },
  returnToStudent(requestId, remarks) {
    return apiRequest(`/api/clerk/verification/${encodeURIComponent(requestId)}/return`, {
      method: "POST",
      body: { remarks: remarks || "" },
    });
  },
};

