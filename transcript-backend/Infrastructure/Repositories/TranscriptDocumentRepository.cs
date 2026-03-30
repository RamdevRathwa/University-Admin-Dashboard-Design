using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptDocumentRepository : ITranscriptDocumentRepository
{
    private readonly V2DbContext _db;
    public TranscriptDocumentRepository(V2DbContext db) => _db = db;

    public async Task<TranscriptDocument?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.TranscriptRequestDocuments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.LegacyDocumentGuid == id, ct);
        if (row is null) return null;

        var legacyRequest = await _db.MapRequests.AsNoTracking()
            .Where(m => m.TranscriptRequestId == row.TranscriptRequestId)
            .Select(m => (Guid?)m.LegacyRequestGuid)
            .FirstOrDefaultAsync(ct);

        var legacyStudent = await ResolveLegacyStudentUserGuidAsync(row.StudentId, ct);
        if (!legacyRequest.HasValue || !legacyStudent.HasValue) return null;

        return Map(row, legacyRequest.Value, legacyStudent.Value);
    }

    public async Task<IReadOnlyList<TranscriptDocument>> GetByRequestIdAsync(Guid requestId, CancellationToken ct = default)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) return Array.Empty<TranscriptDocument>();

        // Resolve student from request row
        var requestRow = await _db.TranscriptRequests.AsNoTracking()
            .Where(r => r.TranscriptRequestId == mr.TranscriptRequestId)
            .Select(r => r.StudentId)
            .FirstOrDefaultAsync(ct);

        var legacyStudentUser = await ResolveLegacyStudentUserGuidAsync(requestRow, ct);
        if (!legacyStudentUser.HasValue) return Array.Empty<TranscriptDocument>();

        var rows = await _db.TranscriptRequestDocuments.AsNoTracking()
            .Where(x => x.TranscriptRequestId == mr.TranscriptRequestId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);

        return rows.Select(r => Map(r, requestId, legacyStudentUser.Value)).ToList();
    }

    public async Task AddAsync(TranscriptDocument doc, CancellationToken ct = default)
    {
        await AddRangeAsync(new[] { doc }, ct);
    }

    public async Task AddRangeAsync(IEnumerable<TranscriptDocument> docs, CancellationToken ct = default)
    {
        var list = docs.ToList();
        if (list.Count == 0) return;

        var requestId = list[0].TranscriptRequestId;
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) throw new InvalidOperationException("Transcript request mapping not found for documents.");

        var requestRow = await _db.TranscriptRequests.AsNoTracking()
            .Where(r => r.TranscriptRequestId == mr.TranscriptRequestId)
            .Select(r => new { r.StudentId })
            .FirstAsync(ct);

        foreach (var d in list)
        {
            var uploadedBy = await ResolveUserIdAsync(d.VerifiedBy, ct); // reuse for uploaded_by when available
            await _db.TranscriptRequestDocuments.AddAsync(new Infrastructure.Persistence.V2.Entities.V2TranscriptRequestDocument
            {
                LegacyDocumentGuid = d.Id,
                TranscriptRequestId = mr.TranscriptRequestId,
                StudentId = requestRow.StudentId,
                DocumentType = TypeToCode(d.DocumentType),
                StatusCode = StatusToCode(d.Status),
                FileName = d.FileName,
                MimeType = d.ContentType,
                SizeBytes = d.SizeBytes,
                StoragePath = d.StoragePath,
                UploadedAt = d.UploadedAt == default ? DateTimeOffset.UtcNow : d.UploadedAt,
                UploadedBy = uploadedBy,
                VerifiedBy = null,
                VerifiedAt = null,
                Remarks = string.IsNullOrWhiteSpace(d.Remarks) ? null : d.Remarks.Trim()
            }, ct);
        }
    }

    public async Task UpdateAsync(TranscriptDocument doc, CancellationToken ct = default)
    {
        var row = await _db.TranscriptRequestDocuments.FirstOrDefaultAsync(x => x.LegacyDocumentGuid == doc.Id, ct);
        if (row is null) throw new InvalidOperationException("Document not found.");

        row.StatusCode = StatusToCode(doc.Status);
        row.FileName = doc.FileName;
        row.MimeType = doc.ContentType;
        row.SizeBytes = doc.SizeBytes;
        row.StoragePath = doc.StoragePath;
        row.UploadedAt = doc.UploadedAt == default ? row.UploadedAt : doc.UploadedAt;
        row.VerifiedAt = doc.VerifiedAt;
        row.Remarks = string.IsNullOrWhiteSpace(doc.Remarks) ? null : doc.Remarks.Trim();

        if (doc.VerifiedBy.HasValue)
        {
            row.VerifiedBy = await ResolveUserIdAsync(doc.VerifiedBy, ct);
        }
    }

    public async Task<bool> HasRequiredUploadsAsync(Guid requestId, CancellationToken ct = default)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) return false;

        var rows = await _db.TranscriptRequestDocuments.AsNoTracking()
            .Where(x => x.TranscriptRequestId == mr.TranscriptRequestId)
            .Select(x => x.DocumentType)
            .ToListAsync(ct);

        return rows.Contains("Marksheet") && rows.Contains("GovernmentId");
    }

    public async Task<bool> AreRequiredApprovedAsync(Guid requestId, CancellationToken ct = default)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) return false;

        var approved = await _db.TranscriptRequestDocuments.AsNoTracking()
            .Where(x => x.TranscriptRequestId == mr.TranscriptRequestId && x.StatusCode == "Approved")
            .Select(x => x.DocumentType)
            .ToListAsync(ct);

        return approved.Contains("Marksheet") && approved.Contains("GovernmentId");
    }

    public async Task<int> CountPendingVerificationsAsync(CancellationToken ct = default)
    {
        return await _db.TranscriptRequestDocuments.AsNoTracking()
            .CountAsync(x => x.StatusCode == "Pending", ct);
    }

    private TranscriptDocument Map(Infrastructure.Persistence.V2.Entities.V2TranscriptRequestDocument row, Guid legacyRequestGuid, Guid legacyStudentGuid)
    {
        return new TranscriptDocument
        {
            Id = row.LegacyDocumentGuid ?? Guid.NewGuid(),
            TranscriptRequestId = legacyRequestGuid,
            StudentId = legacyStudentGuid,
            DocumentType = CodeToType(row.DocumentType),
            Status = CodeToStatus(row.StatusCode),
            FileName = row.FileName,
            ContentType = row.MimeType ?? string.Empty,
            SizeBytes = row.SizeBytes,
            StoragePath = row.StoragePath,
            UploadedAt = row.UploadedAt,
            VerifiedBy = null,
            VerifiedAt = row.VerifiedAt,
            Remarks = row.Remarks
        };
    }

    private async Task<long?> ResolveUserIdAsync(Guid? legacyUserGuid, CancellationToken ct)
    {
        if (!legacyUserGuid.HasValue) return null;
        return await _db.MapUsers.AsNoTracking()
            .Where(x => x.LegacyUserGuid == legacyUserGuid.Value)
            .Select(x => (long?)x.UserId)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<Guid?> ResolveLegacyStudentUserGuidAsync(long studentId, CancellationToken ct)
    {
        var userId = await _db.Students.AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .Select(s => (long?)s.UserId)
            .FirstOrDefaultAsync(ct);
        if (!userId.HasValue) return null;

        return await _db.MapUsers.AsNoTracking()
            .Where(m => m.UserId == userId.Value)
            .Select(m => (Guid?)m.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);
    }

    private static string TypeToCode(TranscriptDocumentType t) => t switch
    {
        TranscriptDocumentType.Marksheet => "Marksheet",
        TranscriptDocumentType.GovernmentId => "GovernmentId",
        TranscriptDocumentType.AuthorityLetter => "AuthorityLetter",
        _ => t.ToString()
    };

    private static TranscriptDocumentType CodeToType(string code) => code switch
    {
        "Marksheet" => TranscriptDocumentType.Marksheet,
        "GovernmentId" => TranscriptDocumentType.GovernmentId,
        "AuthorityLetter" => TranscriptDocumentType.AuthorityLetter,
        _ => TranscriptDocumentType.Marksheet
    };

    private static string StatusToCode(TranscriptDocumentStatus s) => s switch
    {
        TranscriptDocumentStatus.Pending => "Pending",
        TranscriptDocumentStatus.Approved => "Approved",
        TranscriptDocumentStatus.Returned => "Returned",
        _ => s.ToString()
    };

    private static TranscriptDocumentStatus CodeToStatus(string code) => code switch
    {
        "Pending" => TranscriptDocumentStatus.Pending,
        "Approved" => TranscriptDocumentStatus.Approved,
        "Returned" => TranscriptDocumentStatus.Returned,
        _ => TranscriptDocumentStatus.Pending
    };
}
