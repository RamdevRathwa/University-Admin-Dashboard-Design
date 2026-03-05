namespace Domain.Entities;

public sealed class AuditLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string UserLabel { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty; // INSERT/UPDATE/DELETE/LOGIN/LOGOUT/APPROVE/REJECT/PUBLISH
    public string EntityName { get; set; } = string.Empty; // table/module
    public string? RecordId { get; set; }
    public bool Success { get; set; } = true;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

