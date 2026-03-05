namespace Application.DTOs.Admin;

public sealed record AdminTranscriptItemDto(
    Guid Id,
    string RequestNo,
    string StudentName,
    string? PRN,
    decimal CGPA,
    string Status,
    string? VerificationCode
);

