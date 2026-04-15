using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/transcripts")]
[Authorize]
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

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download([FromRoute] Guid id, CancellationToken ct)
    {
        var (path, fileName) = await _admin.GetTranscriptDownloadAsync(id, ct);
        var abs = ResolvePath(path);
        if (!System.IO.File.Exists(abs)) return NotFound();
        return PhysicalFile(abs, "application/pdf", fileName);
    }

    private static string ResolvePath(string storedPath)
    {
        var p = (storedPath ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(p)) return string.Empty;
        if (Path.IsPathRooted(p)) return p;
        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, p));
    }
}
