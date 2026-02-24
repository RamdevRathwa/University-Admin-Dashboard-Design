namespace Application.DTOs.Student;

public sealed record ApprovedTranscriptDto(
    Guid Id,
    Guid TranscriptRequestId,
    DateTimeOffset ApprovedAt,
    decimal CGPA,
    int SemesterFrom,
    int SemesterTo,
    bool Locked,
    string PdfPath
);

