namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySaveDraftRequestDto(
    IReadOnlyList<GradeEntryUpsertDto> Items
);

