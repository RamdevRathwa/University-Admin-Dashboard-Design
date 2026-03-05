/*
  06_migrate_curriculum_versioning.sql
  Migrates V1 CurriculumSubjects into V2:
  - subjects
  - subject_versions (single version: Imported V1)
  - curriculum_versions (per program)
  - curriculum_subjects
  Also fills map_curriculum_subjects.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_curriculum_subjects', N'U') IS NULL
    THROW 50000, 'map_curriculum_subjects not found. Run 01_create_mapping_tables.sql first.', 1;

  DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
  DECLARE @adminUserId bigint = (
    SELECT TOP (1) ur.user_id
    FROM dbo.user_roles ur
    WHERE ur.role_id = 5
    ORDER BY ur.user_id
  );

  -----------------------------------------------------------------------------
  -- Ensure a curriculum_version exists for each program referenced in V1
  -----------------------------------------------------------------------------
  ;WITH v1p AS (
    SELECT DISTINCT UPPER(LTRIM(RTRIM(cs.Program))) AS program_code
    FROM [TranscriptDB_V1].dbo.CurriculumSubjects cs
    WHERE cs.Program IS NOT NULL AND LTRIM(RTRIM(cs.Program)) <> N''
  ), prog AS (
    SELECT p.program_id, p.program_code
    FROM dbo.programs p
    JOIN v1p ON v1p.program_code = p.program_code
  ), pick_year AS (
    SELECT
      pr.program_id,
      COALESCE(
        (SELECT MIN(s.admission_year_id) FROM dbo.students s WHERE s.program_id = pr.program_id AND s.admission_year_id IS NOT NULL),
        (SELECT TOP (1) academic_year_id FROM dbo.academic_years WHERE is_current = 1 ORDER BY academic_year_id),
        (SELECT MIN(academic_year_id) FROM dbo.academic_years)
      ) AS academic_year_id
    FROM prog pr
  )
  MERGE dbo.curriculum_versions AS t
  USING (
    SELECT
      py.program_id,
      py.academic_year_id,
      1 AS version_no,
      N'Imported V1' AS version_label,
      CAST(1 AS bit) AS is_published,
      @now AS published_at,
      @adminUserId AS created_by,
      @now AS created_at
    FROM pick_year py
    WHERE py.academic_year_id IS NOT NULL
  ) AS s
    ON t.program_id = s.program_id AND t.version_no = s.version_no AND t.version_label = s.version_label
  WHEN NOT MATCHED THEN
    INSERT (program_id, academic_year_id, version_no, version_label, is_published, published_at, created_by, created_at)
    VALUES (s.program_id, s.academic_year_id, s.version_no, s.version_label, s.is_published, s.published_at, s.created_by, s.created_at);

  -----------------------------------------------------------------------------
  -- Subjects master
  -----------------------------------------------------------------------------
  ;WITH src AS (
    SELECT DISTINCT
      CASE
        WHEN cs.SubjectCode IS NOT NULL AND LTRIM(RTRIM(cs.SubjectCode)) <> N'' THEN UPPER(LTRIM(RTRIM(cs.SubjectCode)))
        ELSE CONCAT(N'SUBJ-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', UPPER(LTRIM(RTRIM(cs.SubjectName)))), 2), 1, 8))
      END AS subject_code,
      LTRIM(RTRIM(cs.SubjectName)) AS subject_name
    FROM [TranscriptDB_V1].dbo.CurriculumSubjects cs
    WHERE cs.SubjectName IS NOT NULL AND LTRIM(RTRIM(cs.SubjectName)) <> N''
  )
  MERGE dbo.subjects AS t
  USING src AS s
    ON t.subject_code = s.subject_code
  WHEN MATCHED AND t.subject_name <> s.subject_name THEN
    UPDATE SET subject_name = s.subject_name
  WHEN NOT MATCHED THEN
    INSERT (subject_code, subject_name, is_active, created_at)
    VALUES (s.subject_code, s.subject_name, 1, @now);

  -----------------------------------------------------------------------------
  -- Subject versions (one per subject_id)
  -----------------------------------------------------------------------------
  ;WITH v1agg AS (
    SELECT
      CASE
        WHEN cs.SubjectCode IS NOT NULL AND LTRIM(RTRIM(cs.SubjectCode)) <> N'' THEN UPPER(LTRIM(RTRIM(cs.SubjectCode)))
        ELSE CONCAT(N'SUBJ-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', UPPER(LTRIM(RTRIM(cs.SubjectName)))), 2), 1, 8))
      END AS subject_code,
      MAX(CASE WHEN ISNULL(cs.ThCredits,0) > 0 OR ISNULL(cs.ThHours,0) > 0 THEN 1 ELSE 0 END) AS has_theory,
      MAX(CASE WHEN ISNULL(cs.PrCredits,0) > 0 OR ISNULL(cs.PrHours,0) > 0 THEN 1 ELSE 0 END) AS has_practical
    FROM [TranscriptDB_V1].dbo.CurriculumSubjects cs
    GROUP BY
      CASE
        WHEN cs.SubjectCode IS NOT NULL AND LTRIM(RTRIM(cs.SubjectCode)) <> N'' THEN UPPER(LTRIM(RTRIM(cs.SubjectCode)))
        ELSE CONCAT(N'SUBJ-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', UPPER(LTRIM(RTRIM(cs.SubjectName)))), 2), 1, 8))
      END
  )
  INSERT INTO dbo.subject_versions (
    subject_id,
    version_label,
    effective_from,
    effective_to,
    title_on_transcript,
    has_theory,
    has_practical,
    theory_max_marks,
    practical_max_marks,
    total_max_marks,
    created_at
  )
  SELECT
    s.subject_id,
    N'Imported V1',
    (SELECT MIN(start_date) FROM dbo.academic_years),
    NULL,
    s.subject_name,
    CAST(ISNULL(a.has_theory,1) AS bit),
    CAST(ISNULL(a.has_practical,1) AS bit),
    NULL,
    NULL,
    NULL,
    @now
  FROM dbo.subjects s
  LEFT JOIN v1agg a ON a.subject_code = s.subject_code
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.subject_versions sv
    WHERE sv.subject_id = s.subject_id AND sv.version_label = N'Imported V1'
  );

  -----------------------------------------------------------------------------
  -- Curriculum subjects + mapping
  -----------------------------------------------------------------------------
  ;WITH v1 AS (
    SELECT
      cs.Id AS legacy_curriculum_subject_guid,
      UPPER(LTRIM(RTRIM(cs.Program))) AS program_code,
      TRY_CONVERT(tinyint, cs.SemesterNumber) AS semester_number,
      CASE
        WHEN cs.SubjectCode IS NOT NULL AND LTRIM(RTRIM(cs.SubjectCode)) <> N'' THEN UPPER(LTRIM(RTRIM(cs.SubjectCode)))
        ELSE CONCAT(N'SUBJ-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', UPPER(LTRIM(RTRIM(cs.SubjectName)))), 2), 1, 8))
      END AS subject_code,
      LTRIM(RTRIM(cs.SubjectName)) AS subject_name,
      CAST(ISNULL(cs.ThHours, 0) AS decimal(8,2)) AS th_hours,
      CAST(ISNULL(cs.PrHours, 0) AS decimal(8,2)) AS pr_hours,
      CAST(ISNULL(cs.ThCredits, 0) AS decimal(8,2)) AS th_credits,
      CAST(ISNULL(cs.PrCredits, 0) AS decimal(8,2)) AS pr_credits,
      CAST(ISNULL(cs.IsActive, 1) AS bit) AS is_active
    FROM [TranscriptDB_V1].dbo.CurriculumSubjects cs
  ), joined AS (
    SELECT
      v1.legacy_curriculum_subject_guid,
      p.program_id,
      cv.curriculum_version_id,
      v1.semester_number,
      sv.subject_version_id,
      v1.th_hours,
      v1.pr_hours,
      v1.th_credits,
      v1.pr_credits,
      v1.is_active,
      ROW_NUMBER() OVER (
        PARTITION BY p.program_id, v1.semester_number
        ORDER BY v1.subject_code, v1.subject_name
      ) AS display_order
    FROM v1
    JOIN dbo.programs p ON p.program_code = v1.program_code
    JOIN dbo.curriculum_versions cv
      ON cv.program_id = p.program_id AND cv.version_no = 1 AND cv.version_label = N'Imported V1'
    JOIN dbo.subjects s ON s.subject_code = v1.subject_code
    JOIN dbo.subject_versions sv ON sv.subject_id = s.subject_id AND sv.version_label = N'Imported V1'
    WHERE v1.semester_number BETWEEN 1 AND 12
      AND NOT EXISTS (SELECT 1 FROM dbo.map_curriculum_subjects m WHERE m.legacy_curriculum_subject_guid = v1.legacy_curriculum_subject_guid)
  )
  INSERT INTO dbo.curriculum_subjects (
    curriculum_version_id,
    subject_version_id,
    semester_number,
    display_order,
    th_hours_per_week,
    pr_hours_per_week,
    th_credits,
    pr_credits,
    is_elective,
    is_active
  )
  OUTPUT joined.legacy_curriculum_subject_guid, inserted.curriculum_subject_id
  INTO dbo.map_curriculum_subjects(legacy_curriculum_subject_guid, curriculum_subject_id)
  SELECT
    joined.curriculum_version_id,
    joined.subject_version_id,
    joined.semester_number,
    joined.display_order,
    joined.th_hours,
    joined.pr_hours,
    joined.th_credits,
    joined.pr_credits,
    0,
    joined.is_active
  FROM joined;

  COMMIT;
  PRINT 'Curriculum + subjects migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
