namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySubjectDto(
    Guid CurriculumSubjectId,
    string SubjectCode,
    string SubjectName,
    decimal ThHours,
    decimal PrHours,
    decimal ThCredits,
    decimal PrCredits,
    int CreditPointScheme,
    string ThGrade,
    string PrGrade
);

