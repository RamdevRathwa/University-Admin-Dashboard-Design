using Application.DTOs.Admin;
using Application.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminUsersController(IAdminService admin) => _admin = admin;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] string? role, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var res = await _admin.ListUsersAsync(q, role, page, pageSize, ct);
        return Ok(new
        {
            items = res.Items.Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                email = u.Email,
                mobile = u.Mobile,
                role = u.Role.ToString(),
                isActive = u.IsActive,
                locked = u.Locked,
                lastLogin = u.LastLoginAt?.ToString("u")
            }),
            total = res.Total,
            page = res.Page,
            pageSize = res.PageSize
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdminUserUpsertDto body, CancellationToken ct)
    {
        var created = await _admin.CreateUserAsync(body, ct);
        return Ok(new { id = created.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] AdminUserUpsertDto body, CancellationToken ct)
    {
        var updated = await _admin.UpdateUserAsync(id, body, ct);
        return Ok(new { id = updated.Id });
    }

    public sealed record LockRequest(bool Locked);

    [HttpPost("{id:guid}/lock")]
    public async Task<IActionResult> Lock([FromRoute] Guid id, [FromBody] LockRequest body, CancellationToken ct)
    {
        await _admin.LockUserAsync(id, body.Locked, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
    {
        await _admin.SoftDeleteUserAsync(id, ct);
        return NoContent();
    }
}

