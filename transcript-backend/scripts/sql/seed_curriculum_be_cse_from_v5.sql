SET NOCOUNT ON;
-- Seed CurriculumSubjects for program BE-CSE from CRS_Transcript_CSE_Proposed upto V5.xlsx (sheet V5).
-- Re-running is idempotent by (Program, SemesterNumber, SubjectName).

IF OBJECT_ID('dbo.curriculum_subjects','U') IS NULL
BEGIN
  PRINT 'curriculum_subjects table is missing. Run the init schema script first.';
  RETURN;
END

DECLARE @Program NVARCHAR(100) = N'BE-CSE';

IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=1 AND SubjectName=N'Applied Physics - I')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 1, N'', N'Applied Physics - I', 4.0, 3.0, 4.0, 1.5, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=1 AND SubjectName=N'Applied Mathematics-I')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 1, N'', N'Applied Mathematics-I', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=1 AND SubjectName=N'Fundamentals of Civil and Environmental Engineering')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 1, N'', N'Fundamentals of Civil and Environmental Engineering', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=1 AND SubjectName=N'Engineering Drawing-I')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 1, N'', N'Engineering Drawing-I', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=1 AND SubjectName=N'Workshop Practices')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 1, N'', N'Workshop Practices', 0.0, 2.0, 0.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=1 AND SubjectName=N'Material Science')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 1, N'', N'Material Science', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=2 AND SubjectName=N'Applied Mathematics-II')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 2, N'', N'Applied Mathematics-II', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=2 AND SubjectName=N'Applied Physics-II')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 2, N'', N'Applied Physics-II', 4.0, 3.0, 4.0, 1.5, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=2 AND SubjectName=N'Engineering Mechanics')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 2, N'', N'Engineering Mechanics', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=2 AND SubjectName=N'Programming in C and C++')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 2, N'', N'Programming in C and C++', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=2 AND SubjectName=N'Electrical Engineering & Machines')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 2, N'', N'Electrical Engineering & Machines', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=3 AND SubjectName=N'Applied Mathematics-III')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 3, N'', N'Applied Mathematics-III', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=3 AND SubjectName=N'Combinatorial Methods')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 3, N'', N'Combinatorial Methods', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=3 AND SubjectName=N'Data Structures')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 3, N'', N'Data Structures', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=3 AND SubjectName=N'Object Oriented
Programming with Java')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 3, N'', N'Object Oriented
Programming with Java', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=3 AND SubjectName=N'Electronics Engineering')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 3, N'', N'Electronics Engineering', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=3 AND SubjectName=N'Communication Skills')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 3, N'', N'Communication Skills', 2.0, 2.0, 2.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=4 AND SubjectName=N'Applied Mathematics - IV')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 4, N'', N'Applied Mathematics - IV', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=4 AND SubjectName=N'Database Management System')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 4, N'', N'Database Management System', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=4 AND SubjectName=N'Design and Analysis of Algorithms')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 4, N'', N'Design and Analysis of Algorithms', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=4 AND SubjectName=N'Digital Logic & Design')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 4, N'', N'Digital Logic & Design', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=4 AND SubjectName=N'Analog and Digital Communication')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 4, N'', N'Analog and Digital Communication', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=5 AND SubjectName=N'Basics of Web Programming')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 5, N'', N'Basics of Web Programming', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=5 AND SubjectName=N'Computer Graphics')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 5, N'', N'Computer Graphics', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=5 AND SubjectName=N'Computer Organization')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 5, N'', N'Computer Organization', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=5 AND SubjectName=N'Theory of Computation')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 5, N'', N'Theory of Computation', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=5 AND SubjectName=N'Engineering Economics')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 5, N'', N'Engineering Economics', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=6 AND SubjectName=N'Advance statistical Software')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 6, N'', N'Advance statistical Software', 3.0, 0.0, 3.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=6 AND SubjectName=N'Compiler Design')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 6, N'', N'Compiler Design', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=6 AND SubjectName=N'Computer Network')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 6, N'', N'Computer Network', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=6 AND SubjectName=N'Operating System')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 6, N'', N'Operating System', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=6 AND SubjectName=N'Software Engineer')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 6, N'', N'Software Engineer', 4.0, 0.0, 4.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=6 AND SubjectName=N'Advance Java Technology')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 6, N'', N'Advance Java Technology', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=7 AND SubjectName=N'Minor Project')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 7, N'', N'Minor Project', 5.0, 0.0, 5.0, 0.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=7 AND SubjectName=N'Core Elective-I')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 7, N'', N'Core Elective-I', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=7 AND SubjectName=N'Core Elective-II')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 7, N'', N'Core Elective-II', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=7 AND SubjectName=N'Core Elective-III')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 7, N'', N'Core Elective-III', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
IF NOT EXISTS (SELECT 1 FROM dbo.curriculum_subjects WHERE Program=@Program AND SemesterNumber=7 AND SubjectName=N'Core Elective-IV')
BEGIN
  INSERT INTO dbo.curriculum_subjects (Id, Program, SemesterNumber, SubjectCode, SubjectName, ThHours, PrHours, ThCredits, PrCredits, CreditPointScheme, IsActive)
  VALUES (NEWID(), @Program, 7, N'', N'Core Elective-IV', 4.0, 2.0, 4.0, 1.0, 10, 1);
END
