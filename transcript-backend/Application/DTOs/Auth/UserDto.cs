using Domain.Enums;

namespace Application.DTOs.Auth;

public sealed record UserDto(
    Guid Id,
    string FullName,
    string Email,
    string Mobile,
    UserRole Role,
    bool IsEmailVerified,
    bool IsMobileVerified,
    DateTimeOffset CreatedAt
);

