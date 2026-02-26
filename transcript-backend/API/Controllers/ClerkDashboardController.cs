using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/dashboard")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkDashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITranscriptDocumentRepository _docs;
    public ClerkDashboardController(AppDbContext db, ITranscriptDocumentRepository docs)
    {
        _db = db;
        _docs = docs;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var from = now.Date.AddDays(-6);

        var requests = await _db.TranscriptRequests
            .AsNoTracking()
            .Include(x => x.Approvals)
            .ToListAsync(ct);

        var clerkQueue = requests.Count(x => x.Status == TranscriptRequestStatus.Submitted && x.CurrentStage == TranscriptStage.Clerk);
        var forwardedToHod = requests.Count(x => x.Status == TranscriptRequestStatus.ForwardedToHoD && x.CurrentStage == TranscriptStage.HoD);

        // Returned to clerk is modeled as Status=Submitted + Stage=Clerk, with last approval Reject by HoD.
        var returnedToClerk = requests.Count(x =>
        {
            if (x.Status != TranscriptRequestStatus.Submitted || x.CurrentStage != TranscriptStage.Clerk) return false;
            var last = x.Approvals.OrderByDescending(a => a.ActionAt).FirstOrDefault();
            return last is not null && last.Role == UserRole.HoD && last.Action == ApprovalAction.Reject;
        });

        var rejected = requests.Count(x => x.Status == TranscriptRequestStatus.Rejected);

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
            .OrderByDescending(x => x.ActionAt)
            .Take(10)
            .ToListAsync(ct);

        var activities = activitiesRaw.Select(a => new
        {
            id = a.Id,
            text = $"{a.Role} {a.Action} (Request {a.TranscriptRequestId})",
            at = a.ActionAt,
        }).ToList();

        var pendingVerifications = await _docs.CountPendingVerificationsAsync(ct);

        return Ok(new
        {
            stats = new
            {
                pendingVerifications,
                pendingGradeEntry = clerkQueue + returnedToClerk,
                forwardedToHod,
                rejectedRequests = rejected
            },
            workload7d,
            activities
        });
    }
}
