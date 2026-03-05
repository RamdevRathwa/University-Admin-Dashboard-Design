using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminCurriculumController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminCurriculumController(IAdminService admin) => _admin = admin;

    [HttpGet("programs")]
    public async Task<IActionResult> Programs(CancellationToken ct)
    {
        var items = await _admin.ListProgramsAsync(ct);
        return Ok(new { items });
    }

    [HttpPost("programs")]
    public async Task<IActionResult> UpsertProgram([FromBody] object body, CancellationToken ct)
    {
        await _admin.UpsertProgramAsync(body, ct);
        return NoContent();
    }

    [HttpGet("curriculum/versions")]
    public async Task<IActionResult> Versions([FromQuery] Guid? programId, CancellationToken ct)
    {
        var items = await _admin.ListCurriculumVersionsAsync(programId, ct);
        return Ok(new { items });
    }

    [HttpPost("curriculum/versions")]
    public async Task<IActionResult> CreateVersion([FromQuery] Guid? programId, [FromBody] object body, CancellationToken ct)
    {
        await _admin.CreateCurriculumVersionAsync(programId, body, ct);
        return NoContent();
    }
}

