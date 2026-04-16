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
    private readonly IWebHostEnvironment _env;

    public AdminTranscriptsController(IAdminService admin, IWebHostEnvironment env)
    {
        _admin = admin;
        _env = env;
    }

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
        var abs = ResolvePath(path, _env.ContentRootPath);

        if (!System.IO.File.Exists(abs))
        {
            var (retryPath, retryFileName) = await _admin.GetTranscriptDownloadAsync(id, CancellationToken.None);
            fileName = retryFileName;
            abs = ResolvePath(retryPath, _env.ContentRootPath);
        }

        if (!System.IO.File.Exists(abs))
            return NotFound("Transcript PDF could not be located after regeneration.");

        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Expires"] = "0";

        var bytes = await System.IO.File.ReadAllBytesAsync(abs, CancellationToken.None);
        return File(bytes, "application/pdf", fileName);
    }

    private static string ResolvePath(string storedPath, string? contentRootPath)
    {
        var p = (storedPath ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(p)) return string.Empty;
        if (Path.IsPathRooted(p)) return p;

        var candidates = new[]
        {
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, p)),
            string.IsNullOrWhiteSpace(contentRootPath) ? string.Empty : Path.GetFullPath(Path.Combine(contentRootPath, p)),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), p))
        };

        return candidates.FirstOrDefault(System.IO.File.Exists) ?? candidates.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty;
    }
}
