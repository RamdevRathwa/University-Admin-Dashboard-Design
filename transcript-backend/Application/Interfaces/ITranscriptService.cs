using Application.DTOs.Transcripts;

namespace Application.Interfaces;

public interface ITranscriptService
{
    Task<TranscriptRequestDto> CreateDraftAsync(CancellationToken ct = default);
    Task<IReadOnlyList<TranscriptRequestDto>> GetMyRequestsAsync(CancellationToken ct = default);
    Task<TranscriptRequestDto> SubmitAsync(Guid requestId, CancellationToken ct = default);
}

