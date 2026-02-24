using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class StudentGradeEntryRepository : IStudentGradeEntryRepository
{
    private readonly AppDbContext _db;
    public StudentGradeEntryRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<StudentGradeEntry>> GetByStudentIdAsync(Guid studentId, CancellationToken ct = default) =>
        await _db.StudentGradeEntries
            .AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .ToListAsync(ct);

    public async Task UpsertAsync(StudentGradeEntry entry, CancellationToken ct = default)
    {
        var existing = await _db.StudentGradeEntries
            .FirstOrDefaultAsync(x => x.StudentId == entry.StudentId && x.CurriculumSubjectId == entry.CurriculumSubjectId, ct);

        if (existing is null)
        {
            await _db.StudentGradeEntries.AddAsync(entry, ct);
            return;
        }

        existing.ThGrade = entry.ThGrade;
        existing.PrGrade = entry.PrGrade;
        existing.UpdatedAt = entry.UpdatedAt;
        existing.UpdatedBy = entry.UpdatedBy;
        _db.StudentGradeEntries.Update(existing);
    }
}

