using Application.DTOs.Workflow;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/clerk/transcript-requests")]
[Authorize(Roles = "Clerk,Admin")]
public sealed class ClerkTranscriptRequestsController : ControllerBase
{
    private readonly IClerkWorkflowService _workflow;
    public ClerkTranscriptRequestsController(IClerkWorkflowService workflow) => _workflow = workflow;

    [HttpPost("{id:guid}/forward-to-hod")]
    public async Task<IActionResult> ForwardToHod([FromRoute] Guid id, [FromBody] WorkflowRemarksRequest? body, CancellationToken ct)
    {
        await _workflow.ForwardToHoDAsync(id, body?.Remarks, ct);
        return NoContent();
    }
}

