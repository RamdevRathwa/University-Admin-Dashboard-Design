# Effort Estimate + Risk List

## Estimate (realistic)
- SQL migration scripts (done): 0.5 day including verification
- Backend refactor to V2 DbContext + repos (keeping API contracts): 3-7 days
  - Auth + RBAC: 0.5-1 day
  - Student + transcript request flows: 1-2 days
  - Clerk grade entry + marks persistence: 1-2 days
  - HoD/Dean workflow + status transitions: 0.5-1.5 days
  - Transcript download wiring to transcript_files + snapshots: 0.5-1 day
- End-to-end testing + bugfix: 1-3 days

## Top Risks
1. GUID -> BIGINT refactor
   - Any lingering GUID assumptions in JWT claims, repositories, DTO mapping.
2. Curriculum ambiguity in V1
   - V1 lacks explicit curriculum version + academic year; V2 import uses an assumption (Imported V1, version_no=1).
3. Document scoping mismatch
   - V1 request-scoped documents vs V2 student-scoped documents.
4. Workflow status mapping
   - V1 int status meanings must be confirmed; script uses a best-effort mapping.
5. Transcript verification salt/hash
   - V1 stored as strings; V2 requires varbinary. Script uses safe hashing fallback.

## Mitigations
- Run `99_validation.sql` and spot-check at least 2 PRNs end-to-end.
- Keep V1 connection string ready (instant rollback).
- Add a feature flag `UseV2` (config) to swap repositories cleanly.
- Confirm V1 status enum values in code before final migration.
