using Application.Common;
using Application.DTOs.Auth;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IOtpService _otp;
    private readonly IJwtService _jwt;
    private readonly IUnitOfWork _uow;

    public AuthService(IUserRepository users, IOtpService otp, IJwtService jwt, IUnitOfWork uow)
    {
        _users = users;
        _otp = otp;
        _jwt = jwt;
        _uow = uow;
    }

    public async Task RequestRegistrationOtpAsync(RegisterRequestOtpDto dto, CancellationToken ct = default)
    {
        var email = NormalizeEmail(dto.Email);
        var mobile = NormalizeMobile(dto.Mobile);

        if (await _users.EmailExistsAsync(email, ct)) throw AppException.Conflict("An account with this email already exists.");
        if (await _users.MobileExistsAsync(mobile, ct)) throw AppException.Conflict("An account with this mobile already exists.");

        await _otp.SendOtpAsync(email, OtpPurpose.RegisterEmail, null, ct);
        await _otp.SendOtpAsync(mobile, OtpPurpose.RegisterMobile, null, ct);
    }

    public async Task<AuthResponseDto> VerifyRegistrationAsync(RegisterVerifyDto dto, CancellationToken ct = default)
    {
        var email = NormalizeEmail(dto.Email);
        var mobile = NormalizeMobile(dto.Mobile);

        if (await _users.EmailExistsAsync(email, ct)) throw AppException.Conflict("An account with this email already exists.");
        if (await _users.MobileExistsAsync(mobile, ct)) throw AppException.Conflict("An account with this mobile already exists.");

        await _otp.VerifyOtpAsync(email, OtpPurpose.RegisterEmail, dto.EmailOtp, ct);
        await _otp.VerifyOtpAsync(mobile, OtpPurpose.RegisterMobile, dto.MobileOtp, ct);

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName.Trim(),
            Email = email,
            Mobile = mobile,
            Role = UserRole.Student,
            IsEmailVerified = true,
            IsMobileVerified = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        var token = _jwt.GenerateToken(user);
        return new AuthResponseDto(token, MapUser(user));
    }

    public async Task RequestLoginOtpAsync(LoginRequestOtpDto dto, CancellationToken ct = default)
    {
        var raw = NormalizeIdentifier(dto.Identifier);
        var isEmail = raw.Contains('@');
        var otpIdentifier = isEmail ? NormalizeEmail(raw) : NormalizeMobile(raw);

        var user = isEmail
            ? await _users.GetByEmailAsync(otpIdentifier, ct)
            : await _users.GetByMobileAsync(otpIdentifier, ct);

        if (user is null) throw AppException.NotFound("Account not found. Please register first.");
        if (user.DeletedAt is not null || !user.IsActive) throw new AppException("Account is inactive.", 403, "account_inactive");
        if (user.Locked) throw new AppException("Account is locked.", 403, "account_locked");

        var purpose = isEmail ? OtpPurpose.LoginEmail : OtpPurpose.LoginMobile;
        await _otp.SendOtpAsync(otpIdentifier, purpose, user.Id, ct);
    }

    public async Task<AuthResponseDto> VerifyLoginAsync(LoginVerifyDto dto, CancellationToken ct = default)
    {
        var raw = NormalizeIdentifier(dto.Identifier);
        var isEmail = raw.Contains('@');
        var otpIdentifier = isEmail ? NormalizeEmail(raw) : NormalizeMobile(raw);

        var user = isEmail
            ? await _users.GetByEmailAsync(otpIdentifier, ct)
            : await _users.GetByMobileAsync(otpIdentifier, ct);

        if (user is null) throw AppException.NotFound("Account not found. Please register first.");
        if (user.DeletedAt is not null || !user.IsActive) throw new AppException("Account is inactive.", 403, "account_inactive");
        if (user.Locked) throw new AppException("Account is locked.", 403, "account_locked");

        var purpose = isEmail ? OtpPurpose.LoginEmail : OtpPurpose.LoginMobile;
        await _otp.VerifyOtpAsync(otpIdentifier, purpose, dto.Otp, ct);

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        var token = _jwt.GenerateToken(user);
        return new AuthResponseDto(token, MapUser(user));
    }

    private static UserDto MapUser(User u) =>
        new(u.Id, u.FullName, u.Email, u.Mobile, u.Role, u.IsEmailVerified, u.IsMobileVerified, u.CreatedAt);

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();
    private static string NormalizeMobile(string mobile) => new string((mobile ?? string.Empty).Where(char.IsDigit).ToArray());
    private static string NormalizeIdentifier(string identifier) => (identifier ?? string.Empty).Trim();
}
