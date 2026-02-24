SET NOCOUNT ON;

-- Creates the tables required by the current backend (Auth + Student Profile + Transcript Requests + Curriculum + Grade Entry).
-- Safe to run multiple times.

IF OBJECT_ID('dbo.Users','U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    FullName NVARCHAR(120) NOT NULL,
    Email NVARCHAR(254) NOT NULL,
    Mobile NVARCHAR(20) NOT NULL,
    Role INT NOT NULL CONSTRAINT DF_Users_Role DEFAULT (1),
    IsEmailVerified BIT NOT NULL CONSTRAINT DF_Users_IsEmailVerified DEFAULT (0),
    IsMobileVerified BIT NOT NULL CONSTRAINT DF_Users_IsMobileVerified DEFAULT (0),
    CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME())
  );

  CREATE UNIQUE INDEX UX_Users_Email ON dbo.Users(Email);
  CREATE UNIQUE INDEX UX_Users_Mobile ON dbo.Users(Mobile);
END

IF OBJECT_ID('dbo.OtpVerifications','U') IS NULL
BEGIN
  CREATE TABLE dbo.OtpVerifications (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_OtpVerifications PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NULL,
    Identifier NVARCHAR(254) NOT NULL,
    Purpose INT NOT NULL,
    OtpCode NVARCHAR(512) NOT NULL,
    ExpiresAt DATETIMEOFFSET NOT NULL,
    IsUsed BIT NOT NULL CONSTRAINT DF_OtpVerifications_IsUsed DEFAULT (0),
    CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_OtpVerifications_CreatedAt DEFAULT (SYSUTCDATETIME())
  );

  CREATE INDEX IX_OtpVerifications_Lookup ON dbo.OtpVerifications(Identifier, Purpose, IsUsed, ExpiresAt);
  ALTER TABLE dbo.OtpVerifications
    ADD CONSTRAINT FK_OtpVerifications_Users
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE;
END

IF OBJECT_ID('dbo.StudentProfiles','U') IS NULL
BEGIN
  CREATE TABLE dbo.StudentProfiles (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_StudentProfiles PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    PRN NVARCHAR(50) NULL,
    Faculty NVARCHAR(100) NULL,
    Department NVARCHAR(100) NULL,
    Program NVARCHAR(100) NULL,
    AdmissionYear INT NULL,
    GraduationYear INT NULL,
    Nationality NVARCHAR(60) NULL,
    DOB DATE NULL,
    BirthPlace NVARCHAR(120) NULL,
    Address NVARCHAR(500) NULL
  );

  CREATE UNIQUE INDEX UX_StudentProfiles_UserId ON dbo.StudentProfiles(UserId);
  CREATE INDEX IX_StudentProfiles_PRN ON dbo.StudentProfiles(PRN);
  ALTER TABLE dbo.StudentProfiles
    ADD CONSTRAINT FK_StudentProfiles_Users
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE;
END

IF OBJECT_ID('dbo.TranscriptRequests','U') IS NULL
BEGIN
  CREATE TABLE dbo.TranscriptRequests (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TranscriptRequests PRIMARY KEY,
    StudentId UNIQUEIDENTIFIER NOT NULL,
    Status INT NOT NULL CONSTRAINT DF_TranscriptRequests_Status DEFAULT (0),
    CurrentStage INT NOT NULL CONSTRAINT DF_TranscriptRequests_CurrentStage DEFAULT (0),
    CreatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TranscriptRequests_CreatedAt DEFAULT (SYSUTCDATETIME())
  );

  CREATE INDEX IX_TranscriptRequests_Queue ON dbo.TranscriptRequests(StudentId, Status, CreatedAt);
  ALTER TABLE dbo.TranscriptRequests
    ADD CONSTRAINT FK_TranscriptRequests_Users
    FOREIGN KEY (StudentId) REFERENCES dbo.Users(Id);
END

IF OBJECT_ID('dbo.TranscriptApprovals','U') IS NULL
BEGIN
  CREATE TABLE dbo.TranscriptApprovals (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TranscriptApprovals PRIMARY KEY,
    TranscriptRequestId UNIQUEIDENTIFIER NOT NULL,
    Role INT NOT NULL,
    ApprovedBy UNIQUEIDENTIFIER NOT NULL,
    Remarks NVARCHAR(1000) NULL,
    Action INT NOT NULL,
    ActionAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_TranscriptApprovals_ActionAt DEFAULT (SYSUTCDATETIME())
  );

  CREATE INDEX IX_TranscriptApprovals_RequestId ON dbo.TranscriptApprovals(TranscriptRequestId);
  ALTER TABLE dbo.TranscriptApprovals
    ADD CONSTRAINT FK_TranscriptApprovals_TranscriptRequests
    FOREIGN KEY (TranscriptRequestId) REFERENCES dbo.TranscriptRequests(Id) ON DELETE CASCADE;
