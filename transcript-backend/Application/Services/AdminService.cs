using System.Text.Json;
using Application.Common;
using Application.DTOs.Admin;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class AdminService : IAdminService
{
    private const string SettingsKey = "admin_settings";
    private const string RolePermsKey = "role_permissions";

    private readonly ICurrentUserService _current;
    private readonly IAdminRepository _repo;
    private readonly IUnitOfWork _uow;

    public AdminService(ICurrentUserService current, IAdminRepository repo, IUnitOfWork uow)
    {
        _current = current;
        _repo = repo;
        _uow = uow;
    }

    private void EnsureAdmin()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Admin) throw AppException.Forbidden();
    }

    public async Task<AdminDashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        return await _repo.GetDashboardSummaryAsync(ct);
    }

    public async Task<IReadOnlyList<AdminAuditItemDto>> GetRecentAuditAsync(int limit, CancellationToken ct = default)
    {
        EnsureAdmin();
        return await _repo.GetRecentAuditAsync(limit, ct);
    }

    public async Task<PagedResultDto<AdminUserItemDto>> ListUsersAsync(string? q, string? role, int page, int pageSize, CancellationToken ct = default)
    {
        EnsureAdmin();
        var parsed = ParseRole(role);
        return await _repo.ListUsersAsync(q, parsed, page, pageSize, ct);
    }

    public async Task<AdminUserItemDto> CreateUserAsync(AdminUserUpsertDto dto, CancellationToken ct = default)
    {
        EnsureAdmin();
        var email = NormalizeEmail(dto.Email);
        var mobile = NormalizeMobile(dto.Mobile);
        var name = (dto.FullName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name)) throw new AppException("Full name is required.", 400, "full_name_required");
        if (string.IsNullOrWhiteSpace(email)) throw new AppException("Email is required.", 400, "email_required");
        if (string.IsNullOrWhiteSpace(mobile)) throw new AppException("Mobile is required.", 400, "mobile_required");

        if (await _repo.EmailExistsAsync(email, null, ct)) throw AppException.Conflict("Email already exists.");
        if (await _repo.MobileExistsAsync(mobile, null, ct)) throw AppException.Conflict("Mobile already exists.");

        var u = new User
        {
            Id = Guid.NewGuid(),
            FullName = name,
            Email = email,
            Mobile = mobile,
            Role = dto.Role,
            IsActive = dto.IsActive,
            Locked = dto.Locked,
            IsEmailVerified = true,
            IsMobileVerified = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _repo.AddUserAsync(u, ct);
        await _repo.AddAuditAsync(NewAudit("INSERT", "Users", u.Id.ToString(), null, JsonSerializer.Serialize(new
        {
            u.FullName, u.Email, u.Mobile, role = u.Role.ToString(), u.IsActive, u.Locked
        })), ct);
        await _uow.SaveChangesAsync(ct);

        return new AdminUserItemDto(u.Id, u.FullName, u.Email, u.Mobile, u.Role, u.IsActive, u.Locked, u.LastLoginAt);
    }

    public async Task<AdminUserItemDto> UpdateUserAsync(Guid id, AdminUserUpsertDto dto, CancellationToken ct = default)
    {
        EnsureAdmin();
        var user = await _repo.GetUserForUpdateAsync(id, ct);
        if (user is null || user.DeletedAt != null) throw AppException.NotFound("User not found.");

        var email = NormalizeEmail(dto.Email);
        var mobile = NormalizeMobile(dto.Mobile);
        var name = (dto.FullName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name)) throw new AppException("Full name is required.", 400, "full_name_required");
        if (string.IsNullOrWhiteSpace(email)) throw new AppException("Email is required.", 400, "email_required");
        if (string.IsNullOrWhiteSpace(mobile)) throw new AppException("Mobile is required.", 400, "mobile_required");

        if (await _repo.EmailExistsAsync(email, id, ct)) throw AppException.Conflict("Email already exists.");
        if (await _repo.MobileExistsAsync(mobile, id, ct)) throw AppException.Conflict("Mobile already exists.");

        var old = JsonSerializer.Serialize(new
        {
            user.FullName, user.Email, user.Mobile, role = user.Role.ToString(), user.IsActive, user.Locked
        });

        user.FullName = name;
        user.Email = email;
        user.Mobile = mobile;
        user.Role = dto.Role;
        user.IsActive = dto.IsActive;
        user.Locked = dto.Locked;

        await _repo.UpdateUserAsync(user, ct);
        await _repo.AddAuditAsync(NewAudit("UPDATE", "Users", user.Id.ToString(), old, JsonSerializer.Serialize(new
        {
            user.FullName, user.Email, user.Mobile, role = user.Role.ToString(), user.IsActive, user.Locked
        })), ct);
        await _uow.SaveChangesAsync(ct);

        return new AdminUserItemDto(user.Id, user.FullName, user.Email, user.Mobile, user.Role, user.IsActive, user.Locked, user.LastLoginAt);
    }

    public async Task LockUserAsync(Guid id, bool locked, CancellationToken ct = default)
    {
        EnsureAdmin();
        var user = await _repo.GetUserForUpdateAsync(id, ct);
        if (user is null || user.DeletedAt != null) throw AppException.NotFound("User not found.");

        var old = user.Locked;
        user.Locked = locked;
        await _repo.UpdateUserAsync(user, ct);
        await _repo.AddAuditAsync(NewAudit("UPDATE", "Users", user.Id.ToString(), JsonSerializer.Serialize(new { locked = old }), JsonSerializer.Serialize(new { locked })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task SoftDeleteUserAsync(Guid id, CancellationToken ct = default)
    {
        EnsureAdmin();
        var user = await _repo.GetUserForUpdateAsync(id, ct);
        if (user is null || user.DeletedAt != null) throw AppException.NotFound("User not found.");

        if (user.Role == UserRole.Student)
        {
            if (await _repo.HasActiveStudentWorkflowAsync(user.Id, ct))
                throw new AppException("Cannot delete user: active transcript request/transcript exists.", 400, "user_has_active_transcript");
        }

        user.IsActive = false;
        user.Locked = true;
        user.DeletedAt = DateTimeOffset.UtcNow;
        await _repo.UpdateUserAsync(user, ct);
        await _repo.AddAuditAsync(NewAudit("DELETE", "Users", user.Id.ToString(), null, JsonSerializer.Serialize(new { deletedAt = user.DeletedAt })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public Task<IReadOnlyList<object>> ListRolesAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var roles = Enum.GetValues<UserRole>()
            .Select(r => (object)new { id = (int)r, name = r.ToString(), description = string.Empty, permissions = Array.Empty<string>() })
            .ToList()
            .AsReadOnly();
        return Task.FromResult<IReadOnlyList<object>>(roles);
    }

    public async Task UpdateRolePermissionsAsync(string roleId, object body, CancellationToken ct = default)
    {
        EnsureAdmin();

        // Minimal: store the payload under a single settings key so UI doesn't break.
        var json = JsonSerializer.Serialize(body);
        var existing = await _repo.GetSettingAsync(RolePermsKey, ct);
        if (existing is null)
        {
            existing = new SystemSetting { Id = Guid.NewGuid(), SettingKey = RolePermsKey, SettingValue = json, UpdatedAt = DateTimeOffset.UtcNow, UpdatedBy = _current.UserId };
        }
        else
        {
            existing.SettingValue = json;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            existing.UpdatedBy = _current.UserId;
        }

        await _repo.UpsertSettingAsync(existing, ct);
        await _repo.AddAuditAsync(NewAudit("UPDATE", "SystemSettings", RolePermsKey, null, json), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListFacultiesAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var list = await _repo.ListFacultiesAsync(ct);
        return list.Select(f => (object)new { id = f.Id, code = f.Code, name = f.Name, active = f.IsActive }).ToList();
    }

    public async Task UpsertFacultyAsync(object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        var e = ToJsonElement(body);
        var id = TryGuid(e, "id") ?? Guid.NewGuid();
        var code = GetString(e, "code") ?? string.Empty;
        var name = GetString(e, "name") ?? string.Empty;
        var active = TryBool(e, "active") ?? true;
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            throw new AppException("Faculty code and name are required.", 400, "validation_error");

        var existing = await _repo.GetFacultyAsync(id, ct);
        var f = existing ?? new Faculty { Id = id, CreatedAt = DateTimeOffset.UtcNow };
        f.Code = code.Trim();
        f.Name = name.Trim();
        f.IsActive = active;
        await _repo.UpsertFacultyAsync(f, ct);
        await _repo.AddAuditAsync(NewAudit(existing is null ? "INSERT" : "UPDATE", "Faculties", f.Id.ToString(), null, JsonSerializer.Serialize(new { f.Code, f.Name, f.IsActive })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListDepartmentsAsync(Guid? facultyId, CancellationToken ct = default)
    {
        EnsureAdmin();
        var list = await _repo.ListDepartmentsAsync(facultyId, ct);
        return list.Select(d => (object)new { id = d.Id, facultyId = d.FacultyId, code = d.Code, name = d.Name, hodUserId = d.HodUserId, active = d.IsActive }).ToList();
    }

    public async Task UpsertDepartmentAsync(object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        var e = ToJsonElement(body);
        var id = TryGuid(e, "id") ?? Guid.NewGuid();
        var facultyId = TryGuid(e, "facultyId");
        var code = GetString(e, "code") ?? string.Empty;
        var name = GetString(e, "name") ?? string.Empty;
        var hodUserId = TryGuid(e, "hodUserId");
        var active = TryBool(e, "active") ?? true;

        if (!facultyId.HasValue) throw new AppException("Faculty is required.", 400, "validation_error");
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            throw new AppException("Department code and name are required.", 400, "validation_error");

        var existing = await _repo.GetDepartmentAsync(id, ct);
        var d = existing ?? new Department { Id = id, CreatedAt = DateTimeOffset.UtcNow };
        d.FacultyId = facultyId.Value;
        d.Code = code.Trim();
        d.Name = name.Trim();
        d.HodUserId = hodUserId;
        d.IsActive = active;

        await _repo.UpsertDepartmentAsync(d, ct);
        await _repo.AddAuditAsync(NewAudit(existing is null ? "INSERT" : "UPDATE", "Departments", d.Id.ToString(), null, JsonSerializer.Serialize(new { d.FacultyId, d.Code, d.Name, d.HodUserId, d.IsActive })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListProgramsAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var list = await _repo.ListProgramsAsync(ct);
        return list.Select(p => (object)new
        {
            id = p.Id,
            departmentId = p.DepartmentId,
            code = p.Code,
            name = p.Name,
            degreeName = p.DegreeName,
            durationYears = p.DurationYears,
            gradingSchemeId = p.GradingSchemeId
        }).ToList();
    }

    public async Task UpsertProgramAsync(object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        var e = ToJsonElement(body);
        var id = TryGuid(e, "id") ?? Guid.NewGuid();
        var departmentId = TryGuid(e, "departmentId");
        var code = GetString(e, "code") ?? string.Empty;
        var name = GetString(e, "name") ?? string.Empty;
        var degreeName = GetString(e, "degreeName") ?? string.Empty;
        var durationYears = TryInt(e, "durationYears") ?? 4;
        var gradingSchemeId = TryGuid(e, "gradingSchemeId");

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(degreeName) || !departmentId.HasValue || !gradingSchemeId.HasValue)
            throw new AppException("Department, program code, name, degree name and grading scheme are required.", 400, "validation_error");

        var existing = await _repo.GetProgramAsync(id, ct);
        var p = existing ?? new Domain.Entities.Program { Id = id, CreatedAt = DateTimeOffset.UtcNow };
        p.DepartmentId = departmentId.Value;
        p.Code = code.Trim();
        p.Name = name.Trim();
        p.DegreeName = degreeName.Trim();
        p.DurationYears = Math.Clamp(durationYears, 1, 10);
        p.GradingSchemeId = gradingSchemeId;

        await _repo.UpsertProgramAsync(p, ct);
        await _repo.AddAuditAsync(NewAudit(existing is null ? "INSERT" : "UPDATE", "Programs", p.Id.ToString(), null, JsonSerializer.Serialize(new { p.Code, p.Name })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListCurriculumVersionsAsync(Guid? programId, CancellationToken ct = default)
    {
        EnsureAdmin();
        var list = await _repo.ListCurriculumVersionsAsync(programId, ct);
        return list.Select(v => (object)new
        {
            id = v.Id,
            programId = v.ProgramId,
            academicYear = v.AcademicYear,
            versionName = v.VersionName,
            active = v.IsActive,
            locked = v.Locked,
            subjectCount = 0
        }).ToList();
    }

    public async Task CreateCurriculumVersionAsync(Guid? programId, object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        if (!programId.HasValue) throw new AppException("ProgramId is required.", 400, "validation_error");
        var e = ToJsonElement(body);
        var academicYear = (GetString(e, "academicYear") ?? string.Empty).Trim();
        var versionName = (GetString(e, "versionName") ?? string.Empty).Trim();
        var active = TryBool(e, "active") ?? true;

        if (string.IsNullOrWhiteSpace(academicYear) || string.IsNullOrWhiteSpace(versionName))
            throw new AppException("AcademicYear and VersionName are required.", 400, "validation_error");

        var v = new CurriculumVersion
        {
            Id = Guid.NewGuid(),
            ProgramId = programId.Value,
            AcademicYear = academicYear,
            VersionName = versionName,
            IsActive = active,
            Locked = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _repo.AddCurriculumVersionAsync(v, ct);
        await _repo.AddAuditAsync(NewAudit("INSERT", "CurriculumVersions", v.Id.ToString(), null, JsonSerializer.Serialize(new { v.ProgramId, v.AcademicYear, v.VersionName })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListCurriculumSubjectsAsync(Guid? versionId, CancellationToken ct = default)
    {
        EnsureAdmin();
        if (!versionId.HasValue) throw new AppException("VersionId is required.", 400, "validation_error");

        var program = await _repo.GetProgramByCurriculumVersionAsync(versionId.Value, ct);
        var items = await _repo.ListCurriculumSubjectsAsync(versionId.Value, ct);
        var locked = await _repo.IsCurriculumVersionUsedAsync(versionId.Value, ct);

        return items.Select(subject => (object)new
        {
            id = subject.Id,
            versionId = subject.VersionId,
            semesterNumber = subject.SemesterNumber,
            displayOrder = subject.DisplayOrder,
            subjectCode = subject.SubjectCode,
            subjectName = subject.SubjectName,
            titleOnTranscript = subject.TitleOnTranscript,
            thHours = subject.ThHours,
            prHours = subject.PrHours,
            thCredits = subject.ThCredits,
            prCredits = subject.PrCredits,
            totalCredits = subject.ThCredits + subject.PrCredits,
            hasTheory = subject.HasTheory,
            hasPractical = subject.HasPractical,
            isElective = subject.IsElective,
            active = subject.IsActive,
            locked,
            programName = program?.Name,
            programCode = program?.Code
        }).ToList();
    }

    public async Task UpsertCurriculumSubjectAsync(Guid? versionId, Guid? curriculumSubjectId, object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        if (!versionId.HasValue) throw new AppException("VersionId is required.", 400, "validation_error");
        if (await _repo.IsCurriculumVersionUsedAsync(versionId.Value, ct))
            throw new AppException("This curriculum version is already in use and cannot be edited.", 400, "curriculum_locked");

        var e = ToJsonElement(body);
        var subjectCode = (GetString(e, "subjectCode") ?? string.Empty).Trim();
        var subjectName = (GetString(e, "subjectName") ?? string.Empty).Trim();
        var titleOnTranscript = (GetString(e, "titleOnTranscript") ?? subjectName).Trim();
        var semesterNumber = TryInt(e, "semesterNumber") ?? 0;
        var displayOrder = TryInt(e, "displayOrder") ?? 1;
        var thHours = TryDecimal(e, "thHours") ?? 0m;
        var prHours = TryDecimal(e, "prHours") ?? 0m;
        var thCredits = TryDecimal(e, "thCredits") ?? 0m;
        var prCredits = TryDecimal(e, "prCredits") ?? 0m;
        var hasTheory = TryBool(e, "hasTheory") ?? true;
        var hasPractical = TryBool(e, "hasPractical") ?? false;
        var isElective = TryBool(e, "isElective") ?? false;
        var active = TryBool(e, "active") ?? true;

        if (string.IsNullOrWhiteSpace(subjectCode) || string.IsNullOrWhiteSpace(subjectName))
            throw new AppException("Subject code and subject name are required.", 400, "validation_error");
        if (semesterNumber < 1 || semesterNumber > 8)
            throw new AppException("Semester number must be between 1 and 8.", 400, "validation_error");

        var subject = new CurriculumSubject
        {
            Id = curriculumSubjectId ?? Guid.NewGuid(),
            VersionId = versionId.Value,
            SemesterNumber = semesterNumber,
            DisplayOrder = displayOrder,
            SubjectCode = subjectCode,
            SubjectName = subjectName,
            TitleOnTranscript = string.IsNullOrWhiteSpace(titleOnTranscript) ? subjectName : titleOnTranscript,
            ThHours = thHours,
            PrHours = prHours,
            ThCredits = thCredits,
            PrCredits = prCredits,
            HasTheory = hasTheory,
            HasPractical = hasPractical,
            IsElective = isElective,
            IsActive = active
        };

        await _repo.UpsertCurriculumSubjectAsync(curriculumSubjectId, versionId.Value, subject, ct);
        await _repo.AddAuditAsync(NewAudit(curriculumSubjectId.HasValue ? "UPDATE" : "INSERT", "CurriculumSubjects", subject.Id.ToString(), null, JsonSerializer.Serialize(new
        {
            subject.VersionId,
            subject.SemesterNumber,
            subject.SubjectCode,
            subject.SubjectName,
            subject.ThCredits,
            subject.PrCredits
        })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteCurriculumSubjectAsync(Guid curriculumSubjectId, CancellationToken ct = default)
    {
        EnsureAdmin();
        var parentVersionId = await _repo.GetCurriculumVersionIdBySubjectAsync(curriculumSubjectId, ct);
        if (parentVersionId.HasValue && await _repo.IsCurriculumVersionUsedAsync(parentVersionId.Value, ct))
            throw new AppException("This curriculum version is already in use and cannot be edited.", 400, "curriculum_locked");

        await _repo.SoftDeleteCurriculumSubjectAsync(curriculumSubjectId, ct);
        await _repo.AddAuditAsync(NewAudit("DELETE", "CurriculumSubjects", curriculumSubjectId.ToString(), null, JsonSerializer.Serialize(new { inactive = true })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<object>> ListGradingSchemesAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var list = await _repo.ListGradingSchemesAsync(ct);
        return list.Select(s => (object)new
        {
            id = s.Id,
            schemeName = s.SchemeName,
            schemeType = s.SchemeType,
            maxGradePoint = s.MaxGradePoint,
            active = s.IsActive
        }).ToList();
    }

    public async Task UpsertGradingSchemeAsync(object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        var e = ToJsonElement(body);
        var name = (GetString(e, "name") ?? GetString(e, "schemeName") ?? string.Empty).Trim();
        var type = (GetString(e, "type") ?? GetString(e, "schemeType") ?? "10-Point").Trim();
        var maxGp = TryDecimal(e, "maxGradePoint") ?? 10m;

        if (string.IsNullOrWhiteSpace(name)) throw new AppException("Scheme name is required.", 400, "validation_error");

        var s = new GradingScheme
        {
            Id = Guid.NewGuid(),
            SchemeName = name,
            SchemeType = type,
            MaxGradePoint = maxGp,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _repo.AddGradingSchemeAsync(s, ct);
        await _repo.AddAuditAsync(NewAudit("INSERT", "GradingSchemes", s.Id.ToString(), null, JsonSerializer.Serialize(new { s.SchemeName, s.SchemeType })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<PagedResultDto<AdminTranscriptItemDto>> ListTranscriptsAsync(string? status, string? q, int page, int pageSize, CancellationToken ct = default)
    {
        EnsureAdmin();
        return await _repo.ListTranscriptsAsync(status, q, page, pageSize, ct);
    }

    public async Task PublishTranscriptAsync(Guid id, CancellationToken ct = default)
    {
        EnsureAdmin();
        var t = await _repo.GetTranscriptForUpdateAsync(id, ct);
        if (t is null) throw AppException.NotFound("Transcript not found.");
        if (!t.Locked) throw new AppException("Cannot publish: transcript not approved/locked by Dean.", 400, "not_approved");
        if (t.PublishedAt != null) throw new AppException("Transcript already published.", 400, "already_published");

        t.PublishedAt = DateTimeOffset.UtcNow;
        t.PublishedBy = _current.UserId;
        await _repo.AddAuditAsync(NewAudit("PUBLISH", "Transcripts", t.Id.ToString(), null, JsonSerializer.Serialize(new { t.PublishedAt, t.PublishedBy })), ct);
        await _uow.SaveChangesAsync(ct);
    }

    public Task<PagedResultDto<object>> ListPaymentsAsync(string? status, string? q, int page, int pageSize, CancellationToken ct = default)
    {
        EnsureAdmin();
        return Task.FromResult(new PagedResultDto<object>(Array.Empty<object>(), 0, page < 1 ? 1 : page, pageSize));
    }

    public async Task<PagedResultDto<object>> ListAuditAsync(string? q, string? action, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct = default)
    {
        EnsureAdmin();
        return await _repo.ListAuditAsync(q, action, from, to, page, pageSize, ct);
    }

    public async Task<object> GetSystemSettingsAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var s = await _repo.GetSettingAsync(SettingsKey, ct);
        if (s is null)
        {
            return new
            {
                appName = "Online Transcript Management System",
                contactEmail = "",
                maintenanceMode = false,
                otp = new { ttlSeconds = 300, length = 6, maxSendPerHour = 20 },
                smtp = new { host = "", port = 587, username = "", fromEmail = "", fromName = "Maharaja Sayajirao University of Baroda" },
                payment = new { enabled = false, gateway = "", notes = "" }
            };
        }

        try
        {
            var obj = JsonSerializer.Deserialize<object>(s.SettingValue);
            return obj ?? new { };
        }
        catch
        {
            return new { };
        }
    }

    public async Task UpdateSystemSettingsAsync(object body, CancellationToken ct = default)
    {
        EnsureAdmin();
        var json = JsonSerializer.Serialize(body);
        var s = await _repo.GetSettingAsync(SettingsKey, ct);
        if (s is null)
        {
            s = new SystemSetting { Id = Guid.NewGuid(), SettingKey = SettingsKey, SettingValue = json, UpdatedAt = DateTimeOffset.UtcNow, UpdatedBy = _current.UserId };
        }
        else
        {
            s.SettingValue = json;
            s.UpdatedAt = DateTimeOffset.UtcNow;
            s.UpdatedBy = _current.UserId;
        }

        await _repo.UpsertSettingAsync(s, ct);
        await _repo.AddAuditAsync(NewAudit("UPDATE", "SystemSettings", SettingsKey, null, json), ct);
        await _uow.SaveChangesAsync(ct);
    }

    private static UserRole? ParseRole(string? role)
    {
        var r = (role ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(r)) return null;
        if (Enum.TryParse<UserRole>(r, ignoreCase: true, out var parsed)) return parsed;
        return null;
    }

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();
    private static string NormalizeMobile(string mobile) => new string((mobile ?? string.Empty).Where(char.IsDigit).ToArray());

    private AuditLog NewAudit(string action, string entity, string? recordId, string? oldValue, string? newValue)
    {
        return new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = _current.UserId,
            UserLabel = _current.UserId.ToString(),
            ActionType = action,
            EntityName = entity,
            RecordId = recordId,
            Success = true,
            OldValue = oldValue,
            NewValue = newValue,
            IpAddress = null,
            UserAgent = null,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private static JsonElement ToJsonElement(object body)
    {
        if (body is JsonElement je) return je;
        var json = JsonSerializer.Serialize(body);
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    private static string? GetString(JsonElement e, string prop)
    {
        if (e.ValueKind != JsonValueKind.Object) return null;
        if (!e.TryGetProperty(prop, out var v)) return null;
        if (v.ValueKind == JsonValueKind.String) return v.GetString();
        return v.ToString();
    }

    private static Guid? TryGuid(JsonElement e, string prop)
    {
        var s = GetString(e, prop);
        if (string.IsNullOrWhiteSpace(s)) return null;
        return Guid.TryParse(s, out var g) ? g : null;
    }

    private static int? TryInt(JsonElement e, string prop)
    {
        if (e.ValueKind == JsonValueKind.Object && e.TryGetProperty(prop, out var v))
        {
            if (v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i)) return i;
            if (v.ValueKind == JsonValueKind.String && int.TryParse(v.GetString(), out var i2)) return i2;
        }
        return null;
    }

    private static bool? TryBool(JsonElement e, string prop)
    {
        if (e.ValueKind == JsonValueKind.Object && e.TryGetProperty(prop, out var v))
        {
            if (v.ValueKind == JsonValueKind.True) return true;
            if (v.ValueKind == JsonValueKind.False) return false;
            if (v.ValueKind == JsonValueKind.String && bool.TryParse(v.GetString(), out var b)) return b;
        }
        return null;
    }

    private static decimal? TryDecimal(JsonElement e, string prop)
    {
        if (e.ValueKind == JsonValueKind.Object && e.TryGetProperty(prop, out var v))
        {
            if (v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d)) return d;
            if (v.ValueKind == JsonValueKind.String && decimal.TryParse(v.GetString(), out var d2)) return d2;
        }
        return null;
    }
}
