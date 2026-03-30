namespace Application.Interfaces;

public interface IAuditTrailService
{
    Task LogAsync(
        string action,
        string entity,
        string? recordId = null,
        string? oldValue = null,
        string? newValue = null,
        Guid? userId = null,
        string? ipAddress = null,
        CancellationToken ct = default);
}
