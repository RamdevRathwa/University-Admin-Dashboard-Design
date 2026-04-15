using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/settings")]
[Authorize]
public sealed class AdminSettingsController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminSettingsController(IAdminService admin) => _admin = admin;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var s = await _admin.GetSystemSettingsAsync(ct);
        return Ok(s);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] object body, CancellationToken ct)
    {
        await _admin.UpdateSystemSettingsAsync(body, ct);
        return NoContent();
    }
}

