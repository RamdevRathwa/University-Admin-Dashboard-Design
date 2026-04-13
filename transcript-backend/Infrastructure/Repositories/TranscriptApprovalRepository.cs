using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptApprovalRepository : ITranscriptApprovalRepository
{
    private readonly V2DbContext _db;
    public TranscriptApprovalRepository(V2DbContext db) => _db = db;

    public async Task AddAsync(TranscriptApproval approval, CancellationToken ct = default)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == approval.TranscriptRequestId, ct);
        if (mr is null) throw new InvalidOperationException("Transcript request mapping not found for approval.");

        var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == approval.ApprovedBy, ct);
        if (mu is null) throw new InvalidOperationException("User mapping not found for approval actor.");

        await _db.TranscriptApprovals.AddAsync(new Infrastructure.Persistence.V2.Entities.V2TranscriptApproval
        {
            TranscriptRequestId = mr.TranscriptRequestId,
            RoleId = (short)approval.Role,
            ActedByUserId = mu.UserId,
            ActionCode = ActionToCode(approval.Action),
            Remarks = string.IsNullOrWhiteSpace(approval.Remarks) ? null : approval.Remarks.Trim(),
            ActedAt = approval.ActionAt == default ? DateTimeOffset.UtcNow : approval.ActionAt
        }, ct);
    }

    private static string ActionToCode(ApprovalAction a) => a switch
    {
        ApprovalAction.Forward => "Forward",
        ApprovalAction.Approve => "Approve",
        ApprovalAction.Reject => "Reject",
        ApprovalAction.Return => "Return",
        _ => a.ToString()
    };
}
