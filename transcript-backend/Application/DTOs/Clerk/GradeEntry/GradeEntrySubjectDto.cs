namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntrySubjectDto(
    Guid CurriculumSubjectId,
    string SubjectCode,
    string SubjectName,
    bool IsElective,
    string? SelectedElectiveValue,
    decimal ThHours,
    decimal PrHours,
    decimal ThCredits,
    decimal PrCredits,
    int CreditPointScheme,
    string ThGrade,
    string PrGrade,
    decimal ThGradePoint,
    decimal PrGradePoint,
    decimal ThEarnedGradePoints,
    decimal PrEarnedGradePoints,
    decimal ThOutOf,
    decimal PrOutOf
);
