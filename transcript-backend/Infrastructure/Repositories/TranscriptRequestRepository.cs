using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptRequestRepository : ITranscriptRequestRepository
{
    private readonly AppDbContext _db;
    public TranscriptRequestRepository(AppDbContext db) => _db = db;

    public Task<TranscriptRequest?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.TranscriptRequests.Include(x => x.Approvals).FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<TranscriptRequest>> GetByStudentIdAsync(Guid studentId, CancellationToken ct = default) =>
        await _db.TranscriptRequests.AsNoTracking().Where(x => x.StudentId == studentId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task<IReadOnlyList<TranscriptRequest>> GetQueueAsync(CancellationToken ct = default) =>
        await _db.TranscriptRequests.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public Task AddAsync(TranscriptRequest request, CancellationToken ct = default) =>
        _db.TranscriptRequests.AddAsync(request, ct).AsTask();

    public Task UpdateAsync(TranscriptRequest request, CancellationToken ct = default)
    {
        _db.TranscriptRequests.Update(request);
        return Task.CompletedTask;
    }
}

