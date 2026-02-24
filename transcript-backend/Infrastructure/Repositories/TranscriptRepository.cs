using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptRepository : ITranscriptRepository
{
    private readonly AppDbContext _db;
    public TranscriptRepository(AppDbContext db) => _db = db;

    public Task<Transcript?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Transcripts
            .Include(x => x.Semesters)
                .ThenInclude(x => x.Subjects)
            .Include(x => x.Student)
                .ThenInclude(x => x.StudentProfile)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Transcript?> GetByRequestIdAsync(Guid requestId, CancellationToken ct = default) =>
        _db.Transcripts.FirstOrDefaultAsync(x => x.TranscriptRequestId == requestId, ct);

    public async Task<IReadOnlyList<Transcript>> GetApprovedByStudentIdAsync(Guid studentId, CancellationToken ct = default) =>
        await _db.Transcripts.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.ApprovedAt)
            .ToListAsync(ct);

    public Task AddAsync(Transcript transcript, CancellationToken ct = default) =>
        _db.Transcripts.AddAsync(transcript, ct).AsTask();

    public Task UpdateAsync(Transcript transcript, CancellationToken ct = default)
    {
        _db.Transcripts.Update(transcript);
        return Task.CompletedTask;
    }
}

