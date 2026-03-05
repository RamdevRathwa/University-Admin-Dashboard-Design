namespace Domain.Entities;

public sealed class CurriculumVersion
{
    public Guid Id { get; set; }
    public Guid ProgramId { get; set; }
    public Program Program { get; set; } = null!;
    public string AcademicYear { get; set; } = string.Empty;
    public string VersionName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool Locked { get; set; } = false;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

