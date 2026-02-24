using Application.DTOs.Transcripts;
using Application.DTOs.Dean;

namespace Application.Interfaces;

public interface IDeanApprovalService
{
    Task<IReadOnlyList<TranscriptRequestDto>> PendingAsync(CancellationToken ct = default);
    Task<TranscriptRequestDto> GetAsync(Guid requestId, CancellationToken ct = default);
    Task<DeanReviewDto> GetReviewAsync(Guid requestId, CancellationToken ct = default);
    Task<Guid> FinalApproveAsync(Guid requestId, string? remarks, CancellationToken ct = default);
    Task ReturnToHoDAsync(Guid requestId, string remarks, CancellationToken ct = default);
    Task RejectAsync(Guid requestId, string remarks, CancellationToken ct = default);
}
