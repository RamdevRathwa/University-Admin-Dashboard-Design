using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptDocumentRepository : ITranscriptDocumentRepository
{
    private readonly AppDbContext _db;
    public TranscriptDocumentRepository(AppDbContext db) => _db = db;

    public Task<TranscriptDocument?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.TranscriptDocuments.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<TranscriptDocument>> GetByRequestIdAsync(Guid requestId, CancellationToken ct = default)
    {
        var list = await _db.TranscriptDocuments
            .AsNoTracking()
            .Where(x => x.TranscriptRequestId == requestId)
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);
        return list;
    }

    public async Task AddAsync(TranscriptDocument doc, CancellationToken ct = default)
    {
        await _db.TranscriptDocuments.AddAsync(doc, ct);
    }

    public async Task AddRangeAsync(IEnumerable<TranscriptDocument> docs, CancellationToken ct = default)
    {
        await _db.TranscriptDocuments.AddRangeAsync(docs, ct);
    }

    public Task UpdateAsync(TranscriptDocument doc, CancellationToken ct = default)
    {
        _db.TranscriptDocuments.Update(doc);
        return Task.CompletedTask;
    }

    public async Task<bool> HasRequiredUploadsAsync(Guid requestId, CancellationToken ct = default)
    {
        var docs = await _db.TranscriptDocuments
            .AsNoTracking()
            .Where(x => x.TranscriptRequestId == requestId)
            .Select(x => x.DocumentType)
            .ToListAsync(ct);

        var marksheet = docs.Count(x => x == TranscriptDocumentType.Marksheet);
        var govtId = docs.Any(x => x == TranscriptDocumentType.GovernmentId);
        var auth = docs.Any(x => x == TranscriptDocumentType.AuthorityLetter);

        return marksheet >= 1 && govtId && auth;
    }

    public async Task<bool> AreRequiredApprovedAsync(Guid requestId, CancellationToken ct = default)
    {
        var docs = await _db.TranscriptDocuments
            .AsNoTracking()
            .Where(x => x.TranscriptRequestId == requestId)
            .Select(x => new { x.DocumentType, x.Status })
            .ToListAsync(ct);

        var marksheetApproved = docs.Any(x => x.DocumentType == TranscriptDocumentType.Marksheet && x.Status == TranscriptDocumentStatus.Approved);
        var govtIdApproved = docs.Any(x => x.DocumentType == TranscriptDocumentType.GovernmentId && x.Status == TranscriptDocumentStatus.Approved);
        var authApproved = docs.Any(x => x.DocumentType == TranscriptDocumentType.AuthorityLetter && x.Status == TranscriptDocumentStatus.Approved);

        return marksheetApproved && govtIdApproved && authApproved;
    }

    public Task<int> CountPendingVerificationsAsync(CancellationToken ct = default)
    {
        // Requests in clerk queue that have any required document pending/returned (i.e. needs clerk action).
        return _db.TranscriptRequests
            .AsNoTracking()
            .Where(r => r.Status == TranscriptRequestStatus.Submitted && r.CurrentStage == TranscriptStage.Clerk)
            .Join(
                _db.TranscriptDocuments.AsNoTracking(),
                r => r.Id,
                d => d.TranscriptRequestId,
                (r, d) => new { r.Id, d.Status })
            .Where(x => x.Status == TranscriptDocumentStatus.Pending || x.Status == TranscriptDocumentStatus.Returned)
            .Select(x => x.Id)
            .Distinct()
            .CountAsync(ct);
    }
}

