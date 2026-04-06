using Application.DTOs.Dean;
using Application.DTOs.Workflow;
using Application.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/dean/transcript-requests")]
[Authorize(Roles = "Dean,Admin")]
public sealed class DeanTranscriptRequestsController : ControllerBase
{
    private readonly IDeanApprovalService _dean;
    private readonly V2DbContext _db;
    public DeanTranscriptRequestsController(IDeanApprovalService dean, V2DbContext db)
    {
        _dean = dean;
        _db = db;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> Pending(CancellationToken ct)
    {
        var res = await _dean.PendingAsync(ct);
        return Ok(res);
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
            join t in _db.Transcripts.AsNoTracking() on r.TranscriptRequestId equals t.TranscriptRequestId into tj
            from t in tj.DefaultIfEmpty()
            where a.RoleId == (short)UserRole.Dean && a.ActionCode == "Approve"
            orderby a.ActedAt descending
            select new
            {
                id = mr.LegacyRequestGuid,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null,
                decisionAt = a.ActedAt,
                remarks = a.Remarks,
                transcriptId = t != null ? t.TranscriptId : (long?)null,
                cgpa = t != null ? t.Cgpa : (decimal?)null,
                percentage = t != null ? t.Percentage : (decimal?)null,
                status = "Approved by Dean"
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
            where a.RoleId == (short)UserRole.Dean && (a.ActionCode == "Reject" || a.ActionCode == "Forward")
            orderby a.ActedAt descending
            select new
            {
                id = mr.LegacyRequestGuid,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null,
                decisionAt = a.ActedAt,
                remarks = a.Remarks,
                status = a.ActionCode == "Reject" ? "Rejected by Dean" : "Returned to HoD"
            }
        ).Take(500).ToListAsync(ct);

        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get([FromRoute] Guid id, CancellationToken ct)
    {
        var res = await _dean.GetAsync(id, ct);
        return Ok(res);
    }

    [HttpGet("{id:guid}/review")]
    public async Task<ActionResult<DeanReviewDto>> Review([FromRoute] Guid id, CancellationToken ct)
    {
        var res = await _dean.GetReviewAsync(id, ct);
        return Ok(res);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<object>> Approve([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        var transcriptId = await _dean.FinalApproveAsync(id, body?.Remarks, ct);
        return Ok(new { transcriptId });
    }

    [HttpPost("{id:guid}/return-to-hod")]
    public async Task<IActionResult> ReturnToHod([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest body, CancellationToken ct)
    {
        await _dean.ReturnToHoDAsync(id, body.Remarks, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest body, CancellationToken ct)
    {
        await _dean.RejectAsync(id, body.Remarks, ct);
        return NoContent();
    }
}
