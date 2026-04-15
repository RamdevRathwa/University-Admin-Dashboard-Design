using Application.DTOs.Admin;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Infrastructure.Persistence.V2.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class AdminRepository : IAdminRepository
{
    private static readonly HashSet<string> AllowedAuditActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "INSERT", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "APPROVE", "REJECT", "PAYMENT", "DOWNLOAD"
    };

    private readonly V2DbContext _db;
    public AdminRepository(V2DbContext db) => _db = db;

    public async Task<AdminDashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken ct = default)
    {
        var activeUsers = _db.Users.AsNoTracking().Where(u => u.DeletedAt == null);

        var userIds = await activeUsers.Select(u => u.UserId).ToListAsync(ct);
        var roles = await _db.UserRoles.AsNoTracking()
            .Where(ur => userIds.Contains(ur.UserId))
            .GroupBy(ur => ur.UserId)
            .Select(g => new { userId = g.Key, roleId = g.Max(x => x.RoleId) })
            .ToListAsync(ct);

        var totalStudents = roles.Count(x => x.roleId == (short)UserRole.Student);
        var totalStaff = roles.Count - totalStudents;

        var approvedTranscripts = await _db.Transcripts.AsNoTracking().CountAsync(t => (t.IsLocked ?? false), ct);
        var pendingTranscripts = await _db.Transcripts.AsNoTracking().CountAsync(t => (t.IsLocked ?? false) && t.PublishedAt == null, ct);

        var totalPaymentsReceived = 0m;
        var systemAlerts = pendingTranscripts;

        return new AdminDashboardSummaryDto(
            totalStudents,
            totalStaff,
            pendingTranscripts,
            approvedTranscripts,
            totalPaymentsReceived,
            systemAlerts
        );
    }

    public async Task<IReadOnlyList<AdminAuditItemDto>> GetRecentAuditAsync(int limit, CancellationToken ct = default)
    {
        var l = Math.Clamp(limit, 1, 100);
        var list = await _db.AuditLogs.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(l)
            .ToListAsync(ct);

        // V2 audit logs don't store user label + success separately; infer.
        var result = new List<AdminAuditItemDto>(list.Count);
        foreach (var a in list)
        {
            var label = a.UserId.HasValue ? await UserLabelAsync(a.UserId.Value, ct) : "System";
            result.Add(new AdminAuditItemDto(
                EncodeInt64Guid(0xA1, a.AuditLogId),
                a.CreatedAt.ToString("u"),
                label,
                a.ActionType,
                a.EntityName ?? string.Empty,
                true
            ));
        }

        return result;
    }

    public async Task<PagedResultDto<AdminUserItemDto>> ListUsersAsync(string? q, UserRole? role, int page, int pageSize, CancellationToken ct = default)
    {
        var p = page < 1 ? 1 : page;
        var ps = Math.Clamp(pageSize, 1, 100);
        var query = _db.Users.AsNoTracking().Where(u => u.DeletedAt == null);

        var term = (q ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(u =>
                u.FullName.Contains(term) ||
                (u.Email != null && u.Email.Contains(term)) ||
                (u.Mobile != null && u.Mobile.Contains(term)));
        }

        var total = await query.CountAsync(ct);
        var users = await query
            .OrderBy(u => u.FullName)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        var userIds = users.Select(u => u.UserId).ToList();
        var roleByUser = await _db.UserRoles.AsNoTracking()
            .Where(ur => userIds.Contains(ur.UserId))
            .GroupBy(ur => ur.UserId)
            .Select(g => new { userId = g.Key, roleId = g.Max(x => x.RoleId) })
            .ToDictionaryAsync(x => x.userId, x => x.roleId, ct);

        var mapByUser = await _db.MapUsers.AsNoTracking()
            .Where(m => userIds.Contains(m.UserId))
            .ToDictionaryAsync(m => m.UserId, m => m.LegacyUserGuid, ct);

        var items = users.Select(u =>
        {
            mapByUser.TryGetValue(u.UserId, out var legacy);
            var roleId = roleByUser.TryGetValue(u.UserId, out var rid) ? rid : (short)UserRole.Student;

            return new AdminUserItemDto(
                legacy == Guid.Empty ? Guid.NewGuid() : legacy,
                u.FullName,
                u.Email ?? string.Empty,
                u.Mobile ?? string.Empty,
                Enum.IsDefined(typeof(UserRole), (int)roleId) ? (UserRole)roleId : UserRole.Student,
                u.IsActive,
                false,
                null
            );
        }).ToList();

        if (role.HasValue) items = items.Where(x => x.Role == role.Value).ToList();

        return new PagedResultDto<AdminUserItemDto>(items, role.HasValue ? items.Count : total, p, ps);
    }

    public async Task<User?> GetUserForUpdateAsync(Guid id, CancellationToken ct = default)
    {
        var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == id, ct);
        if (mu is null) return null;

        var u = await _db.Users.FirstOrDefaultAsync(x => x.UserId == mu.UserId, ct);
        if (u is null) return null;

        var roleId = await _db.UserRoles.AsNoTracking()
            .Where(x => x.UserId == u.UserId)
            .Select(x => (short?)x.RoleId)
            .OrderByDescending(x => x)
            .FirstOrDefaultAsync(ct) ?? (short)UserRole.Student;

        return new User
        {
            Id = id,
            FullName = u.FullName,
            Email = u.Email ?? string.Empty,
            Mobile = u.Mobile ?? string.Empty,
            Role = Enum.IsDefined(typeof(UserRole), (int)roleId) ? (UserRole)roleId : UserRole.Student,
            IsEmailVerified = u.IsEmailVerified,
            IsMobileVerified = u.IsMobileVerified,
            IsActive = u.IsActive,
            Locked = false,
            DeletedAt = u.DeletedAt,
            CreatedAt = u.CreatedAt
        };
    }

    public Task<bool> EmailExistsAsync(string email, Guid? excludeUserId, CancellationToken ct = default)
    {
        var e = (email ?? string.Empty).Trim().ToLowerInvariant();
        var q = _db.Users.AsNoTracking().Where(x => x.NormalizedEmail == e);
        if (excludeUserId.HasValue)
        {
            q = q.Where(x => !_db.MapUsers.Any(m => m.LegacyUserGuid == excludeUserId.Value && m.UserId == x.UserId));
        }
        return q.AnyAsync(ct);
    }

    public Task<bool> MobileExistsAsync(string mobile, Guid? excludeUserId, CancellationToken ct = default)
    {
        var m = new string((mobile ?? string.Empty).Where(char.IsDigit).ToArray());
        var q = _db.Users.AsNoTracking().Where(x => x.NormalizedMobile == m);
        if (excludeUserId.HasValue)
        {
            q = q.Where(x => !_db.MapUsers.Any(mm => mm.LegacyUserGuid == excludeUserId.Value && mm.UserId == x.UserId));
        }
        return q.AnyAsync(ct);
    }

    public async Task AddUserAsync(User user, CancellationToken ct = default)
    {
        // Delegate to core UserRepository logic is not available here; implement minimal.
        var now = DateTimeOffset.UtcNow;
        var email = (user.Email ?? string.Empty).Trim();
        var mobile = new string((user.Mobile ?? string.Empty).Where(char.IsDigit).ToArray());
        var normEmail = email.Trim().ToLowerInvariant();

        var row = new Infrastructure.Persistence.V2.Entities.V2User
        {
            FullName = (user.FullName ?? string.Empty).Trim(),
            Email = email,
            Mobile = mobile,
            IsEmailVerified = user.IsEmailVerified,
            IsMobileVerified = user.IsMobileVerified,
            IsActive = user.IsActive,
            DeletedAt = user.DeletedAt,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _db.Users.AddAsync(row, ct);
        await _db.SaveChangesAsync(ct);

        if (!await _db.MapUsers.AnyAsync(x => x.LegacyUserGuid == user.Id, ct))
        {
            await _db.MapUsers.AddAsync(new Infrastructure.Persistence.V2.Entities.V2MapUser
            {
                LegacyUserGuid = user.Id,
                UserId = row.UserId
            }, ct);
        }

        await _db.UserRoles.AddAsync(new Infrastructure.Persistence.V2.Entities.V2UserRole
        {
            UserId = row.UserId,
            RoleId = (short)user.Role,
            AssignedAt = now,
            AssignedBy = null
        }, ct);
    }

    public async Task UpdateUserAsync(User user, CancellationToken ct = default)
    {
        var mu = await _db.MapUsers.FirstOrDefaultAsync(x => x.LegacyUserGuid == user.Id, ct);
        if (mu is null) return;

        var row = await _db.Users.FirstOrDefaultAsync(x => x.UserId == mu.UserId, ct);
        if (row is null) return;

        row.FullName = (user.FullName ?? string.Empty).Trim();
        row.Email = (user.Email ?? string.Empty).Trim();
        row.Mobile = new string((user.Mobile ?? string.Empty).Where(char.IsDigit).ToArray());
        row.IsActive = user.IsActive;
        row.DeletedAt = user.DeletedAt;
        row.IsEmailVerified = user.IsEmailVerified;
        row.IsMobileVerified = user.IsMobileVerified;
        row.UpdatedAt = DateTimeOffset.UtcNow;

        var targetRoleId = (short)user.Role;
        if (!await _db.UserRoles.AnyAsync(x => x.UserId == row.UserId && x.RoleId == targetRoleId, ct))
        {
            await _db.UserRoles.AddAsync(new Infrastructure.Persistence.V2.Entities.V2UserRole
            {
                UserId = row.UserId,
                RoleId = targetRoleId,
                AssignedAt = DateTimeOffset.UtcNow,
                AssignedBy = null
            }, ct);
        }
    }

    public async Task<bool> HasActiveStudentWorkflowAsync(Guid studentId, CancellationToken ct = default)
    {
        var ms = await _db.MapStudents.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == studentId, ct);
        if (ms is null) return false;

        var hasRequest = await _db.TranscriptRequests.AsNoTracking()
            .AnyAsync(x => x.StudentId == ms.StudentId, ct);
        if (hasRequest) return true;

        var hasTranscript = await _db.Transcripts.AsNoTracking()
            .AnyAsync(x => x.StudentId == ms.StudentId, ct);
        return hasTranscript;
    }

    public async Task AddAuditAsync(AuditLog log, CancellationToken ct = default)
    {
        long? userId = null;
        if (log.UserId.HasValue)
        {
            userId = await _db.MapUsers.AsNoTracking()
                .Where(x => x.LegacyUserGuid == log.UserId.Value)
                .Select(x => (long?)x.UserId)
                .FirstOrDefaultAsync(ct);
        }

        await _db.AuditLogs.AddAsync(new Infrastructure.Persistence.V2.Entities.V2AuditLog
        {
            UserId = userId,
            ActionType = NormalizeAuditAction(log.ActionType),
            EntityName = log.EntityName,
            EntityKey = log.RecordId,
            OldDataJson = log.OldValue,
            NewDataJson = log.NewValue,
            IpAddress = log.IpAddress,
            CreatedAt = log.CreatedAt == default ? DateTimeOffset.UtcNow : log.CreatedAt
        }, ct);
    }

    private static string NormalizeAuditAction(string? action)
    {
        var a = (action ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(a)) return "UPDATE";
        if (AllowedAuditActions.Contains(a)) return a;

        return a switch
        {
            "REGISTER" => "INSERT",
            "PUBLISH" => "UPDATE",
            "SAVE_DRAFT" => "UPDATE",
            "SUBMIT" => "UPDATE",
            "SUBMIT_TO_HOD" => "UPDATE",
            "FORWARD_TO_HOD" => "UPDATE",
            "RETURN" => "UPDATE",
            "UPLOAD" => "UPDATE",
            _ => "UPDATE"
        };
    }

    public async Task<PagedResultDto<object>> ListAuditAsync(string? q, string? action, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct = default)
    {
        var p = page < 1 ? 1 : page;
        var ps = Math.Clamp(pageSize, 1, 200);
        var query = _db.AuditLogs.AsNoTracking();

        var term = (q ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            var matchingUserIds = await _db.Users.AsNoTracking()
                .Where(u =>
                    u.FullName.Contains(term) ||
                    (u.Email != null && u.Email.Contains(term)) ||
                    (u.Mobile != null && u.Mobile.Contains(term)))
                .Select(u => u.UserId)
                .ToListAsync(ct);

            query = query.Where(x =>
                (x.EntityName != null && x.EntityName.Contains(term)) ||
                (x.EntityKey != null && x.EntityKey.Contains(term)) ||
                x.ActionType.Contains(term) ||
                (x.UserId.HasValue && matchingUserIds.Contains(x.UserId.Value)));
        }

        var act = (action ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(act)) query = query.Where(x => x.ActionType == act);

        if (from.HasValue)
        {
            var start = from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(x => x.CreatedAt >= start);
        }
        if (to.HasValue)
        {
            var end = to.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            query = query.Where(x => x.CreatedAt <= end);
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt).Skip((p - 1) * ps).Take(ps).ToListAsync(ct);

        var items = new List<object>(rows.Count);
        foreach (var x in rows)
        {
            items.Add(new
            {
                id = EncodeInt64Guid(0xA1, x.AuditLogId),
                time = x.CreatedAt.ToString("u"),
                user = x.UserId.HasValue ? await UserLabelAsync(x.UserId.Value, ct) : "System",
                action = x.ActionType,
                entity = x.EntityName ?? string.Empty,
                recordId = x.EntityKey,
                oldValue = x.OldDataJson,
                newValue = x.NewDataJson
            });
        }

        return new PagedResultDto<object>(items, total, p, ps);
    }

    public async Task<SystemSetting?> GetSettingAsync(string key, CancellationToken ct = default)
    {
        var k = (key ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(k)) return null;

        var row = await _db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(x => x.SettingKey == k, ct);
        if (row is null) return null;

        return new SystemSetting
        {
            Id = EncodeInt32Guid(0xB1, row.SettingId),
            SettingKey = row.SettingKey,
            SettingValue = row.SettingValue,
            UpdatedAt = row.UpdatedAt,
            UpdatedBy = row.UpdatedBy.HasValue ? await ResolveLegacyUserGuidAsync(row.UpdatedBy.Value, ct) : null
        };
    }

    public async Task UpsertSettingAsync(SystemSetting setting, CancellationToken ct = default)
    {
        var k = (setting.SettingKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(k)) return;

        var row = await _db.SystemSettings.FirstOrDefaultAsync(x => x.SettingKey == k, ct);
        if (row is null)
        {
            row = new Infrastructure.Persistence.V2.Entities.V2SystemSetting
            {
                SettingKey = k,
                SettingValue = setting.SettingValue ?? string.Empty,
                SettingType = "String",
                Description = null,
                UpdatedBy = null,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            await _db.SystemSettings.AddAsync(row, ct);
            return;
        }

        row.SettingValue = setting.SettingValue ?? string.Empty;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        if (setting.UpdatedBy.HasValue)
        {
            var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == setting.UpdatedBy.Value, ct);
            row.UpdatedBy = mu?.UserId;
        }
    }

    // Minimal institution methods (read-only). Write operations can be added later.
    public async Task<IReadOnlyList<Faculty>> ListFacultiesAsync(CancellationToken ct = default)
    {
        var rows = await _db.Faculties.AsNoTracking().OrderBy(x => x.FacultyName).ToListAsync(ct);
        return rows.Select(x => new Faculty
        {
            Id = EncodeInt32Guid(0xC1, x.FacultyId),
            Code = x.FacultyCode,
            Name = x.FacultyName,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    public async Task<Faculty?> GetFacultyAsync(Guid id, CancellationToken ct = default)
    {
        var fid = DecodeInt32Guid(id);
        if (!fid.HasValue) return null;

        var row = await _db.Faculties.AsNoTracking().FirstOrDefaultAsync(x => x.FacultyId == fid.Value, ct);
        if (row is null) return null;

        return new Faculty
        {
            Id = EncodeInt32Guid(0xC1, row.FacultyId),
            Code = row.FacultyCode,
            Name = row.FacultyName,
            IsActive = row.IsActive,
            CreatedAt = row.CreatedAt
        };
    }

    public async Task UpsertFacultyAsync(Faculty faculty, CancellationToken ct = default)
    {
        var fid = DecodeInt32Guid(faculty.Id);
        V2Faculty? row = null;
        if (fid.HasValue)
            row = await _db.Faculties.FirstOrDefaultAsync(x => x.FacultyId == fid.Value, ct);

        if (row is null)
        {
            row = new V2Faculty
            {
                FacultyCode = faculty.Code.Trim(),
                FacultyName = faculty.Name.Trim(),
                IsActive = faculty.IsActive,
                CreatedAt = faculty.CreatedAt == default ? DateTimeOffset.UtcNow : faculty.CreatedAt
            };
            _db.Faculties.Add(row);
        }
        else
        {
            row.FacultyCode = faculty.Code.Trim();
            row.FacultyName = faculty.Name.Trim();
            row.IsActive = faculty.IsActive;
        }
    }

    public async Task<IReadOnlyList<Department>> ListDepartmentsAsync(Guid? facultyId, CancellationToken ct = default)
    {
        var q = _db.Departments.AsNoTracking();
        if (facultyId.HasValue)
        {
            var fid = DecodeInt32Guid(facultyId.Value);
            if (fid.HasValue) q = q.Where(x => x.FacultyId == fid.Value);
        }
        var rows = await q.OrderBy(x => x.DeptName).ToListAsync(ct);
        return rows.Select(x => new Department
        {
            Id = EncodeInt32Guid(0xC2, x.DepartmentId),
            FacultyId = EncodeInt32Guid(0xC1, x.FacultyId),
            Code = x.DeptCode,
            Name = x.DeptName,
            HodUserId = null,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    public async Task<Department?> GetDepartmentAsync(Guid id, CancellationToken ct = default)
    {
        var did = DecodeInt32Guid(id);
        if (!did.HasValue) return null;

        var row = await _db.Departments.AsNoTracking().FirstOrDefaultAsync(x => x.DepartmentId == did.Value, ct);
        if (row is null) return null;

        var hodLegacyGuid = row.HodUserId.HasValue
            ? await _db.MapUsers.AsNoTracking()
                .Where(m => m.UserId == row.HodUserId.Value)
                .Select(m => (Guid?)m.LegacyUserGuid)
                .FirstOrDefaultAsync(ct)
            : null;

        return new Department
        {
            Id = EncodeInt32Guid(0xC2, row.DepartmentId),
            FacultyId = EncodeInt32Guid(0xC1, row.FacultyId),
            Code = row.DeptCode,
            Name = row.DeptName,
            HodUserId = hodLegacyGuid,
            IsActive = row.IsActive,
            CreatedAt = row.CreatedAt
        };
    }

    public async Task UpsertDepartmentAsync(Department dept, CancellationToken ct = default)
    {
        var did = DecodeInt32Guid(dept.Id);
        var facultyId = DecodeInt32Guid(dept.FacultyId);
        if (!facultyId.HasValue)
            throw new InvalidOperationException("Invalid faculty identifier.");

        V2Department? row = null;
        if (did.HasValue)
            row = await _db.Departments.FirstOrDefaultAsync(x => x.DepartmentId == did.Value, ct);

        long? hodUserId = null;
        if (dept.HodUserId.HasValue)
        {
            hodUserId = await _db.MapUsers.AsNoTracking()
                .Where(m => m.LegacyUserGuid == dept.HodUserId.Value)
                .Select(m => (long?)m.UserId)
                .FirstOrDefaultAsync(ct);
        }

        if (row is null)
        {
            row = new V2Department
            {
                FacultyId = facultyId.Value,
                DeptCode = dept.Code.Trim(),
                DeptName = dept.Name.Trim(),
                HodUserId = hodUserId,
                IsActive = dept.IsActive,
                CreatedAt = dept.CreatedAt == default ? DateTimeOffset.UtcNow : dept.CreatedAt
            };
            _db.Departments.Add(row);
        }
        else
        {
            row.FacultyId = facultyId.Value;
            row.DeptCode = dept.Code.Trim();
            row.DeptName = dept.Name.Trim();
            row.HodUserId = hodUserId;
            row.IsActive = dept.IsActive;
        }
    }

    public async Task<IReadOnlyList<Domain.Entities.Program>> ListProgramsAsync(CancellationToken ct = default)
    {
        var rows = await _db.Programs.AsNoTracking().OrderBy(x => x.ProgramName).ToListAsync(ct);
        return rows.Select(x => new Domain.Entities.Program
        {
            Id = EncodeInt32Guid(0xC3, x.ProgramId),
            DepartmentId = EncodeInt32Guid(0xC2, x.DepartmentId),
            Code = x.ProgramCode,
            Name = x.ProgramName,
            DegreeName = x.DegreeName,
            DurationYears = x.DurationYears,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    public async Task<Domain.Entities.Program?> GetProgramAsync(Guid id, CancellationToken ct = default)
    {
        var pid = DecodeInt32Guid(id);
        if (!pid.HasValue) return null;

        var row = await _db.Programs.AsNoTracking().FirstOrDefaultAsync(x => x.ProgramId == pid.Value, ct);
        if (row is null) return null;

        return new Domain.Entities.Program
        {
            Id = EncodeInt32Guid(0xC3, row.ProgramId),
            DepartmentId = EncodeInt32Guid(0xC2, row.DepartmentId),
            Code = row.ProgramCode,
            Name = row.ProgramName,
            DegreeName = row.DegreeName,
            DurationYears = row.DurationYears,
            GradingSchemeId = EncodeInt32Guid(0xC4, row.GradingSchemeId),
            IsActive = row.IsActive,
            CreatedAt = row.CreatedAt
        };
    }

    public async Task UpsertProgramAsync(Domain.Entities.Program program, CancellationToken ct = default)
    {
        var pid = DecodeInt32Guid(program.Id);
        var departmentId = program.DepartmentId.HasValue ? DecodeInt32Guid(program.DepartmentId.Value) : null;
        var gradingSchemeId = program.GradingSchemeId.HasValue ? DecodeInt32Guid(program.GradingSchemeId.Value) : null;

        if (!departmentId.HasValue)
            throw new InvalidOperationException("Invalid department identifier.");
        if (!gradingSchemeId.HasValue)
            throw new InvalidOperationException("Invalid grading scheme identifier.");

        V2Program? row = null;
        if (pid.HasValue)
            row = await _db.Programs.FirstOrDefaultAsync(x => x.ProgramId == pid.Value, ct);

        if (row is null)
        {
            row = new V2Program
            {
                DepartmentId = departmentId.Value,
                ProgramCode = program.Code.Trim(),
                ProgramName = program.Name.Trim(),
                DegreeName = program.DegreeName.Trim(),
                DurationYears = (byte)Math.Clamp(program.DurationYears, 1, 10),
                GradingSchemeId = gradingSchemeId.Value,
                IsActive = program.IsActive,
                CreatedAt = program.CreatedAt == default ? DateTimeOffset.UtcNow : program.CreatedAt
            };
            _db.Programs.Add(row);
        }
        else
        {
            row.DepartmentId = departmentId.Value;
            row.ProgramCode = program.Code.Trim();
            row.ProgramName = program.Name.Trim();
            row.DegreeName = program.DegreeName.Trim();
            row.DurationYears = (byte)Math.Clamp(program.DurationYears, 1, 10);
            row.GradingSchemeId = gradingSchemeId.Value;
            row.IsActive = program.IsActive;
        }
    }

    public async Task<IReadOnlyList<CurriculumVersion>> ListCurriculumVersionsAsync(Guid? programId, CancellationToken ct = default)
    {
        var query = _db.CurriculumVersions.AsNoTracking();
        if (programId.HasValue)
        {
            var pid = DecodeInt32Guid(programId.Value);
            if (pid.HasValue) query = query.Where(x => x.ProgramId == pid.Value);
        }

        var rows = await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        var yearIds = rows.Select(x => x.AcademicYearId).Distinct().ToList();
        var yearCodes = await _db.AcademicYears.AsNoTracking()
            .Where(x => yearIds.Contains(x.AcademicYearId))
            .ToDictionaryAsync(x => x.AcademicYearId, x => x.YearCode, ct);
        var programIds = rows.Select(x => x.ProgramId).Distinct().ToList();
        var programDurations = await _db.Programs.AsNoTracking()
            .Where(x => programIds.Contains(x.ProgramId))
            .ToDictionaryAsync(x => x.ProgramId, x => (int)x.DurationYears, ct);
        var versionIds = rows.Select(x => x.CurriculumVersionId).ToList();
        var subjectCounts = await _db.CurriculumSubjects.AsNoTracking()
            .Where(x => versionIds.Contains(x.CurriculumVersionId) && x.IsActive)
            .GroupBy(x => x.CurriculumVersionId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        return rows.Select(x => new CurriculumVersion
        {
            Id = EncodeInt32Guid(0xC5, x.CurriculumVersionId),
            ProgramId = EncodeInt32Guid(0xC3, x.ProgramId),
            AcademicYear = BuildProgramAcademicSpan(
                yearCodes.TryGetValue(x.AcademicYearId, out var yearCode) ? yearCode : string.Empty,
                programDurations.TryGetValue(x.ProgramId, out var durationYears) ? durationYears : 0),
            VersionName = x.VersionLabel,
            IsActive = x.IsPublished,
            Locked = x.IsPublished,
            SubjectCount = subjectCounts.TryGetValue(x.CurriculumVersionId, out var count) ? count : 0,
            CreatedAt = x.CreatedAt,
            Program = null!
        }).ToList();
    }

    public async Task<CurriculumVersion?> GetCurriculumVersionAsync(Guid versionId, CancellationToken ct = default)
    {
        var cvId = DecodeInt32Guid(versionId);
        if (!cvId.HasValue) return null;

        var row = await _db.CurriculumVersions.AsNoTracking().FirstOrDefaultAsync(x => x.CurriculumVersionId == cvId.Value, ct);
        if (row is null) return null;

        var yearCode = await _db.AcademicYears.AsNoTracking()
            .Where(x => x.AcademicYearId == row.AcademicYearId)
            .Select(x => x.YearCode)
            .FirstOrDefaultAsync(ct) ?? string.Empty;
        var durationYears = await _db.Programs.AsNoTracking()
            .Where(x => x.ProgramId == row.ProgramId)
            .Select(x => (int)x.DurationYears)
            .FirstOrDefaultAsync(ct);

        return new CurriculumVersion
        {
            Id = EncodeInt32Guid(0xC5, row.CurriculumVersionId),
            ProgramId = EncodeInt32Guid(0xC3, row.ProgramId),
            AcademicYear = BuildProgramAcademicSpan(yearCode, durationYears),
            VersionName = row.VersionLabel,
            IsActive = row.IsPublished,
            Locked = row.IsPublished,
            SubjectCount = await _db.CurriculumSubjects.AsNoTracking()
                .CountAsync(x => x.CurriculumVersionId == row.CurriculumVersionId && x.IsActive, ct),
            CreatedAt = row.CreatedAt,
            Program = null!
        };
    }

    public async Task AddCurriculumVersionAsync(CurriculumVersion version, CancellationToken ct = default)
    {
        var programId = DecodeInt32Guid(version.ProgramId);
        if (!programId.HasValue)
            throw new InvalidOperationException("Invalid program identifier.");

        var yearCode = NormalizeAcademicYearCode(version.AcademicYear);
        var academicYear = await _db.AcademicYears.FirstOrDefaultAsync(x => x.YearCode == yearCode, ct);
        if (academicYear is null)
        {
            var (startDate, endDate) = ParseAcademicYearRange(yearCode);
            academicYear = new V2AcademicYear
            {
                YearCode = yearCode,
                StartDate = startDate,
                EndDate = endDate,
                IsCurrent = false,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.AcademicYears.Add(academicYear);
            await _db.SaveChangesAsync(ct);
        }

        var existingMax = await _db.CurriculumVersions.AsNoTracking()
            .Where(x => x.ProgramId == programId.Value)
            .Select(x => (int?)x.VersionNo)
            .MaxAsync(ct);

        var requestedVersionNo = TryExtractVersionNo(version.VersionName);
        var versionNo = requestedVersionNo ?? ((existingMax ?? 0) + 1);
        var versionLabel = string.IsNullOrWhiteSpace(version.VersionName) ? $"V{versionNo}" : version.VersionName.Trim();

        _db.CurriculumVersions.Add(new V2CurriculumVersion
        {
            ProgramId = programId.Value,
            AcademicYearId = academicYear.AcademicYearId,
            VersionNo = versionNo,
            VersionLabel = versionLabel,
            IsPublished = version.IsActive,
            PublishedAt = version.IsActive ? DateTimeOffset.UtcNow : null,
            CreatedBy = null,
            CreatedAt = version.CreatedAt == default ? DateTimeOffset.UtcNow : version.CreatedAt
        });
    }

    public async Task<bool> IsCurriculumVersionUsedAsync(Guid versionId, CancellationToken ct = default)
    {
        var cvId = DecodeInt32Guid(versionId);
        if (!cvId.HasValue) return false;

        var usedByTranscript = await _db.Transcripts.AsNoTracking().AnyAsync(x => x.CurriculumVersionId == cvId.Value, ct);
        if (usedByTranscript) return true;

        var curriculumSubjectIds = await _db.CurriculumSubjects.AsNoTracking()
            .Where(x => x.CurriculumVersionId == cvId.Value)
            .Select(x => x.CurriculumSubjectId)
            .ToListAsync(ct);

        if (curriculumSubjectIds.Count == 0) return false;

        return await _db.StudentMarks.AsNoTracking().AnyAsync(x => curriculumSubjectIds.Contains(x.CurriculumSubjectId), ct);
    }

    public async Task<IReadOnlyList<CurriculumSubject>> ListCurriculumSubjectsAsync(Guid versionId, CancellationToken ct = default)
    {
        var cvId = DecodeInt32Guid(versionId);
        if (!cvId.HasValue) return Array.Empty<CurriculumSubject>();

        var query =
            from curriculumSubject in _db.CurriculumSubjects.AsNoTracking()
            join subjectVersion in _db.SubjectVersions.AsNoTracking() on curriculumSubject.SubjectVersionId equals subjectVersion.SubjectVersionId
            join subject in _db.Subjects.AsNoTracking() on subjectVersion.SubjectId equals subject.SubjectId
            where curriculumSubject.CurriculumVersionId == cvId.Value
            orderby curriculumSubject.SemesterNumber, curriculumSubject.DisplayOrder, subject.SubjectCode
            select new { curriculumSubject, subjectVersion, subject };

        var rows = await query.ToListAsync(ct);
        return rows.Select(row => new CurriculumSubject
        {
            Id = EncodeInt64Guid(0xC6, row.curriculumSubject.CurriculumSubjectId),
            VersionId = versionId,
            SemesterNumber = row.curriculumSubject.SemesterNumber,
            DisplayOrder = row.curriculumSubject.DisplayOrder ?? 0,
            SubjectCode = row.subject.SubjectCode,
            SubjectName = row.subject.SubjectName,
            TitleOnTranscript = row.subjectVersion.TitleOnTranscript,
            ThHours = row.curriculumSubject.ThHoursPerWeek,
            PrHours = row.curriculumSubject.PrHoursPerWeek,
            ThCredits = row.curriculumSubject.ThCredits,
            PrCredits = row.curriculumSubject.PrCredits,
            HasTheory = row.subjectVersion.HasTheory,
            HasPractical = row.subjectVersion.HasPractical,
            IsElective = row.curriculumSubject.IsElective,
            IsActive = row.curriculumSubject.IsActive
        }).ToList();
    }

    public async Task<Domain.Entities.Program?> GetProgramByCurriculumVersionAsync(Guid versionId, CancellationToken ct = default)
    {
        var cvId = DecodeInt32Guid(versionId);
        if (!cvId.HasValue) return null;

        var programId = await _db.CurriculumVersions.AsNoTracking()
            .Where(x => x.CurriculumVersionId == cvId.Value)
            .Select(x => (int?)x.ProgramId)
            .FirstOrDefaultAsync(ct);

        return programId.HasValue ? await GetProgramAsync(EncodeInt32Guid(0xC3, programId.Value), ct) : null;
    }

    public async Task<Guid?> GetCurriculumVersionIdBySubjectAsync(Guid curriculumSubjectId, CancellationToken ct = default)
    {
        var csId = DecodeInt64Guid(curriculumSubjectId);
        if (!csId.HasValue) return null;

        var versionId = await _db.CurriculumSubjects.AsNoTracking()
            .Where(x => x.CurriculumSubjectId == csId.Value)
            .Select(x => (int?)x.CurriculumVersionId)
            .FirstOrDefaultAsync(ct);

        return versionId.HasValue ? EncodeInt32Guid(0xC5, versionId.Value) : null;
    }

    public async Task UpsertCurriculumSubjectAsync(Guid? curriculumSubjectId, Guid versionId, CurriculumSubject subject, CancellationToken ct = default)
    {
        var cvId = DecodeInt32Guid(versionId);
        if (!cvId.HasValue)
            throw new InvalidOperationException("Invalid curriculum version identifier.");

        var version = await _db.CurriculumVersions.AsNoTracking().FirstOrDefaultAsync(x => x.CurriculumVersionId == cvId.Value, ct)
            ?? throw new InvalidOperationException("Curriculum version not found.");
        var academicYearCode = await _db.AcademicYears.AsNoTracking()
            .Where(x => x.AcademicYearId == version.AcademicYearId)
            .Select(x => x.YearCode)
            .FirstOrDefaultAsync(ct) ?? version.VersionLabel;

        if (curriculumSubjectId.HasValue)
        {
            var csId = DecodeInt64Guid(curriculumSubjectId.Value);
            if (!csId.HasValue)
                throw new InvalidOperationException("Invalid curriculum subject identifier.");

            var curriculumSubject = await _db.CurriculumSubjects.FirstOrDefaultAsync(x => x.CurriculumSubjectId == csId.Value, ct)
                ?? throw new InvalidOperationException("Curriculum subject not found.");
            var subjectVersion = await _db.SubjectVersions.FirstOrDefaultAsync(x => x.SubjectVersionId == curriculumSubject.SubjectVersionId, ct)
                ?? throw new InvalidOperationException("Subject version not found.");
            var subjectRow = await _db.Subjects.FirstOrDefaultAsync(x => x.SubjectId == subjectVersion.SubjectId, ct)
                ?? throw new InvalidOperationException("Subject not found.");

            subjectRow.SubjectCode = (subject.SubjectCode ?? string.Empty).Trim();
            subjectRow.SubjectName = subject.SubjectName.Trim();
            subjectRow.IsActive = subject.IsActive;

            subjectVersion.VersionLabel = academicYearCode;
            subjectVersion.TitleOnTranscript = subject.TitleOnTranscript.Trim();
            subjectVersion.HasTheory = subject.HasTheory;
            subjectVersion.HasPractical = subject.HasPractical;

            curriculumSubject.SemesterNumber = (byte)subject.SemesterNumber;
            curriculumSubject.DisplayOrder = subject.DisplayOrder;
            curriculumSubject.ThHoursPerWeek = subject.ThHours;
            curriculumSubject.PrHoursPerWeek = subject.PrHours;
            curriculumSubject.ThCredits = subject.ThCredits;
            curriculumSubject.PrCredits = subject.PrCredits;
            curriculumSubject.IsElective = subject.IsElective;
            curriculumSubject.IsActive = subject.IsActive;
            return;
        }

        var subjectRowNew = new V2Subject
        {
            SubjectCode = (subject.SubjectCode ?? string.Empty).Trim(),
            SubjectName = subject.SubjectName.Trim(),
            IsActive = subject.IsActive,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.Subjects.Add(subjectRowNew);
        await _db.SaveChangesAsync(ct);

        var subjectVersionNew = new V2SubjectVersion
        {
            SubjectId = subjectRowNew.SubjectId,
            VersionLabel = academicYearCode,
            EffectiveFrom = new DateTime(version.CreatedAt.Year, 7, 1),
            EffectiveTo = null,
            TitleOnTranscript = subject.TitleOnTranscript.Trim(),
            HasTheory = subject.HasTheory,
            HasPractical = subject.HasPractical,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.SubjectVersions.Add(subjectVersionNew);
        await _db.SaveChangesAsync(ct);

        _db.CurriculumSubjects.Add(new V2CurriculumSubject
        {
            CurriculumVersionId = cvId.Value,
            SubjectVersionId = subjectVersionNew.SubjectVersionId,
            SemesterNumber = (byte)subject.SemesterNumber,
            DisplayOrder = subject.DisplayOrder,
            ThHoursPerWeek = subject.ThHours,
            PrHoursPerWeek = subject.PrHours,
            ThCredits = subject.ThCredits,
            PrCredits = subject.PrCredits,
            IsElective = subject.IsElective,
            IsActive = subject.IsActive
        });
    }

    public async Task SoftDeleteCurriculumSubjectAsync(Guid curriculumSubjectId, CancellationToken ct = default)
    {
        var csId = DecodeInt64Guid(curriculumSubjectId);
        if (!csId.HasValue) return;

        var row = await _db.CurriculumSubjects.FirstOrDefaultAsync(x => x.CurriculumSubjectId == csId.Value, ct);
        if (row is null) return;
        row.IsActive = false;
    }

    public async Task<int> CloneCurriculumSubjectsAsync(Guid sourceVersionId, Guid targetVersionId, CancellationToken ct = default)
    {
        var sourceCvId = DecodeInt32Guid(sourceVersionId);
        var targetCvId = DecodeInt32Guid(targetVersionId);
        if (!sourceCvId.HasValue || !targetCvId.HasValue)
            throw new InvalidOperationException("Invalid curriculum version identifier.");
        if (sourceCvId.Value == targetCvId.Value)
            throw new InvalidOperationException("Source and target versions must be different.");

        var sourceVersion = await _db.CurriculumVersions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CurriculumVersionId == sourceCvId.Value, ct)
            ?? throw new InvalidOperationException("Source curriculum version not found.");
        var targetVersion = await _db.CurriculumVersions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.CurriculumVersionId == targetCvId.Value, ct)
            ?? throw new InvalidOperationException("Target curriculum version not found.");

        if (sourceVersion.ProgramId != targetVersion.ProgramId)
            throw new InvalidOperationException("Curriculum subjects can only be cloned within the same program.");

        var targetHasSubjects = await _db.CurriculumSubjects.AsNoTracking()
            .AnyAsync(x => x.CurriculumVersionId == targetCvId.Value && x.IsActive, ct);
        if (targetHasSubjects)
            throw new InvalidOperationException("Target curriculum version already has subjects.");

        var targetAcademicYearCode = await _db.AcademicYears.AsNoTracking()
            .Where(x => x.AcademicYearId == targetVersion.AcademicYearId)
            .Select(x => x.YearCode)
            .FirstOrDefaultAsync(ct) ?? targetVersion.VersionLabel;

        var sourceRows = await (
            from curriculumSubject in _db.CurriculumSubjects.AsNoTracking()
            join subjectVersion in _db.SubjectVersions.AsNoTracking() on curriculumSubject.SubjectVersionId equals subjectVersion.SubjectVersionId
            join subject in _db.Subjects.AsNoTracking() on subjectVersion.SubjectId equals subject.SubjectId
            where curriculumSubject.CurriculumVersionId == sourceCvId.Value && curriculumSubject.IsActive
            orderby curriculumSubject.SemesterNumber, curriculumSubject.DisplayOrder, subject.SubjectCode
            select new { curriculumSubject, subjectVersion, subject }
        ).ToListAsync(ct);

        foreach (var row in sourceRows)
        {
            var clonedSubjectVersion = await _db.SubjectVersions.FirstOrDefaultAsync(x =>
                x.SubjectId == row.subject.SubjectId && x.VersionLabel == targetAcademicYearCode, ct);

            if (clonedSubjectVersion is null)
            {
                clonedSubjectVersion = new V2SubjectVersion
                {
                    SubjectId = row.subject.SubjectId,
                    VersionLabel = targetAcademicYearCode,
                    EffectiveFrom = new DateTime(targetVersion.CreatedAt.Year, 7, 1),
                    EffectiveTo = null,
                    TitleOnTranscript = row.subjectVersion.TitleOnTranscript,
                    HasTheory = row.subjectVersion.HasTheory,
                    HasPractical = row.subjectVersion.HasPractical,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _db.SubjectVersions.Add(clonedSubjectVersion);
                await _db.SaveChangesAsync(ct);
            }

            _db.CurriculumSubjects.Add(new V2CurriculumSubject
            {
                CurriculumVersionId = targetCvId.Value,
                SubjectVersionId = clonedSubjectVersion.SubjectVersionId,
                SemesterNumber = row.curriculumSubject.SemesterNumber,
                DisplayOrder = row.curriculumSubject.DisplayOrder,
                ThHoursPerWeek = row.curriculumSubject.ThHoursPerWeek,
                PrHoursPerWeek = row.curriculumSubject.PrHoursPerWeek,
                ThCredits = row.curriculumSubject.ThCredits,
                PrCredits = row.curriculumSubject.PrCredits,
                IsElective = row.curriculumSubject.IsElective,
                IsActive = row.curriculumSubject.IsActive
            });
        }

        return sourceRows.Count;
    }

    public async Task<IReadOnlyList<GradingScheme>> ListGradingSchemesAsync(CancellationToken ct = default)
    {
        var rows = await _db.GradingSchemes.AsNoTracking().OrderBy(x => x.SchemeName).ToListAsync(ct);
        return rows.Select(x => new GradingScheme
        {
            Id = EncodeInt32Guid(0xC4, x.GradingSchemeId),
            SchemeName = x.SchemeName,
            SchemeType = x.SchemeCode,
            MaxGradePoint = x.MaxGradePoint,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    public Task AddGradingSchemeAsync(GradingScheme scheme, CancellationToken ct = default)
    {
        _db.GradingSchemes.Add(new V2GradingScheme
        {
            SchemeCode = string.IsNullOrWhiteSpace(scheme.SchemeType) ? "CUSTOM" : scheme.SchemeType.Trim(),
            SchemeName = scheme.SchemeName.Trim(),
            MaxGradePoint = scheme.MaxGradePoint,
            IsActive = scheme.IsActive,
            CreatedAt = scheme.CreatedAt == default ? DateTimeOffset.UtcNow : scheme.CreatedAt
        });
        return Task.CompletedTask;
    }

    public async Task<PagedResultDto<AdminTranscriptItemDto>> ListTranscriptsAsync(string? status, string? q, int page, int pageSize, CancellationToken ct = default)
    {
        var p = page < 1 ? 1 : page;
        var ps = Math.Clamp(pageSize, 1, 100);

        var query = _db.Transcripts.AsNoTracking();
        var total = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(x => x.ApprovedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(ct);

        var transcriptIds = rows.Select(r => r.TranscriptId).ToList();
        var legacyIds = await _db.MapTranscripts.AsNoTracking()
            .Where(m => transcriptIds.Contains(m.TranscriptId))
            .ToDictionaryAsync(m => m.TranscriptId, m => m.LegacyTranscriptGuid, ct);

        var reqIds = rows.Select(r => r.TranscriptRequestId).Distinct().ToList();
        var reqMetaById = await _db.TranscriptRequests.AsNoTracking()
            .Where(r => reqIds.Contains(r.TranscriptRequestId))
            .ToDictionaryAsync(
                r => r.TranscriptRequestId,
                r => new { r.RequestNo, r.StatusId, r.CurrentStageRoleId },
                ct
            );

        var statusById = await _db.TranscriptStatuses.AsNoTracking()
            .ToDictionaryAsync(s => s.StatusId, s => s.StatusCode, ct);

        var roleById = await _db.Roles.AsNoTracking()
            .ToDictionaryAsync(r => r.RoleId, r => r.RoleName, ct);

        var studentIds = rows.Select(r => r.StudentId).Distinct().ToList();
        var prns = await _db.Students.AsNoTracking()
            .Where(s => studentIds.Contains(s.StudentId))
            .ToDictionaryAsync(s => s.StudentId, s => s.Prn, ct);

        var userIds = await _db.Students.AsNoTracking()
            .Where(s => studentIds.Contains(s.StudentId))
            .ToDictionaryAsync(s => s.StudentId, s => s.UserId, ct);

        var names = await _db.Users.AsNoTracking()
            .Where(u => userIds.Values.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId, u => u.FullName, ct);

        var items = rows.Select(r =>
        {
            legacyIds.TryGetValue(r.TranscriptId, out var gid);
            reqMetaById.TryGetValue(r.TranscriptRequestId, out var reqMeta);
            prns.TryGetValue(r.StudentId, out var prn);
            userIds.TryGetValue(r.StudentId, out var uid);
            names.TryGetValue(uid, out var nm);

            var st = r.PublishedAt != null
                ? "Published"
                : (r.IsLocked ?? false)
                    ? "ReadyToPublish"
                    : "Approved";
            var statusCode = reqMeta is null || !statusById.TryGetValue(reqMeta.StatusId, out var sc) ? string.Empty : sc;
            var roleName = reqMeta is null || !roleById.TryGetValue(reqMeta.CurrentStageRoleId, out var rn) ? string.Empty : rn;
            var stage = GetCurrentStageLabel(statusCode, roleName, r.PublishedAt != null, r.IsLocked ?? false);
            var id = gid == Guid.Empty ? EncodeInt64Guid(0xD1, r.TranscriptId) : gid;

            return new AdminTranscriptItemDto(
                id,
                reqMeta?.RequestNo ?? string.Empty,
                nm ?? "Student",
                prn,
                r.Cgpa,
                st,
                null,
                stage
            );
        }).ToList();

        return new PagedResultDto<AdminTranscriptItemDto>(items, total, p, ps);
    }

    public async Task<Transcript?> GetTranscriptForUpdateAsync(Guid id, CancellationToken ct = default)
    {
        // delegate to TranscriptRepository if needed; keep minimal here.
        return null;
    }

    private async Task<string> UserLabelAsync(long userId, CancellationToken ct)
    {
        return await _db.Users.AsNoTracking()
            .Where(u => u.UserId == userId)
            .Select(u => u.Email ?? u.Mobile ?? u.FullName)
            .FirstOrDefaultAsync(ct) ?? "User";
    }

    private async Task<Guid?> ResolveLegacyUserGuidAsync(long userId, CancellationToken ct)
    {
        return await _db.MapUsers.AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => (Guid?)m.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);
    }

    // GUID<->INT encoding helpers for V2-only identities (not for users/requests/transcripts which use map_* tables).
    private static Guid EncodeInt32Guid(byte prefix, int value)
    {
        Span<byte> b = stackalloc byte[16];
        b.Clear();
        b[0] = prefix;
        BitConverter.TryWriteBytes(b.Slice(1, 4), value);
        return new Guid(b);
    }

    private static Guid EncodeInt64Guid(byte prefix, long value)
    {
        Span<byte> b = stackalloc byte[16];
        b.Clear();
        b[0] = prefix;
        BitConverter.TryWriteBytes(b.Slice(1, 8), value);
        return new Guid(b);
    }

    private static string GetCurrentStageLabel(string? statusCode, string? roleName, bool isPublished, bool isLocked)
    {
        if (isPublished) return "Published";
        if (isLocked) return "Admin";

        var role = (roleName ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(role)) return role;

        return (statusCode ?? string.Empty).Trim() switch
        {
            "Draft" => "Student",
            "Submitted" => "Clerk",
            "GradeEntry" => "Clerk",
            "ReturnedToClerk" => "Clerk",
            "ForwardedToHoD" => "HoD",
            "ForwardedToDean" => "Dean",
            "Approved" => "Admin",
            "Rejected" => "Rejected",
            _ => "Admin"
        };
    }

    private static int? DecodeInt32Guid(Guid g)
    {
        var b = g.ToByteArray();
        return BitConverter.ToInt32(b, 1);
    }

    private static long? DecodeInt64Guid(Guid g)
    {
        var b = g.ToByteArray();
        return BitConverter.ToInt64(b, 1);
    }

    private static string NormalizeAcademicYearCode(string value)
    {
        var trimmed = (value ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new InvalidOperationException("Academic year is required.");

        if (trimmed.Length >= 9 && trimmed[4] == '-' && int.TryParse(trimmed[..4], out var fullStart) && int.TryParse(trimmed.Substring(5, 4), out var fullEnd))
            return $"{fullStart}-{fullEnd % 100:00}";

        if (trimmed.Length >= 7 && trimmed[4] == '-' && int.TryParse(trimmed[..4], out var shortStart) && int.TryParse(trimmed[5..], out var shortEnd))
            return $"{shortStart}-{shortEnd:00}";

        throw new InvalidOperationException("Academic year format is invalid.");
    }

    private static string BuildProgramAcademicSpan(string yearCode, int durationYears)
    {
        if (string.IsNullOrWhiteSpace(yearCode) || yearCode.Length < 7 || !int.TryParse(yearCode[..4], out var startYear))
            return yearCode;

        var endPart = yearCode[(yearCode.IndexOf('-') + 1)..];
        if (!int.TryParse(endPart, out var parsedEnd))
            return yearCode;

        var endYear = endPart.Length >= 4
            ? parsedEnd
            : ((startYear / 100) * 100) + parsedEnd;

        if (endYear < startYear)
            endYear += 100;

        if (durationYears > 1 && (endYear - startYear) <= 1)
            endYear = startYear + durationYears;

        return $"{startYear}-{endYear}";
    }

    private static (DateTime StartDate, DateTime EndDate) ParseAcademicYearRange(string yearCode)
    {
        var startYear = int.Parse(yearCode[..4]);
        var endSuffix = int.Parse(yearCode[^2..]);
        var endYear = ((startYear / 100) * 100) + endSuffix;
        if (endYear < startYear) endYear += 100;

        return (new DateTime(startYear, 7, 1), new DateTime(endYear, 6, 30));
    }

    private static int? TryExtractVersionNo(string? versionName)
    {
        var digits = new string((versionName ?? string.Empty).Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var value) ? value : null;
    }
}
