using Application.DTOs.Clerk.GradeEntry;

namespace Application.Interfaces;

public interface IClerkGradeEntryService
{
    Task<GradeEntryResponseDto> GetByPrnAsync(string prn, CancellationToken ct = default);
    Task SaveDraftAsync(string prn, GradeEntrySaveDraftRequestDto dto, CancellationToken ct = default);
    Task SubmitToHoDAsync(string prn, GradeEntrySubmitRequestDto dto, CancellationToken ct = default);
}
