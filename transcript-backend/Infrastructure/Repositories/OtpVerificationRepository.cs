using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class OtpVerificationRepository : IOtpVerificationRepository
{
    private readonly AppDbContext _db;
    public OtpVerificationRepository(AppDbContext db) => _db = db;

    public Task<OtpVerification?> GetActiveAsync(string identifier, OtpPurpose purpose, CancellationToken ct = default) =>
        _db.OtpVerifications
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(x => x.Identifier == identifier && x.Purpose == purpose && !x.IsUsed && x.ExpiresAt > DateTimeOffset.UtcNow, ct);

    public Task<int> CountCreatedSinceAsync(string identifier, DateTimeOffset sinceUtc, CancellationToken ct = default) =>
        _db.OtpVerifications.AsNoTracking().CountAsync(x => x.Identifier == identifier && x.CreatedAt >= sinceUtc, ct);

    public Task AddAsync(OtpVerification otp, CancellationToken ct = default) =>
        _db.OtpVerifications.AddAsync(otp, ct).AsTask();

    public Task MarkUsedAsync(OtpVerification otp, CancellationToken ct = default)
    {
        otp.IsUsed = true;
        _db.OtpVerifications.Update(otp);
        return Task.CompletedTask;
    }
}
