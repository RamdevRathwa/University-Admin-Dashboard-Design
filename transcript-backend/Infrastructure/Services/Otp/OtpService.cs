using System.Security.Cryptography;
using System.Text;
using Application.Common;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Otp;

public sealed class OtpService : IOtpService
{
    private readonly IOtpVerificationRepository _otps;
    private readonly IUnitOfWork _uow;
    private readonly IEmailSender _email;
    private readonly ISmsSender _sms;
    private readonly OtpOptions _opt;
    private readonly ILogger<OtpService> _log;

    public OtpService(
        IOtpVerificationRepository otps,
        IUnitOfWork uow,
        IEmailSender email,
        ISmsSender sms,
        IOptions<OtpOptions> options,
        ILogger<OtpService> log)
    {
        _otps = otps;
        _uow = uow;
        _email = email;
        _sms = sms;
        _opt = options.Value;
        _log = log;
    }

    public async Task SendOtpAsync(string identifier, OtpPurpose purpose, Guid? userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_opt.HashKey) || _opt.HashKey.Length < 32)
            throw new InvalidOperationException("OTP HashKey is missing or too short. Configure Infrastructure:Otp:HashKey.");

        var id = NormalizeIdentifier(identifier);
        if (string.IsNullOrWhiteSpace(id)) throw new AppException("Email or mobile number is required.");

        var isEmail = id.Contains('@');
        if (isEmail && !IsValidEmail(id)) throw new AppException("Enter a valid email.");
        if (!isEmail && !IsValidMobile(id)) throw new AppException("Enter a valid 10-digit mobile number.");

        var sentLastHour = await _otps.CountCreatedSinceAsync(id, DateTimeOffset.UtcNow.AddHours(-1), ct);
        if (sentLastHour >= _opt.MaxSendPerIdentifierPerHour)
            throw new AppException("Too many OTP requests. Please try again later.", 429, "rate_limited");

        var code = GetOtpCode();
        var salt = Convert.ToHexString(RandomNumberGenerator.GetBytes(8));
        var hash = HashOtp(salt, id, purpose, code);

        var otp = new OtpVerification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Identifier = id,
            Purpose = purpose,
            OtpCode = $"{salt}:{hash}",
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(_opt.TtlSeconds),
            IsUsed = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _otps.AddAsync(otp, ct);
        await _uow.SaveChangesAsync(ct);

        // For production, wire these senders to real providers. This default implementation logs the OTP.
        if (isEmail)
        {
            await _email.SendAsync(id, "OTP Verification", $"Your OTP is {code}. It expires in {_opt.TtlSeconds / 60} minutes.", ct);
        }
        else
        {
            await _sms.SendAsync(id, $"Your OTP is {code}. It expires in {_opt.TtlSeconds / 60} minutes.", ct);
        }

        _log.LogInformation("OTP sent purpose={Purpose} identifier={Identifier}", purpose, id);
    }

    public async Task VerifyOtpAsync(string identifier, OtpPurpose purpose, string otp, CancellationToken ct = default)
    {
        var id = NormalizeIdentifier(identifier);
        var code = (otp ?? string.Empty).Trim();
        var devKeys = _opt.HashKey?.StartsWith("DEV_ONLY__", StringComparison.Ordinal) ?? false;
        // Dev/testing bypass: accept FixedCode (or fallback 123456 when using DEV_ONLY keys).
        var bypass = (_opt.FixedCode ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(bypass) && (_opt.HashKey?.StartsWith("DEV_ONLY__", StringComparison.Ordinal) ?? false))
            bypass = "123456";

        // If bypass is enabled and matches, skip length/hash checks but still require an active OTP record.
        if (!string.IsNullOrWhiteSpace(bypass) && code == bypass)
        {
            var bypassRecord = await _otps.GetActiveAsync(id, purpose, ct);
            if (bypassRecord is null) throw new AppException("OTP expired or not found. Please request a new OTP.", 400, "otp_missing");
            await _otps.MarkUsedAsync(bypassRecord, ct);
            await _uow.SaveChangesAsync(ct);
            return;
        }

        if (code.Length != _opt.Length)
            throw new AppException(devKeys ? $"Invalid OTP (len={code.Length}, expected={_opt.Length})." : "Invalid OTP.");

        var active = await _otps.GetActiveAsync(id, purpose, ct);
        if (active is null) throw new AppException("OTP expired or not found. Please request a new OTP.", 400, "otp_missing");

        var parts = (active.OtpCode ?? string.Empty).Split(':', 2);
        if (parts.Length != 2) throw new AppException("OTP record corrupted.", 500, "otp_corrupt");

        var salt = parts[0];
        var storedHash = parts[1];
        var computed = HashOtp(salt, id, purpose, code);

        if (!FixedTimeEquals(storedHash, computed))
            throw new AppException($"Invalid OTP (bypassSet={(!string.IsNullOrWhiteSpace(bypass))}, envDevKeys={devKeys}).");

        await _otps.MarkUsedAsync(active, ct);
        await _uow.SaveChangesAsync(ct);
    }

    private string HashOtp(string salt, string identifier, OtpPurpose purpose, string otp)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_opt.HashKey));
        var data = $"{salt}|{identifier}|{(int)purpose}|{otp}";
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash);
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var ba = Encoding.UTF8.GetBytes(a ?? string.Empty);
        var bb = Encoding.UTF8.GetBytes(b ?? string.Empty);
        return CryptographicOperations.FixedTimeEquals(ba, bb);
    }

    private static string GenerateNumericOtp(int length)
    {
        length = Math.Clamp(length, 4, 10);
        var bytes = RandomNumberGenerator.GetBytes(length);
        var chars = new char[length];
        for (var i = 0; i < length; i++)
        {
            chars[i] = (char)('0' + (bytes[i] % 10));
        }
        return new string(chars);
    }

    private string GetOtpCode()
    {
        var fixedCode = (_opt.FixedCode ?? string.Empty).Trim();
        if (fixedCode.Length == _opt.Length && fixedCode.All(char.IsDigit)) return fixedCode;
        return GenerateNumericOtp(_opt.Length);
    }

    private static string NormalizeIdentifier(string identifier) => (identifier ?? string.Empty).Trim();
    private static bool IsValidEmail(string email) => System.Text.RegularExpressions.Regex.IsMatch(email, @"^\S+@\S+\.\S+$");
    private static bool IsValidMobile(string mobile) => System.Text.RegularExpressions.Regex.IsMatch(mobile, @"^\d{10}$");
}
