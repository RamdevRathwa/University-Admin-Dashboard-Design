using Application.DTOs.Workflow;
using Application.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/hod/transcript-requests")]
[Authorize(Roles = "HoD,Admin")]
public sealed class HodTranscriptRequestsController : ControllerBase
{
    private readonly IHodWorkflowService _workflow;
    private readonly IHodReviewService _review;
    private readonly V2DbContext _db;

    public HodTranscriptRequestsController(IHodWorkflowService workflow, IHodReviewService review, V2DbContext db)
    {
        _workflow = workflow;
        _review = review;
        _db = db;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> Pending(CancellationToken ct)
    {
        // Return legacy request GUIDs so the existing workflow services (domain GUID) keep working.
        var statusById = await _db.TranscriptStatuses.AsNoTracking()
            .ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var rows = await (
            from r in _db.TranscriptRequests.AsNoTracking()
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join p in _db.Programs.AsNoTracking() on s.ProgramId equals p.ProgramId into pj
            from p in pj.DefaultIfEmpty()
            where r.CurrentStageRoleId == (short)UserRole.HoD
            orderby r.SubmittedAt descending, r.CreatedAt descending
            select new
            {
                legacyId = mr.LegacyRequestGuid,
                statusId = r.StatusId,
                createdAt = r.CreatedAt,
                submittedAt = r.SubmittedAt,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null
            }
        ).Take(500).ToListAsync(ct);

        var shaped = rows
            .Where(x =>
            {
                var sc = statusById.TryGetValue(x.statusId, out var s) ? s : "Draft";
                return sc == "ForwardedToHoD";
            })
            .Select(x => new
            {
                id = x.legacyId,
                studentName = x.studentName,
                prn = x.prn,
                program = x.program,
                status = "ForwardedToHoD",
                submittedAt = x.submittedAt,
                createdAt = x.createdAt
            })
            .ToList();

        return Ok(shaped);
    }

    [HttpGet("approved")]
    public async Task<IActionResult> Approved(CancellationToken ct)
    {
        var rows = await (
            from a in _db.TranscriptApprovals.AsNoTracking()
            join r in _db.TranscriptRequests.AsNoTracking() on a.TranscriptRequestId equals r.TranscriptRequestId
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join p in _db.Programs.AsNoTracking() on s.ProgramId equals p.ProgramId into pj
            from p in pj.DefaultIfEmpty()
            join d in _db.Departments.AsNoTracking() on p.DepartmentId equals d.DepartmentId into dj
            from d in dj.DefaultIfEmpty()
            where a.RoleId == (short)UserRole.HoD && a.ActionCode == "Forward"
            orderby a.ActedAt descending
            select new
            {
                id = mr.LegacyRequestGuid,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null,
                department = d != null ? d.DeptName : null,
                decisionAt = a.ActedAt,
                remarks = a.Remarks,
                status = "Forwarded to Dean"
            }
        ).Take(500).ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("rejected")]
    public async Task<IActionResult> Rejected(CancellationToken ct)
    {
        var rows = await (
            from a in _db.TranscriptApprovals.AsNoTracking()
            join r in _db.TranscriptRequests.AsNoTracking() on a.TranscriptRequestId equals r.TranscriptRequestId
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join p in _db.Programs.AsNoTracking() on s.ProgramId equals p.ProgramId into pj
            from p in pj.DefaultIfEmpty()
            join d in _db.Departments.AsNoTracking() on p.DepartmentId equals d.DepartmentId into dj
            from d in dj.DefaultIfEmpty()
            where a.RoleId == (short)UserRole.HoD && (a.ActionCode == "Return" || a.ActionCode == "Reject")
            orderby a.ActedAt descending
            select new
            {
                id = mr.LegacyRequestGuid,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null,
                department = d != null ? d.DeptName : null,
                decisionAt = a.ActedAt,
                remarks = a.Remarks,
                status = a.ActionCode == "Reject" ? "Rejected by HoD" : "Returned to Clerk"
            }
        ).Take(500).ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("{id:guid}/review")]
    public async Task<IActionResult> Review([FromRoute] Guid id, CancellationToken ct)
    {
        var res = await _review.GetReviewAsync(id, ct);
        return Ok(res);
    }

    [HttpPost("{id:guid}/forward-to-dean")]
    public async Task<IActionResult> ForwardToDean([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        await _workflow.ForwardToDeanAsync(id, body?.Remarks, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/return-to-clerk")]
    public async Task<IActionResult> ReturnToClerk([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest body, CancellationToken ct)
    {
        await _workflow.ReturnToClerkAsync(id, body.Remarks, ct);
        return NoContent();
    }
}
