using System.Security.Cryptography;
using System.Text;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class StudentGradeEntryRepository : IStudentGradeEntryRepository
{
    private readonly V2DbContext _db;
    public StudentGradeEntryRepository(V2DbContext db) => _db = db;

    public async Task<IReadOnlyList<StudentGradeEntry>> GetByStudentIdAsync(Guid studentId, CancellationToken ct = default)
    {
        // studentId is legacy user guid for the student.
        var ms = await _db.MapStudents.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == studentId, ct);
        if (ms is null) return Array.Empty<StudentGradeEntry>();

        var maps = await _db.MapCurriculumSubjects.AsNoTracking().ToListAsync(ct);
        var legacyByNew = maps.ToDictionary(m => m.CurriculumSubjectId, m => m.LegacyCurriculumSubjectGuid);

        var rows = await _db.StudentMarks.AsNoTracking()
            .Where(x => x.StudentId == ms.StudentId && x.AttemptNo == 1)
            .ToListAsync(ct);

        return rows.Select(r =>
        {
            legacyByNew.TryGetValue(r.CurriculumSubjectId, out var legacyCsId);
            if (legacyCsId == Guid.Empty) legacyCsId = Guid.NewGuid();

            return new StudentGradeEntry
            {
                Id = StableGuid(ms.StudentId, r.CurriculumSubjectId),
                StudentId = studentId,
                CurriculumSubjectId = legacyCsId,
                ThGrade = r.ThGradeLetter ?? string.Empty,
                PrGrade = r.PrGradeLetter ?? string.Empty,
                UpdatedAt = r.EnteredAt,
                UpdatedBy = null
            };
        }).ToList();
    }

    public async Task UpsertAsync(StudentGradeEntry entry, CancellationToken ct = default)
    {
        var ms = await _db.MapStudents.FirstOrDefaultAsync(x => x.LegacyUserGuid == entry.StudentId, ct);
        if (ms is null) throw new InvalidOperationException("Student mapping not found.");

        var mcs = await _db.MapCurriculumSubjects.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyCurriculumSubjectGuid == entry.CurriculumSubjectId, ct);
        if (mcs is null) throw new InvalidOperationException("Curriculum subject mapping not found.");

        var enteredBy = await ResolveEnteredByAsync(entry.UpdatedBy, ct);
        var now = entry.UpdatedAt == default ? DateTimeOffset.UtcNow : entry.UpdatedAt;

        var row = await _db.StudentMarks
            .FirstOrDefaultAsync(x => x.StudentId == ms.StudentId && x.CurriculumSubjectId == mcs.CurriculumSubjectId && x.AttemptNo == 1, ct);

        if (row is null)
        {
            await _db.StudentMarks.AddAsync(new Infrastructure.Persistence.V2.Entities.V2StudentMark
            {
                StudentId = ms.StudentId,
                CurriculumSubjectId = mcs.CurriculumSubjectId,
                AttemptNo = 1,
                ThGradeLetter = NullIfEmpty(entry.ThGrade),
                PrGradeLetter = NullIfEmpty(entry.PrGrade),
                EnteredBy = enteredBy,
                EnteredAt = now,
                VerifiedBy = null,
                VerifiedAt = null,
                IsFinal = false
            }, ct);
            return;
        }

        row.ThGradeLetter = NullIfEmpty(entry.ThGrade);
        row.PrGradeLetter = NullIfEmpty(entry.PrGrade);
        row.EnteredBy = enteredBy;
        row.EnteredAt = now;
    }

    private async Task<long> ResolveEnteredByAsync(Guid? legacyUserId, CancellationToken ct)
    {
        if (legacyUserId.HasValue)
        {
            var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == legacyUserId.Value, ct);
            if (mu is not null) return mu.UserId;
        }

        // fallback: any clerk/admin
        var id = await _db.UserRoles.AsNoTracking()
            .Where(x => x.RoleId == 2 || x.RoleId == 5)
            .OrderByDescending(x => x.RoleId)
            .Select(x => (long?)x.UserId)
            .FirstOrDefaultAsync(ct);

        if (id.HasValue) return id.Value;
        // last resort: first user
        return await _db.Users.AsNoTracking().Select(x => x.UserId).FirstAsync(ct);
    }

    private static string? NullIfEmpty(string? s)
    {
        var v = (s ?? string.Empty).Trim();
        return string.IsNullOrWhiteSpace(v) ? null : v;
    }

    private static Guid StableGuid(long a, long b)
    {
        // Stable GUID from two BIGINTs so API responses remain consistent.
        var bytes = SHA1.HashData(Encoding.UTF8.GetBytes($"grade:{a}:{b}"));
        var g = new byte[16];
        Array.Copy(bytes, g, 16);
        return new Guid(g);
    }
}

