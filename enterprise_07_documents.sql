/*
  TranscriptDB_V1 - Documents Module (Student Upload + Clerk Verification)
  Run in SSMS against the correct database before starting the backend.
*/

SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.TranscriptDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TranscriptDocuments
    (
        Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TranscriptDocuments PRIMARY KEY,
        TranscriptRequestId UNIQUEIDENTIFIER NOT NULL,
        StudentId UNIQUEIDENTIFIER NOT NULL,

        DocumentType INT NOT NULL,  -- 1=Marksheet, 2=GovernmentId, 3=AuthorityLetter
        Status INT NOT NULL,        -- 1=Pending, 2=Approved, 3=Returned

        FileName NVARCHAR(260) NOT NULL,
        ContentType NVARCHAR(100) NOT NULL,
        SizeBytes BIGINT NOT NULL,
        StoragePath NVARCHAR(600) NOT NULL,

        UploadedAt DATETIMEOFFSET(7) NOT NULL,
        VerifiedBy UNIQUEIDENTIFIER NULL,
        VerifiedAt DATETIMEOFFSET(7) NULL,
        Remarks NVARCHAR(1000) NULL
    );

    ALTER TABLE dbo.TranscriptDocuments
      ADD CONSTRAINT FK_TranscriptDocuments_TranscriptRequests
      FOREIGN KEY (TranscriptRequestId) REFERENCES dbo.TranscriptRequests(Id)
      ON DELETE CASCADE;

    ALTER TABLE dbo.TranscriptDocuments
      ADD CONSTRAINT FK_TranscriptDocuments_Users_Student
      FOREIGN KEY (StudentId) REFERENCES dbo.Users(Id)
      ON DELETE NO ACTION;

    ALTER TABLE dbo.TranscriptDocuments
      ADD CONSTRAINT FK_TranscriptDocuments_Users_VerifiedBy
      FOREIGN KEY (VerifiedBy) REFERENCES dbo.Users(Id)
      ON DELETE NO ACTION;

    ALTER TABLE dbo.TranscriptDocuments
      ADD CONSTRAINT CK_TranscriptDocuments_DocumentType
      CHECK (DocumentType IN (1,2,3));

    ALTER TABLE dbo.TranscriptDocuments
      ADD CONSTRAINT CK_TranscriptDocuments_Status
      CHECK (Status IN (1,2,3));

    CREATE INDEX IX_TranscriptDocuments_Request_Type
      ON dbo.TranscriptDocuments(TranscriptRequestId, DocumentType);

    CREATE INDEX IX_TranscriptDocuments_Student_Request
      ON dbo.TranscriptDocuments(StudentId, TranscriptRequestId);
END
ELSE
BEGIN
    PRINT 'dbo.TranscriptDocuments already exists. Skipping create.';
END

