namespace Application.Interfaces;

public interface IHodWorkflowService
{
    Task ForwardToDeanAsync(Guid requestId, string? remarks, CancellationToken ct = default);
    Task ReturnToClerkAsync(Guid requestId, string remarks, CancellationToken ct = default);
}

