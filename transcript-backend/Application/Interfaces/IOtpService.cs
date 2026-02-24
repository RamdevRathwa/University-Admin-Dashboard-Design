using Domain.Enums;

namespace Application.Interfaces;

public interface IOtpService
{
    Task SendOtpAsync(string identifier, OtpPurpose purpose, Guid? userId, CancellationToken ct = default);
    Task VerifyOtpAsync(string identifier, OtpPurpose purpose, string otp, CancellationToken ct = default);
}

