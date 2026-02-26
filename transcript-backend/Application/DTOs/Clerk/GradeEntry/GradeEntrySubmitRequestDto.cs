namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySubmitRequestDto(
    IReadOnlyList<GradeEntryUpsertDto> Items,
    string? Remarks
);

