using Application.DTOs.Workflow;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/hod/transcript-requests")]
[Authorize(Roles = "HoD,Admin")]
public sealed class HodTranscriptRequestsController : ControllerBase
{
    private readonly IHodWorkflowService _workflow;
    public HodTranscriptRequestsController(IHodWorkflowService workflow) => _workflow = workflow;

    [HttpPost("{id:guid}/forward-to-dean")]
    public async Task<IActionResult> ForwardToDean([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        await _workflow.ForwardToDeanAsync(id, body?.Remarks, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/return-to-clerk")]
    public async Task<IActionResult> ReturnToClerk([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest body, CancellationToken ct)
    {
        await _workflow.ReturnToClerkAsync(id, body.Remarks, ct);
        return NoContent();
    }
}

