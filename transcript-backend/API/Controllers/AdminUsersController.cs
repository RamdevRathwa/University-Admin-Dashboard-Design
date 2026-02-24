using Application.Common;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;

    public AdminUsersController(IUserRepository users, IUnitOfWork uow)
    {
        _users = users;
        _uow = uow;
    }

    public sealed record CreateUserRequest(string FullName, string Email, string Mobile, UserRole Role);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req, CancellationToken ct)
    {
        var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var mobile = new string((req.Mobile ?? string.Empty).Where(char.IsDigit).ToArray());

        if (string.IsNullOrWhiteSpace(req.FullName)) throw new AppException("Full name is required.");
        if (string.IsNullOrWhiteSpace(email)) throw new AppException("Email is required.");
        if (string.IsNullOrWhiteSpace(mobile)) throw new AppException("Mobile number is required.");

        if (await _users.EmailExistsAsync(email, ct)) throw AppException.Conflict("An account with this email already exists.");
        if (await _users.MobileExistsAsync(mobile, ct)) throw AppException.Conflict("An account with this mobile already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = req.FullName.Trim(),
            Email = email,
            Mobile = mobile,
            Role = req.Role,
            IsEmailVerified = true,
            IsMobileVerified = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(new { user.Id, user.FullName, user.Email, user.Mobile, Role = user.Role.ToString(), user.CreatedAt });
    }
}

