/*
  05_migrate_institution.sql
  Creates placeholder faculties/departments/programs from V1 StudentProfiles text fields.
  Then updates V2 students.program_id based on V1 Program.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  DECLARE @gradingSchemeId int = (SELECT TOP (1) grading_scheme_id FROM dbo.grading_schemes ORDER BY grading_scheme_id);
  IF @gradingSchemeId IS NULL
    THROW 50000, 'No grading_schemes found in V2. Seed grading scheme first.', 1;

  ;WITH raw AS (
    SELECT DISTINCT
      NULLIF(LTRIM(RTRIM(sp.Faculty)), N'') AS faculty_name,
      NULLIF(LTRIM(RTRIM(sp.Department)), N'') AS dept_name,
      NULLIF(LTRIM(RTRIM(sp.Program)), N'') AS program_text
    FROM [TranscriptDB_V1].dbo.StudentProfiles sp
  ), norm AS (
    SELECT
      ISNULL(faculty_name, N'Unknown Faculty') AS faculty_name,
      ISNULL(dept_name, N'Unknown Department') AS dept_name,
      ISNULL(program_text, N'UNKNOWN') AS program_text,
      CONCAT(N'FAC-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', ISNULL(faculty_name, N'Unknown Faculty')), 2), 1, 8)) AS faculty_code,
      CONCAT(N'DEP-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', ISNULL(dept_name, N'Unknown Department')), 2), 1, 8)) AS dept_code,
      CASE
        WHEN program_text IS NULL OR LTRIM(RTRIM(program_text)) = N'' THEN CONCAT(N'PRG-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', N'UNKNOWN'), 2), 1, 8))
        WHEN UPPER(LTRIM(RTRIM(program_text))) LIKE N'BE-%' THEN UPPER(LTRIM(RTRIM(program_text)))
        WHEN UPPER(LTRIM(RTRIM(program_text))) LIKE N'ME-%' THEN UPPER(LTRIM(RTRIM(program_text)))
        ELSE CONCAT(N'PRG-', SUBSTRING(CONVERT(varchar(40), HASHBYTES('SHA1', UPPER(LTRIM(RTRIM(program_text)))), 2), 1, 8))
      END AS program_code,
      UPPER(LTRIM(RTRIM(program_text))) AS program_name
    FROM raw
  )
  -- Faculties
  MERGE dbo.faculties AS t
  USING (SELECT DISTINCT faculty_code, faculty_name FROM norm) AS s
    ON t.faculty_code = s.faculty_code
  WHEN NOT MATCHED THEN
    INSERT (faculty_code, faculty_name, dean_user_id, is_active, created_at)
    VALUES (s.faculty_code, s.faculty_name, NULL, 1, SYSDATETIMEOFFSET());

  -- Departments
  MERGE dbo.departments AS t
  USING (
    SELECT DISTINCT n.dept_code, n.dept_name, f.faculty_id
    FROM norm n
    JOIN dbo.faculties f ON f.faculty_code = n.faculty_code
  ) AS s
    ON t.dept_code = s.dept_code
  WHEN NOT MATCHED THEN
    INSERT (faculty_id, dept_code, dept_name, hod_user_id, is_active, created_at)
    VALUES (s.faculty_id, s.dept_code, s.dept_name, NULL, 1, SYSDATETIMEOFFSET());

  -- Programs
  MERGE dbo.programs AS t
  USING (
    SELECT DISTINCT n.program_code, n.program_name, d.department_id
    FROM norm n
    JOIN dbo.departments d ON d.dept_code = n.dept_code
  ) AS s
    ON t.program_code = s.program_code
  WHEN NOT MATCHED THEN
    INSERT (department_id, program_code, program_name, degree_name, duration_years, grading_scheme_id, is_active, created_at)
    VALUES (s.department_id, s.program_code, s.program_name, s.program_name, 4, @gradingSchemeId, 1, SYSDATETIMEOFFSET());

  -- Update students.program_id by matching V1 Program text to V2 program_code
  UPDATE st
  SET st.program_id = p.program_id
  FROM dbo.students st
  JOIN dbo.map_students ms ON ms.student_id = st.student_id
  JOIN [TranscriptDB_V1].dbo.StudentProfiles sp ON sp.UserId = ms.legacy_user_guid
  JOIN dbo.programs p ON p.program_code = UPPER(LTRIM(RTRIM(sp.Program)))
  WHERE st.program_id IS NULL
    AND sp.Program IS NOT NULL AND LTRIM(RTRIM(sp.Program)) <> N'';

  COMMIT;
  PRINT 'Institution placeholders migrated and students.program_id updated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
