using Application.Common;
using Application.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/verification")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkVerificationController : ControllerBase
{
    private readonly V2DbContext _db;
    private readonly ICurrentUserService _current;

    public ClerkVerificationController(V2DbContext db, ICurrentUserService current)
    {
        _db = db;
        _current = current;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] string? q, CancellationToken ct)
    {
        var statusById = await _db.TranscriptStatuses.AsNoTracking().ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);
        var term = (q ?? string.Empty).Trim();

        var baseQuery =
            from r in _db.TranscriptRequests.AsNoTracking()
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join prg in _db.Programs.AsNoTracking() on s.ProgramId equals prg.ProgramId into pj
            from prg in pj.DefaultIfEmpty()
            where r.CurrentStageRoleId == (short)UserRole.Clerk
            orderby r.CreatedAt descending
            select new
            {
                r.TranscriptRequestId,
                legacyRequestId = mr.LegacyRequestGuid,
                r.StatusId,
                r.CreatedAt,
                studentName = u.FullName,
                email = u.Email,
                mobile = u.Mobile,
                prn = s.Prn,
                program = prg != null ? prg.ProgramCode : null
            };

        if (!string.IsNullOrWhiteSpace(term))
        {
            baseQuery = baseQuery.Where(x =>
                x.studentName.Contains(term) ||
                (x.email != null && x.email.Contains(term)) ||
                (x.mobile != null && x.mobile.Contains(term)) ||
                (x.prn != null && x.prn.Contains(term)));
        }

        var list = await baseQuery.ToListAsync(ct);

        // Load docs for these requests
        var reqIds = list.Select(x => x.TranscriptRequestId).Distinct().ToList();
        var docs = reqIds.Count == 0
            ? new List<Infrastructure.Persistence.V2.Entities.V2TranscriptRequestDocument>()
            : await _db.TranscriptRequestDocuments.AsNoTracking()
                .Where(d => reqIds.Contains(d.TranscriptRequestId))
                .ToListAsync(ct);

        var docsByReq = docs.GroupBy(d => d.TranscriptRequestId).ToDictionary(g => g.Key, g => g.ToList());

        var shaped = list
            .Where(r =>
            {
                var sc = statusById.TryGetValue(r.StatusId, out var s) ? s : "Draft";
                return sc == "Submitted" || sc == "GradeEntry" || sc == "ReturnedToClerk";
            })
            .Select(r =>
            {
                docsByReq.TryGetValue(r.TranscriptRequestId, out var dlist);
                dlist ??= new List<Infrastructure.Persistence.V2.Entities.V2TranscriptRequestDocument>();

                var pending = dlist.Count(d => d.StatusCode == "Pending");
                var returned = dlist.Count(d => d.StatusCode == "Returned");
                var approved = dlist.Count(d => d.StatusCode == "Approved");

                var overall =
                    returned > 0 ? "Returned" :
                    pending > 0 ? "Pending" :
                    "Approved";

                return new
                {
                    requestId = r.legacyRequestId,
                    createdAt = r.CreatedAt,
                    status = overall,
                    student = new
                    {
                        id = (Guid?)null, // client doesn't need student guid here
                        name = r.studentName,
                        email = r.email,
                        mobile = r.mobile,
                        prn = r.prn,
                        program = r.program,
                        department = (string?)null,
                        faculty = (string?)null
                    },
                    counts = new { pending, returned, approved, total = dlist.Count }
                };
            })
            .Where(x => x.counts.pending > 0 || x.counts.returned > 0)
            .OrderByDescending(x => x.createdAt)
            .Take(200)
            .ToList();

        return Ok(shaped);
    }

    [HttpGet("approved")]
    public async Task<IActionResult> Approved([FromQuery] string? q, CancellationToken ct)
    {
        var term = (q ?? string.Empty).Trim();

        var query =
            from a in _db.TranscriptApprovals.AsNoTracking()
            join r in _db.TranscriptRequests.AsNoTracking() on a.TranscriptRequestId equals r.TranscriptRequestId
            join mr in _db.MapRequests.AsNoTracking() on r.TranscriptRequestId equals mr.TranscriptRequestId
            join s in _db.Students.AsNoTracking() on r.StudentId equals s.StudentId
            join u in _db.Users.AsNoTracking() on s.UserId equals u.UserId
            join prg in _db.Programs.AsNoTracking() on s.ProgramId equals prg.ProgramId into pj
            from prg in pj.DefaultIfEmpty()
            where a.RoleId == (short)UserRole.Clerk && a.ActionCode == "Approve"
            orderby a.ActedAt descending
            select new
            {
                r.TranscriptRequestId,
                legacyRequestId = mr.LegacyRequestGuid,
                r.CreatedAt,
                actedAt = a.ActedAt,
                studentName = u.FullName,
                email = u.Email,
                mobile = u.Mobile,
                prn = s.Prn,
                program = prg != null ? prg.ProgramCode : null
            };

        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(x =>
                x.studentName.Contains(term) ||
                (x.email != null && x.email.Contains(term)) ||
                (x.mobile != null && x.mobile.Contains(term)) ||
                (x.prn != null && x.prn.Contains(term)));
        }

        var list = await query.Take(250).ToListAsync(ct);
        return Ok(list.Select(r => new
        {
            requestId = r.legacyRequestId,
            createdAt = r.CreatedAt,
            actedAt = r.actedAt,
            status = "Approved",
            student = new
            {
                id = (Guid?)null,
                name = r.studentName,
                email = r.email,
                mobile = r.mobile,
                prn = r.prn,
                program = r.program,
                department = (string?)null,
                faculty = (string?)null
            },
            counts = new { pending = 0, returned = 0, approved = 0, total = 0 }
        }));
    }

    [HttpGet("{requestId:guid}")]
    public async Task<IActionResult> Review(Guid requestId, CancellationToken ct)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) throw AppException.NotFound("Transcript request not found.");

        var r = await _db.TranscriptRequests.AsNoTracking().FirstOrDefaultAsync(x => x.TranscriptRequestId == mr.TranscriptRequestId, ct);
        if (r is null) throw AppException.NotFound("Transcript request not found.");

        var docs = await _db.TranscriptRequestDocuments.AsNoTracking()
            .Where(d => d.TranscriptRequestId == r.TranscriptRequestId)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                id = d.LegacyDocumentGuid,
                type = d.DocumentType,
                status = d.StatusCode,
                fileName = d.FileName,
                sizeBytes = d.SizeBytes,
                uploadedAt = d.UploadedAt,
                verifiedAt = d.VerifiedAt,
                remarks = d.Remarks
            })
            .ToListAsync(ct);

        var s = await _db.Students.AsNoTracking().FirstOrDefaultAsync(x => x.StudentId == r.StudentId, ct);
        var u = s is null ? null : await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == s.UserId, ct);
        var prg = s?.ProgramId is null ? null : await _db.Programs.AsNoTracking().FirstOrDefaultAsync(x => x.ProgramId == s.ProgramId.Value, ct);
        var dept = prg is null ? null : await _db.Departments.AsNoTracking().FirstOrDefaultAsync(x => x.DepartmentId == prg.DepartmentId, ct);
        var fac = dept is null ? null : await _db.Faculties.AsNoTracking().FirstOrDefaultAsync(x => x.FacultyId == dept.FacultyId, ct);
        var sp = s is null ? null : await _db.StudentProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.StudentId == s.StudentId, ct);
        var admissionYear = await ResolveYearIntAsync(s?.AdmissionYearId, ct);
        var graduationYear = await ResolveYearIntAsync(s?.GraduationYearId, ct);

        return Ok(new
        {
            requestId,
            createdAt = r.CreatedAt,
            student = new
            {
                id = (Guid?)null,
                name = u?.FullName,
                email = u?.Email,
                mobile = u?.Mobile,
                prn = s?.Prn,
                faculty = fac?.FacultyName,
                department = dept?.DeptName,
                program = prg?.ProgramCode,
                admissionYear,
                graduationYear,
                nationality = sp?.Nationality,
                dob = sp?.DateOfBirthRaw is null ? (DateOnly?)null : DateOnly.FromDateTime(sp.DateOfBirthRaw.Value),
                birthPlace = sp?.BirthPlace,
                address = sp?.PermanentAddress
            },
            documents = docs
        });
    }

    private async Task<int?> ResolveYearIntAsync(int? academicYearId, CancellationToken ct)
    {
        if (!academicYearId.HasValue) return null;
        var code = await _db.AcademicYears.AsNoTracking()
            .Where(x => x.AcademicYearId == academicYearId.Value)
            .Select(x => x.YearCode)
            .FirstOrDefaultAsync(ct);

        if (string.IsNullOrWhiteSpace(code) || code.Length < 4) return null;
        return int.TryParse(code[..4], out var y) ? y : null;
    }

    [HttpPost("{requestId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid requestId, [FromBody] VerificationDecisionDto? dto, CancellationToken ct)
    {
        var mr = await _db.MapRequests.FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) throw AppException.NotFound("Transcript request not found.");

        var req = await _db.TranscriptRequests.FirstOrDefaultAsync(x => x.TranscriptRequestId == mr.TranscriptRequestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");

        if (req.CurrentStageRoleId != (short)UserRole.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be verified.", 400, "invalid_stage");

        var docs = await _db.TranscriptRequestDocuments.Where(d => d.TranscriptRequestId == req.TranscriptRequestId).ToListAsync(ct);
        if (docs.Count == 0) throw new AppException("No documents uploaded for this request.", 400, "documents_missing");

        var now = DateTimeOffset.UtcNow;
        var actor = await ResolveActorUserIdAsync(ct);

        foreach (var d in docs)
        {
            d.StatusCode = "Approved";
            d.VerifiedBy = actor;
            d.VerifiedAt = now;
            d.Remarks = null;
        }

        await _db.TranscriptApprovals.AddAsync(new Infrastructure.Persistence.V2.Entities.V2TranscriptApproval
        {
            TranscriptRequestId = req.TranscriptRequestId,
            RoleId = (short)UserRole.Clerk,
            ActedByUserId = actor,
            ActionCode = "Approve",
            Remarks = (dto?.Remarks ?? string.Empty).Trim(),
            ActedAt = now
        }, ct);

        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    [HttpPost("{requestId:guid}/return")]
    public async Task<IActionResult> ReturnToStudent(Guid requestId, [FromBody] VerificationDecisionDto dto, CancellationToken ct)
    {
        var remarks = (dto?.Remarks ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(remarks))
            throw new AppException("Remarks are required.", 400, "remarks_required");

        var mr = await _db.MapRequests.FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) throw AppException.NotFound("Transcript request not found.");

        var req = await _db.TranscriptRequests.FirstOrDefaultAsync(x => x.TranscriptRequestId == mr.TranscriptRequestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");

        if (req.CurrentStageRoleId != (short)UserRole.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be verified.", 400, "invalid_stage");

        var docs = await _db.TranscriptRequestDocuments.Where(d => d.TranscriptRequestId == req.TranscriptRequestId).ToListAsync(ct);
        if (docs.Count == 0) throw new AppException("No documents uploaded for this request.", 400, "documents_missing");

        var now = DateTimeOffset.UtcNow;
        var actor = await ResolveActorUserIdAsync(ct);

        foreach (var d in docs)
        {
            d.StatusCode = "Returned";
            d.VerifiedBy = actor;
            d.VerifiedAt = now;
            d.Remarks = remarks;
        }

        await _db.TranscriptApprovals.AddAsync(new Infrastructure.Persistence.V2.Entities.V2TranscriptApproval
        {
            TranscriptRequestId = req.TranscriptRequestId,
            RoleId = (short)UserRole.Clerk,
            ActedByUserId = actor,
            ActionCode = "Reject",
            Remarks = remarks,
            ActedAt = now
        }, ct);

        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    private async Task<long> ResolveActorUserIdAsync(CancellationToken ct)
    {
        var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == _current.UserId, ct);
        if (mu is not null) return mu.UserId;
        return await _db.Users.AsNoTracking().Select(x => x.UserId).FirstAsync(ct);
    }

    public sealed class VerificationDecisionDto
    {
        public string? Remarks { get; set; }
    }
}
