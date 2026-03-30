using Application.DTOs.Clerk.GradeEntry;
using Application.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/grade-entry")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkGradeEntryController : ControllerBase
{
    private readonly IClerkGradeEntryService _grades;
    private readonly V2DbContext _db;

    public ClerkGradeEntryController(IClerkGradeEntryService grades, V2DbContext db)
    {
        _grades = grades;
        _db = db;
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready(CancellationToken ct)
    {
        var statusById = await _db.TranscriptStatuses
            .AsNoTracking()
            .ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var rows = await (
            from r in _db.TranscriptRequests.AsNoTracking()
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join p in _db.Programs.AsNoTracking() on s.ProgramId equals p.ProgramId into pj
            from p in pj.DefaultIfEmpty()
            where r.CurrentStageRoleId == (short)UserRole.Clerk
            orderby r.CreatedAt descending
            select new
            {
                r.TranscriptRequestId,
                LegacyRequestGuid = mr.LegacyRequestGuid,
                r.StatusId,
                r.CreatedAt,
                StudentName = u.FullName,
                Prn = s.Prn,
                Program = p != null ? p.ProgramCode : null
            }
        ).ToListAsync(ct);

        var requestIds = rows.Select(x => x.TranscriptRequestId).Distinct().ToList();
        var approvedDocuments = await _db.TranscriptRequestDocuments
            .AsNoTracking()
            .Where(d =>
                requestIds.Contains(d.TranscriptRequestId) &&
                d.StatusCode == "Approved" &&
                (d.DocumentType == "Marksheet" || d.DocumentType == "GovernmentId"))
            .Select(d => new { d.TranscriptRequestId, d.DocumentType })
            .ToListAsync(ct);

        var approvedTypesByRequest = approvedDocuments
            .GroupBy(x => x.TranscriptRequestId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.DocumentType).Distinct(StringComparer.OrdinalIgnoreCase).ToHashSet(StringComparer.OrdinalIgnoreCase));

        var ready = rows
            .Where(x =>
            {
                var status = statusById.TryGetValue(x.StatusId, out var code) ? code : "Draft";
                if (!(status == "Submitted" || status == "GradeEntry" || status == "ReturnedToClerk"))
                    return false;

                return approvedTypesByRequest.TryGetValue(x.TranscriptRequestId, out var approved) &&
                       approved.Contains("Marksheet") &&
                       approved.Contains("GovernmentId");
            })
            .GroupBy(x => x.Prn, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var first = g.First();
                var status = statusById.TryGetValue(first.StatusId, out var code) ? code : "Submitted";
                return new
                {
                    requestId = first.LegacyRequestGuid,
                    prn = first.Prn,
                    studentName = first.StudentName,
                    program = first.Program,
                    status = status == "GradeEntry" ? "InProgress" : "Ready",
                    createdAt = first.CreatedAt
                };
            })
            .ToList();

        return Ok(new { students = ready });
    }

    [HttpGet("by-prn/{prn}")]
    public async Task<ActionResult<GradeEntryResponseDto>> GetByPrn([FromRoute] string prn, CancellationToken ct)
    {
        var res = await _grades.GetByPrnAsync(prn, ct);
        return Ok(res);
    }

    [HttpPost("by-prn/{prn}/preview")]
    public async Task<ActionResult<GradeEntryResponseDto>> Preview([FromRoute] string prn, [FromBody] GradeEntrySaveDraftRequestDto body, CancellationToken ct)
    {
        var res = await _grades.PreviewAsync(prn, body, ct);
        return Ok(res);
    }

    [HttpPost("by-prn/{prn}/save-draft")]
    public async Task<IActionResult> SaveDraft([FromRoute] string prn, [FromBody] GradeEntrySaveDraftRequestDto body, CancellationToken ct)
    {
        await _grades.SaveDraftAsync(prn, body, ct);
        return NoContent();
    }

    [HttpPost("by-prn/{prn}/submit-to-hod")]
    public async Task<IActionResult> SubmitToHod([FromRoute] string prn, [FromBody] GradeEntrySubmitRequestDto body, CancellationToken ct)
    {
        await _grades.SubmitToHoDAsync(prn, body, ct);
        return NoContent();
    }
}
