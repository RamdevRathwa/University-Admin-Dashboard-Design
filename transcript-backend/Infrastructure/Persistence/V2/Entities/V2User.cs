using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2User
{
    [Column("user_id")]
    public long UserId { get; set; }

    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Column("email")]
    public string? Email { get; set; }

    [Column("mobile")]
    public string? Mobile { get; set; }

    [Column("normalized_email")]
    public string? NormalizedEmail { get; set; }

    [Column("normalized_mobile")]
    public string? NormalizedMobile { get; set; }

    [Column("is_email_verified")]
    public bool IsEmailVerified { get; set; }

    [Column("is_mobile_verified")]
    public bool IsMobileVerified { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("deleted_at")]
    public DateTimeOffset? DeletedAt { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}

