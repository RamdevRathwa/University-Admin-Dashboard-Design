using Domain.Enums;

namespace Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Student;
    public bool IsEmailVerified { get; set; }
    public bool IsMobileVerified { get; set; }

    // Admin governance fields (soft delete + access control)
    public bool IsActive { get; set; } = true;
    public bool Locked { get; set; } = false;
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public StudentProfile? StudentProfile { get; set; }
    public ICollection<OtpVerification> OtpVerifications { get; set; } = new List<OtpVerification>();
    public ICollection<TranscriptRequest> TranscriptRequests { get; set; } = new List<TranscriptRequest>();
}
