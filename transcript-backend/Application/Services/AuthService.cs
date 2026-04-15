using Application.Common;
using Application.DTOs.Auth;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using System.Text.Json;

namespace Application.Services;

public sealed class AuthService : IAuthService
{
    private const string RolePermsKey = "role_permissions";

    private readonly IUserRepository _users;
    private readonly IAdminRepository _admin;
    private readonly IOtpService _otp;
    private readonly IJwtService _jwt;
    private readonly IAuditTrailService _audit;
    private readonly IUnitOfWork _uow;

    public AuthService(IUserRepository users, IAdminRepository admin, IOtpService otp, IJwtService jwt, IAuditTrailService audit, IUnitOfWork uow)
    {
        _users = users;
        _admin = admin;
        _otp = otp;
        _jwt = jwt;
        _audit = audit;
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
        await _audit.LogAsync(
            "REGISTER",
            "Auth",
            user.Id.ToString(),
            null,
            System.Text.Json.JsonSerializer.Serialize(new { user.FullName, user.Email, user.Mobile, role = user.Role.ToString() }),
            user.Id,
            null,
            ct);

        var token = _jwt.GenerateToken(user);
        var permissions = await GetPermissionsForRoleAsync(user.Role, ct);
        return new AuthResponseDto(token, MapUser(user, permissions));
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
        await _audit.LogAsync(
            "LOGIN",
            "Auth",
            user.Id.ToString(),
            null,
            System.Text.Json.JsonSerializer.Serialize(new { identifier = otpIdentifier, role = user.Role.ToString(), user.LastLoginAt }),
            user.Id,
            null,
            ct);

        var token = _jwt.GenerateToken(user);
        var permissions = await GetPermissionsForRoleAsync(user.Role, ct);
        return new AuthResponseDto(token, MapUser(user, permissions));
    }

    private static UserDto MapUser(User u, IReadOnlyList<string> permissions) =>
        new(u.Id, u.FullName, u.Email, u.Mobile, u.Role, u.IsEmailVerified, u.IsMobileVerified, u.CreatedAt, permissions);

    private async Task<IReadOnlyList<string>> GetPermissionsForRoleAsync(UserRole role, CancellationToken ct)
    {
        var setting = await _admin.GetSettingAsync(RolePermsKey, ct);
        if (setting is null || string.IsNullOrWhiteSpace(setting.SettingValue)) return Array.Empty<string>();

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, string[]>>(setting.SettingValue);
            if (parsed is null) return Array.Empty<string>();

            return parsed.TryGetValue(role.ToString(), out var keys)
                ? (keys ?? Array.Empty<string>())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                    .ToArray()
                : Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();
    private static string NormalizeMobile(string mobile) => new string((mobile ?? string.Empty).Where(char.IsDigit).ToArray());
    private static string NormalizeIdentifier(string identifier) => (identifier ?? string.Empty).Trim();
}
