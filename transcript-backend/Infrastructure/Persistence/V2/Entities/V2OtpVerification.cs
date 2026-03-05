using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2OtpVerification
{
    [Column("otp_id")]
    public long OtpId { get; set; }

    [Column("user_id")]
    public long? UserId { get; set; }

    [Column("identifier")]
    public string Identifier { get; set; } = string.Empty;

    [Column("identifier_type")]
    public string IdentifierType { get; set; } = string.Empty; // Email/Mobile

    [Column("purpose")]
    public string Purpose { get; set; } = string.Empty;

    [Column("otp_salt")]
    public byte[] OtpSalt { get; set; } = Array.Empty<byte>();

    [Column("otp_hash")]
    public byte[] OtpHash { get; set; } = Array.Empty<byte>();

    [Column("attempts")]
    public int Attempts { get; set; }

    [Column("expires_at")]
    public DateTimeOffset ExpiresAt { get; set; }

    [Column("used_at")]
    public DateTimeOffset? UsedAt { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }
}

