using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2LoginLog
{
    [Column("login_log_id")]
    public long LoginLogId { get; set; }

    [Column("user_id")]
    public long? UserId { get; set; }

    [Column("identifier")]
    public string Identifier { get; set; } = string.Empty;

    [Column("success")]
    public bool Success { get; set; }

    [Column("failure_reason")]
    public string? FailureReason { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("device_id")]
    public string? DeviceId { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

