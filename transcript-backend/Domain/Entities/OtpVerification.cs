using Domain.Enums;

namespace Domain.Entities;

public sealed class OtpVerification
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public string Identifier { get; set; } = string.Empty; // email or mobile
    public OtpPurpose Purpose { get; set; }

    // Stores "salt:hash" (hash is HMACSHA256). Never store raw OTP in production.
    public string OtpCode { get; set; } = string.Empty;

    public int Attempts { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

