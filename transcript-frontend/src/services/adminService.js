import { apiRequest } from "./apiClient";

export const adminService = {
  getDashboardSummary: async () => apiRequest("/api/admin/dashboard/summary"),
  getRecentActivity: async ({ limit = 10 } = {}) => apiRequest(`/api/admin/audit/recent?limit=${encodeURIComponent(limit)}`),

  listUsers: async ({ q = "", role = "", page = 1, pageSize = 10 } = {}) =>
    apiRequest(
      `/api/admin/users?q=${encodeURIComponent(q)}&role=${encodeURIComponent(role)}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(
        pageSize
      )}`
    ),
  createUser: async (body) => apiRequest("/api/admin/users", { method: "POST", body }),
  updateUser: async (id, body) => apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PUT", body }),
  setUserLocked: async (id, locked) =>
    apiRequest(`/api/admin/users/${encodeURIComponent(id)}/lock`, { method: "POST", body: { locked: Boolean(locked) } }),
  softDeleteUser: async (id) => apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listRoles: async () => apiRequest("/api/admin/roles"),
  updateRolePermissions: async (roleId, body) =>
    apiRequest(`/api/admin/roles/${encodeURIComponent(roleId)}/permissions`, { method: "PUT", body }),

  listFaculties: async () => apiRequest("/api/admin/faculties"),
  listDepartments: async (facultyId) =>
    apiRequest(facultyId ? `/api/admin/departments?facultyId=${encodeURIComponent(facultyId)}` : "/api/admin/departments"),
  upsertFaculty: async (body) => apiRequest("/api/admin/faculties", { method: "POST", body }),
  upsertDepartment: async (body) => apiRequest("/api/admin/departments", { method: "POST", body }),

  listPrograms: async () => apiRequest("/api/admin/programs"),
  listCurriculumVersions: async (programId) =>
    apiRequest(`/api/admin/curriculum/versions?programId=${encodeURIComponent(programId || "")}`),
  upsertProgram: async (body) => apiRequest("/api/admin/programs", { method: "POST", body }),
  createCurriculumVersion: async (programId, body) =>
    apiRequest(`/api/admin/curriculum/versions?programId=${encodeURIComponent(programId || "")}`, { method: "POST", body }),
  listCurriculumSubjects: async (versionId) =>
    apiRequest(`/api/admin/curriculum/subjects?versionId=${encodeURIComponent(versionId || "")}`),
  createCurriculumSubject: async (versionId, body) =>
    apiRequest(`/api/admin/curriculum/subjects?versionId=${encodeURIComponent(versionId || "")}`, { method: "POST", body }),
  updateCurriculumSubject: async (id, versionId, body) =>
    apiRequest(`/api/admin/curriculum/subjects/${encodeURIComponent(id)}?versionId=${encodeURIComponent(versionId || "")}`, { method: "PUT", body }),
  deleteCurriculumSubject: async (id) =>
    apiRequest(`/api/admin/curriculum/subjects/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listGradingSchemes: async () => apiRequest("/api/admin/grading/schemes"),
  upsertGradingScheme: async (body) => apiRequest("/api/admin/grading/schemes", { method: "POST", body }),

  listTranscripts: async ({ status = "", q = "", page = 1, pageSize = 10 } = {}) =>
    apiRequest(
      `/api/admin/transcripts?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${encodeURIComponent(
        page
      )}&pageSize=${encodeURIComponent(pageSize)}`
    ),
  publishTranscript: async (id) => apiRequest(`/api/admin/transcripts/${encodeURIComponent(id)}/publish`, { method: "POST" }),

  listPayments: async ({ status = "", q = "", page = 1, pageSize = 10 } = {}) =>
    apiRequest(
      `/api/admin/payments?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${encodeURIComponent(
        page
      )}&pageSize=${encodeURIComponent(pageSize)}`
    ),

  listAuditLogs: async ({ q = "", action = "", from = "", to = "", page = 1, pageSize = 10 } = {}) =>
    apiRequest(
      `/api/admin/audit?q=${encodeURIComponent(q)}&action=${encodeURIComponent(action)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        to
      )}&page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`
    ),

  getSystemSettings: async () => apiRequest("/api/admin/settings"),
  updateSystemSettings: async (body) => apiRequest("/api/admin/settings", { method: "PUT", body }),
};
