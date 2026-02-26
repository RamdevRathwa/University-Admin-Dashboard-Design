namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntryUpsertDto(
    Guid CurriculumSubjectId,
    string? ThGrade,
    string? PrGrade
);

