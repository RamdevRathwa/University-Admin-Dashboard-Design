/*
  Migrate a subset of data from TranscriptDB_V1 (current app DB) into TranscriptDB_V2 (enterprise schema).

  Notes:
  - V1 uses UNIQUEIDENTIFIER keys; V2 uses BIGINT identity keys.
  - This script creates mapping tables inside V2 to preserve relationships.
  - This does NOT migrate curriculum/grades/transcripts yet (requires curriculum_version mapping).

  Run against TranscriptDB_V2.
*/

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;

/* Mapping tables (V1 GUID -> V2 BIGINT) */
IF OBJECT_ID('dbo.migration_user_map','U') IS NULL
BEGIN
  CREATE TABLE dbo.migration_user_map
  (
    old_user_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_migration_user_map PRIMARY KEY,
    new_user_id   BIGINT NOT NULL CONSTRAINT UQ_migration_user_map_new UNIQUE
  );
END

IF OBJECT_ID('dbo.migration_student_map','U') IS NULL
BEGIN
  CREATE TABLE dbo.migration_student_map
  (
    old_user_guid   UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_migration_student_map PRIMARY KEY,
    new_student_id  BIGINT NOT NULL CONSTRAINT UQ_migration_student_map_new UNIQUE
  );
END

IF OBJECT_ID('dbo.migration_request_map','U') IS NULL
BEGIN
  CREATE TABLE dbo.migration_request_map
  (
    old_request_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_migration_request_map PRIMARY KEY,
    new_request_id   BIGINT NOT NULL CONSTRAINT UQ_migration_request_map_new UNIQUE,
    request_no       NVARCHAR(30) NOT NULL
  );
END

/* 1) Users */
MERGE dbo.users AS tgt
USING
(
  SELECT
    u.Id,
    u.FullName,
    u.Email,
    u.Mobile,
    u.IsEmailVerified,
    u.IsMobileVerified,
    u.CreatedAt
  FROM TranscriptDB_V1.dbo.Users u
  WHERE NOT EXISTS (SELECT 1 FROM dbo.migration_user_map m WHERE m.old_user_guid = u.Id)
) AS src
ON 1 = 0
WHEN NOT MATCHED THEN
  INSERT (full_name, email, mobile, is_email_verified, is_mobile_verified, is_active, deleted_at, created_at, updated_at)
  VALUES
  (
    src.FullName,
    NULLIF(LTRIM(RTRIM(src.Email)), N''),
    NULLIF(LTRIM(RTRIM(src.Mobile)), N''),
    CASE WHEN src.IsEmailVerified = 1 THEN 1 ELSE 0 END,
    CASE WHEN src.IsMobileVerified = 1 THEN 1 ELSE 0 END,
    1,
    NULL,
    CAST(src.CreatedAt AS DATETIMEOFFSET(0)),
    CAST(src.CreatedAt AS DATETIMEOFFSET(0))
  )
OUTPUT src.Id, inserted.user_id INTO dbo.migration_user_map(old_user_guid, new_user_id);

/* 2) User roles (single-role from V1.Role int) */
INSERT INTO dbo.user_roles(user_id, role_id, assigned_at, assigned_by)
SELECT
  m.new_user_id,
  r.role_id,
  SYSUTCDATETIME(),
  NULL
FROM TranscriptDB_V1.dbo.Users u
JOIN dbo.migration_user_map m ON m.old_user_guid = u.Id
JOIN dbo.roles r ON r.role_code =
  CASE u.Role
    WHEN 1 THEN N'Student'
    WHEN 2 THEN N'Clerk'
    WHEN 3 THEN N'HoD'
    WHEN 4 THEN N'Dean'
    WHEN 5 THEN N'Admin'
    ELSE N'Student'
  END
WHERE NOT EXISTS
(
  SELECT 1 FROM dbo.user_roles ur
  WHERE ur.user_id = m.new_user_id AND ur.role_id = r.role_id
);

/* 3) Students + student_profiles from V1.StudentProfiles */
MERGE dbo.students AS tgt
USING
(
  SELECT
    p.UserId,
    um.new_user_id AS new_user_id,
    p.PRN,
    p.Program,
    p.AdmissionYear,
    p.GraduationYear
  FROM TranscriptDB_V1.dbo.StudentProfiles p
  JOIN dbo.migration_user_map um ON um.old_user_guid = p.UserId
  WHERE NOT EXISTS (SELECT 1 FROM dbo.migration_student_map s WHERE s.old_user_guid = p.UserId)
) AS src
ON 1 = 0
WHEN NOT MATCHED THEN
  INSERT (user_id, program_id, prn, admission_year_id, graduation_year_id, is_active, created_at)
  VALUES
  (
    src.new_user_id,
    (SELECT TOP 1 program_id FROM dbo.programs WHERE program_code = NULLIF(LTRIM(RTRIM(src.Program)), N'')),
    NULLIF(LTRIM(RTRIM(src.PRN)), N''),
    (SELECT TOP 1 academic_year_id FROM dbo.academic_years WHERE year_code = CONCAT(src.AdmissionYear, N'-', RIGHT(CONVERT(NVARCHAR(4), src.AdmissionYear + 1), 2))),
    (SELECT TOP 1 academic_year_id FROM dbo.academic_years WHERE year_code = CONCAT(src.GraduationYear, N'-', RIGHT(CONVERT(NVARCHAR(4), src.GraduationYear + 1), 2))),
    1,
    SYSUTCDATETIME()
  )
OUTPUT src.UserId, inserted.student_id INTO dbo.migration_student_map(old_user_guid, new_student_id);

