using Application.DTOs.Clerk.GradeEntry;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/grade-entry")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkGradeEntryController : ControllerBase
{
    private readonly IClerkGradeEntryService _grades;
    public ClerkGradeEntryController(IClerkGradeEntryService grades) => _grades = grades;

    [HttpGet("by-prn/{prn}")]
    public async Task<ActionResult<GradeEntryResponseDto>> GetByPrn([FromRoute] string prn, CancellationToken ct)
    {
        var res = await _grades.GetByPrnAsync(prn, ct);
        return Ok(res);
    }
}

