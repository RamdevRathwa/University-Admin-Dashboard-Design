namespace Application.Interfaces;

public interface ISmsSender
{
    Task SendAsync(string toMobile, string message, CancellationToken ct = default);
}

