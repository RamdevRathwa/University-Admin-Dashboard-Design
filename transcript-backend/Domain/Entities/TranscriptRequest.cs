using Domain.Enums;

namespace Domain.Entities;

public sealed class TranscriptRequest
{
    public Guid Id { get; set; }

    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;

    public TranscriptRequestStatus Status { get; set; } = TranscriptRequestStatus.Draft;
    public TranscriptStage CurrentStage { get; set; } = TranscriptStage.Student;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<TranscriptApproval> Approvals { get; set; } = new List<TranscriptApproval>();
    public ICollection<TranscriptDocument> Documents { get; set; } = new List<TranscriptDocument>();
}
