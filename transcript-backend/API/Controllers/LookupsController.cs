using Infrastructure.Persistence.V2;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/lookups")]
public sealed class LookupsController : ControllerBase
{
    private readonly V2DbContext _db;

    public LookupsController(V2DbContext db)
    {
        _db = db;
    }

    [HttpGet("faculties")]
    public async Task<IActionResult> Faculties(CancellationToken ct)
    {
        var items = await _db.Faculties
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.FacultyName)
            .Select(x => new
            {
                id = x.FacultyId.ToString(),
                code = x.FacultyCode,
                name = x.FacultyName
            })
            .ToListAsync(ct);

        return Ok(new { items });
    }

    [HttpGet("departments")]
    public async Task<IActionResult> Departments([FromQuery] int? facultyId, CancellationToken ct)
    {
        var query = _db.Departments
            .AsNoTracking()
            .Where(x => x.IsActive);

        if (facultyId.HasValue)
            query = query.Where(x => x.FacultyId == facultyId.Value);

        var items = await query
            .OrderBy(x => x.DeptName)
            .Select(x => new
            {
                id = x.DepartmentId.ToString(),
                facultyId = x.FacultyId.ToString(),
                code = x.DeptCode,
                name = x.DeptName
            })
            .ToListAsync(ct);

        return Ok(new { items });
    }

    [HttpGet("programs")]
    public async Task<IActionResult> Programs([FromQuery] int? departmentId, CancellationToken ct)
    {
        var query = _db.Programs
            .AsNoTracking()
            .Where(x => x.IsActive);

        if (departmentId.HasValue)
            query = query.Where(x => x.DepartmentId == departmentId.Value);

        var items = await query
            .OrderBy(x => x.ProgramName)
            .Select(x => new
            {
                id = x.ProgramId.ToString(),
                departmentId = x.DepartmentId.ToString(),
                code = x.ProgramCode,
                name = x.ProgramName,
                durationYears = x.DurationYears
            })
            .ToListAsync(ct);

        return Ok(new { items });
    }
}
