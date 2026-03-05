/*
  03_migrate_users.sql
  Migrates V1 users into V2 users + user_roles.
  Notes:
  - OTP rows are NOT migrated (treat as expired).
  - V2 `dbo.users` does NOT store role/locked/last_login; roles are in `dbo.user_roles`.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_users', N'U') IS NULL
    THROW 50000, 'map_users not found. Run 01_create_mapping_tables.sql first.', 1;

  -- Insert users from V1 that are not yet mapped.
  ;WITH src AS (
    SELECT
      u.Id AS legacy_user_guid,
      NULLIF(LTRIM(RTRIM(u.FullName)), N'') AS full_name,
      NULLIF(LTRIM(RTRIM(LOWER(u.Email))), N'') AS email,
      NULLIF(LTRIM(RTRIM(u.Mobile)), N'') AS mobile_raw,
      u.Role AS role_int,
      CAST(ISNULL(u.IsEmailVerified,0) AS bit) AS is_email_verified,
      CAST(ISNULL(u.IsMobileVerified,0) AS bit) AS is_mobile_verified,
      CAST(ISNULL(u.IsActive,1) AS bit) AS is_active,
      u.CreatedAt AS created_at,
      u.DeletedAt AS deleted_at
    FROM [TranscriptDB_V1].dbo.Users u
  ), todo AS (
    SELECT s.*
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.map_users m WHERE m.legacy_user_guid = s.legacy_user_guid)
  )
  INSERT INTO dbo.users (
    full_name,
    email,
    mobile,
    normalized_email,
    normalized_mobile,
    is_email_verified,
    is_mobile_verified,
    is_active,
    deleted_at,
    created_at,
    updated_at
  )
  OUTPUT todo.legacy_user_guid, inserted.user_id
  INTO dbo.map_users(legacy_user_guid, user_id)
  SELECT
    ISNULL(todo.full_name, N'Unknown'),
    todo.email,
    todo.mobile_raw,
    todo.email,
    -- digits-only normalized mobile
    NULLIF(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          ISNULL(todo.mobile_raw,N''),
        N'+',N''), N' ',N''), N'-',N''), N'(',N''), N')',N''), N'.',N''), N'/',N''), N'\\',N''), N',',N''), N':',N''),
        N';',N''), N'_',N''), N'\t',N''), N'\r',N''), N'\n',N''), N'#',N''), N'*',N''), N'@',N''), N'=',N''), N'?',N'')
    ,N''),
    todo.is_email_verified,
    todo.is_mobile_verified,
    todo.is_active,
    CASE WHEN todo.deleted_at IS NULL THEN NULL ELSE TODATETIMEOFFSET(todo.deleted_at, '+00:00') END,
    CASE WHEN todo.created_at IS NULL THEN SYSDATETIMEOFFSET() ELSE TODATETIMEOFFSET(todo.created_at, '+00:00') END,
    CASE WHEN todo.created_at IS NULL THEN SYSDATETIMEOFFSET() ELSE TODATETIMEOFFSET(todo.created_at, '+00:00') END
  FROM todo;

  -- Sync to helper table if present.
  IF OBJECT_ID(N'dbo.migration_user_map', N'U') IS NOT NULL
  BEGIN
    MERGE dbo.migration_user_map AS t
    USING dbo.map_users AS s
      ON t.old_user_guid = s.legacy_user_guid
    WHEN NOT MATCHED THEN
      INSERT (old_user_guid, new_user_id) VALUES (s.legacy_user_guid, s.user_id);
  END

  -- Insert user_roles for all mapped users.
  ;WITH v1roles AS (
    SELECT
      u.Id AS legacy_user_guid,
      CASE
        WHEN u.Role IN (1,2,3,4,5) THEN CAST(u.Role AS smallint)
        ELSE CAST(1 AS smallint)
      END AS role_id
    FROM [TranscriptDB_V1].dbo.Users u
  )
  INSERT INTO dbo.user_roles (user_id, role_id, assigned_at)
  SELECT m.user_id, r.role_id, SYSUTCDATETIME()
  FROM v1roles r
  JOIN dbo.map_users m ON m.legacy_user_guid = r.legacy_user_guid
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.user_roles ur
    WHERE ur.user_id = m.user_id AND ur.role_id = r.role_id
  );

  COMMIT;
  PRINT 'Users migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
