using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence.V2;
using Infrastructure.Persistence.V2.Entities;
using Application.Common;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TranscriptRepository : ITranscriptRepository
{
    private readonly V2DbContext _db;
    public TranscriptRepository(V2DbContext db) => _db = db;

    public async Task<Transcript?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var map = await _db.MapTranscripts.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyTranscriptGuid == id, ct);
        if (map is null) return null;

        var row = await _db.Transcripts.AsNoTracking().FirstOrDefaultAsync(x => x.TranscriptId == map.TranscriptId, ct);
        if (row is null) return null;

        var legacyRequest = await _db.MapRequests.AsNoTracking()
            .Where(m => m.TranscriptRequestId == row.TranscriptRequestId)
            .Select(m => (Guid?)m.LegacyRequestGuid)
            .FirstOrDefaultAsync(ct);
        if (!legacyRequest.HasValue) return null;

        var legacyStudent = await ResolveLegacyStudentUserGuidAsync(row.StudentId, ct);
        if (!legacyStudent.HasValue) return null;

        var studentUser = await LoadStudentUserAsync(row.StudentId, ct);
        if (studentUser is null) return null;

        var pdfPath = await _db.TranscriptFiles.AsNoTracking()
            .Where(f => f.TranscriptId == row.TranscriptId && f.FileType == "PDF" && f.IsActive)
            .Select(f => f.StoragePath)
            .FirstOrDefaultAsync(ct) ?? string.Empty;

        var semRows = await _db.TranscriptSemesterSnapshots.AsNoTracking()
            .Where(x => x.TranscriptId == row.TranscriptId)
            .OrderBy(x => x.SemesterNumber)
            .ToListAsync(ct);

        var semIds = semRows.Select(x => x.TranscriptSemesterSnapshotId).ToList();
        var subjRows = semIds.Count == 0
            ? new List<V2TranscriptSubjectSnapshot>()
            : await _db.TranscriptSubjectSnapshots.AsNoTracking()
                .Where(x => semIds.Contains(x.TranscriptSemesterSnapshotId))
                .OrderBy(x => x.TranscriptSemesterSnapshotId)
                .ThenBy(x => x.Sn)
                .ToListAsync(ct);

        var semesters = semRows.Select(s =>
        {
            var sem = new TranscriptSemesterSnapshot
            {
                Id = Guid.NewGuid(),
                TranscriptId = id,
                SemesterNumber = s.SemesterNumber,
                YearTitle = s.YearTitle,
                TermTitle = s.TermTitle,
                CreditPointScheme = s.CreditPointScheme,
                ThHoursTotal = s.ThHoursTotal,
                PrHoursTotal = s.PrHoursTotal,
                ThCreditsTotal = s.ThCreditsTotal,
                PrCreditsTotal = s.PrCreditsTotal,
                ThGradePointsSum = s.ThGradePointsSum,
                PrGradePointsSum = s.PrGradePointsSum,
                ThEarnedTotal = s.ThEarnedTotal,
                PrEarnedTotal = s.PrEarnedTotal,
                ThOutOfTotal = s.ThOutOfTotal,
                PrOutOfTotal = s.PrOutOfTotal,
                SGPA = s.Sgpa,
                SemesterGrade = s.SemesterGrade,
                Result = s.ResultStatus,
                Percentage = s.Percentage,
                EGP = s.Egp
            };

            var subjects = subjRows
                .Where(x => x.TranscriptSemesterSnapshotId == s.TranscriptSemesterSnapshotId)
                .Select(x => new TranscriptSubjectSnapshot
                {
                    Id = Guid.NewGuid(),
                    TranscriptSemesterSnapshotId = sem.Id,
                    SN = x.Sn,
                    SubjectName = x.SubjectName,
                    SubjectCode = x.SubjectCode,
                    ThHours = x.ThHours,
                    PrHours = x.PrHours,
                    ThCredits = x.ThCredits,
                    PrCredits = x.PrCredits,
                    ThGrade = x.ThGradeLetter,
                    PrGrade = x.PrGradeLetter,
                    ThGradePoint = x.ThGradePoint,
                    PrGradePoint = x.PrGradePoint,
                    ThEarned = x.ThEarned,
                    PrEarned = x.PrEarned
                }).ToList();

            sem.Subjects = subjects;
            return sem;
        }).ToList();

        semesters = await AppendMissingCurriculumSemestersAsync(id, row, studentUser, semesters, ct);

        var semFrom = semesters.Count == 0 ? 0 : semesters.Min(x => x.SemesterNumber);
        var semTo = semesters.Count == 0 ? 0 : semesters.Max(x => x.SemesterNumber);

        return new Transcript
        {
            Id = id,
            TranscriptRequestId = legacyRequest.Value,
            StudentId = legacyStudent.Value,
            Student = studentUser,
            ApprovedAt = row.ApprovedAt,
            Locked = row.IsLocked ?? false,
            PublishedAt = row.PublishedAt,
            PublishedBy = row.PublishedByUserId.HasValue ? await ResolveLegacyUserGuidAsync(row.PublishedByUserId.Value, ct) : null,
            PdfPath = pdfPath,
            VerificationSalt = Convert.ToBase64String(row.VerificationSalt ?? Array.Empty<byte>()),
            VerificationHash = Convert.ToBase64String(row.VerificationHash ?? Array.Empty<byte>()),
            CGPA = row.Cgpa,
            SemesterFrom = semFrom,
            SemesterTo = semTo,
            Semesters = semesters
        };
    }

    public async Task<Transcript?> GetByRequestIdAsync(Guid requestId, CancellationToken ct = default)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == requestId, ct);
        if (mr is null) return null;

        var tid = await _db.Transcripts.AsNoTracking()
            .Where(t => t.TranscriptRequestId == mr.TranscriptRequestId)
            .Select(t => (long?)t.TranscriptId)
            .FirstOrDefaultAsync(ct);
        if (!tid.HasValue) return null;

        var legacy = await _db.MapTranscripts.AsNoTracking()
            .Where(m => m.TranscriptId == tid.Value)
            .Select(m => (Guid?)m.LegacyTranscriptGuid)
            .FirstOrDefaultAsync(ct);
        if (!legacy.HasValue) return null;

        return await GetByIdAsync(legacy.Value, ct);
    }

    public async Task<IReadOnlyList<Transcript>> GetApprovedByStudentIdAsync(Guid studentId, CancellationToken ct = default)
    {
        var ms = await _db.MapStudents.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == studentId, ct);
        if (ms is null) return Array.Empty<Transcript>();

        var ids = await _db.Transcripts.AsNoTracking()
            .Where(t => t.StudentId == ms.StudentId)
            .OrderByDescending(t => t.ApprovedAt)
            .Select(t => t.TranscriptId)
            .ToListAsync(ct);

        var legacyIds = await _db.MapTranscripts.AsNoTracking()
            .Where(m => ids.Contains(m.TranscriptId))
            .Select(m => m.LegacyTranscriptGuid)
            .ToListAsync(ct);

        var list = new List<Transcript>();
        foreach (var gid in legacyIds)
        {
            var t = await GetByIdAsync(gid, ct);
            if (t is not null) list.Add(t);
        }
        return list;
    }

    public async Task AddAsync(Transcript transcript, CancellationToken ct = default)
    {
        var mr = await _db.MapRequests.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyRequestGuid == transcript.TranscriptRequestId, ct);
        if (mr is null) throw new InvalidOperationException("Transcript request mapping not found for transcript.");

        var ms = await _db.MapStudents.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == transcript.StudentId, ct);
        if (ms is null) throw new InvalidOperationException("Student mapping not found for transcript.");

        var approverUserId = await ResolveUserIdAsync(transcript.StudentId, ct) ?? await AnyAdminUserIdAsync(ct);

        // pick curriculum_version from program
        var cvId = await _db.Students.AsNoTracking()
            .Where(s => s.StudentId == ms.StudentId)
            .Select(s => s.ProgramId)
            .Where(pid => pid.HasValue)
            .Select(pid => pid!.Value)
            .SelectMany(pid => _db.CurriculumVersions.AsNoTracking().Where(cv => cv.ProgramId == pid).OrderByDescending(cv => cv.IsPublished).ThenByDescending(cv => cv.AcademicYearId).ThenByDescending(cv => cv.VersionNo).Select(cv => cv.CurriculumVersionId).Take(1))
            .FirstOrDefaultAsync(ct);

        if (cvId == 0) cvId = await _db.CurriculumVersions.AsNoTracking().Select(x => x.CurriculumVersionId).FirstAsync(ct);

        var row = new V2Transcript
        {
            TranscriptRequestId = mr.TranscriptRequestId,
            StudentId = ms.StudentId,
            CurriculumVersionId = cvId,
            ApprovedByUserId = approverUserId,
            ApprovedAt = transcript.ApprovedAt == default ? DateTimeOffset.UtcNow : transcript.ApprovedAt,
            LockedAt = transcript.Locked ? (DateTimeOffset?)DateTimeOffset.UtcNow : null,
            // is_locked is computed from locked_at in SQL Server. Do not write to it.
            VerificationSalt = string.IsNullOrWhiteSpace(transcript.VerificationSalt) ? Array.Empty<byte>() : SafeFromBase64(transcript.VerificationSalt),
            VerificationHash = string.IsNullOrWhiteSpace(transcript.VerificationHash) ? Array.Empty<byte>() : SafeFromBase64(transcript.VerificationHash),
            Cgpa = transcript.CGPA,
            Percentage = 0,
            CreditsEarned = 0,
            CreatedAt = DateTimeOffset.UtcNow,
            PublishedAt = transcript.PublishedAt,
            PublishedByUserId = null
        };

        await _db.Transcripts.AddAsync(row, ct);
        await _db.SaveChangesAsync(ct); // identity

        if (!await _db.MapTranscripts.AnyAsync(x => x.LegacyTranscriptGuid == transcript.Id, ct))
        {
            await _db.MapTranscripts.AddAsync(new V2MapTranscript
            {
                LegacyTranscriptGuid = transcript.Id,
                TranscriptId = row.TranscriptId
            }, ct);
        }

        // Semester + subject snapshots
        foreach (var sem in transcript.Semesters ?? new List<TranscriptSemesterSnapshot>())
        {
            var semRow = new V2TranscriptSemesterSnapshot
            {
                TranscriptId = row.TranscriptId,
                SemesterNumber = (byte)Math.Clamp(sem.SemesterNumber, 0, 255),
                YearTitle = sem.YearTitle ?? string.Empty,
                TermTitle = sem.TermTitle ?? string.Empty,
                CreditPointScheme = sem.CreditPointScheme,
                ThHoursTotal = sem.ThHoursTotal,
                PrHoursTotal = sem.PrHoursTotal,
                ThCreditsTotal = sem.ThCreditsTotal,
                PrCreditsTotal = sem.PrCreditsTotal,
                ThGradePointsSum = sem.ThGradePointsSum,
                PrGradePointsSum = sem.PrGradePointsSum,
                ThEarnedTotal = sem.ThEarnedTotal,
                PrEarnedTotal = sem.PrEarnedTotal,
                ThOutOfTotal = sem.ThOutOfTotal,
                PrOutOfTotal = sem.PrOutOfTotal,
                Sgpa = sem.SGPA,
                SemesterGrade = sem.SemesterGrade ?? string.Empty,
                ResultStatus = sem.Result ?? string.Empty,
                Percentage = sem.Percentage,
                Egp = sem.EGP
            };
            await _db.TranscriptSemesterSnapshots.AddAsync(semRow, ct);
            await _db.SaveChangesAsync(ct); // identity for subject snapshots

            foreach (var subj in sem.Subjects ?? new List<TranscriptSubjectSnapshot>())
            {
                await _db.TranscriptSubjectSnapshots.AddAsync(new V2TranscriptSubjectSnapshot
                {
                    TranscriptSemesterSnapshotId = semRow.TranscriptSemesterSnapshotId,
                    Sn = subj.SN,
                    SubjectCode = subj.SubjectCode ?? string.Empty,
                    SubjectName = subj.SubjectName ?? string.Empty,
                    ThHours = subj.ThHours,
                    PrHours = subj.PrHours,
                    ThCredits = subj.ThCredits,
                    PrCredits = subj.PrCredits,
                    ThGradeLetter = subj.ThGrade ?? string.Empty,
                    PrGradeLetter = subj.PrGrade ?? string.Empty,
                    ThGradePoint = subj.ThGradePoint,
                    PrGradePoint = subj.PrGradePoint,
                    ThEarned = subj.ThEarned,
                    PrEarned = subj.PrEarned
                }, ct);
            }
        }
    }

    public async Task UpdateAsync(Transcript transcript, CancellationToken ct = default)
    {
        var map = await _db.MapTranscripts.FirstOrDefaultAsync(x => x.LegacyTranscriptGuid == transcript.Id, ct);
        if (map is null) throw new InvalidOperationException("Transcript mapping not found.");

        var row = await _db.Transcripts.FirstOrDefaultAsync(x => x.TranscriptId == map.TranscriptId, ct);
        if (row is null) throw new InvalidOperationException("Transcript row not found.");

        row.LockedAt = transcript.Locked ? (row.LockedAt ?? DateTimeOffset.UtcNow) : null;
        row.Cgpa = transcript.CGPA;
        if (!string.IsNullOrWhiteSpace(transcript.VerificationSalt)) row.VerificationSalt = SafeFromBase64(transcript.VerificationSalt);
        if (!string.IsNullOrWhiteSpace(transcript.VerificationHash)) row.VerificationHash = SafeFromBase64(transcript.VerificationHash);
        row.PublishedAt = transcript.PublishedAt;
        if (transcript.PublishedBy.HasValue)
        {
            var mu = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == transcript.PublishedBy.Value, ct);
            row.PublishedByUserId = mu?.UserId;
        }

        // Upsert PDF file path into transcript_files
        var pdf = (transcript.PdfPath ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(pdf))
        {
            var f = await _db.TranscriptFiles.FirstOrDefaultAsync(x => x.TranscriptId == row.TranscriptId && x.FileType == "PDF" && x.IsActive, ct);
            if (f is null)
            {
                var by = row.ApprovedByUserId;
                await _db.TranscriptFiles.AddAsync(new V2TranscriptFile
                {
                    TranscriptId = row.TranscriptId,
                    FileType = "PDF",
                    StoragePath = pdf,
                    FileSha256 = null,
                    GeneratedBy = by,
                    GeneratedAt = DateTimeOffset.UtcNow,
                    IsActive = true
                }, ct);
            }
            else
            {
                f.StoragePath = pdf;
            }
        }
    }

    private async Task<User?> LoadStudentUserAsync(long studentId, CancellationToken ct)
    {
        var student = await _db.Students.AsNoTracking().FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        if (student is null) return null;

        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == student.UserId, ct);
        if (u is null) return null;

        var legacy = await _db.MapUsers.AsNoTracking()
            .Where(m => m.UserId == u.UserId)
            .Select(m => (Guid?)m.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);
        if (!legacy.HasValue) return null;

        var roleId = await _db.UserRoles.AsNoTracking()
            .Where(x => x.UserId == u.UserId)
            .Select(x => (short?)x.RoleId)
            .OrderByDescending(x => x)
            .FirstOrDefaultAsync(ct) ?? (short)Domain.Enums.UserRole.Student;

        var user = new User
        {
            Id = legacy.Value,
            FullName = u.FullName ?? string.Empty,
            Email = u.Email ?? string.Empty,
            Mobile = u.Mobile ?? string.Empty,
            Role = Enum.IsDefined(typeof(Domain.Enums.UserRole), (int)roleId) ? (Domain.Enums.UserRole)roleId : Domain.Enums.UserRole.Student,
            IsEmailVerified = u.IsEmailVerified,
            IsMobileVerified = u.IsMobileVerified,
            IsActive = u.IsActive,
            Locked = false,
            DeletedAt = u.DeletedAt,
            CreatedAt = u.CreatedAt
        };

        // attach profile via existing repository pattern is not available here; do minimal fields from V2.
        var profile = await _db.StudentProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.StudentId == student.StudentId, ct);
        var program = student.ProgramId.HasValue ? await _db.Programs.AsNoTracking().FirstOrDefaultAsync(p => p.ProgramId == student.ProgramId.Value, ct) : null;
        var dept = program is not null ? await _db.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.DepartmentId == program.DepartmentId, ct) : null;
        var fac = dept is not null ? await _db.Faculties.AsNoTracking().FirstOrDefaultAsync(f => f.FacultyId == dept.FacultyId, ct) : null;

        user.StudentProfile = new StudentProfile
        {
            Id = user.Id,
            UserId = user.Id,
            PRN = student.Prn ?? string.Empty,
            Program = program?.ProgramCode ?? string.Empty,
            Department = dept?.DeptName ?? string.Empty,
            Faculty = fac?.FacultyName ?? string.Empty,
            AdmissionYear = await ResolveCalendarYearAsync(student.AdmissionYearId, ct),
            GraduationYear = await ResolveCalendarYearAsync(student.GraduationYearId, ct),
            Nationality = profile?.Nationality ?? string.Empty,
            DOB = profile?.DateOfBirthRaw is null ? null : DateOnly.FromDateTime(profile.DateOfBirthRaw.Value),
            BirthPlace = profile?.BirthPlace ?? string.Empty,
            Address = profile?.PermanentAddress ?? string.Empty
        };

        return user;
    }

    private async Task<Guid?> ResolveLegacyStudentUserGuidAsync(long studentId, CancellationToken ct)
    {
        var userId = await _db.Students.AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .Select(s => (long?)s.UserId)
            .FirstOrDefaultAsync(ct);
        if (!userId.HasValue) return null;

        return await _db.MapUsers.AsNoTracking()
            .Where(m => m.UserId == userId.Value)
            .Select(m => (Guid?)m.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<Guid?> ResolveLegacyUserGuidAsync(long userId, CancellationToken ct)
    {
        return await _db.MapUsers.AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => (Guid?)m.LegacyUserGuid)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<long?> ResolveUserIdAsync(Guid legacyUserGuid, CancellationToken ct)
    {
        return await _db.MapUsers.AsNoTracking()
            .Where(m => m.LegacyUserGuid == legacyUserGuid)
            .Select(m => (long?)m.UserId)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<long> AnyAdminUserIdAsync(CancellationToken ct)
    {
        var id = await _db.UserRoles.AsNoTracking()
            .Where(x => x.RoleId == 5)
            .Select(x => (long?)x.UserId)
            .FirstOrDefaultAsync(ct);
        if (id.HasValue) return id.Value;
        return await _db.Users.AsNoTracking().Select(x => x.UserId).FirstAsync(ct);
    }

    private async Task<int?> ResolveCalendarYearAsync(int? academicYearId, CancellationToken ct)
    {
        if (!academicYearId.HasValue) return null;

        return await _db.AcademicYears.AsNoTracking()
            .Where(x => x.AcademicYearId == academicYearId.Value)
            .Select(x => (int?)x.StartDate.Year)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<List<TranscriptSemesterSnapshot>> AppendMissingCurriculumSemestersAsync(
        Guid legacyTranscriptId,
        V2Transcript transcriptRow,
        User studentUser,
        List<TranscriptSemesterSnapshot> existingSemesters,
        CancellationToken ct)
    {
        var profile = studentUser.StudentProfile;
        var current = existingSemesters
            .OrderBy(x => x.SemesterNumber)
            .ToDictionary(x => x.SemesterNumber);

        var curriculumRows = await (
            from cs in _db.CurriculumSubjects.AsNoTracking()
            join sv in _db.SubjectVersions.AsNoTracking() on cs.SubjectVersionId equals sv.SubjectVersionId
            join subj in _db.Subjects.AsNoTracking() on sv.SubjectId equals subj.SubjectId
            where cs.CurriculumVersionId == transcriptRow.CurriculumVersionId && cs.IsActive
            orderby cs.SemesterNumber, cs.DisplayOrder, subj.SubjectCode
            select new
            {
                cs.CurriculumSubjectId,
                SemesterNumber = (int)cs.SemesterNumber,
                SubjectCode = subj.SubjectCode,
                SubjectName = string.IsNullOrWhiteSpace(sv.TitleOnTranscript) ? subj.SubjectName : sv.TitleOnTranscript,
                cs.ThHoursPerWeek,
                cs.PrHoursPerWeek,
                cs.ThCredits,
                cs.PrCredits
            })
            .ToListAsync(ct);

        if (curriculumRows.Count == 0)
            return existingSemesters.OrderBy(x => x.SemesterNumber).ToList();

        var marks = await _db.StudentMarks.AsNoTracking()
            .Where(x => x.StudentId == transcriptRow.StudentId)
            .GroupBy(x => x.CurriculumSubjectId)
            .Select(g => g
                .OrderByDescending(x => x.IsFinal)
                .ThenByDescending(x => x.VerifiedAt ?? x.EnteredAt)
                .FirstOrDefault()!)
            .ToDictionaryAsync(x => x.CurriculumSubjectId, x => x, ct);

        foreach (var semesterGroup in curriculumRows.GroupBy(x => x.SemesterNumber).OrderBy(x => x.Key))
        {
            if (current.ContainsKey(semesterGroup.Key))
                continue;

            var sem = new TranscriptSemesterSnapshot
            {
                Id = Guid.NewGuid(),
                TranscriptId = legacyTranscriptId,
                SemesterNumber = semesterGroup.Key,
                YearTitle = BuildYearTitle(profile?.Program ?? string.Empty, semesterGroup.Key),
                TermTitle = BuildTermTitle(profile?.AdmissionYear, semesterGroup.Key),
                CreditPointScheme = 10
            };

            var sn = 1;
            foreach (var row in semesterGroup)
            {
                marks.TryGetValue(row.CurriculumSubjectId, out var mark);
                var thGrade = (mark?.ThGradeLetter ?? string.Empty).Trim();
                var prGrade = (mark?.PrGradeLetter ?? string.Empty).Trim();
                var thGp = GradeCalc.GradePoint(thGrade);
                var prGp = GradeCalc.GradePoint(prGrade);
                var thEarned = GradeCalc.Round2(row.ThCredits * thGp);
                var prEarned = GradeCalc.Round2(row.PrCredits * prGp);

                sem.Subjects.Add(new TranscriptSubjectSnapshot
                {
                    Id = Guid.NewGuid(),
                    TranscriptSemesterSnapshotId = sem.Id,
                    SN = sn++,
                    SubjectCode = row.SubjectCode,
                    SubjectName = row.SubjectName,
                    ThHours = row.ThHoursPerWeek,
                    PrHours = row.PrHoursPerWeek,
                    ThCredits = row.ThCredits,
                    PrCredits = row.PrCredits,
                    ThGrade = thGrade,
                    PrGrade = prGrade,
                    ThGradePoint = thGp,
                    PrGradePoint = prGp,
                    ThEarned = thEarned,
                    PrEarned = prEarned
                });
            }

            sem.ThHoursTotal = GradeCalc.Round2(sem.Subjects.Sum(x => x.ThHours));
            sem.PrHoursTotal = GradeCalc.Round2(sem.Subjects.Sum(x => x.PrHours));
            sem.ThCreditsTotal = GradeCalc.Round2(sem.Subjects.Sum(x => x.ThCredits));
            sem.PrCreditsTotal = GradeCalc.Round2(sem.Subjects.Sum(x => x.PrCredits));
            sem.ThGradePointsSum = GradeCalc.Round2(sem.Subjects.Sum(x => x.ThGradePoint));
            sem.PrGradePointsSum = GradeCalc.Round2(sem.Subjects.Sum(x => x.PrGradePoint));
            sem.ThEarnedTotal = GradeCalc.Round2(sem.Subjects.Sum(x => x.ThEarned));
            sem.PrEarnedTotal = GradeCalc.Round2(sem.Subjects.Sum(x => x.PrEarned));
            sem.ThOutOfTotal = GradeCalc.ToOutOf(sem.ThCreditsTotal, sem.CreditPointScheme);
            sem.PrOutOfTotal = GradeCalc.ToOutOf(sem.PrCreditsTotal, sem.CreditPointScheme);

            var creditsTotal = sem.ThCreditsTotal + sem.PrCreditsTotal;
            var earnedTotal = sem.ThEarnedTotal + sem.PrEarnedTotal;
            var hasAnyGrades = sem.Subjects.Any(x => !string.IsNullOrWhiteSpace(x.ThGrade) || !string.IsNullOrWhiteSpace(x.PrGrade));

            sem.EGP = GradeCalc.Round2(earnedTotal);
            sem.SGPA = creditsTotal <= 0 || !hasAnyGrades ? 0m : GradeCalc.Round2(earnedTotal / creditsTotal);
            sem.Percentage = hasAnyGrades ? GradeCalc.Round2(sem.SGPA * 10m) : 0m;
            sem.SemesterGrade = hasAnyGrades ? GradeCalc.GradeFromGp(sem.SGPA) : string.Empty;
            sem.Result = !hasAnyGrades
                ? string.Empty
                : sem.Subjects.Any(x => string.Equals((x.ThGrade ?? string.Empty).Trim(), "F", StringComparison.OrdinalIgnoreCase) ||
                                        string.Equals((x.PrGrade ?? string.Empty).Trim(), "F", StringComparison.OrdinalIgnoreCase))
                    ? "FAIL"
                    : "PASS";

            current[semesterGroup.Key] = sem;
        }

        return current.Values.OrderBy(x => x.SemesterNumber).ToList();
    }

    private static string BuildYearTitle(string program, int semesterNumber)
    {
        var yearIndex = ((Math.Max(semesterNumber, 1) - 1) / 2) + 1;
        var yearToken = yearIndex switch
        {
            1 => "BE-I",
            2 => "BE-II",
            3 => "BE-III",
            4 => "BE-IV",
            _ => $"Year-{yearIndex}"
        };

        return string.IsNullOrWhiteSpace(program) ? yearToken : $"{yearToken} ({program})";
    }

    private static string BuildTermTitle(int? admissionYear, int semesterNumber)
    {
        var term = (semesterNumber % 2) == 1 ? "First Semester" : "Second Semester";
        if (!admissionYear.HasValue || admissionYear.Value <= 0)
            return term;

        var yearOffset = (semesterNumber - 1) / 2;
        var fromYear = admissionYear.Value + yearOffset;
        var toYear = fromYear + 1;
        return $"{term} ({fromYear}-{toYear})";
    }

    private static byte[] SafeFromBase64(string s)
    {
        try { return Convert.FromBase64String(s); }
        catch { return Array.Empty<byte>(); }
    }
}
