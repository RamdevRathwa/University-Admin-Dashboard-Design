/*
  01_create_mapping_tables.sql
  Creates deterministic GUID->BIGINT mapping tables in V2.
*/
SET NOCOUNT ON;
USE [TranscriptDB_V2];

IF OBJECT_ID(N'dbo.map_users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.map_users (
    legacy_user_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_users PRIMARY KEY,
    user_id BIGINT NOT NULL CONSTRAINT UQ_map_users_user UNIQUE
  );
END

IF OBJECT_ID(N'dbo.map_students', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.map_students (
    legacy_user_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_students PRIMARY KEY,
    student_id BIGINT NOT NULL CONSTRAINT UQ_map_students_student UNIQUE
  );
END

IF OBJECT_ID(N'dbo.map_requests', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.map_requests (
    legacy_request_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_requests PRIMARY KEY,
    transcript_request_id BIGINT NOT NULL CONSTRAINT UQ_map_requests_req UNIQUE,
    request_no NVARCHAR(64) NULL
  );
END

IF OBJECT_ID(N'dbo.map_transcripts', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.map_transcripts (
    legacy_transcript_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_transcripts PRIMARY KEY,
    transcript_id BIGINT NOT NULL CONSTRAINT UQ_map_transcripts_tr UNIQUE
  );
END

IF OBJECT_ID(N'dbo.map_curriculum_subjects', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.map_curriculum_subjects (
    legacy_curriculum_subject_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_curriculum_subjects PRIMARY KEY,
    curriculum_subject_id BIGINT NOT NULL CONSTRAINT UQ_map_curriculum_subjects_new UNIQUE
  );
END

IF OBJECT_ID(N'dbo.map_documents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.map_documents (
    legacy_document_guid UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_map_documents PRIMARY KEY,
    student_document_id BIGINT NOT NULL CONSTRAINT UQ_map_documents_new UNIQUE
  );
END

-- Sync from existing migration_*_map tables if they exist.
IF OBJECT_ID(N'dbo.migration_user_map', N'U') IS NOT NULL
BEGIN
  MERGE dbo.map_users AS t
  USING (SELECT old_user_guid AS legacy_user_guid, new_user_id AS user_id FROM dbo.migration_user_map) AS s
    ON t.legacy_user_guid = s.legacy_user_guid
  WHEN NOT MATCHED THEN
    INSERT (legacy_user_guid, user_id) VALUES (s.legacy_user_guid, s.user_id);
END

IF OBJECT_ID(N'dbo.migration_student_map', N'U') IS NOT NULL
BEGIN
  MERGE dbo.map_students AS t
  USING (SELECT old_user_guid AS legacy_user_guid, new_student_id AS student_id FROM dbo.migration_student_map) AS s
    ON t.legacy_user_guid = s.legacy_user_guid
  WHEN NOT MATCHED THEN
    INSERT (legacy_user_guid, student_id) VALUES (s.legacy_user_guid, s.student_id);
END

IF OBJECT_ID(N'dbo.migration_request_map', N'U') IS NOT NULL
BEGIN
  MERGE dbo.map_requests AS t
  USING (SELECT old_request_guid AS legacy_request_guid, new_request_id AS transcript_request_id, request_no FROM dbo.migration_request_map) AS s
    ON t.legacy_request_guid = s.legacy_request_guid
  WHEN NOT MATCHED THEN
    INSERT (legacy_request_guid, transcript_request_id, request_no) VALUES (s.legacy_request_guid, s.transcript_request_id, s.request_no);
END

PRINT 'Mapping tables ready.';
