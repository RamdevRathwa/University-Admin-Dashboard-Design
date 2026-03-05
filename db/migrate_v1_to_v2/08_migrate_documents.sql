/*
  08_migrate_documents.sql
  Migrates V1 TranscriptDocuments into V2 student_documents (student-scoped).
  Note: V2 documents are not request-scoped; we preserve storage_path and basic metadata.
*/
SET NOCOUNT ON;

BEGIN TRY
  BEGIN TRAN;

  USE [TranscriptDB_V2];

  IF OBJECT_ID(N'dbo.map_documents', N'U') IS NULL OR OBJECT_ID(N'dbo.map_students', N'U') IS NULL OR OBJECT_ID(N'dbo.map_users', N'U') IS NULL
    THROW 50000, 'Mapping tables missing. Run 01_create_mapping_tables.sql first.', 1;

  DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();

  ;WITH src AS (
    SELECT
      d.Id AS legacy_document_guid,
      d.StudentId AS legacy_student_user_guid,
      d.DocumentType AS document_type_int,
      d.FileName AS file_name,
      d.ContentType AS mime_type,
      d.StoragePath AS storage_path,
      d.UploadedAt AS uploaded_at,
      d.VerifiedBy AS legacy_uploaded_by_guid
    FROM [TranscriptDB_V1].dbo.TranscriptDocuments d
  ), todo AS (
    SELECT s.*
    FROM src s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.map_documents md WHERE md.legacy_document_guid = s.legacy_document_guid)
  )
  INSERT INTO dbo.student_documents (
    student_id,
    document_type,
    file_name,
    mime_type,
    storage_path,
    file_sha256,
    uploaded_at,
    uploaded_by
  )
  OUTPUT todo.legacy_document_guid, inserted.student_document_id
  INTO dbo.map_documents(legacy_document_guid, student_document_id)
  SELECT
    ms.student_id,
    CASE
      WHEN todo.document_type_int = 1 THEN N'Marksheet'
      WHEN todo.document_type_int = 2 THEN N'GovernmentId'
      WHEN todo.document_type_int = 3 THEN N'AuthorityLetter'
      ELSE N'Other'
    END,
    ISNULL(NULLIF(LTRIM(RTRIM(todo.file_name)), N''), N'file'),
    NULLIF(LTRIM(RTRIM(todo.mime_type)), N''),
    ISNULL(NULLIF(LTRIM(RTRIM(todo.storage_path)), N''), N''),
    NULL,
    ISNULL(todo.uploaded_at, @now),
    mu.user_id
  FROM todo
  JOIN dbo.map_students ms ON ms.legacy_user_guid = todo.legacy_student_user_guid
  LEFT JOIN dbo.map_users mu ON mu.legacy_user_guid = todo.legacy_uploaded_by_guid;

  COMMIT;
  PRINT 'Documents migrated.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  DECLARE @msg nvarchar(4000) = ERROR_MESSAGE();
  THROW 50000, @msg, 1;
END CATCH
