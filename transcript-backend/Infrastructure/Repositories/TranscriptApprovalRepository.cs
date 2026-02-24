using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public sealed class TranscriptApprovalRepository : ITranscriptApprovalRepository
{
    private readonly AppDbContext _db;
    public TranscriptApprovalRepository(AppDbContext db) => _db = db;

    public Task AddAsync(TranscriptApproval approval, CancellationToken ct = default) =>
        _db.TranscriptApprovals.AddAsync(approval, ct).AsTask();
}

