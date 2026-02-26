using Application.Common;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/verification")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkVerificationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _current;

    public ClerkVerificationController(AppDbContext db, ICurrentUserService current)
    {
        _db = db;
        _current = current;
    }

    [HttpGet("pending")]
    public async Task<IActionResult> Pending([FromQuery] string? q, CancellationToken ct)
    {
        var query = _db.TranscriptRequests
            .AsNoTracking()
            .Include(r => r.Student)
            .Include(r => r.Student.StudentProfile)
            .Include(r => r.Documents)
            .Where(r => r.Status == TranscriptRequestStatus.Submitted && r.CurrentStage == TranscriptStage.Clerk);

        var term = (q ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(term))
        {
            query = query.Where(r =>
                r.Student.FullName.Contains(term) ||
                r.Student.Email.Contains(term) ||
                r.Student.Mobile.Contains(term) ||
                (r.Student.StudentProfile != null && r.Student.StudentProfile.PRN != null && r.Student.StudentProfile.PRN.Contains(term)));
        }

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .Take(200)
            .ToListAsync(ct);

        var shaped = list
            .Select(r =>
            {
                var docs = r.Documents ?? new List<TranscriptDocument>();
                var pending = docs.Count(d => d.Status == TranscriptDocumentStatus.Pending);
                var returned = docs.Count(d => d.Status == TranscriptDocumentStatus.Returned);
                var approved = docs.Count(d => d.Status == TranscriptDocumentStatus.Approved);

                var overall =
                    returned > 0 ? "Returned" :
                    pending > 0 ? "Pending" :
                    "Approved";

                return new
                {
                    requestId = r.Id,
                    createdAt = r.CreatedAt,
                    status = overall,
                    student = new
                    {
                        id = r.StudentId,
                        name = r.Student.FullName,
                        email = r.Student.Email,
                        mobile = r.Student.Mobile,
                        prn = r.Student.StudentProfile?.PRN,
                        program = r.Student.StudentProfile?.Program,
                        department = r.Student.StudentProfile?.Department,
                        faculty = r.Student.StudentProfile?.Faculty
                    },
                    counts = new { pending, returned, approved, total = docs.Count }
                };
            })
            .Where(x => x.counts.pending > 0 || x.counts.returned > 0) // needs clerk action
            .ToList();

        return Ok(shaped);
    }

    [HttpGet("{requestId:guid}")]
    public async Task<IActionResult> Review(Guid requestId, CancellationToken ct)
    {
        var r = await _db.TranscriptRequests
            .AsNoTracking()
            .Include(x => x.Student)
            .Include(x => x.Student.StudentProfile)
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == requestId, ct);

        if (r is null) throw AppException.NotFound("Transcript request not found.");

        if (r.Status != TranscriptRequestStatus.Submitted || r.CurrentStage != TranscriptStage.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be verified.", 400, "invalid_stage");

        var docs = (r.Documents ?? new List<TranscriptDocument>())
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                id = d.Id,
                type = d.DocumentType,
                status = d.Status,
                fileName = d.FileName,
                sizeBytes = d.SizeBytes,
                uploadedAt = d.UploadedAt,
                verifiedAt = d.VerifiedAt,
                remarks = d.Remarks
            })
            .ToList();

        return Ok(new
        {
            requestId = r.Id,
            createdAt = r.CreatedAt,
            student = new
            {
                id = r.StudentId,
                name = r.Student.FullName,
                email = r.Student.Email,
                mobile = r.Student.Mobile,
                prn = r.Student.StudentProfile?.PRN,
                faculty = r.Student.StudentProfile?.Faculty,
                department = r.Student.StudentProfile?.Department,
                program = r.Student.StudentProfile?.Program,
                admissionYear = r.Student.StudentProfile?.AdmissionYear,
                graduationYear = r.Student.StudentProfile?.GraduationYear,
                nationality = r.Student.StudentProfile?.Nationality,
                dob = r.Student.StudentProfile?.DOB,
                birthPlace = r.Student.StudentProfile?.BirthPlace,
                address = r.Student.StudentProfile?.Address
            },
            documents = docs
        });
    }

    [HttpPost("{requestId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid requestId, [FromBody] VerificationDecisionDto? dto, CancellationToken ct)
    {
        var r = await _db.TranscriptRequests
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == requestId, ct);

        if (r is null) throw AppException.NotFound("Transcript request not found.");
        if (r.Status != TranscriptRequestStatus.Submitted || r.CurrentStage != TranscriptStage.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be verified.", 400, "invalid_stage");

        var docs = r.Documents ?? new List<TranscriptDocument>();
        if (docs.Count == 0) throw new AppException("No documents uploaded for this request.", 400, "documents_missing");

        foreach (var d in docs)
        {
            d.Status = TranscriptDocumentStatus.Approved;
            d.VerifiedBy = _current.UserId;
            d.VerifiedAt = DateTimeOffset.UtcNow;
            d.Remarks = null;
        }

        await _db.TranscriptApprovals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = r.Id,
            Role = UserRole.Clerk,
            ApprovedBy = _current.UserId,
            Action = ApprovalAction.Approve,
            Remarks = (dto?.Remarks ?? string.Empty).Trim(),
            ActionAt = DateTimeOffset.UtcNow
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

        var r = await _db.TranscriptRequests
            .Include(x => x.Documents)
            .FirstOrDefaultAsync(x => x.Id == requestId, ct);

        if (r is null) throw AppException.NotFound("Transcript request not found.");
        if (r.Status != TranscriptRequestStatus.Submitted || r.CurrentStage != TranscriptStage.Clerk)
            throw new AppException("Only clerk-stage submitted requests can be verified.", 400, "invalid_stage");

        var docs = r.Documents ?? new List<TranscriptDocument>();
        if (docs.Count == 0) throw new AppException("No documents uploaded for this request.", 400, "documents_missing");

        foreach (var d in docs)
        {
            d.Status = TranscriptDocumentStatus.Returned;
            d.VerifiedBy = _current.UserId;
            d.VerifiedAt = DateTimeOffset.UtcNow;
            d.Remarks = remarks;
        }

        await _db.TranscriptApprovals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = r.Id,
            Role = UserRole.Clerk,
            ApprovedBy = _current.UserId,
            Action = ApprovalAction.Reject,
            Remarks = remarks,
            ActionAt = DateTimeOffset.UtcNow
        }, ct);

        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    public sealed class VerificationDecisionDto
    {
        public string? Remarks { get; set; }
    }
}

