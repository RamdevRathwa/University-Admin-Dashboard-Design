using Application.Common;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/student/documents")]
[Authorize(Roles = "Student")]
public sealed class StudentDocumentsController : ControllerBase
{
    private readonly ICurrentUserService _current;
    private readonly ITranscriptRequestRepository _requests;
    private readonly ITranscriptDocumentRepository _docs;
    private readonly IDocumentStorage _storage;
    private readonly IUnitOfWork _uow;

    public StudentDocumentsController(
        ICurrentUserService current,
        ITranscriptRequestRepository requests,
        ITranscriptDocumentRepository docs,
        IDocumentStorage storage,
        IUnitOfWork uow)
    {
        _current = current;
        _requests = requests;
        _docs = docs;
        _storage = storage;
        _uow = uow;
    }

    [HttpGet("{requestId:guid}")]
    public async Task<IActionResult> List(Guid requestId, CancellationToken ct)
    {
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null || req.StudentId != _current.UserId) throw AppException.NotFound("Transcript request not found.");

        var list = await _docs.GetByRequestIdAsync(requestId, ct);
        return Ok(list.Select(d => new
        {
            id = d.Id,
            type = d.DocumentType,
            status = d.Status,
            fileName = d.FileName,
            contentType = d.ContentType,
            sizeBytes = d.SizeBytes,
            uploadedAt = d.UploadedAt,
            verifiedAt = d.VerifiedAt,
            remarks = d.Remarks
        }));
    }

    [HttpPost("{requestId:guid}/upload")]
    [RequestSizeLimit(25_000_000)]
    public async Task<IActionResult> Upload(Guid requestId, [FromQuery] TranscriptDocumentType type, [FromForm] List<IFormFile> files, CancellationToken ct)
    {
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null || req.StudentId != _current.UserId) throw AppException.NotFound("Transcript request not found.");

        // Student can upload while request is Draft/Student or Submitted/Clerk (returned/pending docs).
        TranscriptStateMachine.EnsureEditableByStudent(req);

        if (files is null || files.Count == 0)
            throw new AppException("No files provided.", 400, "files_required");

        if (type != TranscriptDocumentType.Marksheet && files.Count != 1)
            throw new AppException("Only one file allowed for this document type.", 400, "single_file_required");

        var docs = new List<TranscriptDocument>();

        foreach (var f in files)
        {
            if (f.Length <= 0) continue;
            if (f.Length > 20_000_000) throw new AppException("File too large (max 20MB).", 400, "file_too_large");

            var fileName = string.IsNullOrWhiteSpace(f.FileName) ? "file" : f.FileName;
            var contentType = f.ContentType ?? "application/octet-stream";

            await using var s = f.OpenReadStream();
            var rel = await _storage.SaveAsync(requestId, type, fileName, contentType, s, ct);

            docs.Add(new TranscriptDocument
            {
                Id = Guid.NewGuid(),
                TranscriptRequestId = requestId,
                StudentId = _current.UserId,
                DocumentType = type,
                Status = TranscriptDocumentStatus.Pending,
                FileName = fileName,
                ContentType = contentType,
                SizeBytes = f.Length,
                StoragePath = rel,
                UploadedAt = DateTimeOffset.UtcNow
            });
        }

        if (docs.Count == 0) throw new AppException("No valid files provided.", 400, "files_required");

        await _docs.AddRangeAsync(docs, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(new { uploaded = docs.Count });
    }
}