END

IF OBJECT_ID('dbo.CurriculumSubjects','U') IS NULL
BEGIN
  CREATE TABLE dbo.CurriculumSubjects (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CurriculumSubjects PRIMARY KEY,
    Program NVARCHAR(100) NOT NULL,
    SemesterNumber INT NOT NULL,
    SubjectCode NVARCHAR(30) NULL,
    SubjectName NVARCHAR(255) NOT NULL,
    ThHours DECIMAL(9,2) NOT NULL CONSTRAINT DF_CurriculumSubjects_ThHours DEFAULT (0),
    PrHours DECIMAL(9,2) NOT NULL CONSTRAINT DF_CurriculumSubjects_PrHours DEFAULT (0),
    ThCredits DECIMAL(9,2) NOT NULL CONSTRAINT DF_CurriculumSubjects_ThCredits DEFAULT (0),
    PrCredits DECIMAL(9,2) NOT NULL CONSTRAINT DF_CurriculumSubjects_PrCredits DEFAULT (0),
    CreditPointScheme INT NOT NULL CONSTRAINT DF_CurriculumSubjects_Scheme DEFAULT (10),
    IsActive BIT NOT NULL CONSTRAINT DF_CurriculumSubjects_IsActive DEFAULT (1)
  );

  CREATE INDEX IX_CurriculumSubjects_ProgramSemester ON dbo.CurriculumSubjects(Program, SemesterNumber);
END

IF OBJECT_ID('dbo.StudentGradeEntries','U') IS NULL
BEGIN
  CREATE TABLE dbo.StudentGradeEntries (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_StudentGradeEntries PRIMARY KEY,
    StudentId UNIQUEIDENTIFIER NOT NULL,
    CurriculumSubjectId UNIQUEIDENTIFIER NOT NULL,
    ThGrade NVARCHAR(5) NOT NULL CONSTRAINT DF_StudentGradeEntries_ThGrade DEFAULT (N''),
    PrGrade NVARCHAR(5) NOT NULL CONSTRAINT DF_StudentGradeEntries_PrGrade DEFAULT (N''),
    UpdatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_StudentGradeEntries_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedBy UNIQUEIDENTIFIER NULL
  );

  CREATE UNIQUE INDEX UX_StudentGradeEntries_StudentSubject ON dbo.StudentGradeEntries(StudentId, CurriculumSubjectId);
  ALTER TABLE dbo.StudentGradeEntries
    ADD CONSTRAINT FK_StudentGradeEntries_Users
    FOREIGN KEY (StudentId) REFERENCES dbo.Users(Id) ON DELETE CASCADE;
  ALTER TABLE dbo.StudentGradeEntries
    ADD CONSTRAINT FK_StudentGradeEntries_CurriculumSubjects
    FOREIGN KEY (CurriculumSubjectId) REFERENCES dbo.CurriculumSubjects(Id) ON DELETE CASCADE;
END

IF OBJECT_ID('dbo.Transcripts','U') IS NULL
BEGIN
  CREATE TABLE dbo.Transcripts (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Transcripts PRIMARY KEY,
    TranscriptRequestId UNIQUEIDENTIFIER NOT NULL,
    StudentId UNIQUEIDENTIFIER NOT NULL,
    ApprovedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Transcripts_ApprovedAt DEFAULT (SYSUTCDATETIME()),
    Locked BIT NOT NULL CONSTRAINT DF_Transcripts_Locked DEFAULT (1),
    PdfPath NVARCHAR(600) NULL,
    VerificationSalt NVARCHAR(200) NULL,
    VerificationHash NVARCHAR(200) NULL,
    CGPA DECIMAL(9,2) NOT NULL CONSTRAINT DF_Transcripts_CGPA DEFAULT (0),
    SemesterFrom INT NOT NULL CONSTRAINT DF_Transcripts_SemFrom DEFAULT (1),
    SemesterTo INT NOT NULL CONSTRAINT DF_Transcripts_SemTo DEFAULT (1)
  );

  CREATE UNIQUE INDEX UX_Transcripts_RequestId ON dbo.Transcripts(TranscriptRequestId);
  CREATE INDEX IX_Transcripts_Student ON dbo.Transcripts(StudentId, ApprovedAt);

  ALTER TABLE dbo.Transcripts
    ADD CONSTRAINT FK_Transcripts_TranscriptRequests
    FOREIGN KEY (TranscriptRequestId) REFERENCES dbo.TranscriptRequests(Id) ON DELETE CASCADE;
  ALTER TABLE dbo.Transcripts
    ADD CONSTRAINT FK_Transcripts_Users
    FOREIGN KEY (StudentId) REFERENCES dbo.Users(Id);
