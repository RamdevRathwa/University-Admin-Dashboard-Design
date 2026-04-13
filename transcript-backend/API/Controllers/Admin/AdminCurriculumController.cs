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

    [HttpGet("curriculum/versions/{id:guid}")]
    public async Task<IActionResult> Version([FromRoute] Guid id, CancellationToken ct)
    {
        var item = await _admin.GetCurriculumVersionAsync(id, ct);
        return Ok(item);
    }

    [HttpPost("curriculum/versions")]
    public async Task<IActionResult> CreateVersion([FromQuery] Guid? programId, [FromBody] object body, CancellationToken ct)
    {
        await _admin.CreateCurriculumVersionAsync(programId, body, ct);
        return NoContent();
    }

    [HttpGet("curriculum/subjects")]
    public async Task<IActionResult> Subjects([FromQuery] Guid? versionId, CancellationToken ct)
    {
        var items = await _admin.ListCurriculumSubjectsAsync(versionId, ct);
        return Ok(new { items });
    }

    [HttpPost("curriculum/subjects")]
    public async Task<IActionResult> UpsertSubject([FromQuery] Guid? versionId, [FromBody] object body, CancellationToken ct)
    {
        await _admin.UpsertCurriculumSubjectAsync(versionId, null, body, ct);
        return NoContent();
    }

    [HttpPut("curriculum/subjects/{id:guid}")]
    public async Task<IActionResult> UpdateSubject(Guid id, [FromQuery] Guid? versionId, [FromBody] object body, CancellationToken ct)
    {
        await _admin.UpsertCurriculumSubjectAsync(versionId, id, body, ct);
        return NoContent();
    }

    [HttpDelete("curriculum/subjects/{id:guid}")]
    public async Task<IActionResult> DeleteSubject(Guid id, CancellationToken ct)
    {
        await _admin.DeleteCurriculumSubjectAsync(id, ct);
        return NoContent();
    }

    [HttpPost("curriculum/subjects/clone")]
    public async Task<IActionResult> CloneSubjects([FromBody] CloneCurriculumSubjectsRequest body, CancellationToken ct)
    {
        var copied = await _admin.CloneCurriculumSubjectsAsync(body.SourceVersionId, body.TargetVersionId, ct);
        return Ok(new { copied });
    }

    public sealed class CloneCurriculumSubjectsRequest
    {
        public Guid? SourceVersionId { get; set; }
        public Guid? TargetVersionId { get; set; }
    }
}
