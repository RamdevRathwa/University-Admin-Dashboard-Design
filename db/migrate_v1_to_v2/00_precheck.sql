/*
  00_precheck.sql
  Preconditions + safety checks.
*/
SET NOCOUNT ON;

IF DB_ID(N'TranscriptDB_V1') IS NULL
BEGIN
  THROW 50000, 'TranscriptDB_V1 not found on this instance.', 1;
END

IF DB_ID(N'TranscriptDB_V2') IS NULL
BEGIN
  THROW 50000, 'TranscriptDB_V2 not found on this instance.', 1;
END

-- V1 required tables
DECLARE @MissingV1 TABLE (name sysname);
INSERT INTO @MissingV1(name)
SELECT t.name
FROM (VALUES
 (N'Users'),
 (N'StudentProfiles'),
 (N'CurriculumSubjects'),
 (N'TranscriptRequests'),
 (N'TranscriptApprovals'),
 (N'StudentGradeEntries'),
 (N'TranscriptDocuments'),
 (N'Transcripts'),
 (N'TranscriptSemesterSnapshots'),
 (N'TranscriptSubjectSnapshots')
) t(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM [TranscriptDB_V1].sys.tables st
  WHERE st.name = t.name
);

IF EXISTS (SELECT 1 FROM @MissingV1)
BEGIN
  SELECT 'Missing V1 table(s)' AS problem, name FROM @MissingV1;
  THROW 50000, 'Precheck failed: missing required tables in TranscriptDB_V1.', 1;
END

-- V2 required tables
DECLARE @MissingV2 TABLE (name sysname);
INSERT INTO @MissingV2(name)
SELECT t.name
FROM (VALUES
 (N'roles'),
 (N'users'),
 (N'user_roles'),
 (N'students'),
 (N'student_profiles'),
 (N'academic_years'),
 (N'programs'),
 (N'curriculum_versions'),
 (N'subjects'),
 (N'subject_versions'),
 (N'curriculum_subjects'),
 (N'transcript_statuses'),
 (N'status_transitions'),
 (N'transcript_requests'),
 (N'transcript_approvals'),
 (N'student_marks'),
 (N'student_documents'),
 (N'transcripts'),
 (N'transcript_files'),
 (N'transcript_semester_snapshots'),
 (N'transcript_subject_snapshots')
) t(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM [TranscriptDB_V2].sys.tables st
  WHERE st.name = t.name
);

IF EXISTS (SELECT 1 FROM @MissingV2)
BEGIN
  SELECT 'Missing V2 table(s)' AS problem, name FROM @MissingV2;
  THROW 50000, 'Precheck failed: missing required tables in TranscriptDB_V2.', 1;
END

-- Duplicate checks in V1 that would break V2 unique constraints
IF EXISTS (
  SELECT 1
  FROM (
    SELECT LOWER(LTRIM(RTRIM(email))) AS k, COUNT(*) AS c
    FROM [TranscriptDB_V1].dbo.Users
    WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> N''
    GROUP BY LOWER(LTRIM(RTRIM(email)))
  ) x
  WHERE x.c > 1
)
BEGIN
  SELECT 'Duplicate email in V1.Users' AS problem, LOWER(LTRIM(RTRIM(email))) AS email, COUNT(*) AS cnt
  FROM [TranscriptDB_V1].dbo.Users
  WHERE email IS NOT NULL AND LTRIM(RTRIM(email)) <> N''
  GROUP BY LOWER(LTRIM(RTRIM(email)))
  HAVING COUNT(*) > 1;
  THROW 50000, 'Precheck failed: duplicate emails in TranscriptDB_V1.Users.', 1;
END

IF EXISTS (
  SELECT 1
  FROM (
    SELECT LTRIM(RTRIM(mobile)) AS k, COUNT(*) AS c
    FROM [TranscriptDB_V1].dbo.Users
    WHERE mobile IS NOT NULL AND LTRIM(RTRIM(mobile)) <> N''
    GROUP BY LTRIM(RTRIM(mobile))
  ) x
  WHERE x.c > 1
)
BEGIN
  SELECT 'Duplicate mobile in V1.Users (raw)' AS problem, LTRIM(RTRIM(mobile)) AS mobile, COUNT(*) AS cnt
  FROM [TranscriptDB_V1].dbo.Users
  WHERE mobile IS NOT NULL AND LTRIM(RTRIM(mobile)) <> N''
  GROUP BY LTRIM(RTRIM(mobile))
  HAVING COUNT(*) > 1;
  THROW 50000, 'Precheck failed: duplicate mobiles in TranscriptDB_V1.Users.', 1;
END

IF EXISTS (
  SELECT 1
  FROM (
    SELECT LTRIM(RTRIM(prn)) AS k, COUNT(*) AS c
    FROM [TranscriptDB_V1].dbo.StudentProfiles
    WHERE prn IS NOT NULL AND LTRIM(RTRIM(prn)) <> N''
    GROUP BY LTRIM(RTRIM(prn))
  ) x
  WHERE x.c > 1
)
BEGIN
  SELECT 'Duplicate PRN in V1.StudentProfiles' AS problem, LTRIM(RTRIM(prn)) AS prn, COUNT(*) AS cnt
  FROM [TranscriptDB_V1].dbo.StudentProfiles
  WHERE prn IS NOT NULL AND LTRIM(RTRIM(prn)) <> N''
  GROUP BY LTRIM(RTRIM(prn))
  HAVING COUNT(*) > 1;
  THROW 50000, 'Precheck failed: duplicate PRNs in TranscriptDB_V1.StudentProfiles.', 1;
END

-- Status seed check
IF NOT EXISTS (
  SELECT 1 FROM [TranscriptDB_V2].dbo.transcript_statuses
  WHERE status_code IN (N'Draft',N'Submitted',N'GradeEntry',N'ForwardedToHoD',N'ForwardedToDean',N'Approved',N'Locked',N'Rejected',N'ReturnedToClerk',N'ReturnedToHoD')
)
BEGIN
  THROW 50000, 'Precheck failed: transcript_statuses not seeded in TranscriptDB_V2.', 1;
END

DECLARE @V2UserCount bigint = (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.users);
DECLARE @V2MapExists bit = CASE WHEN EXISTS (
  SELECT 1 FROM [TranscriptDB_V2].sys.tables WHERE name IN (N'map_users', N'migration_user_map')
) THEN 1 ELSE 0 END;

PRINT 'V1 counts:';
SELECT
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.Users) AS users,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.StudentProfiles) AS student_profiles,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.TranscriptRequests) AS transcript_requests,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.StudentGradeEntries) AS grade_entries,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.Transcripts) AS transcripts;

PRINT 'V2 counts (current):';
SELECT
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.users) AS users,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.students) AS students,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcript_requests) AS transcript_requests,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.student_marks) AS student_marks,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcripts) AS transcripts;

IF (@V2UserCount > 0 AND @V2MapExists = 0)
BEGIN
  THROW 50000, 'Precheck failed: TranscriptDB_V2 has users but mapping tables are missing. Refusing to proceed.', 1;
END

PRINT 'Precheck OK.';
