namespace Domain.Entities;

public sealed class TranscriptSemesterSnapshot
{
    public Guid Id { get; set; }

    public Guid TranscriptId { get; set; }
    public Transcript Transcript { get; set; } = null!;

    public int SemesterNumber { get; set; }
    public string YearTitle { get; set; } = string.Empty;
    public string TermTitle { get; set; } = string.Empty;
    public int CreditPointScheme { get; set; } = 10;

    public decimal SGPA { get; set; }
    public string SemesterGrade { get; set; } = string.Empty;
    public string Result { get; set; } = "PASS";
    public decimal Percentage { get; set; }
    public decimal EGP { get; set; }

    public decimal ThHoursTotal { get; set; }
    public decimal PrHoursTotal { get; set; }
    public decimal ThCreditsTotal { get; set; }
    public decimal PrCreditsTotal { get; set; }
    public decimal ThGradePointsSum { get; set; }
    public decimal PrGradePointsSum { get; set; }
    public decimal ThEarnedTotal { get; set; }
    public decimal PrEarnedTotal { get; set; }
    public decimal ThOutOfTotal { get; set; }
    public decimal PrOutOfTotal { get; set; }

    public ICollection<TranscriptSubjectSnapshot> Subjects { get; set; } = new List<TranscriptSubjectSnapshot>();
}

