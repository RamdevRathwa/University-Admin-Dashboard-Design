SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.tr_tsub_immutable','TR') IS NOT NULL DROP TRIGGER dbo.tr_tsub_immutable;
IF OBJECT_ID('dbo.tr_tss_immutable','TR') IS NOT NULL DROP TRIGGER dbo.tr_tss_immutable;
GO

IF OBJECT_ID('dbo.transcript_subject_snapshots','U') IS NOT NULL DROP TABLE dbo.transcript_subject_snapshots;
IF OBJECT_ID('dbo.transcript_semester_snapshots','U') IS NOT NULL DROP TABLE dbo.transcript_semester_snapshots;
GO

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
    FOREIGN KEY (transcript_id) REFERENCES dbo.transcripts(transcript_id) ON DELETE NO ACTION;

ALTER TABLE dbo.transcript_semester_snapshots
  ADD CONSTRAINT UQ_tss UNIQUE (transcript_id, semester_number);

ALTER TABLE dbo.transcript_semester_snapshots
  ADD CONSTRAINT CK_tss_sem CHECK (semester_number BETWEEN 1 AND 12);

ALTER TABLE dbo.transcript_semester_snapshots
  ADD CONSTRAINT CK_tss_result CHECK (result_status IN (N'PASS',N'FAIL',N'ATKT',N'NA'));

CREATE INDEX IX_tss_transcript ON dbo.transcript_semester_snapshots(transcript_id, semester_number);
GO

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
    FOREIGN KEY (transcript_semester_snapshot_id) REFERENCES dbo.transcript_semester_snapshots(transcript_semester_snapshot_id) ON DELETE NO ACTION;

ALTER TABLE dbo.transcript_subject_snapshots
  ADD CONSTRAINT UQ_tsub UNIQUE (transcript_semester_snapshot_id, sn);

CREATE INDEX IX_tsub_tss ON dbo.transcript_subject_snapshots(transcript_semester_snapshot_id, sn);
GO

CREATE TRIGGER dbo.tr_tss_immutable
ON dbo.transcript_semester_snapshots
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  RAISERROR('Transcript semester snapshots are immutable.', 16, 1);
END
GO

CREATE TRIGGER dbo.tr_tsub_immutable
ON dbo.transcript_subject_snapshots
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  RAISERROR('Transcript subject snapshots are immutable.', 16, 1);
END
GO

PRINT 'Transcript snapshot immutability enforced.';
