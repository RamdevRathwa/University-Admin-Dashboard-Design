namespace Application.DTOs.Clerk.GradeEntry;

public sealed record GradeEntryResponseDto(
    GradeEntryStudentDto Student,
    IReadOnlyList<GradeEntrySemesterDto> Semesters
);

