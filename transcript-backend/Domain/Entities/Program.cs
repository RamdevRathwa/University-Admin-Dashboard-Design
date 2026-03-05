namespace Domain.Entities;

public sealed class Program
{
    public Guid Id { get; set; }
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DegreeName { get; set; } = string.Empty;
    public int DurationYears { get; set; } = 4;
    public Guid? GradingSchemeId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

