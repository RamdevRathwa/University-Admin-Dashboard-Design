using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/dashboard")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkDashboardController : ControllerBase
{
    private readonly V2DbContext _db;
    private readonly ITranscriptDocumentRepository _docs;

    public ClerkDashboardController(V2DbContext db, ITranscriptDocumentRepository docs)
    {
        _db = db;
        _docs = docs;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var from = now.Date.AddDays(-6);

        var statusById = await _db.TranscriptStatuses.AsNoTracking().ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var requests = await _db.TranscriptRequests.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(2000)
            .ToListAsync(ct);

        var clerkQueue = requests.Count(x =>
        {
            var sc = statusById.TryGetValue(x.StatusId, out var s) ? s : "Draft";
            return (sc == "Submitted" || sc == "GradeEntry" || sc == "ReturnedToClerk") && x.CurrentStageRoleId == (short)UserRole.Clerk;
        });

        var forwardedToHod = requests.Count(x =>
        {
            var sc = statusById.TryGetValue(x.StatusId, out var s) ? s : "Draft";
            return sc == "ForwardedToHoD" && x.CurrentStageRoleId == (short)UserRole.HoD;
        });

        var rejected = requests.Count(x =>
        {
            var sc = statusById.TryGetValue(x.StatusId, out var s) ? s : "Draft";
            return sc == "Rejected";
        });

        var daily = requests
            .Where(x => x.CreatedAt >= from)
            .GroupBy(x => x.CreatedAt.UtcDateTime.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        var workload7d = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var d = from.AddDays(i).Date;
                daily.TryGetValue(d, out var v);
                return new { day = d.ToString("ddd"), value = v };
            })
            .ToList();

        var activitiesRaw = await _db.TranscriptApprovals
            .AsNoTracking()
            .OrderByDescending(x => x.ActedAt)
            .Take(10)
            .ToListAsync(ct);

        var requestNoById = await _db.TranscriptRequests.AsNoTracking()
            .Where(r => activitiesRaw.Select(a => a.TranscriptRequestId).Contains(r.TranscriptRequestId))
            .ToDictionaryAsync(r => r.TranscriptRequestId, r => r.RequestNo, ct);

        var activities = activitiesRaw.Select(a =>
        {
            requestNoById.TryGetValue(a.TranscriptRequestId, out var reqNo);
            return new
            {
                id = a.TranscriptApprovalId,
                text = $"{(UserRole)a.RoleId} {a.ActionCode} ({reqNo ?? a.TranscriptRequestId.ToString()})",
                at = a.ActedAt,
            };
        }).ToList();

        var pendingVerifications = await _docs.CountPendingVerificationsAsync(ct);

        return Ok(new
        {
            stats = new
            {
                pendingVerifications,
                pendingGradeEntry = clerkQueue,
                forwardedToHod,
                rejectedRequests = rejected
            },
            workload7d,
            activities
        });
    }
}

