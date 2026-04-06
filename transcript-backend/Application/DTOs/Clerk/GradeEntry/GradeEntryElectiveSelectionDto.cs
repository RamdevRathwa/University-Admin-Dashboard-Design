namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntryElectiveSelectionDto(
    Guid CurriculumSubjectId,
    string SelectedValue
);
