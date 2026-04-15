using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/audit")]
[Authorize]
public sealed class AdminAuditController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminAuditController(IAdminService admin) => _admin = admin;

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] string? action,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var res = await _admin.ListAuditAsync(q, action, from, to, page, pageSize, ct);
        return Ok(new { items = res.Items, total = res.Total, page = res.Page, pageSize = res.PageSize });
    }

    [HttpGet("recent")]
    public async Task<IActionResult> Recent([FromQuery] int limit = 10, CancellationToken ct = default)
    {
        var items = await _admin.GetRecentAuditAsync(limit, ct);
        return Ok(new { items });
    }
}

