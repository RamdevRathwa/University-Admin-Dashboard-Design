using Application.Interfaces;
using Domain.Entities;
using Domain.Interfaces;

namespace Infrastructure.Services.Audit;

public sealed class AuditTrailService : IAuditTrailService
{
    private readonly IAdminRepository _admin;
    private readonly IUnitOfWork _uow;

    public AuditTrailService(IAdminRepository admin, IUnitOfWork uow)
    {
        _admin = admin;
        _uow = uow;
    }

    public async Task LogAsync(
        string action,
        string entity,
        string? recordId = null,
        string? oldValue = null,
        string? newValue = null,
        Guid? userId = null,
        string? ipAddress = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(action) || string.IsNullOrWhiteSpace(entity))
            return;

        await _admin.AddAuditAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            UserLabel = userId?.ToString() ?? "System",
            ActionType = action.Trim(),
            EntityName = entity.Trim(),
            RecordId = string.IsNullOrWhiteSpace(recordId) ? null : recordId.Trim(),
            Success = true,
            OldValue = oldValue,
            NewValue = newValue,
            IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        }, ct);

        await _uow.SaveChangesAsync(ct);
    }
}
