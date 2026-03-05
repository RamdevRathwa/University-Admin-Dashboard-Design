# TranscriptDB_V1 -> TranscriptDB_V2 Migration

This folder contains ordered, repeatable SQL scripts to migrate data from `TranscriptDB_V1` (GUID PKs) to `TranscriptDB_V2` (enterprise 3NF, BIGINT/INT keys) on the same SQL Server instance.

## Run Order
1. `00_precheck.sql`
2. `01_create_mapping_tables.sql`
3. `02_seed_roles.sql`
4. `03_migrate_users.sql`
5. `04_migrate_students_profiles.sql`
6. `05_migrate_institution.sql`
7. `06_migrate_curriculum_versioning.sql`
8. `07_migrate_transcript_requests.sql`
9. `08_migrate_documents.sql`
10. `09_migrate_grades.sql`
11. `10_migrate_transcripts_snapshots.sql`
12. `11_migrate_audit_logs.sql`
13. `99_validation.sql`

## Safety
- Scripts do NOT drop/alter `TranscriptDB_V1`.
- Scripts are written to be re-runnable (idempotent) using mapping tables + `NOT EXISTS` guards.
- Recommended: stop the API during steps 03-10 to avoid concurrent writes.

## Rollback (Fast)
- Switch backend connection string back to `TranscriptDB_V1` and restart API.
- Do NOT delete `TranscriptDB_V2`; keep it for investigation.

## Notes
- OTP rows are not migrated (treat as expired). Users are migrated.
- If V1 lacks master data (faculty/department/program), placeholder rows are created in V2 to satisfy FK integrity.