END

IF OBJECT_ID('dbo.TranscriptSemesterSnapshots','U') IS NULL
BEGIN
  CREATE TABLE dbo.TranscriptSemesterSnapshots (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TranscriptSemesterSnapshots PRIMARY KEY,
    TranscriptId UNIQUEIDENTIFIER NOT NULL,
    SemesterNumber INT NOT NULL,
    YearTitle NVARCHAR(200) NULL,
    TermTitle NVARCHAR(200) NULL,
    CreditPointScheme INT NOT NULL CONSTRAINT DF_TSS_Scheme DEFAULT (10),
    SGPA DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_SGPA DEFAULT (0),
    SemesterGrade NVARCHAR(10) NULL,
    Result NVARCHAR(20) NULL,
    Percentage DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_Percentage DEFAULT (0),
    EGP DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_EGP DEFAULT (0),
    ThHoursTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_ThHours DEFAULT (0),
    PrHoursTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_PrHours DEFAULT (0),
    ThCreditsTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_ThCredits DEFAULT (0),
    PrCreditsTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_PrCredits DEFAULT (0),
    ThGradePointsSum DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_ThGPSum DEFAULT (0),
    PrGradePointsSum DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_PrGPSum DEFAULT (0),
    ThEarnedTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_ThEarned DEFAULT (0),
    PrEarnedTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_PrEarned DEFAULT (0),
    ThOutOfTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_ThOut DEFAULT (0),
    PrOutOfTotal DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSS_PrOut DEFAULT (0)
  );

  CREATE UNIQUE INDEX UX_TSS_TranscriptSemester ON dbo.TranscriptSemesterSnapshots(TranscriptId, SemesterNumber);
  ALTER TABLE dbo.TranscriptSemesterSnapshots
    ADD CONSTRAINT FK_TSS_Transcripts
    FOREIGN KEY (TranscriptId) REFERENCES dbo.Transcripts(Id) ON DELETE CASCADE;
END

IF OBJECT_ID('dbo.TranscriptSubjectSnapshots','U') IS NULL
BEGIN
  CREATE TABLE dbo.TranscriptSubjectSnapshots (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TranscriptSubjectSnapshots PRIMARY KEY,
    TranscriptSemesterSnapshotId UNIQUEIDENTIFIER NOT NULL,
    SN INT NOT NULL,
    SubjectName NVARCHAR(255) NULL,
    SubjectCode NVARCHAR(30) NULL,
    ThHours DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_ThHours DEFAULT (0),
    PrHours DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_PrHours DEFAULT (0),
    ThCredits DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_ThCredits DEFAULT (0),
    PrCredits DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_PrCredits DEFAULT (0),
    ThGrade NVARCHAR(5) NULL,
    PrGrade NVARCHAR(5) NULL,
    ThGradePoint DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_ThGP DEFAULT (0),
    PrGradePoint DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_PrGP DEFAULT (0),
    ThEarned DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_ThEarned DEFAULT (0),
    PrEarned DECIMAL(9,2) NOT NULL CONSTRAINT DF_TSub_PrEarned DEFAULT (0)
  );

  CREATE UNIQUE INDEX UX_TSub_SemSN ON dbo.TranscriptSubjectSnapshots(TranscriptSemesterSnapshotId, SN);
  ALTER TABLE dbo.TranscriptSubjectSnapshots
    ADD CONSTRAINT FK_TSub_TSS
    FOREIGN KEY (TranscriptSemesterSnapshotId) REFERENCES dbo.TranscriptSemesterSnapshots(Id) ON DELETE CASCADE;
END

PRINT 'Schema init done.';
