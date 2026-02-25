SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ===========================
   MODULE 3: CURRICULUM & SUBJECT VERSIONING
   =========================== */

IF OBJECT_ID('dbo.subjects','U') IS NULL
BEGIN
  CREATE TABLE dbo.subjects
  (
    subject_id      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_subjects PRIMARY KEY,
    subject_code    NVARCHAR(30) NOT NULL,
    subject_name    NVARCHAR(255) NOT NULL,
    is_active       BIT NOT NULL CONSTRAINT DF_subjects_is_active DEFAULT (1),
    created_at      DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_subjects_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.subjects
    ADD CONSTRAINT UQ_subjects_code UNIQUE (subject_code);

  CREATE INDEX IX_subjects_active ON dbo.subjects(is_active, subject_name);
END
GO

IF OBJECT_ID('dbo.subject_versions','U') IS NULL
BEGIN
  CREATE TABLE dbo.subject_versions
  (
    subject_version_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_subject_versions PRIMARY KEY,
    subject_id         INT NOT NULL,
    version_label      NVARCHAR(50) NOT NULL,
    effective_from     DATE NOT NULL,
    effective_to       DATE NULL,
    title_on_transcript NVARCHAR(255) NOT NULL,
    has_theory         BIT NOT NULL CONSTRAINT DF_subject_versions_has_theory DEFAULT (1),
    has_practical      BIT NOT NULL CONSTRAINT DF_subject_versions_has_practical DEFAULT (0),
    theory_max_marks   INT NULL,
    practical_max_marks INT NULL,
    total_max_marks    AS (ISNULL(theory_max_marks,0) + ISNULL(practical_max_marks,0)) PERSISTED,
    created_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_subject_versions_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.subject_versions
    ADD CONSTRAINT FK_subject_versions_subjects
      FOREIGN KEY (subject_id) REFERENCES dbo.subjects(subject_id) ON DELETE CASCADE;

  ALTER TABLE dbo.subject_versions
    ADD CONSTRAINT UQ_subject_versions UNIQUE (subject_id, version_label);

  ALTER TABLE dbo.subject_versions
    ADD CONSTRAINT CK_subject_versions_dates CHECK (effective_to IS NULL OR effective_to > effective_from);

  CREATE INDEX IX_subject_versions_subject_dates ON dbo.subject_versions(subject_id, effective_from DESC);
END
GO

IF OBJECT_ID('dbo.curriculum_versions','U') IS NULL
BEGIN
  CREATE TABLE dbo.curriculum_versions
  (
    curriculum_version_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_curriculum_versions PRIMARY KEY,
    program_id            INT NOT NULL,
    academic_year_id      INT NOT NULL,
    version_no            INT NOT NULL,
    version_label         NVARCHAR(60) NOT NULL,
    is_published          BIT NOT NULL CONSTRAINT DF_curriculum_versions_is_published DEFAULT (0),
    published_at          DATETIMEOFFSET(0) NULL,
    created_by            BIGINT NULL,
    created_at            DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_curriculum_versions_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT FK_curriculum_versions_programs
      FOREIGN KEY (program_id) REFERENCES dbo.programs(program_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT FK_curriculum_versions_academic_years
      FOREIGN KEY (academic_year_id) REFERENCES dbo.academic_years(academic_year_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT FK_curriculum_versions_created_by
      FOREIGN KEY (created_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT UQ_curriculum_versions UNIQUE (program_id, academic_year_id, version_no);

  CREATE INDEX IX_curriculum_versions_program_year ON dbo.curriculum_versions(program_id, academic_year_id, is_published, version_no DESC);
END
GO

IF OBJECT_ID('dbo.curriculum_subjects','U') IS NULL
BEGIN
  CREATE TABLE dbo.curriculum_subjects
  (
    curriculum_subject_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_curriculum_subjects PRIMARY KEY,
    curriculum_version_id INT NOT NULL,
    subject_version_id    INT NOT NULL,
    semester_number       TINYINT NOT NULL,
    display_order         INT NULL,
    th_hours_per_week     DECIMAL(5,2) NOT NULL CONSTRAINT DF_curr_sub_th_hours DEFAULT (0),
    pr_hours_per_week     DECIMAL(5,2) NOT NULL CONSTRAINT DF_curr_sub_pr_hours DEFAULT (0),
    th_credits            DECIMAL(5,2) NOT NULL CONSTRAINT DF_curr_sub_th_credits DEFAULT (0),
    pr_credits            DECIMAL(5,2) NOT NULL CONSTRAINT DF_curr_sub_pr_credits DEFAULT (0),
    total_credits         AS (th_credits + pr_credits) PERSISTED,
    is_elective           BIT NOT NULL CONSTRAINT DF_curr_sub_is_elective DEFAULT (0),
    is_active             BIT NOT NULL CONSTRAINT DF_curr_sub_is_active DEFAULT (1)
  );

  ALTER TABLE dbo.curriculum_subjects
    ADD CONSTRAINT FK_curriculum_subjects_curriculum_versions
      FOREIGN KEY (curriculum_version_id) REFERENCES dbo.curriculum_versions(curriculum_version_id) ON DELETE CASCADE;

  ALTER TABLE dbo.curriculum_subjects
    ADD CONSTRAINT FK_curriculum_subjects_subject_versions
      FOREIGN KEY (subject_version_id) REFERENCES dbo.subject_versions(subject_version_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.curriculum_subjects
    ADD CONSTRAINT CK_curriculum_subjects_sem CHECK (semester_number BETWEEN 1 AND 12);

  ALTER TABLE dbo.curriculum_subjects
    ADD CONSTRAINT CK_curriculum_subjects_credits CHECK (th_credits >= 0 AND pr_credits >= 0 AND (th_credits + pr_credits) > 0);

  ALTER TABLE dbo.curriculum_subjects
    ADD CONSTRAINT CK_curriculum_subjects_hours CHECK (th_hours_per_week >= 0 AND pr_hours_per_week >= 0);

  ALTER TABLE dbo.curriculum_subjects
    ADD CONSTRAINT UQ_curriculum_subjects UNIQUE (curriculum_version_id, semester_number, subject_version_id);

  CREATE INDEX IX_curriculum_subjects_curr_sem ON dbo.curriculum_subjects(curriculum_version_id, semester_number, is_active);
END
GO

IF OBJECT_ID('dbo.elective_groups','U') IS NULL
BEGIN
  CREATE TABLE dbo.elective_groups
  (
    elective_group_id     BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_elective_groups PRIMARY KEY,
    curriculum_version_id INT NOT NULL,
    semester_number       TINYINT NOT NULL,
    group_code            NVARCHAR(30) NOT NULL,
    group_name            NVARCHAR(120) NOT NULL,
    pick_count            TINYINT NOT NULL CONSTRAINT DF_elective_groups_pick DEFAULT (1),
    is_active             BIT NOT NULL CONSTRAINT DF_elective_groups_is_active DEFAULT (1),
    created_at            DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_elective_groups_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.elective_groups
    ADD CONSTRAINT FK_elective_groups_curriculum_versions
      FOREIGN KEY (curriculum_version_id) REFERENCES dbo.curriculum_versions(curriculum_version_id) ON DELETE CASCADE;

  ALTER TABLE dbo.elective_groups
    ADD CONSTRAINT CK_elective_groups_sem CHECK (semester_number BETWEEN 1 AND 12);

  ALTER TABLE dbo.elective_groups
    ADD CONSTRAINT CK_elective_groups_pick CHECK (pick_count BETWEEN 1 AND 20);

  ALTER TABLE dbo.elective_groups
    ADD CONSTRAINT UQ_elective_groups UNIQUE (curriculum_version_id, semester_number, group_code);

  CREATE INDEX IX_elective_groups_curr_sem ON dbo.elective_groups(curriculum_version_id, semester_number, is_active);
END
GO

IF OBJECT_ID('dbo.elective_group_subjects','U') IS NULL
BEGIN
  CREATE TABLE dbo.elective_group_subjects
  (
    elective_group_subject_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_elective_group_subjects PRIMARY KEY,
    elective_group_id         BIGINT NOT NULL,
    curriculum_subject_id     BIGINT NOT NULL,
    is_active                 BIT NOT NULL CONSTRAINT DF_egs_is_active DEFAULT (1),
    created_at                DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_egs_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.elective_group_subjects
    ADD CONSTRAINT FK_egs_groups
      FOREIGN KEY (elective_group_id) REFERENCES dbo.elective_groups(elective_group_id) ON DELETE CASCADE;

  ALTER TABLE dbo.elective_group_subjects
    ADD CONSTRAINT FK_egs_curriculum_subjects
      FOREIGN KEY (curriculum_subject_id) REFERENCES dbo.curriculum_subjects(curriculum_subject_id) ON DELETE CASCADE;

  ALTER TABLE dbo.elective_group_subjects
    ADD CONSTRAINT UQ_egs_curriculum_subject UNIQUE (curriculum_subject_id);

  ALTER TABLE dbo.elective_group_subjects
    ADD CONSTRAINT UQ_egs_group_subject UNIQUE (elective_group_id, curriculum_subject_id);

  CREATE INDEX IX_egs_group ON dbo.elective_group_subjects(elective_group_id, is_active);
END
GO

PRINT 'Enterprise schema: curriculum init done.';
