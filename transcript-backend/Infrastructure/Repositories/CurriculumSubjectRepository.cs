using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class CurriculumSubjectRepository : ICurriculumSubjectRepository
{
    private readonly AppDbContext _db;
    public CurriculumSubjectRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<CurriculumSubject>> GetByProgramAsync(string program, CancellationToken ct = default)
    {
        var p = (program ?? string.Empty).Trim();
        return await _db.CurriculumSubjects
            .AsNoTracking()
            .Where(x => x.IsActive && x.Program == p)
            .OrderBy(x => x.SemesterNumber)
            .ThenBy(x => x.SubjectCode)
            .ThenBy(x => x.SubjectName)
            .ToListAsync(ct);
    }
}

