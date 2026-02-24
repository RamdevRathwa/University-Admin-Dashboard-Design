using Domain.Enums;

namespace Application.DTOs.Approvals;

public sealed record TranscriptApprovalDto(
    Guid Id,
    Guid TranscriptRequestId,
    UserRole Role,
    Guid ApprovedBy,
    string Remarks,
    ApprovalAction Action,
    DateTimeOffset ActionAt
);

