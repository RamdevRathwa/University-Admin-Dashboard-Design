using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2AuditLog
{
    [Column("audit_log_id")]
    public long AuditLogId { get; set; }

    [Column("user_id")]
    public long? UserId { get; set; }

    [Column("action_type")]
    public string ActionType { get; set; } = string.Empty;

    [Column("entity_name")]
    public string? EntityName { get; set; }

    [Column("entity_key")]
    public string? EntityKey { get; set; }

    [Column("old_data_json")]
    public string? OldDataJson { get; set; }

    [Column("new_data_json")]
    public string? NewDataJson { get; set; }

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2SystemSetting
{
    [Column("setting_id")]
    public int SettingId { get; set; }

    [Column("setting_key")]
    public string SettingKey { get; set; } = string.Empty;

    [Column("setting_value")]
    public string SettingValue { get; set; } = string.Empty;

    [Column("setting_type")]
    public string SettingType { get; set; } = "String";

    [Column("description")]
    public string? Description { get; set; }

    [Column("updated_by")]
    public long? UpdatedBy { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}

