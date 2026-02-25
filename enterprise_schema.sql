SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ===========================
   MODULE 1: AUTHENTICATION & AUTHORIZATION
   =========================== */

IF OBJECT_ID('dbo.roles','U') IS NULL
BEGIN
  CREATE TABLE dbo.roles
  (
    role_id        SMALLINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_roles PRIMARY KEY,
    role_code      NVARCHAR(30)  NOT NULL,
    role_name      NVARCHAR(80)  NOT NULL,
    description    NVARCHAR(255) NULL,
    created_at     DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_roles_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.roles
    ADD CONSTRAINT UQ_roles_role_code UNIQUE (role_code);

  ALTER TABLE dbo.roles
    ADD CONSTRAINT CK_roles_role_code CHECK (role_code IN (N'Student',N'Clerk',N'HoD',N'Dean',N'Admin'));
END
GO

IF OBJECT_ID('dbo.users','U') IS NULL
BEGIN
  CREATE TABLE dbo.users
  (
    user_id            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,

    full_name          NVARCHAR(200) NOT NULL,
    email              NVARCHAR(254) NULL,
    mobile             NVARCHAR(20)  NULL,

    normalized_email   AS (LOWER(LTRIM(RTRIM([email])))) PERSISTED,
    normalized_mobile  AS (REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM([mobile])),' ',''),'-',''),'(',''),')',''),'+','')) PERSISTED,

    is_email_verified  BIT NOT NULL CONSTRAINT DF_users_is_email_verified DEFAULT (0),
    is_mobile_verified BIT NOT NULL CONSTRAINT DF_users_is_mobile_verified DEFAULT (0),

    is_active          BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
    deleted_at         DATETIMEOFFSET(0) NULL,

    created_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT (SYSUTCDATETIME()),
    rowver             ROWVERSION NOT NULL
  );

  -- Filter expressions reference base columns (SQL Server limitation for computed cols).
  CREATE UNIQUE INDEX UX_users_normalized_email ON dbo.users(normalized_email) WHERE email IS NOT NULL;
  CREATE UNIQUE INDEX UX_users_normalized_mobile ON dbo.users(normalized_mobile) WHERE mobile IS NOT NULL;

  CREATE INDEX IX_users_is_active ON dbo.users(is_active, deleted_at);

  ALTER TABLE dbo.users
    ADD CONSTRAINT CK_users_soft_delete CHECK (
      (deleted_at IS NULL) OR (deleted_at IS NOT NULL AND is_active = 0)
    );
END
GO

