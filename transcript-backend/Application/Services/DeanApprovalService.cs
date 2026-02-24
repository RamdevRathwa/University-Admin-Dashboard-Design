using Application.Common;
using Application.DTOs.Approvals;
using Application.DTOs.Clerk.GradeEntry;
using Application.DTOs.Dean;
using Application.DTOs.Transcripts;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class DeanApprovalService : IDeanApprovalService
{
    private readonly ICurrentUserService _current;
    private readonly IUserRepository _users;
    private readonly IStudentProfileRepository _profiles;
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IStudentGradeEntryRepository _grades;
    private readonly ITranscriptRequestRepository _requests;
    private readonly ITranscriptApprovalRepository _approvals;
    private readonly ITranscriptRepository _transcripts;
    private readonly ITranscriptPdfService _pdf;
    private readonly IUnitOfWork _uow;

    public DeanApprovalService(
        ICurrentUserService current,
        IUserRepository users,
        IStudentProfileRepository profiles,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades,
        ITranscriptRequestRepository requests,
        ITranscriptApprovalRepository approvals,
        ITranscriptRepository transcripts,
        ITranscriptPdfService pdf,
        IUnitOfWork uow)
    {
        _current = current;
        _users = users;
        _profiles = profiles;
        _curriculum = curriculum;
        _grades = grades;
        _requests = requests;
        _approvals = approvals;
        _transcripts = transcripts;
        _pdf = pdf;
        _uow = uow;
    }

    public async Task<IReadOnlyList<TranscriptRequestDto>> PendingAsync(CancellationToken ct = default)
    {
        EnsureDean();
        var list = await _requests.GetQueueAsync(ct);
        return list
            .Where(x => x.Status == TranscriptRequestStatus.ForwardedToDean && x.CurrentStage == TranscriptStage.Dean)
            .Select(Map)
            .ToList();
    }

    public async Task<TranscriptRequestDto> GetAsync(Guid requestId, CancellationToken ct = default)
    {
        EnsureDean();
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        return Map(req);
    }

    public async Task<Guid> FinalApproveAsync(Guid requestId, string? remarks, CancellationToken ct = default)
    {
        EnsureDean();
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.ForwardedToDean || req.CurrentStage != TranscriptStage.Dean)
            throw new AppException("Only requests forwarded to Dean can be approved.", 400, "invalid_status");

        var existing = await _transcripts.GetByRequestIdAsync(req.Id, ct);
        if (existing is not null) throw new AppException("Transcript already generated for this request.", 400, "already_generated");

        var student = await _users.GetByIdAsync(req.StudentId, ct);
        if (student is null) throw AppException.NotFound("Student not found.");

        var profile = await _profiles.GetByUserIdAsync(student.Id, ct);
        if (profile is null) throw new AppException("Student profile missing.", 400, "profile_missing");
        if (string.IsNullOrWhiteSpace(profile.Program))
            throw new AppException("Student program missing.", 400, "profile_program_missing");

        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        if (subjects.Count == 0)
            throw new AppException($"No curriculum found for program '{profile.Program}'.", 400, "curriculum_missing");

        var gradeEntries = await _grades.GetByStudentIdAsync(student.Id, ct);
        var geMap = gradeEntries.ToDictionary(x => x.CurriculumSubjectId, x => x);

        // Ensure all required grades exist.
        foreach (var s in subjects)
        {
            geMap.TryGetValue(s.Id, out var ge);
            var th = (ge?.ThGrade ?? string.Empty).Trim();
            var pr = (ge?.PrGrade ?? string.Empty).Trim();
            if (GradeCalc.IsGradeMissing(th, s.ThCredits)) throw new AppException($"Missing TH grade for {s.SubjectCode}.", 400, "grade_missing");
            if (GradeCalc.IsGradeMissing(pr, s.PrCredits)) throw new AppException($"Missing PR grade for {s.SubjectCode}.", 400, "grade_missing");
        }

        var transcript = new Transcript
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            StudentId = student.Id,
            ApprovedAt = DateTimeOffset.UtcNow,
            Locked = true
        };

        var semesters = subjects
            .GroupBy(x => x.SemesterNumber)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var semNo = g.Key;
                var scheme = g.Select(x => x.CreditPointScheme).FirstOrDefault();

                var yearTitle = BuildYearTitle(profile.Program ?? string.Empty, profile.AdmissionYear, semNo);
                var termTitle = BuildTermTitle(profile.AdmissionYear, semNo);

                var sem = new TranscriptSemesterSnapshot
                {
                    Id = Guid.NewGuid(),
                    TranscriptId = transcript.Id,
                    SemesterNumber = semNo,
                    YearTitle = yearTitle,
                    TermTitle = termTitle,
                    CreditPointScheme = scheme == 0 ? 10 : scheme
                };

                var list = g.OrderBy(x => x.SubjectCode).ThenBy(x => x.SubjectName).ToList();

                var sn = 1;
                foreach (var s in list)
                {
                    geMap.TryGetValue(s.Id, out var ge);
                    var thGrade = (ge?.ThGrade ?? string.Empty).Trim();
                    var prGrade = (ge?.PrGrade ?? string.Empty).Trim();

                    var thGp = GradeCalc.GradePoint(thGrade);
                    var prGp = GradeCalc.GradePoint(prGrade);
                    var thEarned = GradeCalc.Round2(s.ThCredits * thGp);
                    var prEarned = GradeCalc.Round2(s.PrCredits * prGp);

                    sem.Subjects.Add(new TranscriptSubjectSnapshot
                    {
                        Id = Guid.NewGuid(),
                        TranscriptSemesterSnapshotId = sem.Id,
                        SN = sn++,
                        SubjectName = s.SubjectName,
                        SubjectCode = s.SubjectCode,
                        ThHours = s.ThHours,
                        PrHours = s.PrHours,
                        ThCredits = s.ThCredits,
                        PrCredits = s.PrCredits,
                        ThGrade = thGrade,
                        PrGrade = prGrade,
                        ThGradePoint = thGp,
                        PrGradePoint = prGp,
                        ThEarned = thEarned,
                        PrEarned = prEarned
                    });
                }

                // Totals used by the official table
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
                sem.EGP = GradeCalc.Round2(earnedTotal);
                sem.SGPA = creditsTotal <= 0 ? 0m : GradeCalc.Round2(earnedTotal / creditsTotal);
                sem.Percentage = GradeCalc.Round2(sem.SGPA * 10m);
                sem.SemesterGrade = GradeCalc.GradeFromGp(sem.SGPA);
                sem.Result = sem.Subjects.Any(x => (x.ThGrade ?? "").Trim().ToUpperInvariant() == "F" || (x.PrGrade ?? "").Trim().ToUpperInvariant() == "F")
                    ? "FAIL"
                    : "PASS";

                return sem;
            })
            .ToList();

        foreach (var s in semesters) transcript.Semesters.Add(s);

        transcript.SemesterFrom = semesters.Count == 0 ? 1 : semesters.Min(x => x.SemesterNumber);
        transcript.SemesterTo = semesters.Count == 0 ? 1 : semesters.Max(x => x.SemesterNumber);

        var totalCredits = semesters.Sum(x => x.ThCreditsTotal + x.PrCreditsTotal);
        var totalEarned = semesters.Sum(x => x.ThEarnedTotal + x.PrEarnedTotal);
        transcript.CGPA = totalCredits <= 0 ? 0m : GradeCalc.Round2(totalEarned / totalCredits);

        await _transcripts.AddAsync(transcript, ct);

        req.Status = TranscriptRequestStatus.Approved;
        req.CurrentStage = TranscriptStage.Completed;
        await _requests.UpdateAsync(req, ct);

        await _approvals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            Role = UserRole.Dean,
            ApprovedBy = _current.UserId,
            Remarks = (remarks ?? string.Empty).Trim(),
            Action = ApprovalAction.Approve,
            ActionAt = DateTimeOffset.UtcNow
        }, ct);

        await _uow.SaveChangesAsync(ct);

        var (relativePath, verificationCode) = await _pdf.GeneratePdfAsync(transcript.Id, ct);
        transcript.PdfPath = relativePath;
        await _transcripts.UpdateAsync(transcript, ct);
        await _uow.SaveChangesAsync(ct);

        // verificationCode is returned to Dean controller if you want to display/log it later.
        _ = verificationCode;

        return transcript.Id;
    }

    public async Task ReturnToHoDAsync(Guid requestId, string remarks, CancellationToken ct = default)
    {
        EnsureDean();
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.ForwardedToDean || req.CurrentStage != TranscriptStage.Dean)
            throw new AppException("Only Dean-stage requests can be returned to HoD.", 400, "invalid_status");

        var r = (remarks ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(r)) throw new AppException("Remarks are required.", 400, "remarks_required");

        req.Status = TranscriptRequestStatus.ForwardedToHoD;
        req.CurrentStage = TranscriptStage.HoD;

        await _requests.UpdateAsync(req, ct);
        await _approvals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            Role = UserRole.Dean,
            ApprovedBy = _current.UserId,
            Remarks = r,
            Action = ApprovalAction.Forward,
            ActionAt = DateTimeOffset.UtcNow
        }, ct);

        await _uow.SaveChangesAsync(ct);
    }

    public async Task RejectAsync(Guid requestId, string remarks, CancellationToken ct = default)
    {
        EnsureDean();
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.ForwardedToDean || req.CurrentStage != TranscriptStage.Dean)
            throw new AppException("Only Dean-stage requests can be rejected.", 400, "invalid_status");

        var r = (remarks ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(r)) throw new AppException("Remarks are required.", 400, "remarks_required");

        req.Status = TranscriptRequestStatus.Rejected;
        req.CurrentStage = TranscriptStage.HoD;

        await _requests.UpdateAsync(req, ct);
        await _approvals.AddAsync(new TranscriptApproval
        {
            Id = Guid.NewGuid(),
            TranscriptRequestId = req.Id,
            Role = UserRole.Dean,
            ApprovedBy = _current.UserId,
            Remarks = r,
            Action = ApprovalAction.Reject,
            ActionAt = DateTimeOffset.UtcNow
        }, ct);

        await _uow.SaveChangesAsync(ct);
    }

    public async Task<DeanReviewDto> GetReviewAsync(Guid requestId, CancellationToken ct = default)
    {
        EnsureDean();
        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");

        var student = await _users.GetByIdAsync(req.StudentId, ct);
        if (student is null) throw AppException.NotFound("Student not found.");

        var profile = await _profiles.GetByUserIdAsync(student.Id, ct);
        if (profile is null) throw new AppException("Student profile missing.", 400, "profile_missing");
        if (string.IsNullOrWhiteSpace(profile.Program))
            throw new AppException("Student profile program missing.", 400, "profile_program_missing");

        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        if (subjects.Count == 0)
            throw new AppException($"No curriculum found for program '{profile.Program}'.", 400, "curriculum_missing");

        var gradeEntries = await _grades.GetByStudentIdAsync(student.Id, ct);
        var gradeMap = gradeEntries.ToDictionary(x => x.CurriculumSubjectId, x => x);

        var semesters = subjects
            .GroupBy(x => x.SemesterNumber)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var semNo = g.Key;
                var scheme = g.Select(x => x.CreditPointScheme).FirstOrDefault();
                var yearTitle = BuildYearTitle(profile.Program ?? string.Empty, profile.AdmissionYear, semNo);
                var termTitle = BuildTermTitle(profile.AdmissionYear, semNo);

                var list = g.OrderBy(x => x.SubjectCode).ThenBy(x => x.SubjectName).Select(s =>
                {
                    gradeMap.TryGetValue(s.Id, out var ge);
                    return new GradeEntrySubjectDto(
                        s.Id,
                        s.SubjectCode,
                        s.SubjectName,
                        s.ThHours,
                        s.PrHours,
                        s.ThCredits,
                        s.PrCredits,
                        s.CreditPointScheme,
                        (ge?.ThGrade ?? string.Empty).Trim(),
                        (ge?.PrGrade ?? string.Empty).Trim()
                    );
                }).ToList();

                return new GradeEntrySemesterDto(semNo, yearTitle, termTitle, scheme == 0 ? 10 : scheme, list);
            })
            .ToList();

        var studentDto = new GradeEntryStudentDto(
            student.Id,
            student.FullName,
            profile.PRN,
            profile.Faculty,
            profile.Department,
            profile.Program,
            profile.AdmissionYear,
            profile.GraduationYear,
            profile.Nationality,
            profile.DOB,
            profile.BirthPlace,
            profile.Address
        );

        var approvals = req.Approvals
            .OrderBy(x => x.ActionAt)
            .Select(x => new TranscriptApprovalDto(x.Id, x.TranscriptRequestId, x.Role, x.ApprovedBy, x.Remarks ?? string.Empty, x.Action, x.ActionAt))
            .ToList();

        return new DeanReviewDto(Map(req), new GradeEntryResponseDto(studentDto, semesters), approvals);
    }

    private void EnsureDean()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Dean && _current.Role != UserRole.Admin) throw AppException.Forbidden();
    }

    private static TranscriptRequestDto Map(TranscriptRequest r) =>
        new(r.Id, r.StudentId, r.Status, r.CurrentStage, r.CreatedAt);

    private static string BuildYearTitle(string program, int? admissionYear, int semesterNumber)
    {
        var yearIdx = Math.Max(1, ((semesterNumber - 1) / 2) + 1);
        var label = yearIdx switch
        {
            1 => "BE-I",
            2 => "BE-II",
            3 => "BE-III",
            4 => "BE-IV",
            _ => $"Year-{yearIdx}"
        };

        var ay = admissionYear.HasValue ? $"{admissionYear}-{admissionYear + 1}" : string.Empty;
        return string.IsNullOrWhiteSpace(ay)
            ? $"{label} ({program})"
            : $"{label} ({program})   {ay}";
    }

    private static string BuildTermTitle(int? admissionYear, int semesterNumber)
    {
        var term = (semesterNumber % 2) == 1 ? "First Semester" : "Second Semester";
        var months = (semesterNumber % 2) == 1 ? "(JUL - NOV)" : "(DEC - MAY)";
        var ay = admissionYear.HasValue ? $"{admissionYear + ((semesterNumber - 1) / 2)}" : string.Empty;
        return string.IsNullOrWhiteSpace(ay) ? $"{term} {months}" : $"{term} {months} {ay}";
    }
}
