using Domain.Enums;

namespace Application.DTOs.Admin;

public sealed record AdminUserItemDto(
    Guid Id,
    string FullName,
    string Email,
    string Mobile,
    UserRole Role,
    bool IsActive,
    bool Locked,
    DateTimeOffset? LastLoginAt
);

