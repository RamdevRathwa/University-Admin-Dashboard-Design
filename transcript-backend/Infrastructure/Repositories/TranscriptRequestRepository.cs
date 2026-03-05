using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Infrastructure.Persistence.V2.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptRequestRepository : ITranscriptRequestRepository
{
    private readonly V2DbContext _db;
    public TranscriptRequestRepository(V2DbContext db) => _db = db;

    public async Task<TranscriptRequest?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var map = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == id, ct);
        if (map is null) return null;

        var row = await _db.TranscriptRequests.AsNoTracking().FirstOrDefaultAsync(x => x.TranscriptRequestId == map.TranscriptRequestId, ct);
        if (row is null) return null;

        var legacyStudent = await ResolveLegacyStudentUserGuidAsync(row.StudentId, ct);
        if (!legacyStudent.HasValue) return null;

        var statusCode = await _db.TranscriptStatuses.AsNoTracking()
            .Where(s => s.StatusId == row.StatusId)
            .Select(s => s.StatusCode)
            .FirstOrDefaultAsync(ct) ?? "Draft";

        return new TranscriptRequest
        {
            Id = id,
            StudentId = legacyStudent.Value,
            Status = MapStatus(statusCode),
            CurrentStage = MapStage(row.CurrentStageRoleId, statusCode),
            CreatedAt = row.CreatedAt
        };
    }

    public async Task<IReadOnlyList<TranscriptRequest>> GetByStudentIdAsync(Guid studentId, CancellationToken ct = default)
    {
        var ms = await EnsureStudentMapAsync(studentId, ct);
        if (ms is null) return Array.Empty<TranscriptRequest>();

        var rows = await _db.TranscriptRequests.AsNoTracking()
            .Where(x => x.StudentId == ms.StudentId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var statusById = await _db.TranscriptStatuses.AsNoTracking()
            .ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var maps = await _db.MapRequests.AsNoTracking()
            .Where(m => rows.Select(r => r.TranscriptRequestId).Contains(m.TranscriptRequestId))
            .ToListAsync(ct);
        var legacyByNew = maps.ToDictionary(m => m.TranscriptRequestId, m => m.LegacyRequestGuid);

        return rows.Select(r =>
        {
            var statusCode = statusById.TryGetValue(r.StatusId, out var sc) ? sc : "Draft";
            return new TranscriptRequest
            {
                Id = legacyByNew.TryGetValue(r.TranscriptRequestId, out var gid) ? gid : Guid.NewGuid(),
                StudentId = studentId,
                Status = MapStatus(statusCode),
                CurrentStage = MapStage(r.CurrentStageRoleId, statusCode),
                CreatedAt = r.CreatedAt
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<TranscriptRequest>> GetQueueAsync(CancellationToken ct = default)
    {
        var rows = await _db.TranscriptRequests.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(1000)
            .ToListAsync(ct);

        var statusById = await _db.TranscriptStatuses.AsNoTracking()
            .ToDictionaryAsync(x => x.StatusId, x => x.StatusCode, ct);

        var maps = await _db.MapRequests.AsNoTracking()
            .Where(m => rows.Select(r => r.TranscriptRequestId).Contains(m.TranscriptRequestId))
            .ToListAsync(ct);
        var legacyByNew = maps.ToDictionary(m => m.TranscriptRequestId, m => m.LegacyRequestGuid);

        var studentLegacy = new Dictionary<long, Guid?>();

        var result = new List<TranscriptRequest>(rows.Count);
        foreach (var r in rows)
        {
            if (!studentLegacy.TryGetValue(r.StudentId, out var legacyStudent))
            {
                legacyStudent = await ResolveLegacyStudentUserGuidAsync(r.StudentId, ct);
                studentLegacy[r.StudentId] = legacyStudent;
            }
            if (!legacyStudent.HasValue) continue;

            var statusCode = statusById.TryGetValue(r.StatusId, out var sc) ? sc : "Draft";
            result.Add(new TranscriptRequest
            {
                Id = legacyByNew.TryGetValue(r.TranscriptRequestId, out var gid) ? gid : Guid.NewGuid(),
                StudentId = legacyStudent.Value,
                Status = MapStatus(statusCode),
                CurrentStage = MapStage(r.CurrentStageRoleId, statusCode),
                CreatedAt = r.CreatedAt
            });
        }

        return result;
    }

    public async Task AddAsync(TranscriptRequest request, CancellationToken ct = default)
    {
        var ms = await EnsureStudentMapAsync(request.StudentId, ct);
        if (ms is null) throw new InvalidOperationException("Student mapping not found for transcript request.");

        var statusCode = StatusToV2Code(request.Status, request.CurrentStage);
        var statusId = await ResolveStatusIdAsync(statusCode, ct);
        var stageRoleId = (short)MapStageToRoleId(request.CurrentStage);

        var now = request.CreatedAt == default ? DateTimeOffset.UtcNow : request.CreatedAt;

        // dbo.transcript_requests.request_no is NVARCHAR(30) (max_length=60 bytes), so keep it <= 30 chars.
        // Format: "REQ-" + 26 chars = 30.
        var reqNo = request.Id.ToString("N").ToUpperInvariant();
        if (reqNo.Length > 26) reqNo = reqNo.Substring(0, 26);
        reqNo = "REQ-" + reqNo;

        var row = new V2TranscriptRequest
        {
            RequestNo = reqNo,
            StudentId = ms.StudentId,
            StatusId = statusId,
            CurrentStageRoleId = stageRoleId,
            CreatedAt = now,
            SubmittedAt = statusCode == "Draft" ? null : now,
            LockedAt = null,
            LastUpdatedAt = now
        };

        await _db.TranscriptRequests.AddAsync(row, ct);
        await _db.SaveChangesAsync(ct); // identity

        if (!await _db.MapRequests.AnyAsync(x => x.LegacyRequestGuid == request.Id, ct))
        {
            await _db.MapRequests.AddAsync(new V2MapRequest
            {
                LegacyRequestGuid = request.Id,
                TranscriptRequestId = row.TranscriptRequestId,
                RequestNo = row.RequestNo
            }, ct);
        }
    }

    private async Task<V2MapStudent?> EnsureStudentMapAsync(Guid legacyUserGuid, CancellationToken ct)
    {
        var existing = await _db.MapStudents.FirstOrDefaultAsync(x => x.LegacyUserGuid == legacyUserGuid, ct);
        if (existing is not null) return existing;

        // Resolve V2 student_id from legacy guid -> user_id -> students.user_id.
        var userId = await _db.MapUsers.AsNoTracking()
            .Where(m => m.LegacyUserGuid == legacyUserGuid)
            .Select(m => (long?)m.UserId)
            .FirstOrDefaultAsync(ct);
        if (!userId.HasValue) return null;

        var studentId = await _db.Students.AsNoTracking()
            .Where(s => s.UserId == userId.Value)
            .Select(s => (long?)s.StudentId)
            .FirstOrDefaultAsync(ct);
        if (!studentId.HasValue) return null;

        var ms = new V2MapStudent
        {
            LegacyUserGuid = legacyUserGuid,
            StudentId = studentId.Value
        };

        await _db.MapStudents.AddAsync(ms, ct);
        await _db.SaveChangesAsync(ct);
        return ms;
    }

    public async Task UpdateAsync(TranscriptRequest request, CancellationToken ct = default)
    {
        var map = await _db.MapRequests.FirstOrDefaultAsync(x => x.LegacyRequestGuid == request.Id, ct);
        if (map is null) throw new InvalidOperationException("Transcript request mapping not found.");

        var row = await _db.TranscriptRequests.FirstOrDefaultAsync(x => x.TranscriptRequestId == map.TranscriptRequestId, ct);
        if (row is null) throw new InvalidOperationException("Transcript request row not found.");

        var statusCode = StatusToV2Code(request.Status, request.CurrentStage);
        // Guard: on initial submit we flip stage Student->Clerk. Our V2 state machine requires Draft->Submitted first,
        // so do not attempt Draft->GradeEntry in a single update.
        if (row.StatusId == 1 && statusCode == "GradeEntry") statusCode = "Submitted";
        row.StatusId = await ResolveStatusIdAsync(statusCode, ct);
        row.CurrentStageRoleId = (short)MapStageToRoleId(request.CurrentStage);
        row.LastUpdatedAt = DateTimeOffset.UtcNow;

        if (row.SubmittedAt is null && statusCode != "Draft") row.SubmittedAt = DateTimeOffset.UtcNow;
        if (statusCode == "Locked") row.LockedAt = DateTimeOffset.UtcNow;
    }

    private async Task<short> ResolveStatusIdAsync(string statusCode, CancellationToken ct)
    {
        var id = await _db.TranscriptStatuses.AsNoTracking()
            .Where(x => x.StatusCode == statusCode)
            .Select(x => (short?)x.StatusId)
            .FirstOrDefaultAsync(ct);
        if (id.HasValue) return id.Value;
        // fallback to Draft
        return await _db.TranscriptStatuses.AsNoTracking()
            .Where(x => x.StatusCode == "Draft")
            .Select(x => x.StatusId)
            .FirstAsync(ct);
    }

    private async Task<Guid?> ResolveLegacyStudentUserGuidAsync(long studentId, CancellationToken ct)
    {
        // student_id -> user_id -> legacy guid
        var userId = await _db.Students.AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .Select(s => (long?)s.UserId)
            .FirstOrDefaultAsync(ct);
        if (!userId.HasValue) return null;

        var legacy = await _db.MapUsers.AsNoTracking()
            .Where(m => m.UserId == userId.Value)
            .Select(m => (Guid?)m.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);
        return legacy;
    }

    private static TranscriptRequestStatus MapStatus(string v2StatusCode) => v2StatusCode switch
    {
        "Draft" => TranscriptRequestStatus.Draft,
        "Submitted" => TranscriptRequestStatus.Submitted,
        "GradeEntry" => TranscriptRequestStatus.Submitted,
        "ForwardedToHoD" => TranscriptRequestStatus.ForwardedToHoD,
        "ForwardedToDean" => TranscriptRequestStatus.ForwardedToDean,
        "Approved" => TranscriptRequestStatus.Approved,
        "Locked" => TranscriptRequestStatus.Approved,
        "Rejected" => TranscriptRequestStatus.Rejected,
        "ReturnedToClerk" => TranscriptRequestStatus.Submitted,
        "ReturnedToHoD" => TranscriptRequestStatus.ForwardedToHoD,
        _ => TranscriptRequestStatus.Draft
    };

    private static TranscriptStage MapStage(short currentStageRoleId, string v2StatusCode)
    {
        // V2 uses role ids 1..5. Domain stage includes Completed=6.
        if (v2StatusCode == "Locked") return TranscriptStage.Completed;
        return currentStageRoleId switch
        {
            1 => TranscriptStage.Student,
            2 => TranscriptStage.Clerk,
            3 => TranscriptStage.HoD,
            4 => TranscriptStage.Dean,
            5 => TranscriptStage.Admin,
            _ => TranscriptStage.Student
        };
    }

    private static string StatusToV2Code(TranscriptRequestStatus status, TranscriptStage stage)
    {
        return status switch
        {
            TranscriptRequestStatus.Draft => "Draft",
            // V2 distinguishes "Submitted" (student submission) from "GradeEntry" (clerk working state).
            TranscriptRequestStatus.Submitted => stage == TranscriptStage.Student ? "Submitted" : "GradeEntry",
            TranscriptRequestStatus.ForwardedToHoD => "ForwardedToHoD",
            TranscriptRequestStatus.ForwardedToDean => "ForwardedToDean",
            TranscriptRequestStatus.Approved => "Approved",
            TranscriptRequestStatus.Rejected => "Rejected",
            _ => "Draft"
        };
    }

    private static short MapStageToRoleId(TranscriptStage stage) => stage switch
    {
        TranscriptStage.Student => 1,
        TranscriptStage.Clerk => 2,
        TranscriptStage.HoD => 3,
        TranscriptStage.Dean => 4,
        TranscriptStage.Admin => 5,
        TranscriptStage.Completed => 5,
        _ => 1
    };
}
