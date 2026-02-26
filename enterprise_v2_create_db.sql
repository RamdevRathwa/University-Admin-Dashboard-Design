SET NOCOUNT ON;

IF DB_ID(N'TranscriptDB_V2') IS NULL
BEGIN
  PRINT 'Creating database TranscriptDB_V2...';
  EXEC (N'CREATE DATABASE TranscriptDB_V2');
END
ELSE
BEGIN
  PRINT 'Database TranscriptDB_V2 already exists.';
END

