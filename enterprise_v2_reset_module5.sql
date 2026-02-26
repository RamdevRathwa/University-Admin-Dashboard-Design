/*
  Reset module 5/6 tables in TranscriptDB_V2 so they can be recreated cleanly.
  Safe if no data has been migrated yet.

  Run against TranscriptDB_V2.
*/

SET NOCOUNT ON;

IF OBJECT_ID('dbo.transcript_files','U') IS NOT NULL DROP TABLE dbo.transcript_files;
IF OBJECT_ID('dbo.transcript_subject_snapshots','U') IS NOT NULL DROP TABLE dbo.transcript_subject_snapshots;
IF OBJECT_ID('dbo.transcript_semester_snapshots','U') IS NOT NULL DROP TABLE dbo.transcript_semester_snapshots;
IF OBJECT_ID('dbo.transcript_approvals','U') IS NOT NULL DROP TABLE dbo.transcript_approvals;
IF OBJECT_ID('dbo.transcripts','U') IS NOT NULL DROP TABLE dbo.transcripts;
IF OBJECT_ID('dbo.semester_results','U') IS NOT NULL DROP TABLE dbo.semester_results;
IF OBJECT_ID('dbo.student_marks','U') IS NOT NULL DROP TABLE dbo.student_marks;

IF OBJECT_ID('dbo.tr_tss_immutable','TR') IS NOT NULL DROP TRIGGER dbo.tr_tss_immutable;
IF OBJECT_ID('dbo.tr_tsub_immutable','TR') IS NOT NULL DROP TRIGGER dbo.tr_tsub_immutable;

PRINT 'Module 5/6 tables dropped.';

