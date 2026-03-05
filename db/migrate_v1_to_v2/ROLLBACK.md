# Rollback Plan (Instant)

## Goal
Revert the backend to `TranscriptDB_V1` quickly if any V2 issue is discovered.

## Steps
1. Stop the backend API process/service.
2. Change `ConnectionStrings:DefaultConnection` back to `Database=TranscriptDB_V1`.
3. Restart backend API.
4. Verify:
   - Swagger loads
   - OTP request/verify works
   - Student/Clerk dashboard loads

## Notes
- Do NOT delete `TranscriptDB_V2` after rollback.
- Keep logs + V2 data for debugging and re-running migration.
- Because scripts are idempotent, you can fix issues and re-run migration safely.
