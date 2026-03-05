using Application.DTOs.Admin;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class AdminRepository : IAdminRepository
{
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
            ActionType = log.ActionType,
            EntityName = log.EntityName,
            EntityKey = log.RecordId,
            OldDataJson = log.OldValue,
            NewDataJson = log.NewValue,
            IpAddress = log.IpAddress,
            CreatedAt = log.CreatedAt == default ? DateTimeOffset.UtcNow : log.CreatedAt
        }, ct);
    }

    public async Task<PagedResultDto<object>> ListAuditAsync(string? q, string? action, DateOnly? from, DateOnly? to, int page, int pageSize, CancellationToken ct = default)
    {
        var p = page < 1 ? 1 : page;
        var ps = Math.Clamp(pageSize, 1, 200);
        var query = _db.AuditLogs.AsNoTracking();

        var term = (q ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(x =>
                (x.EntityName != null && x.EntityName.Contains(term)) ||
                (x.EntityKey != null && x.EntityKey.Contains(term)) ||
                x.ActionType.Contains(term));
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

    public Task<Faculty?> GetFacultyAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Faculty?>(null);
    public Task UpsertFacultyAsync(Faculty faculty, CancellationToken ct = default) => Task.CompletedTask;

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

    public Task<Department?> GetDepartmentAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Department?>(null);
    public Task UpsertDepartmentAsync(Department dept, CancellationToken ct = default) => Task.CompletedTask;

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

    public Task<Domain.Entities.Program?> GetProgramAsync(Guid id, CancellationToken ct = default) => Task.FromResult<Domain.Entities.Program?>(null);
    public Task UpsertProgramAsync(Domain.Entities.Program program, CancellationToken ct = default) => Task.CompletedTask;

    public Task<IReadOnlyList<CurriculumVersion>> ListCurriculumVersionsAsync(Guid? programId, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<CurriculumVersion>>(Array.Empty<CurriculumVersion>());
    public Task AddCurriculumVersionAsync(CurriculumVersion version, CancellationToken ct = default) => Task.CompletedTask;

    public Task<IReadOnlyList<GradingScheme>> ListGradingSchemesAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<GradingScheme>>(Array.Empty<GradingScheme>());
    public Task AddGradingSchemeAsync(GradingScheme scheme, CancellationToken ct = default) => Task.CompletedTask;

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
        var reqNos = await _db.TranscriptRequests.AsNoTracking()
            .Where(r => reqIds.Contains(r.TranscriptRequestId))
            .ToDictionaryAsync(r => r.TranscriptRequestId, r => r.RequestNo, ct);

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
            reqNos.TryGetValue(r.TranscriptRequestId, out var reqNo);
            prns.TryGetValue(r.StudentId, out var prn);
            userIds.TryGetValue(r.StudentId, out var uid);
            names.TryGetValue(uid, out var nm);

            var st = (r.IsLocked ?? false) ? "Locked" : "Approved";

            return new AdminTranscriptItemDto(
                gid == Guid.Empty ? Guid.NewGuid() : gid,
                reqNo ?? string.Empty,
                nm ?? "Student",
                prn,
                r.Cgpa,
                st,
                null
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

    private static int? DecodeInt32Guid(Guid g)
    {
        var b = g.ToByteArray();
        return BitConverter.ToInt32(b, 1);
    }
}
