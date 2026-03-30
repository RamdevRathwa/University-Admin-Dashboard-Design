using Application.Common;
using Application.DTOs.Account;
using Application.Interfaces;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public sealed class AccountController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _current;
    private readonly IUnitOfWork _uow;

    public AccountController(IUserRepository users, ICurrentUserService current, IUnitOfWork uow)
    {
        _users = users;
        _current = current;
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
}
