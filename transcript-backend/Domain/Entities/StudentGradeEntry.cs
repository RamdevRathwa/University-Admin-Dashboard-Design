namespace Domain.Entities;

public sealed class StudentGradeEntry
{
    public Guid Id { get; set; }

    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;

    public Guid CurriculumSubjectId { get; set; }
    public CurriculumSubject CurriculumSubject { get; set; } = null!;

    // Letter grades stored as short strings (e.g., "A+", "B", "S", "--")
    public string ThGrade { get; set; } = string.Empty;
    public string PrGrade { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid? UpdatedBy { get; set; }
}

