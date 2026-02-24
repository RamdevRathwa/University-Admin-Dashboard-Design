using Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Messaging;

public sealed class NoOpSmsSender : ISmsSender
{
    private readonly ILogger<NoOpSmsSender> _log;
    public NoOpSmsSender(ILogger<NoOpSmsSender> log) => _log = log;

    public Task SendAsync(string toMobile, string message, CancellationToken ct = default)
    {
        _log.LogInformation("SMS skipped (dev fixed OTP enabled). to={To}", toMobile);
        return Task.CompletedTask;
    }
}

