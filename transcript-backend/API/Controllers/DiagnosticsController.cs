using Infrastructure.Services.Otp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace API.Controllers;

[ApiController]
[Route("api/diagnostics")]
public sealed class DiagnosticsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IOptions<OtpOptions> _otp;

    public DiagnosticsController(IWebHostEnvironment env, IOptions<OtpOptions> otp)
    {
        _env = env;
        _otp = otp;
    }

    [HttpGet("otp")]
    [AllowAnonymous]
    public IActionResult Otp()
    {
        return Ok(new
        {
            Environment = _env.EnvironmentName,
            _otp.Value.Length,
            _otp.Value.TtlSeconds,
            _otp.Value.MaxSendPerIdentifierPerHour,
            FixedCodeSet = !string.IsNullOrWhiteSpace(_otp.Value.FixedCode)
        });
    }
}
