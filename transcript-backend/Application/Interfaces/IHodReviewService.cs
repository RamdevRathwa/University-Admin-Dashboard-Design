using Application.DTOs.Dean;

namespace Application.Interfaces;

public interface IHodReviewService
{
    Task<DeanReviewDto> GetReviewAsync(Guid requestId, CancellationToken ct = default);
}

