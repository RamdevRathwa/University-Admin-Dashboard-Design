using Application.DTOs.Admin;
using Domain.Entities;
using Domain.Enums;

namespace Application.Interfaces;

public interface IAdminRepository
{
    Task<AdminDashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AdminAuditItemDto>> GetRecentAuditAsync(int limit, CancellationToken ct = default);

    Task<PagedResultDto<AdminUserItemDto>> ListUsersAsync(string? q, UserRole? role, int page, int pageSize, CancellationToken ct = default);
    Task<User?> GetUserForUpdateAsync(Guid id, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, Guid? excludeUserId, CancellationToken ct = default);
    Task<bool> MobileExistsAsync(string mobile, Guid? excludeUserId, CancellationToken ct = default);
    Task AddUserAsync(User user, CancellationToken ct = default);
    Task UpdateUserAsync(User user, CancellationToken ct = default);

    Task<bool> HasActiveStudentWorkflowAsync(Guid studentId, CancellationToken ct = default);

    Task AddAuditAsync(AuditLog log, CancellationToken ct = default);
    Task<PagedResultDto<object>> ListAuditAsync(string? q, string? action, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct = default);

    Task<SystemSetting?> GetSettingAsync(string key, CancellationToken ct = default);
    Task UpsertSettingAsync(SystemSetting setting, CancellationToken ct = default);

    Task<IReadOnlyList<Faculty>> ListFacultiesAsync(CancellationToken ct = default);
    Task<Faculty?> GetFacultyAsync(Guid id, CancellationToken ct = default);
    Task UpsertFacultyAsync(Faculty faculty, CancellationToken ct = default);

    Task<IReadOnlyList<Department>> ListDepartmentsAsync(Guid? facultyId, CancellationToken ct = default);
    Task<Department?> GetDepartmentAsync(Guid id, CancellationToken ct = default);
    Task UpsertDepartmentAsync(Department dept, CancellationToken ct = default);

    Task<IReadOnlyList<Domain.Entities.Program>> ListProgramsAsync(CancellationToken ct = default);
    Task<Domain.Entities.Program?> GetProgramAsync(Guid id, CancellationToken ct = default);
    Task UpsertProgramAsync(Domain.Entities.Program program, CancellationToken ct = default);

    Task<IReadOnlyList<CurriculumVersion>> ListCurriculumVersionsAsync(Guid? programId, CancellationToken ct = default);
    Task AddCurriculumVersionAsync(CurriculumVersion version, CancellationToken ct = default);
    Task<bool> IsCurriculumVersionUsedAsync(Guid versionId, CancellationToken ct = default);
    Task<IReadOnlyList<CurriculumSubject>> ListCurriculumSubjectsAsync(Guid versionId, CancellationToken ct = default);
    Task<Domain.Entities.Program?> GetProgramByCurriculumVersionAsync(Guid versionId, CancellationToken ct = default);
    Task<Guid?> GetCurriculumVersionIdBySubjectAsync(Guid curriculumSubjectId, CancellationToken ct = default);
    Task UpsertCurriculumSubjectAsync(Guid? curriculumSubjectId, Guid versionId, CurriculumSubject subject, CancellationToken ct = default);
    Task SoftDeleteCurriculumSubjectAsync(Guid curriculumSubjectId, CancellationToken ct = default);

    Task<IReadOnlyList<GradingScheme>> ListGradingSchemesAsync(CancellationToken ct = default);
    Task AddGradingSchemeAsync(GradingScheme scheme, CancellationToken ct = default);

    Task<PagedResultDto<AdminTranscriptItemDto>> ListTranscriptsAsync(string? status, string? q, int page, int pageSize, CancellationToken ct = default);
    Task<Transcript?> GetTranscriptForUpdateAsync(Guid id, CancellationToken ct = default);
}
