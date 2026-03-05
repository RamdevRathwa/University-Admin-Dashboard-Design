/*
  07_migrate_transcript_requests.sql
  Migrates V1 TranscriptRequests + TranscriptApprovals into V2 transcript_requests + transcript_approvals.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_requests', N'U') IS NULL OR OBJECT_ID(N'dbo.map_students', N'U') IS NULL OR OBJECT_ID(N'dbo.map_users', N'U') IS NULL
    THROW 50000, 'Mapping tables missing. Run 01_create_mapping_tables.sql first.', 1;

  DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
  DECLARE @fallbackUserId bigint = (
    SELECT TOP (1) ur.user_id
    FROM dbo.user_roles ur
    WHERE ur.role_id IN (5,2)
    ORDER BY CASE WHEN ur.role_id = 5 THEN 0 ELSE 1 END, ur.user_id
  );

  -- Map V1 status int to V2 status_code
  ;WITH src AS (
    SELECT
      tr.Id AS legacy_request_guid,
      tr.StudentId AS legacy_student_user_guid,
      tr.Status AS status_int,
      tr.CurrentStage AS stage_int,
      tr.CreatedAt AS created_at
    FROM [TranscriptDB_V1].dbo.TranscriptRequests tr
  ), mapped AS (
    SELECT
      s.*,
      CASE
        WHEN s.status_int IN (0,1) THEN N'Draft'
        WHEN s.status_int = 2 THEN N'Submitted'
        WHEN s.status_int = 3 THEN N'GradeEntry'
        WHEN s.status_int = 4 THEN N'ForwardedToHoD'
        WHEN s.status_int = 5 THEN N'ForwardedToDean'
        WHEN s.status_int = 6 THEN N'Approved'
        WHEN s.status_int = 7 THEN N'Locked'
        WHEN s.status_int = 8 THEN N'Rejected'
        WHEN s.status_int = 9 THEN N'ReturnedToClerk'
        WHEN s.status_int = 10 THEN N'ReturnedToHoD'
        ELSE N'Draft'
      END AS status_code,
      CASE
        WHEN s.stage_int BETWEEN 1 AND 5 THEN CAST(s.stage_int AS smallint)
        ELSE CAST(2 AS smallint)
      END AS current_stage_role_id
    FROM src s
  ), todo AS (
    SELECT m.*
    FROM mapped m
    WHERE NOT EXISTS (SELECT 1 FROM dbo.map_requests mr WHERE mr.legacy_request_guid = m.legacy_request_guid)
  )
  INSERT INTO dbo.transcript_requests (
    request_no,
    student_id,
    status_id,
    current_stage_role_id,
    created_at,
    submitted_at,
    locked_at,
    last_updated_at
  )
  OUTPUT todo.legacy_request_guid, inserted.transcript_request_id, inserted.request_no
  INTO dbo.map_requests(legacy_request_guid, transcript_request_id, request_no)
  SELECT
    CONCAT(N'REQ-', REPLACE(CONVERT(nvarchar(36), todo.legacy_request_guid), N'-', N'')),
    ms.student_id,
    ts.status_id,
    todo.current_stage_role_id,
    ISNULL(todo.created_at, @now),
    CASE WHEN todo.status_code <> N'Draft' THEN ISNULL(todo.created_at, @now) ELSE NULL END,
    CASE WHEN todo.status_code = N'Locked' THEN ISNULL(todo.created_at, @now) ELSE NULL END,
    ISNULL(todo.created_at, @now)
  FROM todo
  JOIN dbo.map_students ms ON ms.legacy_user_guid = todo.legacy_student_user_guid
  JOIN dbo.transcript_statuses ts ON ts.status_code = todo.status_code;

  IF OBJECT_ID(N'dbo.migration_request_map', N'U') IS NOT NULL
  BEGIN
    MERGE dbo.migration_request_map AS t
    USING dbo.map_requests AS s
      ON t.old_request_guid = s.legacy_request_guid
    WHEN NOT MATCHED THEN
      INSERT (old_request_guid, new_request_id, request_no) VALUES (s.legacy_request_guid, s.transcript_request_id, s.request_no);
  END

  -- Approvals
  ;WITH a AS (
    SELECT
      ap.TranscriptRequestId AS legacy_request_guid,
      CASE WHEN ap.Role BETWEEN 1 AND 5 THEN CAST(ap.Role AS smallint) ELSE CAST(2 AS smallint) END AS role_id,
      ap.ApprovedBy AS legacy_actor_guid,
      ap.Remarks AS remarks,
      ap.Action AS action_int,
      ap.ActionAt AS acted_at
    FROM [TranscriptDB_V1].dbo.TranscriptApprovals ap
  ), action_mapped AS (
    SELECT
      a.*,
      CASE
        WHEN a.action_int = 1 THEN N'Forward'
        WHEN a.action_int = 2 THEN N'Approve'
        WHEN a.action_int = 3 THEN N'Reject'
        ELSE N'Forward'
      END AS action_code
    FROM a
  )
  INSERT INTO dbo.transcript_approvals (
    transcript_request_id,
    role_id,
    acted_by_user_id,
    action_code,
    remarks,
    acted_at
  )
  SELECT
    mr.transcript_request_id,
    am.role_id,
    COALESCE(mu.user_id, @fallbackUserId),
    am.action_code,
    am.remarks,
    ISNULL(am.acted_at, @now)
  FROM action_mapped am
  JOIN dbo.map_requests mr ON mr.legacy_request_guid = am.legacy_request_guid
  LEFT JOIN dbo.map_users mu ON mu.legacy_user_guid = am.legacy_actor_guid
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.transcript_approvals ta
    WHERE ta.transcript_request_id = mr.transcript_request_id
      AND ta.role_id = am.role_id
      AND ta.action_code = am.action_code
      AND ta.acted_at = ISNULL(am.acted_at, @now)
  );

  COMMIT;
  PRINT 'Transcript requests + approvals migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
