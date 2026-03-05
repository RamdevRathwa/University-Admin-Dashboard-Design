/*
  09_migrate_grades.sql
  Migrates V1 StudentGradeEntries into V2 student_marks.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_students', N'U') IS NULL OR OBJECT_ID(N'dbo.map_users', N'U') IS NULL OR OBJECT_ID(N'dbo.map_curriculum_subjects', N'U') IS NULL
    THROW 50000, 'Mapping tables missing. Run 01_create_mapping_tables.sql and 06_migrate_curriculum_versioning.sql first.', 1;

  DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
  DECLARE @fallbackUserId bigint = (
    SELECT TOP (1) ur.user_id
    FROM dbo.user_roles ur
    WHERE ur.role_id IN (2,5)
    ORDER BY CASE WHEN ur.role_id = 2 THEN 0 ELSE 1 END, ur.user_id
  );

  ;WITH src AS (
    SELECT
      ge.Id AS legacy_grade_guid,
      ge.StudentId AS legacy_student_user_guid,
      ge.CurriculumSubjectId AS legacy_curr_sub_guid,
      NULLIF(LTRIM(RTRIM(ge.ThGrade)), N'') AS th_grade,
      NULLIF(LTRIM(RTRIM(ge.PrGrade)), N'') AS pr_grade,
      ge.UpdatedAt AS updated_at,
      ge.UpdatedBy AS legacy_updated_by_guid
    FROM [TranscriptDB_V1].dbo.StudentGradeEntries ge
  )
  INSERT INTO dbo.student_marks (
    student_id,
    curriculum_subject_id,
    attempt_no,
    th_grade_letter,
    pr_grade_letter,
    entered_by,
    entered_at,
    verified_by,
    verified_at,
    is_final
  )
  SELECT
    ms.student_id,
    mcs.curriculum_subject_id,
    1,
    s.th_grade,
    s.pr_grade,
    COALESCE(mu.user_id, @fallbackUserId),
    ISNULL(s.updated_at, @now),
    NULL,
    NULL,
    0
  FROM src s
  JOIN dbo.map_students ms ON ms.legacy_user_guid = s.legacy_student_user_guid
  JOIN dbo.map_curriculum_subjects mcs ON mcs.legacy_curriculum_subject_guid = s.legacy_curr_sub_guid
  LEFT JOIN dbo.map_users mu ON mu.legacy_user_guid = s.legacy_updated_by_guid
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.student_marks sm
    WHERE sm.student_id = ms.student_id
      AND sm.curriculum_subject_id = mcs.curriculum_subject_id
      AND sm.attempt_no = 1
  );

  COMMIT;
  PRINT 'Grades migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
