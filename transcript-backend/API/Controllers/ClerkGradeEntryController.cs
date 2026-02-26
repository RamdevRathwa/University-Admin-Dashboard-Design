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

    [HttpPost("by-prn/{prn}/save-draft")]
    public async Task<IActionResult> SaveDraft([FromRoute] string prn, [FromBody] GradeEntrySaveDraftRequestDto body, CancellationToken ct)
    {
        await _grades.SaveDraftAsync(prn, body, ct);
        return NoContent();
    }

    [HttpPost("by-prn/{prn}/submit-to-hod")]
    public async Task<IActionResult> SubmitToHod([FromRoute] string prn, [FromBody] GradeEntrySubmitRequestDto body, CancellationToken ct)
    {
        await _grades.SubmitToHoDAsync(prn, body, ct);
        return NoContent();
    }
}
