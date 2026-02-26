/*
  Fix up missing foreign keys/constraints when module scripts were executed out of order.
  Safe to run multiple times.

  Run against TranscriptDB_V2.
*/

SET NOCOUNT ON;

/* faculties.dean_user_id -> users */
IF OBJECT_ID(N'dbo.faculties', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_faculties_dean_user')
BEGIN
  ALTER TABLE dbo.faculties
    ADD CONSTRAINT FK_faculties_dean_user
      FOREIGN KEY (dean_user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;
END

/* departments.hod_user_id -> users */
IF OBJECT_ID(N'dbo.departments', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_departments_hod_user')
BEGIN
  ALTER TABLE dbo.departments
    ADD CONSTRAINT FK_departments_hod_user
      FOREIGN KEY (hod_user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;
END

/* curriculum_versions FKs */
IF OBJECT_ID(N'dbo.curriculum_versions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_curriculum_versions_programs')
BEGIN
  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT FK_curriculum_versions_programs
      FOREIGN KEY (program_id) REFERENCES dbo.programs(program_id) ON DELETE NO ACTION;
END

IF OBJECT_ID(N'dbo.curriculum_versions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_curriculum_versions_academic_years')
BEGIN
  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT FK_curriculum_versions_academic_years
      FOREIGN KEY (academic_year_id) REFERENCES dbo.academic_years(academic_year_id) ON DELETE NO ACTION;
END

IF OBJECT_ID(N'dbo.curriculum_versions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_curriculum_versions_created_by')
BEGIN
  ALTER TABLE dbo.curriculum_versions
    ADD CONSTRAINT FK_curriculum_versions_created_by
      FOREIGN KEY (created_by) REFERENCES dbo.users(user_id) ON DELETE NO ACTION;
END

PRINT 'V2 constraint fix done.';

