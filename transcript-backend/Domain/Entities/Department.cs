namespace Domain.Entities;

public sealed class Department
{
    public Guid Id { get; set; }
    public Guid FacultyId { get; set; }
    public Faculty Faculty { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid? HodUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

