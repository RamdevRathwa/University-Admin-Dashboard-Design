using Application.Common;
using Application.DTOs.Account;
using Application.Interfaces;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace API.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public sealed class AccountController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _current;
    private readonly IAdminRepository _admin;
    private readonly IUnitOfWork _uow;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public AccountController(IUserRepository users, ICurrentUserService current, IAdminRepository admin, IUnitOfWork uow)
    {
        _users = users;
        _current = current;
        _admin = admin;
        _uow = uow;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();

        var user = await _users.GetByIdAsync(_current.UserId, ct);
        if (user is null) throw AppException.NotFound("User not found.");

        return Ok(new
        {
            user.Id,
            fullName = user.FullName,
            user.Email,
            user.Mobile,
            role = user.Role.ToString(),
            user.IsEmailVerified,
            user.IsMobileVerified,
            user.IsActive,
            user.CreatedAt
        });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> Update([FromBody] UpdateMyProfileDto dto, CancellationToken ct)
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();

        var user = await _users.GetByIdAsync(_current.UserId, ct);
        if (user is null) throw AppException.NotFound("User not found.");

        var fullName = (dto.FullName ?? string.Empty).Trim();
        var email = (dto.Email ?? string.Empty).Trim().ToLowerInvariant();
        var mobile = new string((dto.Mobile ?? string.Empty).Where(char.IsDigit).ToArray());

        if (string.IsNullOrWhiteSpace(fullName)) throw new AppException("Full name is required.", 400, "full_name_required");
        if (string.IsNullOrWhiteSpace(email)) throw new AppException("Email is required.", 400, "email_required");
        if (string.IsNullOrWhiteSpace(mobile)) throw new AppException("Mobile is required.", 400, "mobile_required");

        if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase) &&
            await _users.EmailExistsAsync(email, ct))
            throw new AppException("Email already exists.", 400, "email_exists");

        var currentMobile = new string((user.Mobile ?? string.Empty).Where(char.IsDigit).ToArray());
        if (!string.Equals(currentMobile, mobile, StringComparison.Ordinal) &&
            await _users.MobileExistsAsync(mobile, ct))
            throw new AppException("Mobile already exists.", 400, "mobile_exists");

        user.FullName = fullName;
        user.Email = email;
        user.Mobile = mobile;

        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(new
        {
            user.Id,
            fullName = user.FullName,
            user.Email,
            user.Mobile,
            role = user.Role.ToString(),
            user.IsEmailVerified,
            user.IsMobileVerified,
            user.IsActive,
            user.CreatedAt
        });
    }

    [HttpGet("preferences")]
    public async Task<ActionResult<NotificationPreferencesDto>> GetPreferences(CancellationToken ct)
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();

        var setting = await _admin.GetSettingAsync(GetPreferencesKey(_current.UserId), ct);
        if (setting is null || string.IsNullOrWhiteSpace(setting.SettingValue))
            return Ok(DefaultPreferences());

        try
        {
            var prefs = JsonSerializer.Deserialize<NotificationPreferencesDto>(setting.SettingValue, JsonOptions);
            return Ok(prefs ?? DefaultPreferences());
        }
        catch (JsonException)
        {
            return Ok(DefaultPreferences());
        }
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<NotificationPreferencesDto>> UpdatePreferences([FromBody] UpdateNotificationPreferencesDto dto, CancellationToken ct)
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();

        var prefs = new NotificationPreferencesDto(
            dto.EmailNotifications,
            dto.InAppAlerts,
            dto.ApprovalUpdates,
            dto.QueueUpdates,
            dto.ReturnedCases,
            dto.FinalApprovalQueue,
            dto.PublishFollowUp
        );

        await _admin.UpsertSettingAsync(new Domain.Entities.SystemSetting
        {
            SettingKey = GetPreferencesKey(_current.UserId),
            SettingValue = JsonSerializer.Serialize(prefs, JsonOptions),
            UpdatedAt = DateTimeOffset.UtcNow,
            UpdatedBy = _current.UserId
        }, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(prefs);
    }

    private static string GetPreferencesKey(Guid userId) => $"account_prefs:{userId:N}";

    private static NotificationPreferencesDto DefaultPreferences() =>
        new(
            EmailNotifications: true,
            InAppAlerts: true,
            ApprovalUpdates: true,
            QueueUpdates: true,
            ReturnedCases: true,
            FinalApprovalQueue: true,
            PublishFollowUp: true
        );
}
