using Application.DTOs.Workflow;
using Application.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/transcript-requests")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkTranscriptRequestsController : ControllerBase
{
    private readonly IClerkWorkflowService _workflow;
    private readonly AppDbContext _db;

    public ClerkTranscriptRequestsController(IClerkWorkflowService workflow, AppDbContext db)
    {
        _workflow = workflow;
        _db = db;
    }

    [HttpGet("queue")]
    public async Task<IActionResult> Queue(CancellationToken ct)
    {
        var list = await _db.TranscriptRequests
            .AsNoTracking()
            .Include(x => x.Student)
            .ThenInclude(x => x.StudentProfile)
            .Include(x => x.Approvals)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var rows = list
            .Where(x => x.Status == TranscriptRequestStatus.Submitted && x.CurrentStage == TranscriptStage.Clerk)
            .Select(x => new
            {
                id = x.Id,
                studentName = x.Student.FullName,
                prn = x.Student.StudentProfile != null ? x.Student.StudentProfile.PRN : null,
                program = x.Student.StudentProfile != null ? x.Student.StudentProfile.Program : null,
                stage = x.CurrentStage.ToString(),
                status = x.Status.ToString(),
                createdAt = x.CreatedAt
            })
            .ToList();

        return Ok(new { requests = rows });
    }

    [HttpGet("returned")]
    public async Task<IActionResult> Returned(CancellationToken ct)
    {
        var list = await _db.TranscriptRequests
            .AsNoTracking()
            .Include(x => x.Student)
            .ThenInclude(x => x.StudentProfile)
            .Include(x => x.Approvals)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var rows = list
            .Where(x => x.Status == TranscriptRequestStatus.Submitted && x.CurrentStage == TranscriptStage.Clerk)
            .Select(x =>
            {
                var last = x.Approvals.OrderByDescending(a => a.ActionAt).FirstOrDefault();
                return new { req = x, last };
            })
            .Where(x => x.last is not null && x.last.Role == UserRole.HoD && x.last.Action == ApprovalAction.Reject)
            .Select(x => new
            {
                id = x.req.Id,
                studentName = x.req.Student.FullName,
                prn = x.req.Student.StudentProfile != null ? x.req.Student.StudentProfile.PRN : null,
                program = x.req.Student.StudentProfile != null ? x.req.Student.StudentProfile.Program : null,
                returnedBy = x.last!.Role.ToString(),
                remarks = x.last!.Remarks,
                date = x.last!.ActionAt
            })
            .ToList();

        return Ok(new { requests = rows });
    }

    [HttpPost("{id:guid}/forward-to-hod")]
    public async Task<IActionResult> ForwardToHod([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        await _workflow.ForwardToHoDAsync(id, body?.Remarks, ct);
        return NoContent();
    }
}
