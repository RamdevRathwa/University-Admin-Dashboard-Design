SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @ProgramId INT;
DECLARE @AcademicYearId INT;
DECLARE @CurriculumVersionId INT;

SELECT @ProgramId = program_id
FROM dbo.programs
WHERE program_code = N'BE-ME';

IF @ProgramId IS NULL
BEGIN
  RAISERROR('BE-ME program not found in dbo.programs.', 16, 1);
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
    N'BE-ME 2022-23 v1',
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
  (N'ME-S1-01', N'Calculus', 1, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'ME-S1-02', N'Applied Physics', 1, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S1-03', N'Fundamentals of Civil and Environmental Engineering', 1, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S1-04', N'Basic Electrical and Electronics Engineering', 1, 4, 3.00, 2.00, 3.00, 1.00, 0),
  (N'ME-S1-05', N'Engineering Thermodynamics', 1, 5, 4.00, 0.00, 4.00, 0.00, 0),
  (N'ME-S1-06', N'Material Science and Metallurgy', 1, 6, 3.00, 0.00, 3.00, 0.00, 0),

  (N'ME-S2-01', N'Linear Algebra and Vector Calculus', 2, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'ME-S2-02', N'Applied Mechanics', 2, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S2-03', N'Communication Skills', 2, 3, 2.00, 1.00, 2.00, 0.50, 0),
  (N'ME-S2-04', N'Computational Techniques and Programming', 2, 4, 3.00, 2.00, 3.00, 1.00, 0),
  (N'ME-S2-05', N'Engineering Drawing', 2, 5, 3.00, 4.00, 3.00, 2.00, 0),
  (N'ME-S2-06', N'Workshop Practices', 2, 6, 0.00, 4.00, 0.00, 2.00, 0),

  (N'ME-S3-01', N'Differential Equations', 3, 1, 4.00, 0.00, 4.00, 0.00, 0),
  (N'ME-S3-02', N'Mechanics of Materials', 3, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S3-03', N'Production Technology-I', 3, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S3-04', N'Theory of Machines-I', 3, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S3-05', N'Thermal Engineering-I', 3, 5, 4.00, 2.00, 4.00, 1.00, 0),

  (N'ME-S4-01', N'Elements of Mechatronics', 4, 1, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S4-02', N'Machine Drawing', 4, 2, 2.00, 2.00, 2.00, 1.00, 0),
  (N'ME-S4-03', N'Production Technology-II', 4, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S4-04', N'Theory of Machines-II', 4, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S4-05', N'Fluid Mechanics', 4, 5, 4.00, 2.00, 4.00, 1.00, 0),

  (N'ME-S5-01', N'Measurements and Metrology', 5, 1, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S5-02', N'Industrial Engineering - I', 5, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S5-03', N'Design of Machine Elements - I', 5, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S5-04', N'Heat and Mass Transfer', 5, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S5-05', N'<Dep.Elective> Name as per Students marksheet', 5, 5, 4.00, 0.00, 4.00, 0.00, 1),
  (N'ME-S5-06', N'<Inst.Elective> Name as per Students marksheet', 5, 6, 3.00, 0.00, 3.00, 0.00, 1),

  (N'ME-S6-01', N'Production Technology-III', 6, 1, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S6-02', N'Industrial Engineering-II', 6, 2, 4.00, 0.00, 4.00, 0.00, 0),
  (N'ME-S6-03', N'Design of Machine Elements-II', 6, 3, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S6-04', N'Hydraulic Machines', 6, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S6-05', N'Thermal Engineering-II', 6, 5, 4.00, 2.00, 4.00, 1.00, 0),

  (N'ME-S7-01', N'Dynamics of Compressible Flow and Turbomachines', 7, 1, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S7-02', N'Computer Aided Design and Manufacturing', 7, 2, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S7-03', N'Operation Research and Optimization Techniques', 7, 3, 4.00, 0.00, 4.00, 0.00, 0),
  (N'ME-S7-04', N'Thermal Engineering-III', 7, 4, 4.00, 2.00, 4.00, 1.00, 0),
  (N'ME-S7-05', N'<Dep.Elective II> Name as per students marksheet', 7, 5, 4.00, 0.00, 4.00, 0.00, 1),

  (N'ME-S8-01', N'Industrial Project / Internship / Research Project', 8, 1, 0.00, 24.00, 0.00, 12.00, 0),
  (N'ME-S8-02', N'Institute Project', 8, 2, 0.00, 8.00, 0.00, 4.00, 0),
  (N'ME-S8-03', N'<Dep.Elective III> Name as per students marksheet', 8, 3, 4.00, 0.00, 4.00, 0.00, 1),
  (N'ME-S8-04', N'<Dep.Elective IV> Name as per students marksheet', 8, 4, 4.00, 0.00, 4.00, 0.00, 1);

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

PRINT 'BE-ME curriculum seeded/updated from Excel listing.';
