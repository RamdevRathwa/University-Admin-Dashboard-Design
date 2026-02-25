SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ===========================
   MODULE 4: STUDENTS + REQUESTS + WORKFLOW (FIXED)
   =========================== */

IF OBJECT_ID('dbo.students','U') IS NULL
BEGIN
  CREATE TABLE dbo.students
  (
    student_id        BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_students PRIMARY KEY,
    user_id           BIGINT NOT NULL,
    program_id        INT NULL,
    prn               NVARCHAR(30) NULL,
    admission_year_id INT NULL,
    graduation_year_id INT NULL,
    is_active         BIT NOT NULL CONSTRAINT DF_students_is_active DEFAULT (1),
    created_at        DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_students_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.students
    ADD CONSTRAINT UQ_students_user UNIQUE (user_id);

  CREATE UNIQUE INDEX UX_students_prn ON dbo.students(prn) WHERE prn IS NOT NULL;

  ALTER TABLE dbo.students
    ADD CONSTRAINT FK_students_users
      FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE;

  ALTER TABLE dbo.students
    ADD CONSTRAINT FK_students_programs
      FOREIGN KEY (program_id) REFERENCES dbo.programs(program_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.students
    ADD CONSTRAINT FK_students_admission_year
      FOREIGN KEY (admission_year_id) REFERENCES dbo.academic_years(academic_year_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.students
    ADD CONSTRAINT FK_students_graduation_year
      FOREIGN KEY (graduation_year_id) REFERENCES dbo.academic_years(academic_year_id) ON DELETE NO ACTION;

  CREATE INDEX IX_students_program ON dbo.students(program_id, is_active);
END
GO

IF OBJECT_ID('dbo.student_profiles','U') IS NULL
BEGIN
  CREATE TABLE dbo.student_profiles
  (
    student_id          BIGINT NOT NULL CONSTRAINT PK_student_profiles PRIMARY KEY,
    nationality         NVARCHAR(80) NULL,
    date_of_birth       DATE NULL,
    birth_place         NVARCHAR(120) NULL,
    permanent_address   NVARCHAR(500) NULL,
    created_at          DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_student_profiles_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at          DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_student_profiles_updated_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.student_profiles
    ADD CONSTRAINT FK_student_profiles_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE CASCADE;
END
GO

IF OBJECT_ID('dbo.student_documents','U') IS NULL
BEGIN
  CREATE TABLE dbo.student_documents
  (
    student_document_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_student_documents PRIMARY KEY,
    student_id          BIGINT NOT NULL,
    document_type       NVARCHAR(50) NOT NULL,
    file_name           NVARCHAR(255) NOT NULL,
    mime_type           NVARCHAR(120) NULL,
    storage_path        NVARCHAR(600) NOT NULL,
    file_sha256         VARBINARY(32) NULL,
    uploaded_at         DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_student_documents_uploaded_at DEFAULT (SYSUTCDATETIME()),
    uploaded_by         BIGINT NULL
  );

  ALTER TABLE dbo.student_documents
    ADD CONSTRAINT FK_student_documents_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE CASCADE;

  ALTER TABLE dbo.student_documents
    ADD CONSTRAINT FK_student_documents_uploaded_by
      FOREIGN KEY (uploaded_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_student_documents_student_type ON dbo.student_documents(student_id, document_type, uploaded_at DESC);
END
GO

IF OBJECT_ID('dbo.transcript_statuses','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcript_statuses
  (
    status_id     SMALLINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcript_statuses PRIMARY KEY,
    status_code   NVARCHAR(50) NOT NULL,
    description   NVARCHAR(255) NULL,
    is_terminal   BIT NOT NULL CONSTRAINT DF_transcript_statuses_is_terminal DEFAULT (0),
    created_at    DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcript_statuses_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.transcript_statuses
    ADD CONSTRAINT UQ_transcript_statuses_code UNIQUE (status_code);
END
GO

IF OBJECT_ID('dbo.status_transitions','U') IS NOT NULL
BEGIN
  DROP TABLE dbo.status_transitions;
END
GO

CREATE TABLE dbo.status_transitions
(
  status_transition_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_status_transitions PRIMARY KEY,
  from_status_id       SMALLINT NOT NULL,
  to_status_id         SMALLINT NOT NULL,
  allowed_role_id      SMALLINT NOT NULL,
  is_active            BIT NOT NULL CONSTRAINT DF_status_transitions_is_active DEFAULT (1),
  created_at           DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_status_transitions_created_at DEFAULT (SYSUTCDATETIME())
);

-- Use NO ACTION to avoid multiple cascade paths (two FKs to same table)
ALTER TABLE dbo.status_transitions
  ADD CONSTRAINT FK_status_transitions_from
    FOREIGN KEY (from_status_id) REFERENCES dbo.transcript_statuses(status_id) ON DELETE NO ACTION;

ALTER TABLE dbo.status_transitions
  ADD CONSTRAINT FK_status_transitions_to
    FOREIGN KEY (to_status_id) REFERENCES dbo.transcript_statuses(status_id) ON DELETE NO ACTION;

ALTER TABLE dbo.status_transitions
  ADD CONSTRAINT FK_status_transitions_role
    FOREIGN KEY (allowed_role_id) REFERENCES dbo.roles(role_id) ON DELETE NO ACTION;

ALTER TABLE dbo.status_transitions
  ADD CONSTRAINT UQ_status_transitions UNIQUE (from_status_id, to_status_id, allowed_role_id);

CREATE INDEX IX_status_transitions_active ON dbo.status_transitions(is_active, from_status_id, to_status_id);
GO

IF OBJECT_ID('dbo.transcript_requests','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcript_requests
  (
    transcript_request_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcript_requests PRIMARY KEY,
    request_no            NVARCHAR(30) NOT NULL,
    student_id            BIGINT NOT NULL,
    status_id             SMALLINT NOT NULL,
    current_stage_role_id SMALLINT NOT NULL,
    created_at            DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcript_requests_created_at DEFAULT (SYSUTCDATETIME()),
    submitted_at          DATETIMEOFFSET(0) NULL,
    locked_at             DATETIMEOFFSET(0) NULL,
    last_updated_at       DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcript_requests_last_updated_at DEFAULT (SYSUTCDATETIME()),
    rowver                ROWVERSION NOT NULL
  );

  ALTER TABLE dbo.transcript_requests
    ADD CONSTRAINT UQ_transcript_requests_request_no UNIQUE (request_no);

  ALTER TABLE dbo.transcript_requests
    ADD CONSTRAINT FK_transcript_requests_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.transcript_requests
    ADD CONSTRAINT FK_transcript_requests_status
      FOREIGN KEY (status_id) REFERENCES dbo.transcript_statuses(status_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.transcript_requests
    ADD CONSTRAINT FK_transcript_requests_stage_role
      FOREIGN KEY (current_stage_role_id) REFERENCES dbo.roles(role_id) ON DELETE NO ACTION;

  CREATE INDEX IX_transcript_requests_queue ON dbo.transcript_requests(status_id, current_stage_role_id, created_at DESC);
  CREATE INDEX IX_transcript_requests_student ON dbo.transcript_requests(student_id, created_at DESC);
END
GO

IF OBJECT_ID('dbo.tr_transcript_requests_enforce_transition','TR') IS NULL
EXEC('CREATE TRIGGER dbo.tr_transcript_requests_enforce_transition
ON dbo.transcript_requests
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT UPDATE(status_id) RETURN;

  IF EXISTS
  (
    SELECT 1
    FROM inserted i
    JOIN deleted d ON d.transcript_request_id = i.transcript_request_id
    WHERE i.status_id <> d.status_id
      AND NOT EXISTS
      (
        SELECT 1
        FROM dbo.status_transitions st
        WHERE st.is_active = 1
          AND st.from_status_id = d.status_id
          AND st.to_status_id   = i.status_id
          AND st.allowed_role_id = i.current_stage_role_id
      )
  )
  BEGIN
    RAISERROR(''Invalid status transition for transcript_requests.'', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
  END
END');
GO

IF OBJECT_ID('dbo.student_elective_selections','U') IS NULL
BEGIN
  CREATE TABLE dbo.student_elective_selections
  (
    student_elective_selection_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_student_elective_selections PRIMARY KEY,
    student_id        BIGINT NOT NULL,
    elective_group_id BIGINT NOT NULL,
    curriculum_subject_id BIGINT NOT NULL,
    selected_at       DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_student_elective_selected_at DEFAULT (SYSUTCDATETIME()),
    selected_by       BIGINT NOT NULL,
    is_active         BIT NOT NULL CONSTRAINT DF_student_elective_is_active DEFAULT (1)
  );

  ALTER TABLE dbo.student_elective_selections
    ADD CONSTRAINT FK_student_elective_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE CASCADE;

  ALTER TABLE dbo.student_elective_selections
    ADD CONSTRAINT FK_student_elective_group
      FOREIGN KEY (elective_group_id) REFERENCES dbo.elective_groups(elective_group_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.student_elective_selections
    ADD CONSTRAINT FK_student_elective_curr_sub
      FOREIGN KEY (curriculum_subject_id) REFERENCES dbo.curriculum_subjects(curriculum_subject_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.student_elective_selections
    ADD CONSTRAINT FK_student_elective_selected_by
      FOREIGN KEY (selected_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.student_elective_selections
    ADD CONSTRAINT UQ_student_elective_no_dup_subject UNIQUE (student_id, curriculum_subject_id);

  ALTER TABLE dbo.student_elective_selections
    ADD CONSTRAINT UQ_student_elective_one_per_group UNIQUE (student_id, elective_group_id);

  CREATE INDEX IX_student_elective_student ON dbo.student_elective_selections(student_id, is_active, selected_at DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.transcript_statuses)
BEGIN
  INSERT INTO dbo.transcript_statuses(status_code, description, is_terminal)
  VALUES
    (N'Draft',N'Draft request',0),
    (N'Submitted',N'Submitted by student',0),
    (N'GradeEntry',N'Grade entry in progress',0),
    (N'ForwardedToHoD',N'Forwarded to HoD',0),
    (N'ForwardedToDean',N'Forwarded to Dean',0),
    (N'Approved',N'Dean approved',0),
    (N'Locked',N'Transcript locked',1),
    (N'Rejected',N'Rejected',1),
    (N'ReturnedToClerk',N'Returned to clerk',0),
    (N'ReturnedToHoD',N'Returned to HoD',0);
END
GO

DELETE FROM dbo.status_transitions;
GO

;WITH S AS (
  SELECT
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'Draft') AS Draft,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'Submitted') AS Submitted,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'GradeEntry') AS GradeEntry,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'ForwardedToHoD') AS FHoD,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'ForwardedToDean') AS FDean,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'Approved') AS Approved,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'Locked') AS Locked,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'Rejected') AS Rejected,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'ReturnedToClerk') AS RClerk,
    (SELECT status_id FROM dbo.transcript_statuses WHERE status_code=N'ReturnedToHoD') AS RHoD,
    (SELECT role_id FROM dbo.roles WHERE role_code=N'Student') AS StudentRole,
    (SELECT role_id FROM dbo.roles WHERE role_code=N'Clerk') AS ClerkRole,
    (SELECT role_id FROM dbo.roles WHERE role_code=N'HoD') AS HoDRole,
    (SELECT role_id FROM dbo.roles WHERE role_code=N'Dean') AS DeanRole
)
INSERT INTO dbo.status_transitions(from_status_id, to_status_id, allowed_role_id)
SELECT Draft, Submitted, StudentRole FROM S
UNION ALL SELECT Submitted, GradeEntry, ClerkRole FROM S
UNION ALL SELECT GradeEntry, FHoD, ClerkRole FROM S
UNION ALL SELECT FHoD, FDean, HoDRole FROM S
UNION ALL SELECT FDean, Approved, DeanRole FROM S
UNION ALL SELECT Approved, Locked, DeanRole FROM S
UNION ALL SELECT FHoD, RClerk, HoDRole FROM S
UNION ALL SELECT FDean, RHoD, DeanRole FROM S
UNION ALL SELECT FDean, Rejected, DeanRole FROM S;
GO

PRINT 'Enterprise schema: students+workflow init done.';
