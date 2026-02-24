using Domain.Entities;

namespace Domain.Interfaces;

public interface IStudentGradeEntryRepository
{
    Task<IReadOnlyList<StudentGradeEntry>> GetByStudentIdAsync(Guid studentId, CancellationToken ct = default);
    Task UpsertAsync(StudentGradeEntry entry, CancellationToken ct = default);
}

