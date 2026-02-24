using Application.DTOs.Approvals;
using Application.DTOs.Clerk.GradeEntry;
using Application.DTOs.Transcripts;

namespace Application.DTOs.Dean;

public sealed record DeanReviewDto(
    TranscriptRequestDto Request,
    GradeEntryResponseDto GradeSheet,
    IReadOnlyList<TranscriptApprovalDto> Approvals
);

