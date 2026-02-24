using Domain.Enums;

namespace Application.DTOs.Transcripts;

public sealed record TranscriptRequestDto(
    Guid Id,
    Guid StudentId,
    TranscriptRequestStatus Status,
    TranscriptStage CurrentStage,
    DateTimeOffset CreatedAt
);

