using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2Role
{
    [Column("role_id")]
    public short RoleId { get; set; }

    [Column("role_name")]
    public string RoleName { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

