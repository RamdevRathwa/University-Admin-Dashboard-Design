namespace Application.DTOs.Admin;

public sealed record AdminAuditItemDto(
    Guid Id,
    string Time,
    string User,
    string Action,
    string Entity,
    bool Success
);

