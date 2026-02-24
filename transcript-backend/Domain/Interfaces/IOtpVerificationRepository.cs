using Domain.Entities;
using Domain.Enums;

namespace Domain.Interfaces;

public interface IOtpVerificationRepository
{
    Task<OtpVerification?> GetActiveAsync(string identifier, OtpPurpose purpose, CancellationToken ct = default);
    Task<int> CountCreatedSinceAsync(string identifier, DateTimeOffset sinceUtc, CancellationToken ct = default);
    Task AddAsync(OtpVerification otp, CancellationToken ct = default);
    Task MarkUsedAsync(OtpVerification otp, CancellationToken ct = default);
}
