using Application.Common;
using Application.Interfaces;
using Domain.Enums;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize(Roles = "Student,Clerk,HoD,Dean,Admin")]
public sealed class DocumentsController : ControllerBase
{
    private readonly ICurrentUserService _current;
    private readonly ITranscriptDocumentRepository _docs;
    private readonly IDocumentStorage _storage;

    public DocumentsController(ICurrentUserService current, ITranscriptDocumentRepository docs, IDocumentStorage storage)
    {
        _current = current;
        _docs = docs;
        _storage = storage;
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var doc = await _docs.GetByIdAsync(id, ct);
        if (doc is null) throw AppException.NotFound("Document not found.");

        // Students can only download their own documents.
        if (_current.Role == UserRole.Student && doc.StudentId != _current.UserId) throw AppException.Forbidden();

        var opened = await _storage.OpenAsync(doc.StoragePath, ct);
        if (opened is null) throw AppException.NotFound("File not found on storage.");

        var (stream, fileName, contentType) = opened.Value;
        return File(stream, contentType, fileName);
    }
}

