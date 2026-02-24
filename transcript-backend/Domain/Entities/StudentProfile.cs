namespace Domain.Entities;

public sealed class StudentProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string PRN { get; set; } = string.Empty;
    public string Faculty { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Program { get; set; } = string.Empty;
    public int? AdmissionYear { get; set; }
    public int? GraduationYear { get; set; }

    public string Nationality { get; set; } = string.Empty;
    public DateOnly? DOB { get; set; }
    public string Address { get; set; } = string.Empty;

    // Not in the requested schema, but present in UI requirements for transcript request step 2.
    public string BirthPlace { get; set; } = string.Empty;
}

