SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @ProgramId INT;
DECLARE @AcademicYearId INT;
DECLARE @CurriculumVersionId INT;

SELECT @ProgramId = program_id
FROM dbo.programs
WHERE program_code = N'BE-CSE';

IF @ProgramId IS NULL
BEGIN
  RAISERROR('BE-CSE program not found in dbo.programs.', 16, 1);
  RETURN;
END

SELECT @AcademicYearId = academic_year_id
FROM dbo.academic_years
WHERE year_code = N'2022-23';

IF @AcademicYearId IS NULL
BEGIN
  RAISERROR('Academic year 2022-23 not found in dbo.academic_years.', 16, 1);
  RETURN;
END

SELECT @CurriculumVersionId = curriculum_version_id
FROM dbo.curriculum_versions
WHERE program_id = @ProgramId
  AND academic_year_id = @AcademicYearId
  AND version_no = 1;

IF @CurriculumVersionId IS NULL
BEGIN
  INSERT INTO dbo.curriculum_versions
  (
    program_id,
    academic_year_id,
    version_no,
    version_label,
    is_published,
    published_at,
    created_by
  )
  VALUES
  (
    @ProgramId,
    @AcademicYearId,
    1,
    N'BE-CSE 2022-23 v1',
    1,
    SYSUTCDATETIME(),
    NULL
  );

  SET @CurriculumVersionId = SCOPE_IDENTITY();
END

DECLARE @Subjects TABLE
(
  subject_code NVARCHAR(20) NOT NULL,
  subject_name NVARCHAR(255) NOT NULL,
  semester_number TINYINT NOT NULL,
  display_order INT NOT NULL,
  th_hours DECIMAL(4,2) NOT NULL,
  pr_hours DECIMAL(4,2) NOT NULL,
  th_credits DECIMAL(4,2) NOT NULL,
  pr_credits DECIMAL(4,2) NOT NULL,
  is_elective BIT NOT NULL
);

