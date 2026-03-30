using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Infrastructure.Persistence.V2.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class OtpVerificationRepository : IOtpVerificationRepository
{
    private readonly V2DbContext _db;
    public OtpVerificationRepository(V2DbContext db) => _db = db;

    public async Task<OtpVerification?> GetActiveAsync(string identifier, OtpPurpose purpose, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var p = PurposeToCode(purpose);

        var row = await _db.OtpVerifications
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(x =>
                x.Identifier == identifier &&
                x.Purpose == p &&
                x.UsedAt == null &&
                x.ExpiresAt > now, ct);

        if (row is null) return null;

        Guid? legacyUser = null;
        if (row.UserId.HasValue)
        {
            var map = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(m => m.UserId == row.UserId.Value, ct);
            legacyUser = map?.LegacyUserGuid;
        }

        var saltHex = Convert.ToHexString(row.OtpSalt);
        var hashHex = Convert.ToHexString(row.OtpHash);

        return new OtpVerification
        {
            Id = Guid.NewGuid(), // V2 otp_verifications uses bigint identity; domain expects guid
            UserId = legacyUser,
            Identifier = row.Identifier,
            Purpose = purpose,
            OtpCode = $"{saltHex}:{hashHex}",
            Attempts = row.Attempts,
            ExpiresAt = row.ExpiresAt,
            IsUsed = row.UsedAt != null,
            CreatedAt = row.CreatedAt
        };
    }

    public Task<int> CountCreatedSinceAsync(string identifier, DateTimeOffset sinceUtc, CancellationToken ct = default) =>
        _db.OtpVerifications.AsNoTracking().CountAsync(x => x.Identifier == identifier && x.CreatedAt >= sinceUtc, ct);

    public async Task AddAsync(OtpVerification otp, CancellationToken ct = default)
    {
        var parts = (otp.OtpCode ?? string.Empty).Split(':', 2);
        if (parts.Length != 2) throw new InvalidOperationException("OtpCode must be in 'salt:hash' format.");

        var salt = Convert.FromHexString(parts[0]);
        var hash = Convert.FromHexString(parts[1]);

        long? userId = null;
        if (otp.UserId.HasValue)
        {
            var map = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == otp.UserId.Value, ct);
            userId = map?.UserId;
        }

        await _db.OtpVerifications.AddAsync(new V2OtpVerification
        {
            UserId = userId,
            Identifier = otp.Identifier,
            IdentifierType = otp.Identifier.Contains('@') ? "Email" : "Mobile",
            Purpose = PurposeToCode(otp.Purpose),
            OtpSalt = salt,
            OtpHash = hash,
            Attempts = 0,
            ExpiresAt = otp.ExpiresAt,
            UsedAt = null,
            CreatedAt = otp.CreatedAt == default ? DateTimeOffset.UtcNow : otp.CreatedAt,
            IpAddress = null,
            UserAgent = null
        }, ct);
    }

    public async Task MarkUsedAsync(OtpVerification otp, CancellationToken ct = default)
    {
        var parts = (otp.OtpCode ?? string.Empty).Split(':', 2);
        if (parts.Length != 2) return;

        var salt = Convert.FromHexString(parts[0]);
        var hash = Convert.FromHexString(parts[1]);

        var now = DateTimeOffset.UtcNow;
        var p = PurposeToCode(otp.Purpose);

        var row = await _db.OtpVerifications
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(x =>
                x.Identifier == otp.Identifier &&
                x.Purpose == p &&
                x.UsedAt == null &&
                x.ExpiresAt > now, ct);

        if (row is null) return;

        // Best-effort check to avoid marking a different OTP.
        if (row.OtpSalt.SequenceEqual(salt) && row.OtpHash.SequenceEqual(hash))
        {
            row.UsedAt = now;
            return;
        }

        // Fallback: mark latest active row.
        row.UsedAt = now;
    }

    public async Task<bool> IncrementAttemptAsync(OtpVerification otp, int maxAttempts, CancellationToken ct = default)
    {
        var parts = (otp.OtpCode ?? string.Empty).Split(':', 2);
        if (parts.Length != 2) return false;

        var salt = Convert.FromHexString(parts[0]);
        var hash = Convert.FromHexString(parts[1]);

        var now = DateTimeOffset.UtcNow;
        var p = PurposeToCode(otp.Purpose);

        var row = await _db.OtpVerifications
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(x =>
                x.Identifier == otp.Identifier &&
                x.Purpose == p &&
                x.UsedAt == null &&
                x.ExpiresAt > now, ct);

        if (row is null) return false;

        if (row.OtpSalt.SequenceEqual(salt) && row.OtpHash.SequenceEqual(hash))
        {
            row.Attempts += 1;
        }
        else
        {
            // Fallback: still increment latest active row to keep brute-force resistance.
            row.Attempts += 1;
        }

        if (maxAttempts > 0 && row.Attempts >= maxAttempts)
        {
            row.UsedAt = now;
            return true;
        }

        return false;
    }

    private static string PurposeToCode(OtpPurpose p) => p switch
    {
        OtpPurpose.RegisterEmail => "RegisterEmail",
        OtpPurpose.RegisterMobile => "RegisterMobile",
        OtpPurpose.LoginEmail => "LoginEmail",
        OtpPurpose.LoginMobile => "LoginMobile",
        _ => p.ToString()
    };
}

