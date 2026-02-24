namespace Application.Interfaces;

public interface IClerkWorkflowService
{
    Task ForwardToHoDAsync(Guid requestId, string? remarks, CancellationToken ct = default);
}

