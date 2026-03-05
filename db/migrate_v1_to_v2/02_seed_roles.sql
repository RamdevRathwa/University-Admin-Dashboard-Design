/*
  02_seed_roles.sql
  Ensures system roles exist with fixed IDs.
*/
SET NOCOUNT ON;
USE [TranscriptDB_V2];

MERGE dbo.roles AS t
USING (VALUES
  (CAST(1 AS SMALLINT), N'Student', N'Student user'),
  (CAST(2 AS SMALLINT), N'Clerk',   N'Clerk (grade entry)'),
  (CAST(3 AS SMALLINT), N'HoD',     N'Head of Department'),
  (CAST(4 AS SMALLINT), N'Dean',    N'Dean (final approval)'),
  (CAST(5 AS SMALLINT), N'Admin',   N'Administrator')
) AS s(role_id, role_name, description)
ON t.role_id = s.role_id
WHEN MATCHED AND (t.role_name <> s.role_name OR ISNULL(t.description,N'') <> ISNULL(s.description,N'')) THEN
  UPDATE SET role_name = s.role_name, description = s.description
WHEN NOT MATCHED THEN
  INSERT (role_id, role_name, description) VALUES (s.role_id, s.role_name, s.description);

PRINT 'Roles seeded/verified.';
