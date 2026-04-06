namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySubmitRequestDto(
    IReadOnlyList<GradeEntryUpsertDto> Items,
    string? Remarks,
    IReadOnlyList<GradeEntryElectiveSelectionDto>? Electives = null
);
