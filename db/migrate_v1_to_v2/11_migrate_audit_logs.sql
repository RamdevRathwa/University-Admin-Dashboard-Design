/*
  11_migrate_audit_logs.sql
  Migrates V1 AuditLogs into V2 audit_logs.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_users', N'U') IS NULL
    THROW 50000, 'map_users not found. Run 01_create_mapping_tables.sql first.', 1;

  IF OBJECT_ID(N'[TranscriptDB_V1].dbo.AuditLogs', N'U') IS NULL
  BEGIN
    PRINT 'V1 AuditLogs table not found. Skipping.';
    COMMIT;
    RETURN;
  END

  INSERT INTO dbo.audit_logs (
    user_id,
    action_type,
    entity_name,
    entity_key,
    old_data_json,
    new_data_json,
    ip_address,
    created_at
  )
  SELECT
    mu.user_id,
    CASE WHEN a.Success = 1 THEN a.ActionType ELSE CONCAT(a.ActionType, N':FAILED') END,
    NULLIF(LTRIM(RTRIM(a.EntityName)), N''),
    NULLIF(LTRIM(RTRIM(a.RecordId)), N''),
    a.OldValue,
    a.NewValue,
    NULLIF(LTRIM(RTRIM(a.IpAddress)), N''),
    a.CreatedAt
  FROM [TranscriptDB_V1].dbo.AuditLogs a
  LEFT JOIN dbo.map_users mu ON mu.legacy_user_guid = a.UserId
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.audit_logs x
    WHERE x.created_at = a.CreatedAt
      AND x.action_type = CASE WHEN a.Success = 1 THEN a.ActionType ELSE CONCAT(a.ActionType, N':FAILED') END
      AND ISNULL(x.entity_name, N'') = ISNULL(NULLIF(LTRIM(RTRIM(a.EntityName)), N''), N'')
      AND ISNULL(x.entity_key, N'') = ISNULL(NULLIF(LTRIM(RTRIM(a.RecordId)), N''), N'')
  );

  COMMIT;
  PRINT 'Audit logs migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
