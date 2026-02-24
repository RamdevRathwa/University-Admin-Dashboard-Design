using Application.Common;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class HodWorkflowService : IHodWorkflowService
{
    private readonly ICurrentUserService _current;
    private readonly ITranscriptRequestRepository _requests;
    private readonly ITranscriptApprovalRepository _approvals;
    private readonly IUnitOfWork _uow;

    public HodWorkflowService(
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

    public async Task ForwardToDeanAsync(Guid requestId, string? remarks, CancellationToken ct = default)
    {
        EnsureRole(UserRole.HoD);

        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.ForwardedToHoD || req.CurrentStage != TranscriptStage.HoD)
            throw new AppException("Only HoD-stage requests can be forwarded to Dean.", 400, "invalid_status");

        req.Status = TranscriptRequestStatus.ForwardedToDean;
        req.CurrentStage = TranscriptStage.Dean;

        await _requests.UpdateAsync(req, ct);
        await _approvals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            Role = UserRole.HoD,
            ApprovedBy = _current.UserId,
            Remarks = (remarks ?? string.Empty).Trim(),
            Action = ApprovalAction.Forward,
            ActionAt = DateTimeOffset.UtcNow
        }, ct);

        await _uow.SaveChangesAsync(ct);
    }

    public async Task ReturnToClerkAsync(Guid requestId, string remarks, CancellationToken ct = default)
    {
        EnsureRole(UserRole.HoD);

        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.ForwardedToHoD || req.CurrentStage != TranscriptStage.HoD)
            throw new AppException("Only HoD-stage requests can be returned to Clerk.", 400, "invalid_status");

        var r = (remarks ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(r)) throw new AppException("Remarks are required.", 400, "remarks_required");

        req.Status = TranscriptRequestStatus.Submitted;
        req.CurrentStage = TranscriptStage.Clerk;

        await _requests.UpdateAsync(req, ct);
        await _approvals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            Role = UserRole.HoD,
            ApprovedBy = _current.UserId,
            Remarks = r,
            Action = ApprovalAction.Reject,
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

