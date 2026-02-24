using System.Security.Claims;
using Application.Interfaces;
using Domain.Enums;

namespace API.Services;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _http;

    public CurrentUserService(IHttpContextAccessor http) => _http = http;

    public bool IsAuthenticated => _http.HttpContext?.User?.Identity?.IsAuthenticated == true;

    public Guid UserId
    {
        get
        {
            var sub = _http.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? _http.HttpContext?.User?.FindFirstValue("sub")
                      ?? _http.HttpContext?.User?.FindFirstValue(ClaimTypes.Name);

            return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
        }
    }

    public UserRole Role
    {
        get
        {
            var r = _http.HttpContext?.User?.FindFirstValue(ClaimTypes.Role)
                    ?? _http.HttpContext?.User?.FindFirstValue("role");
            return Enum.TryParse<UserRole>(r, ignoreCase: true, out var role) ? role : UserRole.Student;
        }
    }
}

