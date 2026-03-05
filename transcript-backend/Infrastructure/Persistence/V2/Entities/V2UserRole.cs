using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2UserRole
{
    [Column("user_role_id")]
    public long UserRoleId { get; set; }

    [Column("user_id")]
    public long UserId { get; set; }

    [Column("role_id")]
    public short RoleId { get; set; }

    [Column("assigned_at")]
    public DateTimeOffset AssignedAt { get; set; }

    [Column("assigned_by")]
    public long? AssignedBy { get; set; }
}

