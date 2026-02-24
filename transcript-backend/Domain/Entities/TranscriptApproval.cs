using Domain.Enums;

namespace Domain.Entities;

public sealed class TranscriptApproval
{
    public Guid Id { get; set; }

    public Guid TranscriptRequestId { get; set; }
    public TranscriptRequest TranscriptRequest { get; set; } = null!;

    public UserRole Role { get; set; }
    public Guid ApprovedBy { get; set; }
    public string Remarks { get; set; } = string.Empty;
    public ApprovalAction Action { get; set; }
    public DateTimeOffset ActionAt { get; set; } = DateTimeOffset.UtcNow;
}

