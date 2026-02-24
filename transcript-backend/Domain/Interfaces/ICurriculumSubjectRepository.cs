using Domain.Entities;

namespace Domain.Interfaces;

public interface ICurriculumSubjectRepository
{
    Task<IReadOnlyList<CurriculumSubject>> GetByProgramAsync(string program, CancellationToken ct = default);
}

