import { apiRequest } from "./apiClient";

export const lookupService = {
  listFaculties: async () => apiRequest("/api/lookups/faculties"),
  listDepartments: async (facultyId) =>
    apiRequest(`/api/lookups/departments?facultyId=${encodeURIComponent(facultyId || "")}`),
  listPrograms: async (departmentId) =>
    apiRequest(`/api/lookups/programs?departmentId=${encodeURIComponent(departmentId || "")}`),
};
