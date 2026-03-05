using Domain.Enums;

namespace Application.DTOs.Admin;

public sealed record AdminUserUpsertDto(
    string FullName,
    string Email,
    string Mobile,
    UserRole Role,
    bool IsActive,
    bool Locked
);

