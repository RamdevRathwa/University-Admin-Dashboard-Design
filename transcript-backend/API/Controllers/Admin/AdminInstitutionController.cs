using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin")]
[Authorize]
public sealed class AdminInstitutionController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminInstitutionController(IAdminService admin) => _admin = admin;

    [HttpGet("faculties")]
    public async Task<IActionResult> Faculties(CancellationToken ct)
    {
        var items = await _admin.ListFacultiesAsync(ct);
        return Ok(new { items });
    }

    [HttpPost("faculties")]
    public async Task<IActionResult> UpsertFaculty([FromBody] object body, CancellationToken ct)
    {
        await _admin.UpsertFacultyAsync(body, ct);
        return NoContent();
    }

    [HttpGet("departments")]
    public async Task<IActionResult> Departments([FromQuery] Guid? facultyId, CancellationToken ct)
    {
        var items = await _admin.ListDepartmentsAsync(facultyId, ct);
        return Ok(new { items });
    }

    [HttpPost("departments")]
    public async Task<IActionResult> UpsertDepartment([FromBody] object body, CancellationToken ct)
    {
        await _admin.UpsertDepartmentAsync(body, ct);
        return NoContent();
    }
}