IF OBJECT_ID('dbo.user_roles','U') IS NULL
BEGIN
  CREATE TABLE dbo.user_roles
  (
    user_role_id   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_user_roles PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    role_id        SMALLINT NOT NULL,
    assigned_at    DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_user_roles_assigned_at DEFAULT (SYSUTCDATETIME()),
    assigned_by    BIGINT NULL
  );

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT UQ_user_roles UNIQUE (user_id, role_id);

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT FK_user_roles_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT FK_user_roles_roles
      FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.user_roles
    ADD CONSTRAINT FK_user_roles_assigned_by
      FOREIGN KEY (assigned_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_user_roles_role ON dbo.user_roles(role_id, user_id);
END
GO

IF OBJECT_ID('dbo.otp_verifications','U') IS NULL
BEGIN
  CREATE TABLE dbo.otp_verifications
  (
    otp_id          BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_otp_verifications PRIMARY KEY,

    user_id         BIGINT NULL,
    identifier      NVARCHAR(254) NOT NULL,
    identifier_type NVARCHAR(10)  NOT NULL,
    purpose         NVARCHAR(50)  NOT NULL,

    otp_salt        VARBINARY(16) NOT NULL,
    otp_hash        VARBINARY(32) NOT NULL,
    attempts        INT NOT NULL CONSTRAINT DF_otp_attempts DEFAULT (0),

    expires_at      DATETIMEOFFSET(0) NOT NULL,
    used_at         DATETIMEOFFSET(0) NULL,

    created_at      DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_otp_created_at DEFAULT (SYSUTCDATETIME()),
    ip_address      NVARCHAR(45) NULL,
    user_agent      NVARCHAR(500) NULL
  );

  ALTER TABLE dbo.otp_verifications
    ADD CONSTRAINT CK_otp_identifier_type CHECK (identifier_type IN (N'EMAIL',N'MOBILE'));

  ALTER TABLE dbo.otp_verifications
    ADD CONSTRAINT CK_otp_expires CHECK (expires_at > created_at);

  ALTER TABLE dbo.otp_verifications
    ADD CONSTRAINT FK_otp_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  CREATE INDEX IX_otp_lookup ON dbo.otp_verifications(identifier, purpose, used_at, expires_at);
  CREATE INDEX IX_otp_user ON dbo.otp_verifications(user_id, created_at) WHERE user_id IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.login_logs','U') IS NULL
BEGIN
  CREATE TABLE dbo.login_logs
  (
    login_log_id   BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_login_logs PRIMARY KEY,

    user_id        BIGINT NULL,
    identifier     NVARCHAR(254) NOT NULL,
    success        BIT NOT NULL,
    failure_reason NVARCHAR(255) NULL,

    ip_address     NVARCHAR(45) NULL,
    user_agent     NVARCHAR(500) NULL,
    device_id      NVARCHAR(100) NULL,

    created_at     DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_login_logs_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.login_logs
    ADD CONSTRAINT FK_login_logs_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_login_logs_user_time ON dbo.login_logs(user_id, created_at) WHERE user_id IS NOT NULL;
  CREATE INDEX IX_login_logs_identifier_time ON dbo.login_logs(identifier, created_at);
  CREATE INDEX IX_login_logs_success_time ON dbo.login_logs(success, created_at);
END
GO

IF OBJECT_ID('dbo.refresh_tokens','U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens
  (
    refresh_token_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY,

    user_id          BIGINT NOT NULL,
    token_salt       VARBINARY(16) NOT NULL,
    token_hash       VARBINARY(32) NOT NULL,

    issued_at        DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_refresh_tokens_issued_at DEFAULT (SYSUTCDATETIME()),
    expires_at       DATETIMEOFFSET(0) NOT NULL,
    revoked_at       DATETIMEOFFSET(0) NULL,

    replaced_by_id   BIGINT NULL,

    ip_address       NVARCHAR(45) NULL,
    user_agent       NVARCHAR(500) NULL,
    device_id        NVARCHAR(100) NULL
  );

  ALTER TABLE dbo.refresh_tokens
    ADD CONSTRAINT FK_refresh_tokens_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  ALTER TABLE dbo.refresh_tokens
    ADD CONSTRAINT FK_refresh_tokens_replaced_by
      FOREIGN KEY (replaced_by_id) REFERENCES dbo.refresh_tokens(refresh_token_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.refresh_tokens
    ADD CONSTRAINT CK_refresh_tokens_expires CHECK (expires_at > issued_at);

  CREATE INDEX IX_refresh_tokens_user_active ON dbo.refresh_tokens(user_id, revoked_at, expires_at);
END
GO

/* ===========================
   MODULE 2: INSTITUTION STRUCTURE
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

/* ===========================
   Minimal seed: roles
   =========================== */

IF NOT EXISTS (SELECT 1 FROM dbo.roles)
BEGIN
  INSERT INTO dbo.roles(role_code, role_name, description)
  VALUES
    (N'Student',N'Student',N'Student user'),
    (N'Clerk',N'Clerk',N'Clerk grade entry'),
    (N'HoD',N'HoD',N'Head of Department'),
    (N'Dean',N'Dean',N'Dean final approval'),
    (N'Admin',N'Admin',N'System admin');
END
GO

PRINT 'Enterprise schema (core) init done.';
