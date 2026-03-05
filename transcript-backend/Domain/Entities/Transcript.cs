namespace Domain.Entities;

public sealed class Transcript
{
    public Guid Id { get; set; }

    public Guid TranscriptRequestId { get; set; }
    public TranscriptRequest TranscriptRequest { get; set; } = null!;

    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;

    public DateTimeOffset ApprovedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool Locked { get; set; } = true;

    public DateTimeOffset? PublishedAt { get; set; }
    public Guid? PublishedBy { get; set; }

    public string PdfPath { get; set; } = string.Empty;

    // Store only a hash of the verification code.
    public string VerificationSalt { get; set; } = string.Empty;
    public string VerificationHash { get; set; } = string.Empty;

    public decimal CGPA { get; set; }
    public int SemesterFrom { get; set; }
    public int SemesterTo { get; set; }

    public ICollection<TranscriptSemesterSnapshot> Semesters { get; set; } = new List<TranscriptSemesterSnapshot>();
}
