# Backend Cutover Checklist (V1 -> V2)

## Goal
Switch API runtime from `TranscriptDB_V1` (GUID PKs) to `TranscriptDB_V2` (enterprise schema, BIGINT/INT keys) without changing external API contracts used by the React frontend.

## Recommended Approach (Option 1): V2 DbContext + Compatibility Services
- Keep existing controllers/routes/DTO shapes unchanged.
- Add a new EF Core context: `V2DbContext` pointing at V2 tables.
- Implement V2 repositories/services behind the existing Application interfaces (or add `*V2` implementations and swap DI).
- Replace V1 repository registrations with V2 versions when `UseV2=true`.

## Configuration
- `API/appsettings.json`
  - `ConnectionStrings:DefaultConnection` -> `Database=TranscriptDB_V2`
- CORS (Development)
  - allow `http://localhost:5173`

## Auth (OTP + JWT)
- Users lookup must use:
  - `users.normalized_email` (lowercase email)
  - `users.normalized_mobile` (digits-only)
- Roles must be resolved via:
  - `user_roles` join `roles`
- JWT claims:
  - `sub` = V2 `user_id` (BIGINT)
  - `role` = role_name (or fixed role_id mapped to names)
- OTP tables:
  - Do not migrate V1 OTP rows.
  - New OTPs should write only into V2 `otp_verifications`.

## Core Module Mapping (API Contract Compatibility)

### Student profile
- V1: `StudentProfiles`
- V2:
  - `students` (prn, program_id, admission/graduation year ids)
  - `student_profiles` (nationality, dob, birth_place, address)
- If frontend still expects Faculty/Department/Program strings:
  - resolve via joins: `students.program_id -> programs -> departments -> faculties`.

### Curriculum + subjects
- V1: `CurriculumSubjects`
- V2:
  - `curriculum_versions` (per program + academic year)
  - `curriculum_subjects` (semester rows with credits/hours)
  - `subject_versions` + `subjects` (names/codes)

### Grades
- V1: `StudentGradeEntries`
- V2: `student_marks`
  - join to `curriculum_subjects` for credits/hours
  - letter grades only, grade points derived from grading rules

### Transcript requests + workflow
- V1: `TranscriptRequests`, `TranscriptApprovals`
- V2: `transcript_requests`, `transcript_approvals`
  - enforce transitions using `status_transitions` on the server

### Transcripts + snapshots
- V1: `Transcripts`, `TranscriptSemesterSnapshots`, `TranscriptSubjectSnapshots`
- V2:
  - `transcripts`
  - `transcript_files`
  - `transcript_semester_snapshots`
  - `transcript_subject_snapshots`
- After Dean approval:
  - transcript is locked (`is_locked=1`)
  - no more grade edits allowed

### Documents
- V1: request-scoped `TranscriptDocuments`
- V2 (current): `student_documents` (student-scoped)
- Gap:
  - if you need request-scoped docs later, add `transcript_request_documents` table and map UI to it.

## Implementation Steps (Code)
1. Add `Infrastructure/V2DbContext` + entity configurations for V2.
2. Replace Auth queries to V2 `users` + `user_roles`.
3. Replace Student/Clerk flows to read/write V2 `students`, `transcript_requests`, `student_marks`.
4. Replace transcript download to use V2 `transcript_files` + snapshots.
5. Add server-side workflow guard:
   - check role + allowed transition before updating request status.
6. Run smoke tests:
   - OTP login for Student/Clerk/HoD/Dean/Admin
   - Clerk fetch by PRN, enter grades, submit
   - HoD forward/reject
   - Dean approve -> locked
   - Student sees download

## Data Cutover
- Stop API.
- Run scripts `00` -> `11` -> `99`.
- Start API with V2 connection string.
