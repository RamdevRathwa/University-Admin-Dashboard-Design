using Domain.Entities;
using Domain.Enums;

namespace Domain.Interfaces;

public interface ITranscriptDocumentRepository
{
    Task<TranscriptDocument?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<TranscriptDocument>> GetByRequestIdAsync(Guid requestId, CancellationToken ct = default);
    Task AddAsync(TranscriptDocument doc, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<TranscriptDocument> docs, CancellationToken ct = default);
    Task UpdateAsync(TranscriptDocument doc, CancellationToken ct = default);

    Task<bool> HasRequiredUploadsAsync(Guid requestId, CancellationToken ct = default);
    Task<bool> AreRequiredApprovedAsync(Guid requestId, CancellationToken ct = default);
    Task<int> CountPendingVerificationsAsync(CancellationToken ct = default);
}

