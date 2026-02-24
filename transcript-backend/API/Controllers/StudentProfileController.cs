using Application.DTOs.Students;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/student/profile")]
[Authorize(Roles = "Student")]
public sealed class StudentProfileController : ControllerBase
{
    private readonly IStudentProfileService _profiles;

    public StudentProfileController(IStudentProfileService profiles) => _profiles = profiles;

    [HttpGet]
    public async Task<ActionResult<StudentProfileDto?>> Get(CancellationToken ct)
    {
        var profile = await _profiles.GetMyProfileAsync(ct);
        return Ok(profile);
    }

    [HttpPut]
    public async Task<ActionResult<StudentProfileDto>> Upsert([FromBody] StudentProfileDto dto, CancellationToken ct)
    {
        var saved = await _profiles.UpsertMyProfileAsync(dto, ct);
        return Ok(saved);
    }

    [HttpGet("complete")]
    public async Task<IActionResult> IsComplete(CancellationToken ct)
    {
        var ok = await _profiles.IsMyProfileCompleteAsync(ct);
        return Ok(new { complete = ok });
    }
}