INSERT INTO @Subjects (subject_code, subject_name, semester_number, display_order, th_hours, pr_hours, th_credits, pr_credits, is_elective)
VALUES
  (N'CSE-S1-01', N'Applied Physics - I', 1, 1, 4.00, 3.00, 4.00, 1.50, 0),
  (N'CSE-S1-02', N'Applied Mathematics-I', 1, 2, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S1-03', N'Fundamentals of Civil and Environmental Engineering', 1, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S1-04', N'Engineering Drawing-I', 1, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S1-05', N'Workshop Practices', 1, 5, 0.00, 2.00, 0.00, 1.00, 0),
  (N'CSE-S1-06', N'Material Science', 1, 6, 4.00, 0.00, 4.00, 0.00, 0),

  (N'CSE-S2-01', N'Applied Mathematics-II', 2, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S2-02', N'Applied Physics-II', 2, 2, 4.00, 3.00, 4.00, 1.50, 0),
  (N'CSE-S2-03', N'Engineering Mechanics', 2, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S2-04', N'Programming in C and C++', 2, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S2-05', N'Electrical Engineering & Machines', 2, 5, 4.00, 2.00, 4.00, 1.00, 0),

  (N'CSE-S3-01', N'Applied Mathematics-III', 3, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S3-02', N'Combinatorial Methods', 3, 2, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S3-03', N'Data Structures', 3, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S3-04', N'Object Oriented Programming with Java', 3, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S3-05', N'Electronics Engineering', 3, 5, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S3-06', N'Communication Skills', 3, 6, 2.00, 2.00, 2.00, 1.00, 0),

  (N'CSE-S4-01', N'Applied Mathematics - IV', 4, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S4-02', N'Database Management System', 4, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S4-03', N'Design and Analysis of Algorithms', 4, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S4-04', N'Digital Logic & Design', 4, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S4-05', N'Analog and Digital Communication', 4, 5, 4.00, 2.00, 4.00, 1.00, 0),

  (N'CSE-S5-01', N'Basics of Web Programming', 5, 1, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S5-02', N'Computer Graphics', 5, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S5-03', N'Computer Organization', 5, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S5-04', N'Theory of Computation', 5, 4, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S5-05', N'Engineering Economics', 5, 5, 4.00, 0.00, 4.00, 0.00, 0),

  (N'CSE-S6-01', N'Compiler Design', 6, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S6-02', N'Computer Network', 6, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S6-03', N'Operating System', 6, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'CSE-S6-04', N'Software Engineer', 6, 4, 4.00, 0.00, 4.00, 0.00, 0),
  (N'CSE-S6-05', N'<Inst.Elective> Name as per students marksheet', 6, 5, 3.00, 0.00, 3.00, 0.00, 1),
  (N'CSE-S6-06', N'<Minor Elective> Name as per Students marksheet', 6, 6, 4.00, 2.00, 4.00, 1.00, 1),

  (N'CSE-S7-01', N'Minor Project', 7, 1, 5.00, 0.00, 5.00, 0.00, 0),
  (N'CSE-S7-02', N'<Dept.Elective I> Name as per students marksheet', 7, 2, 4.00, 2.00, 4.00, 1.00, 1),
  (N'CSE-S7-03', N'<Dept.Elective II> Name as per students marksheet', 7, 3, 4.00, 2.00, 4.00, 1.00, 1),
  (N'CSE-S7-04', N'<Dept.Elective III> Name as per students marksheet', 7, 4, 4.00, 2.00, 4.00, 1.00, 1),
  (N'CSE-S7-05', N'<Dept.Elective IV> Name as per students marksheet', 7, 5, 4.00, 2.00, 4.00, 1.00, 1),

  (N'CSE-S8-01', N'Project / Internship', 8, 1, 0.00, 40.00, 0.00, 20.00, 0);

BEGIN TRANSACTION;

MERGE dbo.subjects AS tgt
USING @Subjects AS src
  ON tgt.subject_code = src.subject_code
WHEN MATCHED THEN
  UPDATE SET
    tgt.subject_name = src.subject_name,
    tgt.is_active = 1
WHEN NOT MATCHED BY TARGET THEN
  INSERT (subject_code, subject_name, is_active)
  VALUES (src.subject_code, src.subject_name, 1);

MERGE dbo.subject_versions AS tgt
USING
(
  SELECT
    s.subject_id,
    x.subject_code,
    x.subject_name,
    x.th_credits,
    x.pr_credits
  FROM @Subjects x
  JOIN dbo.subjects s
    ON s.subject_code = x.subject_code
) AS src
  ON tgt.subject_id = src.subject_id
 AND tgt.version_label = N'2022-23'
WHEN MATCHED THEN
  UPDATE SET
    tgt.title_on_transcript = src.subject_name,
    tgt.has_theory = CASE WHEN src.th_credits > 0 THEN 1 ELSE 0 END,
    tgt.has_practical = CASE WHEN src.pr_credits > 0 THEN 1 ELSE 0 END,
    tgt.effective_from = '2022-07-01'
WHEN NOT MATCHED BY TARGET THEN
  INSERT
  (
    subject_id,
    version_label,
    effective_from,
    title_on_transcript,
    has_theory,
    has_practical,
    theory_max_marks,
    practical_max_marks
  )
  VALUES
  (
    src.subject_id,
    N'2022-23',
    '2022-07-01',
    src.subject_name,
    CASE WHEN src.th_credits > 0 THEN 1 ELSE 0 END,
    CASE WHEN src.pr_credits > 0 THEN 1 ELSE 0 END,
    NULL,
    NULL
  );

MERGE dbo.curriculum_subjects AS tgt
USING
(
  SELECT
    @CurriculumVersionId AS curriculum_version_id,
    sv.subject_version_id,
    x.semester_number,
    x.display_order,
    x.th_hours,
    x.pr_hours,
    x.th_credits,
    x.pr_credits,
    x.is_elective
  FROM @Subjects x
  JOIN dbo.subjects s
    ON s.subject_code = x.subject_code
  JOIN dbo.subject_versions sv
    ON sv.subject_id = s.subject_id
   AND sv.version_label = N'2022-23'
) AS src
  ON tgt.curriculum_version_id = src.curriculum_version_id
 AND tgt.subject_version_id = src.subject_version_id
WHEN MATCHED THEN
  UPDATE SET
    tgt.semester_number = src.semester_number,
    tgt.display_order = src.display_order,
    tgt.th_hours_per_week = src.th_hours,
    tgt.pr_hours_per_week = src.pr_hours,
    tgt.th_credits = src.th_credits,
    tgt.pr_credits = src.pr_credits,
    tgt.is_elective = src.is_elective,
    tgt.is_active = 1
WHEN NOT MATCHED BY TARGET THEN
  INSERT
  (
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
  VALUES
  (
    src.curriculum_version_id,
    src.subject_version_id,
    src.semester_number,
    src.display_order,
    src.th_hours,
    src.pr_hours,
    src.th_credits,
    src.pr_credits,
    src.is_elective,
    1
  );

COMMIT TRANSACTION;

PRINT 'BE-CSE curriculum seeded/updated from Excel listing.';
