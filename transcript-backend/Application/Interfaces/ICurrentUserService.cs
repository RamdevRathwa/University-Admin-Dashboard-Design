using Domain.Enums;

namespace Application.Interfaces;

public interface ICurrentUserService
{
    Guid UserId { get; }
    UserRole Role { get; }
    bool IsAuthenticated { get; }
}

