using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public static class DbBootstrapper
{
    public static async Task EnsureAdminSchemaAsync(AppDbContext db, CancellationToken ct = default)
    {
        // Keep idempotent. This avoids requiring a full migrations workflow during prototyping.
        var sql = @"
-- Users governance columns
IF COL_LENGTH('dbo.Users', 'IsActive') IS NULL
    ALTER TABLE dbo.Users ADD IsActive bit NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT(1);
IF COL_LENGTH('dbo.Users', 'Locked') IS NULL
    ALTER TABLE dbo.Users ADD Locked bit NOT NULL CONSTRAINT DF_Users_Locked DEFAULT(0);
IF COL_LENGTH('dbo.Users', 'LastLoginAt') IS NULL
    ALTER TABLE dbo.Users ADD LastLoginAt datetimeoffset NULL;
IF COL_LENGTH('dbo.Users', 'DeletedAt') IS NULL
    ALTER TABLE dbo.Users ADD DeletedAt datetimeoffset NULL;

-- Transcripts publishing fields
IF COL_LENGTH('dbo.Transcripts', 'PublishedAt') IS NULL
    ALTER TABLE dbo.Transcripts ADD PublishedAt datetimeoffset NULL;
IF COL_LENGTH('dbo.Transcripts', 'PublishedBy') IS NULL
    ALTER TABLE dbo.Transcripts ADD PublishedBy uniqueidentifier NULL;

-- System settings (key/value)
IF OBJECT_ID('dbo.SystemSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SystemSettings(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_SystemSettings PRIMARY KEY,
        SettingKey nvarchar(120) NOT NULL,
        SettingValue nvarchar(max) NOT NULL,
        UpdatedAt datetimeoffset NOT NULL CONSTRAINT DF_SystemSettings_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedBy uniqueidentifier NULL
    );
    CREATE UNIQUE INDEX UX_SystemSettings_Key ON dbo.SystemSettings(SettingKey);
END

-- Audit logs (append-only)
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
        UserId uniqueidentifier NULL,
        UserLabel nvarchar(200) NOT NULL,
        ActionType nvarchar(50) NOT NULL,
        EntityName nvarchar(120) NOT NULL,
        RecordId nvarchar(80) NULL,
        Success bit NOT NULL CONSTRAINT DF_AuditLogs_Success DEFAULT(1),
        OldValue nvarchar(max) NULL,
        NewValue nvarchar(max) NULL,
        IpAddress nvarchar(45) NULL,
        UserAgent nvarchar(500) NULL,
        CreatedAt datetimeoffset NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs(CreatedAt DESC);
    CREATE INDEX IX_AuditLogs_Action_CreatedAt ON dbo.AuditLogs(ActionType, CreatedAt DESC);
END

-- Faculties
IF OBJECT_ID('dbo.Faculties', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Faculties(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Faculties PRIMARY KEY,
        Code nvarchar(20) NOT NULL,
        Name nvarchar(255) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Faculties_IsActive DEFAULT(1),
        CreatedAt datetimeoffset NOT NULL CONSTRAINT DF_Faculties_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_Faculties_Code ON dbo.Faculties(Code);
END

-- Departments
IF OBJECT_ID('dbo.Departments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Departments(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Departments PRIMARY KEY,
        FacultyId uniqueidentifier NOT NULL,
        Code nvarchar(20) NOT NULL,
        Name nvarchar(255) NOT NULL,
        HodUserId uniqueidentifier NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Departments_IsActive DEFAULT(1),
        CreatedAt datetimeoffset NOT NULL CONSTRAINT DF_Departments_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_Departments_Faculty_Code ON dbo.Departments(FacultyId, Code);
    ALTER TABLE dbo.Departments WITH CHECK ADD CONSTRAINT FK_Departments_Faculties FOREIGN KEY(FacultyId) REFERENCES dbo.Faculties(Id);
END

-- Programs
IF OBJECT_ID('dbo.Programs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Programs(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_Programs PRIMARY KEY,
        DepartmentId uniqueidentifier NULL,
        Code nvarchar(20) NOT NULL,
        Name nvarchar(255) NOT NULL,
        DegreeName nvarchar(120) NOT NULL,
        DurationYears int NOT NULL CONSTRAINT DF_Programs_Duration DEFAULT(4),
        GradingSchemeId uniqueidentifier NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Programs_IsActive DEFAULT(1),
        CreatedAt datetimeoffset NOT NULL CONSTRAINT DF_Programs_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_Programs_Code ON dbo.Programs(Code);
END

-- Curriculum versions
IF OBJECT_ID('dbo.CurriculumVersions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CurriculumVersions(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_CurriculumVersions PRIMARY KEY,
        ProgramId uniqueidentifier NOT NULL,
        AcademicYear nvarchar(20) NOT NULL,
        VersionName nvarchar(40) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_CurriculumVersions_IsActive DEFAULT(1),
        Locked bit NOT NULL CONSTRAINT DF_CurriculumVersions_Locked DEFAULT(0),
        CreatedAt datetimeoffset NOT NULL CONSTRAINT DF_CurriculumVersions_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_CurriculumVersions_UQ ON dbo.CurriculumVersions(ProgramId, AcademicYear, VersionName);
END

-- Grading schemes
IF OBJECT_ID('dbo.GradingSchemes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GradingSchemes(
        Id uniqueidentifier NOT NULL CONSTRAINT PK_GradingSchemes PRIMARY KEY,
        SchemeName nvarchar(120) NOT NULL,
        SchemeType nvarchar(40) NOT NULL,
        MaxGradePoint decimal(4,2) NOT NULL CONSTRAINT DF_GradingSchemes_Max DEFAULT(10),
        IsActive bit NOT NULL CONSTRAINT DF_GradingSchemes_IsActive DEFAULT(1),
        CreatedAt datetimeoffset NOT NULL CONSTRAINT DF_GradingSchemes_CreatedAt DEFAULT (SYSUTCDATETIME())
    );
    CREATE UNIQUE INDEX UX_GradingSchemes_Name ON dbo.GradingSchemes(SchemeName);
END
";

        await db.Database.ExecuteSqlRawAsync(sql, ct);
    }
}

