/*
  99_validation.sql
  Validation: counts + orphan checks + spot checks.
*/
SET NOCOUNT ON;

PRINT '=== COUNT CHECKS (V1 vs V2) ===';
SELECT
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.Users) AS v1_users,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.users) AS v2_users,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.StudentProfiles) AS v1_student_profiles,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.students) AS v2_students,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.student_profiles) AS v2_student_profiles,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.CurriculumSubjects) AS v1_curriculum_subjects,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.curriculum_subjects) AS v2_curriculum_subjects,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.map_curriculum_subjects) AS map_curriculum_subjects,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.TranscriptRequests) AS v1_transcript_requests,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcript_requests) AS v2_transcript_requests,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.TranscriptApprovals) AS v1_transcript_approvals,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcript_approvals) AS v2_transcript_approvals,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.TranscriptDocuments) AS v1_documents,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.student_documents) AS v2_student_documents,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.StudentGradeEntries) AS v1_grade_entries,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.student_marks) AS v2_student_marks,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.Transcripts) AS v1_transcripts,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcripts) AS v2_transcripts,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.TranscriptSemesterSnapshots) AS v1_sem_snaps,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcript_semester_snapshots) AS v2_sem_snaps,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.TranscriptSubjectSnapshots) AS v1_subj_snaps,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.transcript_subject_snapshots) AS v2_subj_snaps,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V1].dbo.AuditLogs) AS v1_audit_logs,
  (SELECT COUNT_BIG(1) FROM [TranscriptDB_V2].dbo.audit_logs) AS v2_audit_logs;

PRINT '=== ORPHAN CHECKS (expected 0 rows each) ===';

PRINT 'student_profiles without students';
SELECT TOP (20) p.student_id
FROM [TranscriptDB_V2].dbo.student_profiles p
LEFT JOIN [TranscriptDB_V2].dbo.students s ON s.student_id = p.student_id
WHERE s.student_id IS NULL;

PRINT 'transcript_requests without students';
SELECT TOP (20) r.transcript_request_id
FROM [TranscriptDB_V2].dbo.transcript_requests r
LEFT JOIN [TranscriptDB_V2].dbo.students s ON s.student_id = r.student_id
WHERE s.student_id IS NULL;

PRINT 'transcript_approvals without request';
SELECT TOP (20) a.transcript_approval_id
FROM [TranscriptDB_V2].dbo.transcript_approvals a
LEFT JOIN [TranscriptDB_V2].dbo.transcript_requests r ON r.transcript_request_id = a.transcript_request_id
WHERE r.transcript_request_id IS NULL;

PRINT 'student_marks without student/curriculum_subject';
SELECT TOP (20) sm.student_mark_id
FROM [TranscriptDB_V2].dbo.student_marks sm
LEFT JOIN [TranscriptDB_V2].dbo.students s ON s.student_id = sm.student_id
LEFT JOIN [TranscriptDB_V2].dbo.curriculum_subjects cs ON cs.curriculum_subject_id = sm.curriculum_subject_id
WHERE s.student_id IS NULL OR cs.curriculum_subject_id IS NULL;

PRINT 'transcript_files without transcript';
SELECT TOP (20) tf.transcript_file_id
FROM [TranscriptDB_V2].dbo.transcript_files tf
LEFT JOIN [TranscriptDB_V2].dbo.transcripts t ON t.transcript_id = tf.transcript_id
WHERE t.transcript_id IS NULL;

PRINT 'semester snapshots without transcript';
SELECT TOP (20) ss.transcript_semester_snapshot_id
FROM [TranscriptDB_V2].dbo.transcript_semester_snapshots ss
LEFT JOIN [TranscriptDB_V2].dbo.transcripts t ON t.transcript_id = ss.transcript_id
WHERE t.transcript_id IS NULL;

PRINT 'subject snapshots without semester snapshot';
SELECT TOP (20) sss.transcript_subject_snapshot_id
FROM [TranscriptDB_V2].dbo.transcript_subject_snapshots sss
LEFT JOIN [TranscriptDB_V2].dbo.transcript_semester_snapshots ss ON ss.transcript_semester_snapshot_id = sss.transcript_semester_snapshot_id
WHERE ss.transcript_semester_snapshot_id IS NULL;

PRINT '=== SPOT CHECKS (top 2 PRNs from V1) ===';

;WITH prns AS (
  SELECT TOP (2) LTRIM(RTRIM(PRN)) AS prn
  FROM [TranscriptDB_V1].dbo.StudentProfiles
  WHERE PRN IS NOT NULL AND LTRIM(RTRIM(PRN)) <> N''
  ORDER BY PRN
)
SELECT
  u.full_name,
  u.email,
  s.prn,
  p.nationality,
  p.date_of_birth,
  prg.program_code,
  (SELECT COUNT(1) FROM [TranscriptDB_V2].dbo.transcript_requests r WHERE r.student_id = s.student_id) AS request_count,
  (SELECT COUNT(1) FROM [TranscriptDB_V2].dbo.student_marks m WHERE m.student_id = s.student_id) AS marks_count,
  (SELECT COUNT(1) FROM [TranscriptDB_V2].dbo.student_documents d WHERE d.student_id = s.student_id) AS docs_count
FROM prns x
JOIN [TranscriptDB_V2].dbo.students s ON s.prn = x.prn
JOIN [TranscriptDB_V2].dbo.users u ON u.user_id = s.user_id
LEFT JOIN [TranscriptDB_V2].dbo.student_profiles p ON p.student_id = s.student_id
LEFT JOIN [TranscriptDB_V2].dbo.programs prg ON prg.program_id = s.program_id;

PRINT '=== Status distribution (V2 transcript_requests) ===';
SELECT ts.status_code, COUNT_BIG(1) AS cnt
FROM [TranscriptDB_V2].dbo.transcript_requests r
JOIN [TranscriptDB_V2].dbo.transcript_statuses ts ON ts.status_id = r.status_id
GROUP BY ts.status_code
ORDER BY cnt DESC;
