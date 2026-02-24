using Application.DTOs.Dean;
using Application.DTOs.Workflow;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/dean/transcript-requests")]
[Authorize(Roles = "Dean,Admin")]
public sealed class DeanTranscriptRequestsController : ControllerBase
{
    private readonly IDeanApprovalService _dean;
    public DeanTranscriptRequestsController(IDeanApprovalService dean) => _dean = dean;

    [HttpGet("pending")]
    public async Task<IActionResult> Pending(CancellationToken ct)
    {
        var res = await _dean.PendingAsync(ct);
        return Ok(res);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get([FromRoute] Guid id, CancellationToken ct)
    {
        var res = await _dean.GetAsync(id, ct);
        return Ok(res);
    }

    [HttpGet("{id:guid}/review")]
    public async Task<ActionResult<DeanReviewDto>> Review([FromRoute] Guid id, CancellationToken ct)
    {
        var res = await _dean.GetReviewAsync(id, ct);
        return Ok(res);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<object>> Approve([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        var transcriptId = await _dean.FinalApproveAsync(id, body?.Remarks, ct);
        return Ok(new { transcriptId });
    }

    [HttpPost("{id:guid}/return-to-hod")]
    public async Task<IActionResult> ReturnToHod([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest body, CancellationToken ct)
    {
        await _dean.ReturnToHoDAsync(id, body.Remarks, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest body, CancellationToken ct)
    {
        await _dean.RejectAsync(id, body.Remarks, ct);
        return NoContent();
    }
}

