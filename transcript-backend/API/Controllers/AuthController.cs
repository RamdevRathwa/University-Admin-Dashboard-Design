using Application.DTOs.Auth;
using Application.Interfaces;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private const string RolePermsKey = "role_permissions";

    private readonly IAuthService _auth;
    private readonly IAdminRepository _admin;
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _current;

    public AuthController(IAuthService auth, IAdminRepository admin, IUserRepository users, ICurrentUserService current)
    {
        _auth = auth;
        _admin = admin;
        _users = users;
        _current = current;
    }

    [HttpPost("register/request-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterRequestOtp([FromBody] RegisterRequestOtpDto dto, CancellationToken ct)
    {
        await _auth.RequestRegistrationOtpAsync(dto, ct);
        return Ok(new { message = "OTP sent to email and mobile." });
    }

    [HttpPost("register/verify")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> RegisterVerify([FromBody] RegisterVerifyDto dto, CancellationToken ct)
    {
        var res = await _auth.VerifyRegistrationAsync(dto, ct);
        return Ok(res);
    }

    [HttpPost("login/request-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> LoginRequestOtp([FromBody] LoginRequestOtpDto dto, CancellationToken ct)
    {
        await _auth.RequestLoginOtpAsync(dto, ct);
        return Ok(new { message = "OTP sent." });
    }

    [HttpPost("login/verify")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> LoginVerify([FromBody] LoginVerifyDto dto, CancellationToken ct)
    {
        var res = await _auth.VerifyLoginAsync(dto, ct);
        return Ok(res);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var id = _current.UserId;
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        var permissions = await GetPermissionsForRoleAsync(user.Role.ToString(), ct);
        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.Mobile,
            Role = user.Role.ToString(),
            permissions,
            user.IsEmailVerified,
            user.IsMobileVerified,
            user.CreatedAt
        });
    }

    private async Task<IReadOnlyList<string>> GetPermissionsForRoleAsync(string roleName, CancellationToken ct)
    {
        var setting = await _admin.GetSettingAsync(RolePermsKey, ct);
        if (setting is null || string.IsNullOrWhiteSpace(setting.SettingValue)) return Array.Empty<string>();

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, string[]>>(setting.SettingValue);
            if (parsed is null) return Array.Empty<string>();

            return parsed.TryGetValue(roleName, out var keys)
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
}

