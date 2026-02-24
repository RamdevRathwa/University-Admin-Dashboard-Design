using Application.Common;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class ClerkWorkflowService : IClerkWorkflowService
{
    private readonly ICurrentUserService _current;
    private readonly ITranscriptRequestRepository _requests;
    private readonly ITranscriptApprovalRepository _approvals;
    private readonly IUnitOfWork _uow;

    public ClerkWorkflowService(
        ICurrentUserService current,
        ITranscriptRequestRepository requests,
        ITranscriptApprovalRepository approvals,
        IUnitOfWork uow)
    {
        _current = current;
        _requests = requests;
        _approvals = approvals;
        _uow = uow;
    }

    public async Task ForwardToHoDAsync(Guid requestId, string? remarks, CancellationToken ct = default)
    {
        EnsureRole(UserRole.Clerk);

        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.Submitted || req.CurrentStage != TranscriptStage.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be forwarded to HoD.", 400, "invalid_status");

        req.Status = TranscriptRequestStatus.ForwardedToHoD;
        req.CurrentStage = TranscriptStage.HoD;

        await _requests.UpdateAsync(req, ct);
        await _approvals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            Role = UserRole.Clerk,
            ApprovedBy = _current.UserId,
            Remarks = (remarks ?? string.Empty).Trim(),
            Action = ApprovalAction.Forward,
            ActionAt = DateTimeOffset.UtcNow
        }, ct);

        await _uow.SaveChangesAsync(ct);
    }

    private void EnsureRole(UserRole role)
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != role && _current.Role != UserRole.Admin) throw AppException.Forbidden();
    }
}

