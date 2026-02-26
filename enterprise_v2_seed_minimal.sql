/*
  Seed minimal master data required to migrate V1 profiles into TranscriptDB_V2
  and keep integrity constraints satisfied.

  Run against TranscriptDB_V2.
*/

SET NOCOUNT ON;

/* Grading scheme + core rules (10-point) */
IF NOT EXISTS (SELECT 1 FROM dbo.grading_schemes WHERE scheme_code = N'MSU-10')
BEGIN
  INSERT INTO dbo.grading_schemes(scheme_code, scheme_name, max_grade_point, is_active)
  VALUES (N'MSU-10', N'MSU 10-Point Scheme', 10.00, 1);
END

DECLARE @scheme_id INT = (SELECT grading_scheme_id FROM dbo.grading_schemes WHERE scheme_code = N'MSU-10');

;WITH R AS
(
  SELECT N'O'  AS grade_letter, CAST(10.00 AS DECIMAL(5,2)) AS grade_point, CAST(85.00 AS DECIMAL(5,2)) AS minp, CAST(100.00 AS DECIMAL(5,2)) AS maxp, N'Outstanding' AS remarks
  UNION ALL SELECT N'A+', 9.00, 75.00, 84.99, N'Excellent'
  UNION ALL SELECT N'A',  8.00, 65.00, 74.99, N'Very Good'
  UNION ALL SELECT N'B+', 7.00, 55.00, 64.99, N'Good'
  UNION ALL SELECT N'B',  6.00, 50.00, 54.99, N'Above Average'
  UNION ALL SELECT N'P',  5.00, 40.00, 49.99, N'Pass'
  UNION ALL SELECT N'F',  0.00,  0.00, 39.99, N'Fail'
)
INSERT INTO dbo.grading_rules(grading_scheme_id, grade_letter, grade_point, min_percentage, max_percentage, remarks, is_active)
SELECT @scheme_id, r.grade_letter, r.grade_point, r.minp, r.maxp, r.remarks, 1
FROM R r
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.grading_rules x
  WHERE x.grading_scheme_id = @scheme_id AND x.grade_letter = r.grade_letter
);

/* Academic years from V1 Admission/Graduation years (create Jul->Jun) */
DECLARE @min_year INT = (SELECT MIN(v) FROM (SELECT AdmissionYear AS v FROM TranscriptDB_V1.dbo.StudentProfiles WHERE AdmissionYear IS NOT NULL
                                            UNION ALL SELECT GraduationYear FROM TranscriptDB_V1.dbo.StudentProfiles WHERE GraduationYear IS NOT NULL) t);
DECLARE @max_year INT = (SELECT MAX(v) FROM (SELECT AdmissionYear AS v FROM TranscriptDB_V1.dbo.StudentProfiles WHERE AdmissionYear IS NOT NULL
                                            UNION ALL SELECT GraduationYear FROM TranscriptDB_V1.dbo.StudentProfiles WHERE GraduationYear IS NOT NULL) t);

IF @min_year IS NULL SET @min_year = YEAR(GETDATE()) - 1;
IF @max_year IS NULL SET @max_year = YEAR(GETDATE());

DECLARE @y INT = @min_year;
WHILE @y <= @max_year
BEGIN
  DECLARE @code NVARCHAR(20) = CONCAT(@y, N'-', RIGHT(CONVERT(NVARCHAR(4), @y + 1), 2));
  IF NOT EXISTS (SELECT 1 FROM dbo.academic_years WHERE year_code = @code)
  BEGIN
    INSERT INTO dbo.academic_years(year_code, start_date, end_date, is_current)
    VALUES (@code, DATEFROMPARTS(@y, 7, 1), DATEFROMPARTS(@y + 1, 6, 30), 0);
  END
  SET @y = @y + 1;
END

/* Faculty/Department/Programs from V1 string data (minimal) */
IF NOT EXISTS (SELECT 1 FROM dbo.faculties WHERE faculty_code = N'FTE')
BEGIN
  INSERT INTO dbo.faculties(faculty_code, faculty_name, dean_user_id, is_active)
  VALUES (N'FTE', N'Faculty of Technology and Engineering', NULL, 1);
END

DECLARE @fte_id INT = (SELECT faculty_id FROM dbo.faculties WHERE faculty_code = N'FTE');

IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE dept_code = N'CSE')
BEGIN
  INSERT INTO dbo.departments(faculty_id, dept_code, dept_name, hod_user_id, is_active)
  VALUES (@fte_id, N'CSE', N'Computer Science and Engineering', NULL, 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE dept_code = N'ME')
BEGIN
  INSERT INTO dbo.departments(faculty_id, dept_code, dept_name, hod_user_id, is_active)
  VALUES (@fte_id, N'ME', N'Mechanical Engineering', NULL, 1);
END

DECLARE @cse_id INT = (SELECT department_id FROM dbo.departments WHERE dept_code = N'CSE');
DECLARE @me_id  INT = (SELECT department_id FROM dbo.departments WHERE dept_code = N'ME');

IF NOT EXISTS (SELECT 1 FROM dbo.programs WHERE program_code = N'BE-CSE')
BEGIN
  INSERT INTO dbo.programs(department_id, program_code, program_name, degree_name, duration_years, grading_scheme_id, is_active)
  VALUES (@cse_id, N'BE-CSE', N'BE-CSE', N'B.E.', 4, @scheme_id, 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.programs WHERE program_code = N'BE-ME')
BEGIN
  INSERT INTO dbo.programs(department_id, program_code, program_name, degree_name, duration_years, grading_scheme_id, is_active)
  VALUES (@me_id, N'BE-ME', N'BE-ME', N'B.E.', 4, @scheme_id, 1);
END

PRINT 'V2 minimal seed done.';

