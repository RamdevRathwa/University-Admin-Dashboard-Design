namespace Domain.Entities;

public sealed class GradingScheme
{
    public Guid Id { get; set; }
    public string SchemeName { get; set; } = string.Empty;
    public string SchemeType { get; set; } = "10-Point";
    public decimal MaxGradePoint { get; set; } = 10m;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

