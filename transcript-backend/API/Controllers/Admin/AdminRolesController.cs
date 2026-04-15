using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/roles")]
[Authorize]
public sealed class AdminRolesController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminRolesController(IAdminService admin) => _admin = admin;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var roles = await _admin.ListRolesAsync(ct);
        return Ok(new { items = roles });
    }

    [HttpPut("{roleId}/permissions")]
    public async Task<IActionResult> UpdatePermissions([FromRoute] string roleId, [FromBody] object body, CancellationToken ct)
    {
        await _admin.UpdateRolePermissionsAsync(roleId, body, ct);
        return NoContent();
    }
}

