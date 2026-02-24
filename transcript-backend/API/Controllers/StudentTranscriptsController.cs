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

    public StudentTranscriptsController(IStudentTranscriptService transcripts) => _transcripts = transcripts;

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

