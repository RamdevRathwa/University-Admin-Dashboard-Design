namespace Application.DTOs.Admin;

public sealed record PagedResultDto<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