INSERT INTO dbo.student_profiles(student_id, nationality, date_of_birth, birth_place, permanent_address, created_at, updated_at)
SELECT
  sm.new_student_id,
  NULLIF(LTRIM(RTRIM(p.Nationality)), N''),
  TRY_CONVERT(date, p.DOB),
  NULLIF(LTRIM(RTRIM(p.BirthPlace)), N''),
  NULLIF(LTRIM(RTRIM(p.Address)), N''),
  SYSUTCDATETIME(),
  SYSUTCDATETIME()
FROM TranscriptDB_V1.dbo.StudentProfiles p
JOIN dbo.migration_student_map sm ON sm.old_user_guid = p.UserId
WHERE NOT EXISTS (SELECT 1 FROM dbo.student_profiles x WHERE x.student_id = sm.new_student_id);

/* 4) Transcript requests (basic) */
DECLARE @draft SMALLINT = (SELECT status_id FROM dbo.transcript_statuses WHERE status_code = N'Draft');
DECLARE @submitted SMALLINT = (SELECT status_id FROM dbo.transcript_statuses WHERE status_code = N'Submitted');
DECLARE @fhod SMALLINT = (SELECT status_id FROM dbo.transcript_statuses WHERE status_code = N'ForwardedToHoD');
DECLARE @fdea SMALLINT = (SELECT status_id FROM dbo.transcript_statuses WHERE status_code = N'ForwardedToDean');
DECLARE @approved SMALLINT = (SELECT status_id FROM dbo.transcript_statuses WHERE status_code = N'Approved');
DECLARE @rejected SMALLINT = (SELECT status_id FROM dbo.transcript_statuses WHERE status_code = N'Rejected');

DECLARE @rStudent SMALLINT = (SELECT role_id FROM dbo.roles WHERE role_code = N'Student');
DECLARE @rClerk  SMALLINT = (SELECT role_id FROM dbo.roles WHERE role_code = N'Clerk');
DECLARE @rHoD    SMALLINT = (SELECT role_id FROM dbo.roles WHERE role_code = N'HoD');
DECLARE @rDean   SMALLINT = (SELECT role_id FROM dbo.roles WHERE role_code = N'Dean');
DECLARE @rAdmin  SMALLINT = (SELECT role_id FROM dbo.roles WHERE role_code = N'Admin');

MERGE dbo.transcript_requests AS tgt
USING
(
  SELECT
    t.Id,
    t.StudentId,
    t.Status,
    t.CurrentStage,
    t.CreatedAt
  FROM TranscriptDB_V1.dbo.TranscriptRequests t
  WHERE NOT EXISTS (SELECT 1 FROM dbo.migration_request_map m WHERE m.old_request_guid = t.Id)
) AS src
ON 1 = 0
WHEN NOT MATCHED THEN
  INSERT (request_no, student_id, status_id, current_stage_role_id, created_at, submitted_at, locked_at, last_updated_at)
  VALUES
  (
    CONCAT(N'REQ', RIGHT(REPLACE(CONVERT(NVARCHAR(36), src.Id), N'-', N''), 27)),
    (SELECT sm.new_student_id FROM dbo.migration_student_map sm WHERE sm.old_user_guid = src.StudentId),
    CASE src.Status
      WHEN 1 THEN @draft
      WHEN 2 THEN @submitted
      WHEN 3 THEN @fhod
      WHEN 4 THEN @fdea
      WHEN 5 THEN @approved
      WHEN 6 THEN @rejected
      ELSE @draft
    END,
    CASE src.CurrentStage
      WHEN 1 THEN @rStudent
      WHEN 2 THEN @rClerk
      WHEN 3 THEN @rHoD
      WHEN 4 THEN @rDean
      WHEN 5 THEN @rAdmin
      ELSE @rClerk
    END,
    CAST(src.CreatedAt AS DATETIMEOFFSET(0)),
    CASE WHEN src.Status IN (2,3,4,5,6) THEN CAST(src.CreatedAt AS DATETIMEOFFSET(0)) ELSE NULL END,
    NULL,
    CAST(src.CreatedAt AS DATETIMEOFFSET(0))
  )
OUTPUT src.Id, inserted.transcript_request_id, inserted.request_no INTO dbo.migration_request_map(old_request_guid, new_request_id, request_no);

/* 5) Transcript approvals (basic) */
INSERT INTO dbo.transcript_approvals(transcript_request_id, role_id, acted_by_user_id, action_code, remarks, acted_at)
SELECT
  rm.new_request_id,
  r.role_id,
  um.new_user_id,
  CASE a.Action
    WHEN 1 THEN N'Forward'
    WHEN 2 THEN N'Approve'
    WHEN 3 THEN N'Reject'
    ELSE N'Forward'
  END,
  NULLIF(LTRIM(RTRIM(a.Remarks)), N''),
  CAST(a.ActionAt AS DATETIMEOFFSET(0))
FROM TranscriptDB_V1.dbo.TranscriptApprovals a
JOIN dbo.migration_request_map rm ON rm.old_request_guid = a.TranscriptRequestId
JOIN dbo.migration_user_map um ON um.old_user_guid = a.ApprovedBy
JOIN dbo.roles r ON r.role_code =
  CASE a.Role
    WHEN 1 THEN N'Student'
    WHEN 2 THEN N'Clerk'
    WHEN 3 THEN N'HoD'
    WHEN 4 THEN N'Dean'
    WHEN 5 THEN N'Admin'
    ELSE N'Clerk'
  END
WHERE NOT EXISTS
(
  SELECT 1
  FROM dbo.transcript_approvals x
  WHERE x.transcript_request_id = rm.new_request_id
    AND x.acted_at = CAST(a.ActionAt AS DATETIMEOFFSET(0))
    AND x.acted_by_user_id = um.new_user_id
);

PRINT 'V2 migration (users/students/requests/approvals) done.';
