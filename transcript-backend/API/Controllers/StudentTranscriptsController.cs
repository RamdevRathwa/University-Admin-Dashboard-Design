using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/student/transcripts")]
[Authorize(Roles = "Student")]
public sealed class StudentTranscriptsController : ControllerBase
{
    private readonly IStudentTranscriptService _transcripts;
    private readonly IWebHostEnvironment _env;

    public StudentTranscriptsController(IStudentTranscriptService transcripts, IWebHostEnvironment env)
    {
        _transcripts = transcripts;
        _env = env;
    }

    [HttpGet("approved")]
    public async Task<IActionResult> Approved(CancellationToken ct)
    {
        var res = await _transcripts.MyApprovedAsync(ct);
        return Ok(res);
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download([FromRoute] Guid id, CancellationToken ct)
    {
        var (path, fileName) = await _transcripts.GetDownloadAsync(id, ct);
        var abs = ResolvePath(path, _env.ContentRootPath);

        if (!System.IO.File.Exists(abs))
        {
            // Regenerate once and retry path resolution to handle stale stored paths for newly processed transcripts.
            var (retryPath, retryFileName) = await _transcripts.GetDownloadAsync(id, CancellationToken.None);
            fileName = retryFileName;
            abs = ResolvePath(retryPath, _env.ContentRootPath);
        }

        if (!System.IO.File.Exists(abs))
            return NotFound("Transcript PDF could not be located after regeneration.");

        // Always fetch latest generated PDF; avoid browser/proxy serving stale cached file.
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

