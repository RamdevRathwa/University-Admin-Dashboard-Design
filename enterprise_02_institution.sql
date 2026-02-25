SET NOCOUNT ON;
GO

/* ===========================
   MODULE 2: INSTITUTION + GRADING
   =========================== */

IF OBJECT_ID('dbo.faculties','U') IS NULL
BEGIN
  CREATE TABLE dbo.faculties
  (
    faculty_id      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_faculties PRIMARY KEY,
    faculty_code    NVARCHAR(20) NOT NULL,
    faculty_name    NVARCHAR(255) NOT NULL,
    dean_user_id    BIGINT NULL,
    is_active       BIT NOT NULL CONSTRAINT DF_faculties_is_active DEFAULT (1),
    created_at      DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_faculties_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.faculties
    ADD CONSTRAINT UQ_faculties_code UNIQUE (faculty_code);

  ALTER TABLE dbo.faculties
    ADD CONSTRAINT FK_faculties_dean_user
      FOREIGN KEY (dean_user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_faculties_active ON dbo.faculties(is_active, faculty_name);
END
GO

IF OBJECT_ID('dbo.departments','U') IS NULL
BEGIN
  CREATE TABLE dbo.departments
  (
    department_id   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_departments PRIMARY KEY,
    faculty_id      INT NOT NULL,
    dept_code       NVARCHAR(20) NOT NULL,
    dept_name       NVARCHAR(255) NOT NULL,
    hod_user_id     BIGINT NULL,
    is_active       BIT NOT NULL CONSTRAINT DF_departments_is_active DEFAULT (1),
    created_at      DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_departments_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.departments
    ADD CONSTRAINT UQ_departments_code UNIQUE (dept_code);

  ALTER TABLE dbo.departments
    ADD CONSTRAINT FK_departments_faculties
      FOREIGN KEY (faculty_id) REFERENCES dbo.faculties(faculty_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.departments
    ADD CONSTRAINT FK_departments_hod_user
      FOREIGN KEY (hod_user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_departments_faculty ON dbo.departments(faculty_id, is_active, dept_name);
END
GO

IF OBJECT_ID('dbo.grading_schemes','U') IS NULL
BEGIN
  CREATE TABLE dbo.grading_schemes
  (
    grading_scheme_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_grading_schemes PRIMARY KEY,
    scheme_code       NVARCHAR(30) NOT NULL,
    scheme_name       NVARCHAR(120) NOT NULL,
    max_grade_point   DECIMAL(5,2) NOT NULL,
    is_active         BIT NOT NULL CONSTRAINT DF_grading_schemes_is_active DEFAULT (1),
    created_at        DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_grading_schemes_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.grading_schemes
    ADD CONSTRAINT UQ_grading_schemes_code UNIQUE (scheme_code);

  ALTER TABLE dbo.grading_schemes
    ADD CONSTRAINT CK_grading_schemes_max_gp CHECK (max_grade_point > 0 AND max_grade_point <= 20);

  CREATE INDEX IX_grading_schemes_active ON dbo.grading_schemes(is_active, scheme_name);
END
GO

IF OBJECT_ID('dbo.grading_rules','U') IS NULL
BEGIN
  CREATE TABLE dbo.grading_rules
  (
    grading_rule_id   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_grading_rules PRIMARY KEY,
    grading_scheme_id INT NOT NULL,
    grade_letter      NVARCHAR(10) NOT NULL,
    grade_point       DECIMAL(5,2) NOT NULL,
    min_percentage    DECIMAL(5,2) NOT NULL,
    max_percentage    DECIMAL(5,2) NOT NULL,
    remarks           NVARCHAR(120) NULL,
    is_active         BIT NOT NULL CONSTRAINT DF_grading_rules_is_active DEFAULT (1)
  );

  ALTER TABLE dbo.grading_rules
    ADD CONSTRAINT FK_grading_rules_scheme
      FOREIGN KEY (grading_scheme_id) REFERENCES dbo.grading_schemes(grading_scheme_id) ON DELETE CASCADE;

  ALTER TABLE dbo.grading_rules
    ADD CONSTRAINT UQ_grading_rules UNIQUE (grading_scheme_id, grade_letter);

  ALTER TABLE dbo.grading_rules
    ADD CONSTRAINT CK_grading_rules_pct CHECK (min_percentage >= 0 AND max_percentage <= 100 AND max_percentage >= min_percentage);

  ALTER TABLE dbo.grading_rules
    ADD CONSTRAINT CK_grading_rules_gp CHECK (grade_point >= 0 AND grade_point <= 20);

  CREATE INDEX IX_grading_rules_scheme_active ON dbo.grading_rules(grading_scheme_id, is_active);
END
GO

IF OBJECT_ID('dbo.programs','U') IS NULL
BEGIN
  CREATE TABLE dbo.programs
  (
    program_id        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_programs PRIMARY KEY,
    department_id     INT NOT NULL,
    program_code      NVARCHAR(30) NOT NULL,
    program_name      NVARCHAR(255) NOT NULL,
    degree_name       NVARCHAR(120) NOT NULL,
    duration_years    TINYINT NOT NULL,
    grading_scheme_id INT NOT NULL,
    is_active         BIT NOT NULL CONSTRAINT DF_programs_is_active DEFAULT (1),
    created_at        DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_programs_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.programs
    ADD CONSTRAINT UQ_programs_code UNIQUE (program_code);

  ALTER TABLE dbo.programs
    ADD CONSTRAINT FK_programs_departments
      FOREIGN KEY (department_id) REFERENCES dbo.departments(department_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.programs
    ADD CONSTRAINT FK_programs_grading_schemes
      FOREIGN KEY (grading_scheme_id) REFERENCES dbo.grading_schemes(grading_scheme_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.programs
    ADD CONSTRAINT CK_programs_duration CHECK (duration_years BETWEEN 1 AND 8);

  CREATE INDEX IX_programs_dept_active ON dbo.programs(department_id, is_active, program_name);
END
GO

IF OBJECT_ID('dbo.academic_years','U') IS NULL
BEGIN
  CREATE TABLE dbo.academic_years
  (
    academic_year_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_academic_years PRIMARY KEY,
    year_code        NVARCHAR(20) NOT NULL,
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    is_current       BIT NOT NULL CONSTRAINT DF_academic_years_is_current DEFAULT (0),
    created_at       DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_academic_years_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.academic_years
    ADD CONSTRAINT UQ_academic_years_year_code UNIQUE (year_code);

  ALTER TABLE dbo.academic_years
    ADD CONSTRAINT CK_academic_years_dates CHECK (end_date > start_date);

  CREATE INDEX IX_academic_years_current ON dbo.academic_years(is_current, start_date);
END
GO

IF OBJECT_ID('dbo.semesters','U') IS NULL
BEGIN
  CREATE TABLE dbo.semesters
  (
    semester_id      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_semesters PRIMARY KEY,
    program_id       INT NOT NULL,
    academic_year_id INT NOT NULL,
    semester_number  TINYINT NOT NULL,
    semester_name    NVARCHAR(60) NOT NULL,
    start_date       DATE NULL,
    end_date         DATE NULL,
    is_active        BIT NOT NULL CONSTRAINT DF_semesters_is_active DEFAULT (1),
    created_at       DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_semesters_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.semesters
    ADD CONSTRAINT FK_semesters_programs
      FOREIGN KEY (program_id) REFERENCES dbo.programs(program_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.semesters
    ADD CONSTRAINT FK_semesters_academic_years
      FOREIGN KEY (academic_year_id) REFERENCES dbo.academic_years(academic_year_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.semesters
    ADD CONSTRAINT UQ_semesters UNIQUE (program_id, academic_year_id, semester_number);

  ALTER TABLE dbo.semesters
    ADD CONSTRAINT CK_semesters_num CHECK (semester_number BETWEEN 1 AND 12);

  ALTER TABLE dbo.semesters
    ADD CONSTRAINT CK_semesters_dates CHECK ((start_date IS NULL AND end_date IS NULL) OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date > start_date));

  CREATE INDEX IX_semesters_program_year ON dbo.semesters(program_id, academic_year_id, semester_number);
END
GO

PRINT 'Enterprise schema: institution init done.';
