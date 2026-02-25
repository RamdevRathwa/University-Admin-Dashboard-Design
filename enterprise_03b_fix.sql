SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.elective_group_subjects','U') IS NOT NULL
BEGIN
  DROP TABLE dbo.elective_group_subjects;
END
GO

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

-- Avoid multiple cascade paths: curriculum_subjects already cascades from curriculum_versions.
ALTER TABLE dbo.elective_group_subjects
  ADD CONSTRAINT FK_egs_curriculum_subjects
    FOREIGN KEY (curriculum_subject_id) REFERENCES dbo.curriculum_subjects(curriculum_subject_id) ON DELETE NO ACTION;

ALTER TABLE dbo.elective_group_subjects
  ADD CONSTRAINT UQ_egs_curriculum_subject UNIQUE (curriculum_subject_id);

ALTER TABLE dbo.elective_group_subjects
  ADD CONSTRAINT UQ_egs_group_subject UNIQUE (elective_group_id, curriculum_subject_id);

CREATE INDEX IX_egs_group ON dbo.elective_group_subjects(elective_group_id, is_active);

PRINT 'Enterprise schema: elective_group_subjects fixed.';
