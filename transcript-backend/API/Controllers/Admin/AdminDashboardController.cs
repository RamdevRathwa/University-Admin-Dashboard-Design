using Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Admin;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize]
public sealed class AdminDashboardController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminDashboardController(IAdminService admin) => _admin = admin;

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var s = await _admin.GetDashboardSummaryAsync(ct);
        return Ok(new
        {
            totalStudents = s.TotalStudents,
            totalStaff = s.TotalStaff,
            pendingTranscripts = s.PendingTranscripts,
            approvedTranscripts = s.ApprovedTranscripts,
            totalPaymentsReceived = s.TotalPaymentsReceived,
            systemAlerts = s.SystemAlerts
        });
    }
}

