using Application.DTOs.Clerk.GradeEntry;

namespace Application.Interfaces;

public interface IClerkGradeEntryService
{
    Task<GradeEntryResponseDto> GetByPrnAsync(string prn, CancellationToken ct = default);
}

