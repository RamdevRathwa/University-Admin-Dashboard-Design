using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Infrastructure.Persistence.V2.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class CurriculumSubjectRepository : ICurriculumSubjectRepository
{
    private readonly V2DbContext _db;
    public CurriculumSubjectRepository(V2DbContext db) => _db = db;

    public async Task<IReadOnlyList<CurriculumSubject>> GetByProgramAsync(string program, CancellationToken ct = default)
    {
        var code = (program ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code)) return Array.Empty<CurriculumSubject>();

        var programId = await _db.Programs.AsNoTracking()
            .Where(p => p.ProgramCode == code)
            .Select(p => (int?)p.ProgramId)
            .FirstOrDefaultAsync(ct);

        if (!programId.HasValue) return Array.Empty<CurriculumSubject>();

        var cvId = await (
            from cv in _db.CurriculumVersions.AsNoTracking()
            where cv.ProgramId == programId.Value
            let activeSubjectCount = _db.CurriculumSubjects.Count(cs =>
                cs.CurriculumVersionId == cv.CurriculumVersionId && cs.IsActive)
            orderby activeSubjectCount > 0 descending,
                cv.IsPublished descending,
                cv.AcademicYearId descending,
                cv.VersionNo descending
            select (int?)cv.CurriculumVersionId
        ).FirstOrDefaultAsync(ct);

        if (!cvId.HasValue) return Array.Empty<CurriculumSubject>();

        var rows = await (
            from cs in _db.CurriculumSubjects.AsNoTracking()
            join sv in _db.SubjectVersions.AsNoTracking() on cs.SubjectVersionId equals sv.SubjectVersionId
            join s in _db.Subjects.AsNoTracking() on sv.SubjectId equals s.SubjectId
            where cs.CurriculumVersionId == cvId.Value && cs.IsActive
            orderby cs.SemesterNumber, (cs.DisplayOrder ?? 999999), s.SubjectCode
            select new
            {
                cs.CurriculumSubjectId,
                cs.SemesterNumber,
                cs.ThHoursPerWeek,
                cs.PrHoursPerWeek,
                cs.ThCredits,
                cs.PrCredits,
                cs.IsActive,
                SubjectCode = s.SubjectCode,
                SubjectName = sv.TitleOnTranscript
            }
        ).ToListAsync(ct);

        var ids = rows.Select(r => r.CurriculumSubjectId).Distinct().ToList();
        var maps = await _db.MapCurriculumSubjects.AsNoTracking()
            .Where(m => ids.Contains(m.CurriculumSubjectId))
            .ToListAsync(ct);

        var mapByNew = maps.ToDictionary(m => m.CurriculumSubjectId, m => m.LegacyCurriculumSubjectGuid);

        // Ensure mappings exist for any V2-only rows.
        var missing = ids.Where(id => !mapByNew.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            foreach (var id in missing)
            {
                var legacy = Guid.NewGuid();
                await _db.MapCurriculumSubjects.AddAsync(new V2MapCurriculumSubject
                {
                    LegacyCurriculumSubjectGuid = legacy,
                    CurriculumSubjectId = id
                }, ct);
                mapByNew[id] = legacy;
            }
            await _db.SaveChangesAsync(ct);
        }

        return rows.Select(r => new CurriculumSubject
        {
            Id = mapByNew[r.CurriculumSubjectId],
            Program = code,
            SemesterNumber = r.SemesterNumber,
            SubjectCode = r.SubjectCode,
            SubjectName = r.SubjectName ?? string.Empty,
            ThHours = r.ThHoursPerWeek,
            PrHours = r.PrHoursPerWeek,
            ThCredits = r.ThCredits,
            PrCredits = r.PrCredits,
            CreditPointScheme = 10,
            IsActive = r.IsActive
        }).ToList();
    }
}
