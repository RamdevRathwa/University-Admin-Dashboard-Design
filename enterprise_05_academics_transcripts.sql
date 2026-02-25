SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ===========================
   MODULE 5 + 6: GRADES + TRANSCRIPT FREEZE
   =========================== */

IF OBJECT_ID('dbo.student_marks','U') IS NULL
BEGIN
  CREATE TABLE dbo.student_marks
  (
    student_mark_id       BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_student_marks PRIMARY KEY,
    student_id            BIGINT NOT NULL,
    curriculum_subject_id BIGINT NOT NULL,
    attempt_no            TINYINT NOT NULL CONSTRAINT DF_student_marks_attempt DEFAULT (1),
    th_grade_letter       NVARCHAR(10) NULL,
    pr_grade_letter       NVARCHAR(10) NULL,
    entered_by            BIGINT NOT NULL,
    entered_at            DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_student_marks_entered_at DEFAULT (SYSUTCDATETIME()),
    verified_by           BIGINT NULL,
    verified_at           DATETIMEOFFSET(0) NULL,
    is_final              BIT NOT NULL CONSTRAINT DF_student_marks_is_final DEFAULT (0)
  );

  ALTER TABLE dbo.student_marks
    ADD CONSTRAINT FK_student_marks_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE CASCADE;

  ALTER TABLE dbo.student_marks
    ADD CONSTRAINT FK_student_marks_curr_subjects
      FOREIGN KEY (curriculum_subject_id) REFERENCES dbo.curriculum_subjects(curriculum_subject_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.student_marks
    ADD CONSTRAINT FK_student_marks_entered_by
      FOREIGN KEY (entered_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.student_marks
    ADD CONSTRAINT FK_student_marks_verified_by
      FOREIGN KEY (verified_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.student_marks
    ADD CONSTRAINT UQ_student_marks UNIQUE (student_id, curriculum_subject_id, attempt_no);

  ALTER TABLE dbo.student_marks
    ADD CONSTRAINT CK_student_marks_attempt CHECK (attempt_no BETWEEN 1 AND 10);

  CREATE INDEX IX_student_marks_student ON dbo.student_marks(student_id, entered_at DESC);
  CREATE INDEX IX_student_marks_subject ON dbo.student_marks(curriculum_subject_id, student_id);
  CREATE INDEX IX_student_marks_final ON dbo.student_marks(student_id, is_final) INCLUDE (curriculum_subject_id);
END
GO

IF OBJECT_ID('dbo.semester_results','U') IS NULL
BEGIN
  CREATE TABLE dbo.semester_results
  (
    semester_result_id    BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_semester_results PRIMARY KEY,
    student_id            BIGINT NOT NULL,
    curriculum_version_id INT NOT NULL,
    semester_number       TINYINT NOT NULL,
    sgpa                  DECIMAL(6,3) NOT NULL CONSTRAINT DF_semester_results_sgpa DEFAULT (0),
    total_credits         DECIMAL(7,2) NOT NULL CONSTRAINT DF_semester_results_credits DEFAULT (0),
    earned_grade_points   DECIMAL(10,2) NOT NULL CONSTRAINT DF_semester_results_egp DEFAULT (0),
    percentage            DECIMAL(6,2) NOT NULL CONSTRAINT DF_semester_results_pct DEFAULT (0),
    result_status         NVARCHAR(20) NOT NULL CONSTRAINT DF_semester_results_result DEFAULT (N'PASS'),
    computed_at           DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_semester_results_computed_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.semester_results
    ADD CONSTRAINT FK_semester_results_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE CASCADE;

  ALTER TABLE dbo.semester_results
    ADD CONSTRAINT FK_semester_results_curriculum_versions
      FOREIGN KEY (curriculum_version_id) REFERENCES dbo.curriculum_versions(curriculum_version_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.semester_results
    ADD CONSTRAINT UQ_semester_results UNIQUE (student_id, curriculum_version_id, semester_number);

  ALTER TABLE dbo.semester_results
    ADD CONSTRAINT CK_semester_results_sem CHECK (semester_number BETWEEN 1 AND 12);

  ALTER TABLE dbo.semester_results
    ADD CONSTRAINT CK_semester_results_result CHECK (result_status IN (N'PASS',N'FAIL',N'ATKT',N'NA'));

  CREATE INDEX IX_semester_results_student ON dbo.semester_results(student_id, computed_at DESC);
END
GO

IF OBJECT_ID('dbo.transcripts','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcripts
  (
    transcript_id         BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcripts PRIMARY KEY,
    transcript_request_id BIGINT NOT NULL,
    student_id            BIGINT NOT NULL,
    curriculum_version_id INT NOT NULL,
    approved_by_user_id   BIGINT NOT NULL,
    approved_at           DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcripts_approved_at DEFAULT (SYSUTCDATETIME()),
    locked_at             DATETIMEOFFSET(0) NULL,
    is_locked             AS (CASE WHEN locked_at IS NULL THEN CONVERT(bit,0) ELSE CONVERT(bit,1) END) PERSISTED,
    verification_salt     VARBINARY(16) NOT NULL,
    verification_hash     VARBINARY(32) NOT NULL,
    cgpa                  DECIMAL(6,3) NOT NULL,
    percentage            DECIMAL(6,2) NOT NULL,
    credits_earned        DECIMAL(10,2) NOT NULL,
    created_at            DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcripts_created_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.transcripts
    ADD CONSTRAINT UQ_transcripts_request UNIQUE (transcript_request_id);

  ALTER TABLE dbo.transcripts
    ADD CONSTRAINT FK_transcripts_requests
      FOREIGN KEY (transcript_request_id) REFERENCES dbo.transcript_requests(transcript_request_id) ON DELETE CASCADE;

  ALTER TABLE dbo.transcripts
    ADD CONSTRAINT FK_transcripts_students
      FOREIGN KEY (student_id) REFERENCES dbo.students(student_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.transcripts
    ADD CONSTRAINT FK_transcripts_curriculum_versions
      FOREIGN KEY (curriculum_version_id) REFERENCES dbo.curriculum_versions(curriculum_version_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.transcripts
    ADD CONSTRAINT FK_transcripts_approved_by
      FOREIGN KEY (approved_by_user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_transcripts_student ON dbo.transcripts(student_id, approved_at DESC);
END
GO

IF OBJECT_ID('dbo.transcript_semester_snapshots','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcript_semester_snapshots
  (
    transcript_semester_snapshot_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcript_semester_snapshots PRIMARY KEY,
    transcript_id       BIGINT NOT NULL,
    semester_number     TINYINT NOT NULL,
    year_title          NVARCHAR(200) NOT NULL,
    term_title          NVARCHAR(200) NOT NULL,
    credit_point_scheme INT NOT NULL CONSTRAINT DF_tss_scheme DEFAULT (10),
    th_hours_total      DECIMAL(7,2) NOT NULL,
    pr_hours_total      DECIMAL(7,2) NOT NULL,
    th_credits_total    DECIMAL(7,2) NOT NULL,
    pr_credits_total    DECIMAL(7,2) NOT NULL,
    th_grade_points_sum DECIMAL(10,2) NOT NULL,
    pr_grade_points_sum DECIMAL(10,2) NOT NULL,
    th_earned_total     DECIMAL(10,2) NOT NULL,
    pr_earned_total     DECIMAL(10,2) NOT NULL,
    th_out_of_total     DECIMAL(10,2) NOT NULL,
    pr_out_of_total     DECIMAL(10,2) NOT NULL,
    sgpa                DECIMAL(6,3) NOT NULL,
    semester_grade      NVARCHAR(10) NOT NULL,
    result_status       NVARCHAR(20) NOT NULL,
    percentage          DECIMAL(6,2) NOT NULL,
    egp                 DECIMAL(10,2) NOT NULL
  );

  ALTER TABLE dbo.transcript_semester_snapshots
    ADD CONSTRAINT FK_tss_transcripts
      FOREIGN KEY (transcript_id) REFERENCES dbo.transcripts(transcript_id) ON DELETE CASCADE;

  ALTER TABLE dbo.transcript_semester_snapshots
    ADD CONSTRAINT UQ_tss UNIQUE (transcript_id, semester_number);

  ALTER TABLE dbo.transcript_semester_snapshots
    ADD CONSTRAINT CK_tss_sem CHECK (semester_number BETWEEN 1 AND 12);

  ALTER TABLE dbo.transcript_semester_snapshots
    ADD CONSTRAINT CK_tss_result CHECK (result_status IN (N'PASS',N'FAIL',N'ATKT',N'NA'));

  CREATE INDEX IX_tss_transcript ON dbo.transcript_semester_snapshots(transcript_id, semester_number);
END
GO

IF OBJECT_ID('dbo.transcript_subject_snapshots','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcript_subject_snapshots
  (
    transcript_subject_snapshot_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcript_subject_snapshots PRIMARY KEY,
    transcript_semester_snapshot_id BIGINT NOT NULL,
    sn                INT NOT NULL,
    subject_code      NVARCHAR(30) NOT NULL,
    subject_name      NVARCHAR(255) NOT NULL,
    th_hours          DECIMAL(5,2) NOT NULL,
    pr_hours          DECIMAL(5,2) NOT NULL,
    th_credits        DECIMAL(5,2) NOT NULL,
    pr_credits        DECIMAL(5,2) NOT NULL,
    th_grade_letter   NVARCHAR(10) NOT NULL,
    pr_grade_letter   NVARCHAR(10) NOT NULL,
    th_grade_point    DECIMAL(5,2) NOT NULL,
    pr_grade_point    DECIMAL(5,2) NOT NULL,
    th_earned         DECIMAL(10,2) NOT NULL,
    pr_earned         DECIMAL(10,2) NOT NULL
  );

  ALTER TABLE dbo.transcript_subject_snapshots
    ADD CONSTRAINT FK_tsub_tss
      FOREIGN KEY (transcript_semester_snapshot_id) REFERENCES dbo.transcript_semester_snapshots(transcript_semester_snapshot_id) ON DELETE CASCADE;

  ALTER TABLE dbo.transcript_subject_snapshots
    ADD CONSTRAINT UQ_tsub UNIQUE (transcript_semester_snapshot_id, sn);

  CREATE INDEX IX_tsub_tss ON dbo.transcript_subject_snapshots(transcript_semester_snapshot_id, sn);
END
GO

IF OBJECT_ID('dbo.transcript_approvals','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcript_approvals
  (
    transcript_approval_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcript_approvals PRIMARY KEY,
    transcript_request_id  BIGINT NOT NULL,
    role_id                SMALLINT NOT NULL,
    acted_by_user_id       BIGINT NOT NULL,
    action_code            NVARCHAR(30) NOT NULL,
    remarks                NVARCHAR(1000) NULL,
    acted_at               DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcript_approvals_acted_at DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.transcript_approvals
    ADD CONSTRAINT FK_transcript_approvals_requests
      FOREIGN KEY (transcript_request_id) REFERENCES dbo.transcript_requests(transcript_request_id) ON DELETE CASCADE;

  ALTER TABLE dbo.transcript_approvals
    ADD CONSTRAINT FK_transcript_approvals_roles
      FOREIGN KEY (role_id) REFERENCES dbo.roles(role_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.transcript_approvals
    ADD CONSTRAINT FK_transcript_approvals_users
      FOREIGN KEY (acted_by_user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  ALTER TABLE dbo.transcript_approvals
    ADD CONSTRAINT CK_transcript_approvals_action CHECK (action_code IN (N'Forward',N'Approve',N'Reject',N'Return'));

  CREATE INDEX IX_transcript_approvals_request_time ON dbo.transcript_approvals(transcript_request_id, acted_at);
END
GO

IF OBJECT_ID('dbo.transcript_files','U') IS NULL
BEGIN
  CREATE TABLE dbo.transcript_files
  (
    transcript_file_id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_transcript_files PRIMARY KEY,
    transcript_id      BIGINT NOT NULL,
    file_type          NVARCHAR(30) NOT NULL,
    storage_path       NVARCHAR(600) NOT NULL,
    file_sha256        VARBINARY(32) NULL,
    generated_by       BIGINT NOT NULL,
    generated_at       DATETIMEOFFSET(0) NOT NULL CONSTRAINT DF_transcript_files_generated_at DEFAULT (SYSUTCDATETIME()),
    is_active          BIT NOT NULL CONSTRAINT DF_transcript_files_is_active DEFAULT (1)
  );

  ALTER TABLE dbo.transcript_files
    ADD CONSTRAINT FK_transcript_files_transcripts
      FOREIGN KEY (transcript_id) REFERENCES dbo.transcripts(transcript_id) ON DELETE CASCADE;

  ALTER TABLE dbo.transcript_files
    ADD CONSTRAINT FK_transcript_files_generated_by
      FOREIGN KEY (generated_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;

  CREATE INDEX IX_transcript_files_transcript ON dbo.transcript_files(transcript_id, is_active, generated_at DESC);
END
GO

IF OBJECT_ID('dbo.tr_tss_immutable','TR') IS NULL
EXEC('CREATE TRIGGER dbo.tr_tss_immutable
ON dbo.transcript_semester_snapshots
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  RAISERROR(''Transcript semester snapshots are immutable.'', 16, 1);
END');
GO

IF OBJECT_ID('dbo.tr_tsub_immutable','TR') IS NULL
EXEC('CREATE TRIGGER dbo.tr_tsub_immutable
ON dbo.transcript_subject_snapshots
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  RAISERROR(''Transcript subject snapshots are immutable.'', 16, 1);
END');
GO

PRINT 'Enterprise schema: academics+transcripts init done.';
