using Application.DTOs.Auth;
using Application.Interfaces;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _current;

    public AuthController(IAuthService auth, IUserRepository users, ICurrentUserService current)
    {
        _auth = auth;
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
        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.Mobile,
            Role = user.Role.ToString(),
            user.IsEmailVerified,
            user.IsMobileVerified,
            user.CreatedAt
        });
    }
}

