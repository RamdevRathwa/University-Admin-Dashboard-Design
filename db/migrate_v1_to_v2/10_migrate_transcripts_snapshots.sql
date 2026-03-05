/*
  10_migrate_transcripts_snapshots.sql
  Migrates V1 Transcripts + snapshots into V2:
  - transcripts
  - transcript_files (PDF path)
  - transcript_semester_snapshots
  - transcript_subject_snapshots
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_transcripts', N'U') IS NULL OR OBJECT_ID(N'dbo.map_requests', N'U') IS NULL OR OBJECT_ID(N'dbo.map_students', N'U') IS NULL
    THROW 50000, 'Mapping tables missing. Run 01/04/07 first.', 1;

  IF OBJECT_ID(N'dbo.map_transcript_semester_snapshots', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.map_transcript_semester_snapshots (
      legacy_semester_snapshot_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_tss PRIMARY KEY,
      transcript_semester_snapshot_id BIGINT NOT NULL CONSTRAINT UQ_map_tss_new UNIQUE
    );
  END

  DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
  DECLARE @fallbackUserId bigint = (
    SELECT TOP (1) ur.user_id
    FROM dbo.user_roles ur
    WHERE ur.role_id IN (4,5,2)
    ORDER BY CASE WHEN ur.role_id = 4 THEN 0 WHEN ur.role_id = 5 THEN 1 ELSE 2 END, ur.user_id
  );

  -----------------------------------------------------------------------------
  -- Insert transcripts
  -----------------------------------------------------------------------------
  ;WITH src AS (
    SELECT
      t.Id AS legacy_transcript_guid,
      t.TranscriptRequestId AS legacy_request_guid,
      t.StudentId AS legacy_student_user_guid,
      t.ApprovedAt AS approved_at,
      CAST(ISNULL(t.Locked, 0) AS bit) AS locked,
      NULLIF(LTRIM(RTRIM(t.PdfPath)), N'') AS pdf_path,
      t.VerificationSalt AS salt_str,
      t.VerificationHash AS hash_str,
      CAST(ISNULL(t.CGPA, 0) AS decimal(6,2)) AS cgpa
    FROM [TranscriptDB_V1].dbo.Transcripts t
  ), todo AS (
    SELECT s.*
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.map_transcripts mt WHERE mt.legacy_transcript_guid = s.legacy_transcript_guid)
  ), dean_approver AS (
    SELECT
      ap.TranscriptRequestId AS legacy_request_guid,
      ap.ApprovedBy AS legacy_dean_guid,
      ap.ActionAt AS dean_action_at,
      ROW_NUMBER() OVER (PARTITION BY ap.TranscriptRequestId ORDER BY ap.ActionAt DESC) AS rn
    FROM [TranscriptDB_V1].dbo.TranscriptApprovals ap
    WHERE ap.Role = 4 AND ap.Action = 2
  )
  INSERT INTO dbo.transcripts (
    transcript_request_id,
    student_id,
    curriculum_version_id,
    approved_by_user_id,
    approved_at,
    locked_at,
    is_locked,
    verification_salt,
    verification_hash,
    cgpa,
    percentage,
    credits_earned,
    created_at
  )
  OUTPUT todo.legacy_transcript_guid, inserted.transcript_id
  INTO dbo.map_transcripts(legacy_transcript_guid, transcript_id)
  SELECT
    mr.transcript_request_id,
    ms.student_id,
    COALESCE(
      (SELECT TOP (1) cv.curriculum_version_id
       FROM dbo.students st
       JOIN dbo.curriculum_versions cv ON cv.program_id = st.program_id
       WHERE st.student_id = ms.student_id
       ORDER BY cv.is_published DESC, cv.version_no DESC, cv.curriculum_version_id DESC),
      (SELECT TOP (1) curriculum_version_id FROM dbo.curriculum_versions ORDER BY curriculum_version_id)
    ) AS curriculum_version_id,
    COALESCE(mu_dean.user_id, @fallbackUserId) AS approved_by_user_id,
    ISNULL(todo.approved_at, @now),
    CASE WHEN todo.locked = 1 THEN ISNULL(todo.approved_at, @now) ELSE NULL END,
    todo.locked,
    -- verification_salt (varbinary not null)
    COALESCE(
      CASE
        WHEN todo.salt_str IS NULL OR LTRIM(RTRIM(todo.salt_str)) = N'' THEN HASHBYTES('SHA2_256', CONVERT(varbinary(max), N''))
        WHEN todo.salt_str LIKE N'0x%' THEN TRY_CONVERT(varbinary(64), todo.salt_str, 1)
        WHEN todo.salt_str NOT LIKE N'%[^0-9A-Fa-f]%' AND (LEN(todo.salt_str) % 2) = 0 THEN TRY_CONVERT(varbinary(64), todo.salt_str, 2)
        ELSE HASHBYTES('SHA2_256', CONVERT(varbinary(max), todo.salt_str))
      END,
      HASHBYTES('SHA2_256', CONVERT(varbinary(max), N''))
    ),
    -- verification_hash (varbinary not null)
    COALESCE(
      CASE
        WHEN todo.hash_str IS NULL OR LTRIM(RTRIM(todo.hash_str)) = N'' THEN HASHBYTES('SHA2_256', CONVERT(varbinary(max), N''))
        WHEN todo.hash_str LIKE N'0x%' THEN TRY_CONVERT(varbinary(64), todo.hash_str, 1)
        WHEN todo.hash_str NOT LIKE N'%[^0-9A-Fa-f]%' AND (LEN(todo.hash_str) % 2) = 0 THEN TRY_CONVERT(varbinary(64), todo.hash_str, 2)
        ELSE HASHBYTES('SHA2_256', CONVERT(varbinary(max), todo.hash_str))
      END,
      HASHBYTES('SHA2_256', CONVERT(varbinary(max), N''))
    ),
    todo.cgpa,
    CAST(0 AS decimal(6,2)),
    CAST(0 AS decimal(8,2)),
    ISNULL(todo.approved_at, @now)
  FROM todo
  JOIN dbo.map_requests mr ON mr.legacy_request_guid = todo.legacy_request_guid
  JOIN dbo.map_students ms ON ms.legacy_user_guid = todo.legacy_student_user_guid
  LEFT JOIN dean_approver da ON da.legacy_request_guid = todo.legacy_request_guid AND da.rn = 1
  LEFT JOIN dbo.map_users mu_dean ON mu_dean.legacy_user_guid = da.legacy_dean_guid;

  -----------------------------------------------------------------------------
  -- transcript_files (PDF)
  -----------------------------------------------------------------------------
  INSERT INTO dbo.transcript_files (
    transcript_id,
    file_type,
    storage_path,
    file_sha256,
    generated_by,
    generated_at,
    is_active
  )
  SELECT
    mt.transcript_id,
    N'PDF',
    v1.PdfPath,
    NULL,
    tr.approved_by_user_id,
    tr.approved_at,
    1
  FROM [TranscriptDB_V1].dbo.Transcripts v1
  JOIN dbo.map_transcripts mt ON mt.legacy_transcript_guid = v1.Id
  JOIN dbo.transcripts tr ON tr.transcript_id = mt.transcript_id
  WHERE v1.PdfPath IS NOT NULL AND LTRIM(RTRIM(v1.PdfPath)) <> N''
    AND NOT EXISTS (
      SELECT 1 FROM dbo.transcript_files tf
      WHERE tf.transcript_id = mt.transcript_id AND tf.file_type = N'PDF' AND tf.is_active = 1
    );

  -----------------------------------------------------------------------------
  -- Semester snapshots
  -----------------------------------------------------------------------------
  ;WITH src AS (
    SELECT
      ss.Id AS legacy_semester_snapshot_guid,
      ss.TranscriptId AS legacy_transcript_guid,
      TRY_CONVERT(tinyint, ss.SemesterNumber) AS semester_number,
      ss.YearTitle AS year_title,
      ss.TermTitle AS term_title,
      ss.CreditPointScheme AS credit_point_scheme,
      ss.ThHoursTotal AS th_hours_total,
      ss.PrHoursTotal AS pr_hours_total,
      ss.ThCreditsTotal AS th_credits_total,
      ss.PrCreditsTotal AS pr_credits_total,
      ss.ThGradePointsSum AS th_gp_sum,
      ss.PrGradePointsSum AS pr_gp_sum,
      ss.ThEarnedTotal AS th_earned,
      ss.PrEarnedTotal AS pr_earned,
      ss.ThOutOfTotal AS th_out_of,
      ss.PrOutOfTotal AS pr_out_of,
      ss.SGPA AS sgpa,
      ss.SemesterGrade AS semester_grade,
      ss.Result AS result_status,
      ss.Percentage AS percentage,
      ss.EGP AS egp
    FROM [TranscriptDB_V1].dbo.TranscriptSemesterSnapshots ss
  ), todo AS (
    SELECT s.*
    FROM src s
    WHERE NOT EXISTS (
      SELECT 1 FROM dbo.map_transcript_semester_snapshots m
      WHERE m.legacy_semester_snapshot_guid = s.legacy_semester_snapshot_guid
    )
  )
  INSERT INTO dbo.transcript_semester_snapshots (
    transcript_id,
    semester_number,
    year_title,
    term_title,
    credit_point_scheme,
    th_hours_total,
    pr_hours_total,
    th_credits_total,
    pr_credits_total,
    th_grade_points_sum,
    pr_grade_points_sum,
    th_earned_total,
    pr_earned_total,
    th_out_of_total,
    pr_out_of_total,
    sgpa,
    semester_grade,
    result_status,
    percentage,
    egp
  )
  OUTPUT todo.legacy_semester_snapshot_guid, inserted.transcript_semester_snapshot_id
  INTO dbo.map_transcript_semester_snapshots(legacy_semester_snapshot_guid, transcript_semester_snapshot_id)
  SELECT
    mt.transcript_id,
    todo.semester_number,
    ISNULL(todo.year_title, N''),
    ISNULL(todo.term_title, N''),
    ISNULL(todo.credit_point_scheme, 10),
    ISNULL(todo.th_hours_total, 0),
    ISNULL(todo.pr_hours_total, 0),
    ISNULL(todo.th_credits_total, 0),
    ISNULL(todo.pr_credits_total, 0),
    ISNULL(todo.th_gp_sum, 0),
    ISNULL(todo.pr_gp_sum, 0),
    ISNULL(todo.th_earned, 0),
    ISNULL(todo.pr_earned, 0),
    ISNULL(todo.th_out_of, 0),
    ISNULL(todo.pr_out_of, 0),
    ISNULL(todo.sgpa, 0),
    ISNULL(todo.semester_grade, N''),
    ISNULL(todo.result_status, N''),
    ISNULL(todo.percentage, 0),
    ISNULL(todo.egp, 0)
  FROM todo
  JOIN dbo.map_transcripts mt ON mt.legacy_transcript_guid = todo.legacy_transcript_guid
  WHERE todo.semester_number BETWEEN 1 AND 12;

  -----------------------------------------------------------------------------
  -- Subject snapshots
  -----------------------------------------------------------------------------
  INSERT INTO dbo.transcript_subject_snapshots (
    transcript_semester_snapshot_id,
    sn,
    subject_code,
    subject_name,
    th_hours,
    pr_hours,
    th_credits,
    pr_credits,
    th_grade_letter,
    pr_grade_letter,
    th_grade_point,
    pr_grade_point,
    th_earned,
    pr_earned
  )
  SELECT
    mss.transcript_semester_snapshot_id,
    s.SN,
    ISNULL(NULLIF(LTRIM(RTRIM(s.SubjectCode)), N''), N''),
    ISNULL(NULLIF(LTRIM(RTRIM(s.SubjectName)), N''), N''),
    ISNULL(s.ThHours, 0),
    ISNULL(s.PrHours, 0),
    ISNULL(s.ThCredits, 0),
    ISNULL(s.PrCredits, 0),
    ISNULL(s.ThGrade, N''),
    ISNULL(s.PrGrade, N''),
    ISNULL(s.ThGradePoint, 0),
    ISNULL(s.PrGradePoint, 0),
    ISNULL(s.ThEarned, 0),
    ISNULL(s.PrEarned, 0)
  FROM [TranscriptDB_V1].dbo.TranscriptSubjectSnapshots s
  JOIN dbo.map_transcript_semester_snapshots mss ON mss.legacy_semester_snapshot_guid = s.TranscriptSemesterSnapshotId
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.transcript_subject_snapshots x
    WHERE x.transcript_semester_snapshot_id = mss.transcript_semester_snapshot_id
      AND x.sn = s.SN
      AND x.subject_code = ISNULL(NULLIF(LTRIM(RTRIM(s.SubjectCode)), N''), N'')
  );

  COMMIT;
  PRINT 'Transcripts + snapshots migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
