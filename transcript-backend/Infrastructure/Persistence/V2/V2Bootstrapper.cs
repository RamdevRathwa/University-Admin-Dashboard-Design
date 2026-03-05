using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.V2;

public static class V2Bootstrapper
{
    public static async Task EnsureAppCompatSchemaAsync(V2DbContext db, CancellationToken ct = default)
    {
        // Keep idempotent. This avoids requiring migrations during prototyping.
        // We only ADD missing columns/tables to support the current API contracts.
        var sql = @"
-- Mapping tables (GUID compatibility for existing API contracts)
IF OBJECT_ID('dbo.map_users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.map_users(
        legacy_user_guid uniqueidentifier NOT NULL CONSTRAINT PK_map_users PRIMARY KEY,
        user_id bigint NOT NULL CONSTRAINT UQ_map_users_user UNIQUE
    );
END

IF OBJECT_ID('dbo.map_students', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.map_students(
        legacy_user_guid uniqueidentifier NOT NULL CONSTRAINT PK_map_students PRIMARY KEY,
        student_id bigint NOT NULL CONSTRAINT UQ_map_students_student UNIQUE
    );
END

IF OBJECT_ID('dbo.map_requests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.map_requests(
        legacy_request_guid uniqueidentifier NOT NULL CONSTRAINT PK_map_requests PRIMARY KEY,
        transcript_request_id bigint NOT NULL CONSTRAINT UQ_map_requests_req UNIQUE,
        request_no nvarchar(64) NULL
    );
END

IF OBJECT_ID('dbo.map_transcripts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.map_transcripts(
        legacy_transcript_guid uniqueidentifier NOT NULL CONSTRAINT PK_map_transcripts PRIMARY KEY,
        transcript_id bigint NOT NULL CONSTRAINT UQ_map_transcripts_tr UNIQUE
    );
END

IF OBJECT_ID('dbo.map_curriculum_subjects', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.map_curriculum_subjects(
        legacy_curriculum_subject_guid uniqueidentifier NOT NULL CONSTRAINT PK_map_curriculum_subjects PRIMARY KEY,
        curriculum_subject_id bigint NOT NULL CONSTRAINT UQ_map_curriculum_subjects_new UNIQUE
    );
END

-- Transcript publish fields (admin publishes after Dean approval)
IF COL_LENGTH('dbo.transcripts', 'published_at') IS NULL
    ALTER TABLE dbo.transcripts ADD published_at datetimeoffset NULL;
IF COL_LENGTH('dbo.transcripts', 'published_by_user_id') IS NULL
    ALTER TABLE dbo.transcripts ADD published_by_user_id bigint NULL;

-- Request-scoped document workflow (Pending/Approved/Returned + verification metadata)
IF OBJECT_ID('dbo.transcript_request_documents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.transcript_request_documents(
        transcript_request_document_id bigint NOT NULL IDENTITY(1,1) CONSTRAINT PK_transcript_request_documents PRIMARY KEY,
        legacy_document_guid uniqueidentifier NULL,
        transcript_request_id bigint NOT NULL,
        student_id bigint NOT NULL,
        document_type nvarchar(40) NOT NULL,
        status_code nvarchar(20) NOT NULL CONSTRAINT DF_trd_status DEFAULT(N'Pending'),
        file_name nvarchar(260) NOT NULL,
        mime_type nvarchar(100) NULL,
        size_bytes bigint NOT NULL CONSTRAINT DF_trd_size DEFAULT(0),
        storage_path nvarchar(600) NOT NULL,
        uploaded_at datetimeoffset NOT NULL CONSTRAINT DF_trd_uploaded_at DEFAULT (SYSUTCDATETIME()),
        uploaded_by bigint NULL,
        verified_by bigint NULL,
        verified_at datetimeoffset NULL,
        remarks nvarchar(1000) NULL
    );

    CREATE INDEX IX_trd_request ON dbo.transcript_request_documents(transcript_request_id);
    CREATE INDEX IX_trd_student ON dbo.transcript_request_documents(student_id);
    CREATE INDEX IX_trd_status ON dbo.transcript_request_documents(status_code);
    CREATE UNIQUE INDEX UX_trd_legacy_guid ON dbo.transcript_request_documents(legacy_document_guid) WHERE legacy_document_guid IS NOT NULL;

    ALTER TABLE dbo.transcript_request_documents WITH CHECK ADD CONSTRAINT FK_trd_request
      FOREIGN KEY(transcript_request_id) REFERENCES dbo.transcript_requests(transcript_request_id) ON DELETE CASCADE;

    ALTER TABLE dbo.transcript_request_documents WITH CHECK ADD CONSTRAINT FK_trd_student
      FOREIGN KEY(student_id) REFERENCES dbo.students(student_id) ON DELETE CASCADE;

    ALTER TABLE dbo.transcript_request_documents WITH CHECK ADD CONSTRAINT FK_trd_uploaded_by
      FOREIGN KEY(uploaded_by) REFERENCES dbo.users(user_id);

    ALTER TABLE dbo.transcript_request_documents WITH CHECK ADD CONSTRAINT FK_trd_verified_by
      FOREIGN KEY(verified_by) REFERENCES dbo.users(user_id);
END
";

        await db.Database.ExecuteSqlRawAsync(sql, ct);
    }
}
