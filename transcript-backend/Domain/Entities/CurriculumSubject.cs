namespace Domain.Entities;

public sealed class CurriculumSubject
{
    public Guid Id { get; set; }

    public string Program { get; set; } = string.Empty;
    public int SemesterNumber { get; set; }

    public string? SubjectCode { get; set; }
    public string SubjectName { get; set; } = string.Empty;

    public decimal ThHours { get; set; }
    public decimal PrHours { get; set; }
    public decimal ThCredits { get; set; }
    public decimal PrCredits { get; set; }

    public int CreditPointScheme { get; set; } = 10;
    public bool IsActive { get; set; } = true;
}
