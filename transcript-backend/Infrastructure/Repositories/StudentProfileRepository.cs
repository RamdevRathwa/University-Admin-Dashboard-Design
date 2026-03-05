using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class StudentProfileRepository : IStudentProfileRepository
{
    private readonly V2DbContext _db;
    public StudentProfileRepository(V2DbContext db) => _db = db;

    public async Task<StudentProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == userId, ct);
        if (mu is null) return null;

        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == mu.UserId, ct);
        if (student is null) return null;

        var profile = await _db.StudentProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.StudentId == student.StudentId, ct);

        var program = student.ProgramId.HasValue
            ? await _db.Programs.AsNoTracking().FirstOrDefaultAsync(p => p.ProgramId == student.ProgramId.Value, ct)
            : null;
        var dept = program is not null
            ? await _db.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.DepartmentId == program.DepartmentId, ct)
            : null;
        var faculty = dept is not null
            ? await _db.Faculties.AsNoTracking().FirstOrDefaultAsync(f => f.FacultyId == dept.FacultyId, ct)
            : null;

        var admissionYear = await ResolveYearIntAsync(student.AdmissionYearId, ct);
        var graduationYear = await ResolveYearIntAsync(student.GraduationYearId, ct);

        return new StudentProfile
        {
            Id = userId,
            UserId = userId,
            PRN = student.Prn ?? string.Empty,
            Faculty = faculty?.FacultyName ?? string.Empty,
            Department = dept?.DeptName ?? string.Empty,
            Program = program?.ProgramCode ?? string.Empty,
            AdmissionYear = admissionYear,
            GraduationYear = graduationYear,
            Nationality = profile?.Nationality ?? string.Empty,
            DOB = profile?.DateOfBirthRaw is null ? null : DateOnly.FromDateTime(profile.DateOfBirthRaw.Value),
            BirthPlace = profile?.BirthPlace ?? string.Empty,
            Address = profile?.PermanentAddress ?? string.Empty
        };
    }

    public async Task<User?> GetUserByPrnAsync(string prn, CancellationToken ct = default)
    {
        var term = (prn ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(term)) return null;

        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.Prn == term, ct);
        if (student is null) return null;

        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == student.UserId, ct);
        if (u is null) return null;

        var legacy = await _db.MapUsers.AsNoTracking()
            .Where(x => x.UserId == u.UserId)
            .Select(x => (Guid?)x.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);

        if (legacy is null)
        {
            // Ensure mapping for any V2-only rows.
            var newLegacy = Guid.NewGuid();
            await _db.MapUsers.AddAsync(new Infrastructure.Persistence.V2.Entities.V2MapUser { LegacyUserGuid = newLegacy, UserId = u.UserId }, ct);
            await _db.SaveChangesAsync(ct);
            legacy = newLegacy;
        }

        var roleId = await _db.UserRoles.AsNoTracking()
            .Where(x => x.UserId == u.UserId)
            .Select(x => (short?)x.RoleId)
            .OrderByDescending(x => x)
            .FirstOrDefaultAsync(ct) ?? (short)UserRole.Student;

        var domainUser = new User
        {
            Id = legacy.Value,
            FullName = u.FullName ?? string.Empty,
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

        // Attach profile
        var sp = await GetByUserIdAsync(domainUser.Id, ct);
        domainUser.StudentProfile = sp;
        return domainUser;
    }

    public async Task AddAsync(StudentProfile profile, CancellationToken ct = default)
    {
        // Upsert semantics: V2 stores split across students + student_profiles.
        await UpsertAsync(profile, ct);
    }

    public async Task UpdateAsync(StudentProfile profile, CancellationToken ct = default)
    {
        await UpsertAsync(profile, ct);
    }

    private async Task UpsertAsync(StudentProfile profile, CancellationToken ct)
    {
        var mu = await _db.MapUsers.FirstOrDefaultAsync(x => x.LegacyUserGuid == profile.UserId, ct);
        if (mu is null) throw new InvalidOperationException("User mapping not found for student profile.");

        var student = await _db.Students.FirstOrDefaultAsync(s => s.UserId == mu.UserId, ct);
        if (student is null)
        {
            student = new Infrastructure.Persistence.V2.Entities.V2Student
            {
                UserId = mu.UserId,
                ProgramId = null,
                Prn = string.IsNullOrWhiteSpace(profile.PRN) ? null : profile.PRN.Trim(),
                AdmissionYearId = await EnsureAcademicYearIdAsync(profile.AdmissionYear, ct),
                GraduationYearId = await EnsureAcademicYearIdAsync(profile.GraduationYear, ct),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await _db.Students.AddAsync(student, ct);
            await _db.SaveChangesAsync(ct); // need identity

            if (!await _db.MapStudents.AnyAsync(x => x.LegacyUserGuid == profile.UserId, ct))
            {
                await _db.MapStudents.AddAsync(new Infrastructure.Persistence.V2.Entities.V2MapStudent
                {
                    LegacyUserGuid = profile.UserId,
                    StudentId = student.StudentId
                }, ct);
            }
        }
        else
        {
            student.Prn = string.IsNullOrWhiteSpace(profile.PRN) ? student.Prn : profile.PRN.Trim();
            student.AdmissionYearId = await EnsureAcademicYearIdAsync(profile.AdmissionYear, ct) ?? student.AdmissionYearId;
            student.GraduationYearId = await EnsureAcademicYearIdAsync(profile.GraduationYear, ct) ?? student.GraduationYearId;

            // If program is provided as code, map to program_id when possible.
            var programCode = (profile.Program ?? string.Empty).Trim().ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(programCode))
            {
                var pid = await _db.Programs.AsNoTracking()
                    .Where(p => p.ProgramCode == programCode)
                    .Select(p => (int?)p.ProgramId)
                    .FirstOrDefaultAsync(ct);
                student.ProgramId = pid ?? student.ProgramId;
            }
        }

        var sp = await _db.StudentProfiles.FirstOrDefaultAsync(p => p.StudentId == student.StudentId, ct);
        if (sp is null)
        {
            sp = new Infrastructure.Persistence.V2.Entities.V2StudentProfile
            {
                StudentId = student.StudentId,
                Nationality = NullIfEmpty(profile.Nationality),
                DateOfBirthRaw = profile.DOB.HasValue ? profile.DOB.Value.ToDateTime(TimeOnly.MinValue) : null,
                BirthPlace = NullIfEmpty(profile.BirthPlace),
                PermanentAddress = NullIfEmpty(profile.Address),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            await _db.StudentProfiles.AddAsync(sp, ct);
        }
        else
        {
            sp.Nationality = NullIfEmpty(profile.Nationality);
            sp.DateOfBirthRaw = profile.DOB.HasValue ? profile.DOB.Value.ToDateTime(TimeOnly.MinValue) : null;
            sp.BirthPlace = NullIfEmpty(profile.BirthPlace);
            sp.PermanentAddress = NullIfEmpty(profile.Address);
            sp.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private async Task<int?> EnsureAcademicYearIdAsync(int? year, CancellationToken ct)
    {
        if (!year.HasValue || year.Value < 1990 || year.Value > 2100) return null;
        var yearCode = $"{year.Value}-{(year.Value + 1) % 100:00}";
        var existing = await _db.AcademicYears.AsNoTracking()
            .Where(x => x.YearCode == yearCode)
            .Select(x => (int?)x.AcademicYearId)
            .FirstOrDefaultAsync(ct);
        if (existing.HasValue) return existing;

        var start = new DateTime(year.Value, 7, 1);
        var end = new DateTime(year.Value + 1, 6, 30);
        var ay = new Infrastructure.Persistence.V2.Entities.V2AcademicYear
        {
            YearCode = yearCode,
            StartDate = start,
            EndDate = end,
            IsCurrent = false,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _db.AcademicYears.AddAsync(ay, ct);
        await _db.SaveChangesAsync(ct);
        return ay.AcademicYearId;
    }

    private async Task<int?> ResolveYearIntAsync(int? academicYearId, CancellationToken ct)
    {
        if (!academicYearId.HasValue) return null;
        var code = await _db.AcademicYears.AsNoTracking()
            .Where(x => x.AcademicYearId == academicYearId.Value)
            .Select(x => x.YearCode)
            .FirstOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(code) || code.Length < 4) return null;
        return int.TryParse(code.Substring(0, 4), out var y) ? y : null;
    }

    private static string? NullIfEmpty(string? s)
    {
        var v = (s ?? string.Empty).Trim();
        return string.IsNullOrWhiteSpace(v) ? null : v;
    }
}

