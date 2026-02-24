using Application.DTOs.Transcripts;
using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/transcripts")]
[Authorize(Roles = "Student")]
public sealed class TranscriptRequestsController : ControllerBase
{
    private readonly ITranscriptService _transcripts;

    public TranscriptRequestsController(ITranscriptService transcripts) => _transcripts = transcripts;

    [HttpPost("draft")]
    public async Task<ActionResult<TranscriptRequestDto>> CreateDraft(CancellationToken ct)
    {
        var draft = await _transcripts.CreateDraftAsync(ct);
        return Ok(draft);
    }

    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<TranscriptRequestDto>>> My(CancellationToken ct)
    {
        var list = await _transcripts.GetMyRequestsAsync(ct);
        return Ok(list);
    }

    [HttpPost("{id:guid}/submit")]
    public async Task<ActionResult<TranscriptRequestDto>> Submit(Guid id, CancellationToken ct)
    {
        var res = await _transcripts.SubmitAsync(id, ct);
        return Ok(res);
    }
}

