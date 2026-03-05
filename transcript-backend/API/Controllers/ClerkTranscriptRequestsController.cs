using Application.Common;
using Application.DTOs.Workflow;
using Application.Interfaces;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
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
    private readonly ITranscriptRequestRepository _requests;
    private readonly IStudentProfileRepository _profiles;
    private readonly ITranscriptDocumentRepository _docs;
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IStudentGradeEntryRepository _grades;
    private readonly V2DbContext _db;

    public ClerkTranscriptRequestsController(
        IClerkWorkflowService workflow,
        ITranscriptRequestRepository requests,
        IStudentProfileRepository profiles,
        ITranscriptDocumentRepository docs,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades,
        V2DbContext db)
    {
        _workflow = workflow;
        _requests = requests;
        _profiles = profiles;
        _docs = docs;
        _curriculum = curriculum;
        _grades = grades;
        _db = db;
    }

    [HttpGet("queue")]
    public async Task<IActionResult> Queue(CancellationToken ct)
    {
        var statusById = await _db.TranscriptStatuses.AsNoTracking().ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var rows = await (
            from r in _db.TranscriptRequests.AsNoTracking()
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join p in _db.Programs.AsNoTracking() on s.ProgramId equals p.ProgramId into pj
            from p in pj.DefaultIfEmpty()
            orderby r.CreatedAt descending
            select new
            {
                legacyId = mr.LegacyRequestGuid,
                statusId = r.StatusId,
                stageRoleId = r.CurrentStageRoleId,
                createdAt = r.CreatedAt,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null
            }
        ).Take(500).ToListAsync(ct);

        var shaped = rows
            .Where(x =>
            {
                var sc = statusById.TryGetValue(x.statusId, out var s) ? s : "Draft";
                return (sc == "Submitted" || sc == "GradeEntry" || sc == "ReturnedToClerk") && x.stageRoleId == (short)UserRole.Clerk;
            })
            .Select(x =>
            {
                var sc = statusById.TryGetValue(x.statusId, out var s) ? s : "Draft";
                return new
                {
                    id = x.legacyId,
                    studentName = x.studentName,
                    prn = x.prn,
                    program = x.program,
                    stage = TranscriptStage.Clerk.ToString(),
                    status = sc == "Submitted" ? TranscriptRequestStatus.Submitted.ToString() : TranscriptRequestStatus.Submitted.ToString(),
                    createdAt = x.createdAt
                };
            })
            .ToList();

        return Ok(new { requests = shaped });
    }

    [HttpGet("returned")]
    public async Task<IActionResult> Returned(CancellationToken ct)
    {
        // Returned-to-clerk is modeled as stage=Clerk and latest HoD approval action=Reject.
        var approvals = await _db.TranscriptApprovals.AsNoTracking()
            .Where(a => a.RoleId == (short)UserRole.HoD && a.ActionCode == "Reject")
            .OrderByDescending(a => a.ActedAt)
            .Take(2000)
            .ToListAsync(ct);

        var latestByRequest = approvals
            .GroupBy(a => a.TranscriptRequestId)
            .ToDictionary(g => g.Key, g => g.First());

        var requestIds = latestByRequest.Keys.ToList();
        if (requestIds.Count == 0) return Ok(new { requests = Array.Empty<object>() });

        var statusById = await _db.TranscriptStatuses.AsNoTracking().ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var rows = await (
            from r in _db.TranscriptRequests.AsNoTracking()
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join p in _db.Programs.AsNoTracking() on s.ProgramId equals p.ProgramId into pj
            from p in pj.DefaultIfEmpty()
            where requestIds.Contains(r.TranscriptRequestId)
            select new
            {
                r.TranscriptRequestId,
                legacyId = mr.LegacyRequestGuid,
                statusId = r.StatusId,
                stageRoleId = r.CurrentStageRoleId,
                studentName = u.FullName,
                prn = s.Prn,
                program = p != null ? p.ProgramCode : null
            }
        ).ToListAsync(ct);

        var shaped = rows
            .Where(x =>
            {
                var sc = statusById.TryGetValue(x.statusId, out var s) ? s : "Draft";
                return (sc == "Submitted" || sc == "GradeEntry" || sc == "ReturnedToClerk") && x.stageRoleId == (short)UserRole.Clerk;
            })
            .Select(x =>
            {
                var last = latestByRequest[x.TranscriptRequestId];
                return new
                {
                    id = x.legacyId,
                    studentName = x.studentName,
                    prn = x.prn,
                    program = x.program,
                    returnedBy = UserRole.HoD.ToString(),
                    remarks = last.Remarks,
                    date = last.ActedAt
                };
            })
            .ToList();

        return Ok(new { requests = shaped });
    }

    [HttpPost("{id:guid}/forward-to-hod")]
    public async Task<IActionResult> ForwardToHod([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        var req = await _requests.GetByIdAsync(id, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");

        if (req.Status != TranscriptRequestStatus.Submitted || req.CurrentStage != TranscriptStage.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be forwarded to HoD.", 400, "invalid_status");

        var profile = await _profiles.GetByUserIdAsync(req.StudentId, ct);
        if (profile is null || string.IsNullOrWhiteSpace(profile.Program))
            throw new AppException("Student profile program missing. Ask student to complete Transcript Request form.", 400, "profile_program_missing");

        if (!await _docs.AreRequiredApprovedAsync(req.Id, ct))
            throw new AppException("Student documents are not verified yet. Verify Documents first (Marksheet, Government ID, Authority Letter) before forwarding to HoD.", 400, "documents_not_verified");

        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        if (subjects.Count == 0)
            throw new AppException($"No curriculum found for program '{profile.Program}'. Seed curriculum subjects first.", 400, "curriculum_missing");

        var gradeEntries = await _grades.GetByStudentIdAsync(req.StudentId, ct);
        var gradeMap = gradeEntries.ToDictionary(x => x.CurriculumSubjectId, x => x);

        foreach (var s in subjects)
        {
            gradeMap.TryGetValue(s.Id, out var ge);
            var th = (ge?.ThGrade ?? string.Empty).Trim();
            var pr = (ge?.PrGrade ?? string.Empty).Trim();

            if (GradeCalc.IsGradeMissing(th, s.ThCredits) || GradeCalc.IsGradeMissing(pr, s.PrCredits))
                throw new AppException("Please enter grades for all subjects (TH/PR) before forwarding to HoD.", 400, "grades_incomplete");
        }

        await _workflow.ForwardToHoDAsync(id, body?.Remarks, ct);
        return NoContent();
    }
}

