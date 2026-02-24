namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySemesterDto(
    int SemesterNumber,
    string YearTitle,
    string TermTitle,
    int CreditPointScheme,
    IReadOnlyList<GradeEntrySubjectDto> Subjects
);

