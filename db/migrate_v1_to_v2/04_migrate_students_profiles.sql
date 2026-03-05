/*
  04_migrate_students_profiles.sql
  - Seeds required academic_years (from V1 admission/graduation year ints)
  - Migrates V1 StudentProfiles into V2 students + student_profiles
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_users', N'U') IS NULL OR OBJECT_ID(N'dbo.map_students', N'U') IS NULL
    THROW 50000, 'Mapping tables missing. Run 01_create_mapping_tables.sql first.', 1;

  -----------------------------------------------------------------------------
  -- Seed academic_years (YYYY-YY, Jul 1 -> Jun 30)
  -----------------------------------------------------------------------------
  ;WITH yrs AS (
    SELECT DISTINCT TRY_CONVERT(int, sp.AdmissionYear) AS y
    FROM [TranscriptDB_V1].dbo.StudentProfiles sp
    WHERE TRY_CONVERT(int, sp.AdmissionYear) IS NOT NULL
    UNION
    SELECT DISTINCT TRY_CONVERT(int, sp.GraduationYear) AS y
    FROM [TranscriptDB_V1].dbo.StudentProfiles sp
    WHERE TRY_CONVERT(int, sp.GraduationYear) IS NOT NULL
  ), norm AS (
    SELECT y,
      CONCAT(CAST(y AS nvarchar(4)), N'-', RIGHT(CAST((y+1) % 100 AS nvarchar(2)), 2)) AS year_code,
      DATEFROMPARTS(y, 7, 1) AS start_date,
      DATEFROMPARTS(y+1, 6, 30) AS end_date
    FROM yrs
    WHERE y BETWEEN 1990 AND 2100
  )
  MERGE dbo.academic_years AS t
  USING norm AS s
    ON t.year_code = s.year_code
  WHEN NOT MATCHED THEN
    INSERT (year_code, start_date, end_date, is_current, created_at)
    VALUES (s.year_code, s.start_date, s.end_date, 0, SYSDATETIMEOFFSET());

  -----------------------------------------------------------------------------
  -- Insert students
  -----------------------------------------------------------------------------
  ;WITH src AS (
    SELECT
      sp.UserId AS legacy_user_guid,
      NULLIF(LTRIM(RTRIM(sp.PRN)), N'') AS prn,
      TRY_CONVERT(int, sp.AdmissionYear) AS admission_year,
      TRY_CONVERT(int, sp.GraduationYear) AS graduation_year
    FROM [TranscriptDB_V1].dbo.StudentProfiles sp
  ), todo AS (
    SELECT s.*
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.map_students ms WHERE ms.legacy_user_guid = s.legacy_user_guid)
  )
  INSERT INTO dbo.students (
    user_id,
    program_id,
    prn,
    admission_year_id,
    graduation_year_id,
    is_active,
    created_at
  )
  OUTPUT todo.legacy_user_guid, inserted.student_id
  INTO dbo.map_students(legacy_user_guid, student_id)
  SELECT
    mu.user_id,
    NULL,
    todo.prn,
    ay_in.academic_year_id,
    ay_out.academic_year_id,
    1,
    SYSDATETIMEOFFSET()
  FROM todo
  JOIN dbo.map_users mu ON mu.legacy_user_guid = todo.legacy_user_guid
  LEFT JOIN dbo.academic_years ay_in
    ON ay_in.year_code = CONCAT(CAST(todo.admission_year AS nvarchar(4)), N'-', RIGHT(CAST((todo.admission_year+1) % 100 AS nvarchar(2)), 2))
  LEFT JOIN dbo.academic_years ay_out
    ON ay_out.year_code = CONCAT(CAST(todo.graduation_year AS nvarchar(4)), N'-', RIGHT(CAST((todo.graduation_year+1) % 100 AS nvarchar(2)), 2));

  IF OBJECT_ID(N'dbo.migration_student_map', N'U') IS NOT NULL
  BEGIN
    MERGE dbo.migration_student_map AS t
    USING dbo.map_students AS s
      ON t.old_user_guid = s.legacy_user_guid
    WHEN NOT MATCHED THEN
      INSERT (old_user_guid, new_student_id) VALUES (s.legacy_user_guid, s.student_id);
  END

  -----------------------------------------------------------------------------
  -- Insert student_profiles (normalized)
  -----------------------------------------------------------------------------
  INSERT INTO dbo.student_profiles (
    student_id,
    nationality,
    date_of_birth,
    birth_place,
    permanent_address,
    created_at,
    updated_at
  )
  SELECT
    ms.student_id,
    NULLIF(LTRIM(RTRIM(sp.Nationality)), N''),
    sp.DOB,
    NULLIF(LTRIM(RTRIM(sp.BirthPlace)), N''),
    NULLIF(LTRIM(RTRIM(sp.Address)), N''),
    SYSDATETIMEOFFSET(),
    SYSDATETIMEOFFSET()
  FROM [TranscriptDB_V1].dbo.StudentProfiles sp
  JOIN dbo.map_students ms ON ms.legacy_user_guid = sp.UserId
  WHERE NOT EXISTS (SELECT 1 FROM dbo.student_profiles p WHERE p.student_id = ms.student_id);

  COMMIT;
  PRINT 'Students + profiles migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
