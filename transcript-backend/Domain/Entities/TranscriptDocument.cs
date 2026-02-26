using Domain.Enums;

namespace Domain.Entities;

public sealed class TranscriptDocument
{
    public Guid Id { get; set; }

    public Guid TranscriptRequestId { get; set; }
    public TranscriptRequest TranscriptRequest { get; set; } = null!;

    public Guid StudentId { get; set; }

    public TranscriptDocumentType DocumentType { get; set; }
    public TranscriptDocumentStatus Status { get; set; } = TranscriptDocumentStatus.Pending;

    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty; // relative path inside storage root

    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    public Guid? VerifiedBy { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public string? Remarks { get; set; }
}

