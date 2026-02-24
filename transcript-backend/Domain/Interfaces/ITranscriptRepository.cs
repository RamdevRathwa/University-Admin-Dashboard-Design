using Domain.Entities;

namespace Domain.Interfaces;

public interface ITranscriptRepository
{
    Task<Transcript?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Transcript?> GetByRequestIdAsync(Guid requestId, CancellationToken ct = default);
    Task<IReadOnlyList<Transcript>> GetApprovedByStudentIdAsync(Guid studentId, CancellationToken ct = default);
    Task AddAsync(Transcript transcript, CancellationToken ct = default);
    Task UpdateAsync(Transcript transcript, CancellationToken ct = default);
}

