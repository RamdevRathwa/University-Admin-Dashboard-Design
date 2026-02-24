using Domain.Entities;

namespace Domain.Interfaces;

public interface ITranscriptRequestRepository
{
    Task<TranscriptRequest?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TranscriptRequest>> GetByStudentIdAsync(Guid studentId, CancellationToken ct = default);
    Task<IReadOnlyList<TranscriptRequest>> GetQueueAsync(CancellationToken ct = default);
    Task AddAsync(TranscriptRequest request, CancellationToken ct = default);
    Task UpdateAsync(TranscriptRequest request, CancellationToken ct = default);
}

