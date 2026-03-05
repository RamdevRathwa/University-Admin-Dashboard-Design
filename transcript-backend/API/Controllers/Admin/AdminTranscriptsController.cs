using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/transcripts")]
[Authorize(Roles = "Admin")]
public sealed class AdminTranscriptsController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminTranscriptsController(IAdminService admin) => _admin = admin;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var res = await _admin.ListTranscriptsAsync(status, q, page, pageSize, ct);
        return Ok(new
        {
            items = res.Items,
            total = res.Total,
            page = res.Page,
            pageSize = res.PageSize
        });
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish([FromRoute] Guid id, CancellationToken ct)
    {
        await _admin.PublishTranscriptAsync(id, ct);
        return NoContent();
    }
}

