namespace Application.DTOs.Students;

public sealed record StudentProfileDto(
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

