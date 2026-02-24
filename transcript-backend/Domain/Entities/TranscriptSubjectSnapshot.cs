namespace Domain.Entities;

public sealed class TranscriptSubjectSnapshot
{
    public Guid Id { get; set; }

    public Guid TranscriptSemesterSnapshotId { get; set; }
    public TranscriptSemesterSnapshot Semester { get; set; } = null!;

    public int SN { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;

    public decimal ThHours { get; set; }
    public decimal PrHours { get; set; }
    public decimal ThCredits { get; set; }
    public decimal PrCredits { get; set; }

    public string ThGrade { get; set; } = string.Empty;
    public string PrGrade { get; set; } = string.Empty;

    public decimal ThGradePoint { get; set; }
    public decimal PrGradePoint { get; set; }

    public decimal ThEarned { get; set; }
    public decimal PrEarned { get; set; }
}

