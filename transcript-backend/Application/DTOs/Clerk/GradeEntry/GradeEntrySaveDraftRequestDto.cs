namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySaveDraftRequestDto(
    IReadOnlyList<GradeEntryUpsertDto> Items,
    IReadOnlyList<GradeEntryElectiveSelectionDto>? Electives = null
);
