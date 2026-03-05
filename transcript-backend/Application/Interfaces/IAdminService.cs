using Application.DTOs.Admin;
using Domain.Enums;

namespace Application.Interfaces;

public interface IAdminService
{
    Task<AdminDashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AdminAuditItemDto>> GetRecentAuditAsync(int limit, CancellationToken ct = default);

    Task<PagedResultDto<AdminUserItemDto>> ListUsersAsync(string? q, string? role, int page, int pageSize, CancellationToken ct = default);
    Task<AdminUserItemDto> CreateUserAsync(AdminUserUpsertDto dto, CancellationToken ct = default);
    Task<AdminUserItemDto> UpdateUserAsync(Guid id, AdminUserUpsertDto dto, CancellationToken ct = default);
    Task LockUserAsync(Guid id, bool locked, CancellationToken ct = default);
    Task SoftDeleteUserAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<object>> ListRolesAsync(CancellationToken ct = default);
    Task UpdateRolePermissionsAsync(string roleId, object body, CancellationToken ct = default);

    Task<IReadOnlyList<object>> ListFacultiesAsync(CancellationToken ct = default);
    Task UpsertFacultyAsync(object body, CancellationToken ct = default);
    Task<IReadOnlyList<object>> ListDepartmentsAsync(Guid? facultyId, CancellationToken ct = default);
    Task UpsertDepartmentAsync(object body, CancellationToken ct = default);

    Task<IReadOnlyList<object>> ListProgramsAsync(CancellationToken ct = default);
    Task UpsertProgramAsync(object body, CancellationToken ct = default);
    Task<IReadOnlyList<object>> ListCurriculumVersionsAsync(Guid? programId, CancellationToken ct = default);
    Task CreateCurriculumVersionAsync(Guid? programId, object body, CancellationToken ct = default);

    Task<IReadOnlyList<object>> ListGradingSchemesAsync(CancellationToken ct = default);
    Task UpsertGradingSchemeAsync(object body, CancellationToken ct = default);

    Task<PagedResultDto<AdminTranscriptItemDto>> ListTranscriptsAsync(string? status, string? q, int page, int pageSize, CancellationToken ct = default);
    Task PublishTranscriptAsync(Guid id, CancellationToken ct = default);

    Task<PagedResultDto<object>> ListPaymentsAsync(string? status, string? q, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResultDto<object>> ListAuditAsync(string? q, string? action, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct = default);

    Task<object> GetSystemSettingsAsync(CancellationToken ct = default);
    Task UpdateSystemSettingsAsync(object body, CancellationToken ct = default);
}

