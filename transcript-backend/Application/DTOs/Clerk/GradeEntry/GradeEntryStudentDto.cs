namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntryStudentDto(
    Guid StudentId,
    string FullName,
    string PRN,
    string Faculty,
    string Department,
    string Program,
    int? AdmissionYear,
    int? GraduationYear,
    string Nationality,
    DateOnly? DOB,
    string BirthPlace,
    string Address
);

