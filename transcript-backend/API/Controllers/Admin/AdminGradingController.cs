using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/grading")]
[Authorize(Roles = "Admin")]
public sealed class AdminGradingController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminGradingController(IAdminService admin) => _admin = admin;

    [HttpGet("schemes")]
    public async Task<IActionResult> Schemes(CancellationToken ct)
    {
        var items = await _admin.ListGradingSchemesAsync(ct);
        return Ok(new { items });
    }

    [HttpPost("schemes")]
    public async Task<IActionResult> UpsertScheme([FromBody] object body, CancellationToken ct)
    {
        await _admin.UpsertGradingSchemeAsync(body, ct);
        return NoContent();
    }
}

