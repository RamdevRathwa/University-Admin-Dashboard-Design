using Domain.Entities;

namespace Domain.Interfaces;

public interface ITranscriptApprovalRepository
{
    Task AddAsync(TranscriptApproval approval, CancellationToken ct = default);
}

