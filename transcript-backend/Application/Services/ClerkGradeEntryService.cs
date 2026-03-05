using Application.Common;
using Application.DTOs.Clerk.GradeEntry;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class ClerkGradeEntryService : IClerkGradeEntryService
{
    private readonly ICurrentUserService _current;
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IStudentGradeEntryRepository _grades;
    private readonly IStudentProfileRepository _profiles;
    private readonly ITranscriptRequestRepository _requests;
    private readonly IClerkWorkflowService _workflow;
    private readonly ITranscriptDocumentRepository _documents;
    private readonly IUnitOfWork _uow;

    public ClerkGradeEntryService(
        ICurrentUserService current,
        IStudentProfileRepository profiles,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades,
        ITranscriptRequestRepository requests,
        IClerkWorkflowService workflow,
        ITranscriptDocumentRepository documents,
        IUnitOfWork uow)
    {
        _current = current;
        _profiles = profiles;
        _curriculum = curriculum;
        _grades = grades;
        _requests = requests;
        _workflow = workflow;
        _documents = documents;
        _uow = uow;
    }

    public async Task<GradeEntryResponseDto> GetByPrnAsync(string prn, CancellationToken ct = default)
    {
        EnsureClerk();

        var rawPrn = (prn ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(rawPrn)) throw new AppException("PRN is required.", 400, "prn_required");

        var student = await _profiles.GetUserByPrnAsync(rawPrn, ct);

        if (student is null) throw AppException.NotFound("Student not found for this PRN.");
        var profile = student.StudentProfile!;
        if (string.IsNullOrWhiteSpace(profile.Program))
            throw new AppException("Student profile does not have Program set. Ask student to complete Transcript Request form.", 400, "profile_program_missing");

        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        if (subjects.Count == 0)
            throw new AppException($"No curriculum found for program '{profile.Program}'. Seed curriculum subjects first.", 400, "curriculum_missing");

        var gradeEntries = await _grades.GetByStudentIdAsync(student.Id, ct);
        var gradeMap = gradeEntries.ToDictionary(x => x.CurriculumSubjectId, x => x);

        var semesters = subjects
            .GroupBy(x => x.SemesterNumber)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var semNo = g.Key;
                var scheme = g.Select(x => x.CreditPointScheme).FirstOrDefault();

                var yearTitle = BuildYearTitle(profile.Program, profile.AdmissionYear, semNo);
                var termTitle = BuildTermTitle(profile.AdmissionYear, semNo);

                var list = g.Select(s =>
                {
                    gradeMap.TryGetValue(s.Id, out var ge);
                    return new GradeEntrySubjectDto(
                        s.Id,
                        (s.SubjectCode ?? string.Empty).Trim(),
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

        return new GradeEntryResponseDto(studentDto, semesters);
    }

    public async Task SaveDraftAsync(string prn, GradeEntrySaveDraftRequestDto dto, CancellationToken ct = default)
    {
        EnsureClerk();

        var rawPrn = (prn ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(rawPrn)) throw new AppException("PRN is required.", 400, "prn_required");

        var student = await _profiles.GetUserByPrnAsync(rawPrn, ct);
        if (student is null) throw AppException.NotFound("Student not found for this PRN.");

        // Enforce workflow: grades are editable only when there's an active clerk-stage submitted request.
        var requests = await _requests.GetByStudentIdAsync(student.Id, ct);
        var req = requests.FirstOrDefault(x => x.Status == TranscriptRequestStatus.Submitted && x.CurrentStage == TranscriptStage.Clerk);
        if (req is null)
            throw new AppException("No clerk-stage submitted transcript request found for this student. Ask student to submit transcript request first.", 400, "request_missing");
        TranscriptStateMachine.EnsureClerkCanEditGrades(req);

        var profile = student.StudentProfile!;
        if (string.IsNullOrWhiteSpace(profile.Program))
            throw new AppException("Student profile does not have Program set.", 400, "profile_program_missing");

        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        if (subjects.Count == 0)
            throw new AppException($"No curriculum found for program '{profile.Program}'.", 400, "curriculum_missing");

        var allowedIds = subjects.Select(x => x.Id).ToHashSet();

        // Once clerk starts saving grades, move the request into GradeEntry state (V2) via repository mapping.
        // This enables the enforced state machine path: Submitted -> GradeEntry -> ForwardedToHoD.
        await _requests.UpdateAsync(req, ct);

        foreach (var item in dto.Items ?? Array.Empty<GradeEntryUpsertDto>())
        {
            if (item.CurriculumSubjectId == Guid.Empty) continue;
            if (!allowedIds.Contains(item.CurriculumSubjectId))
                throw new AppException("One or more subjects are not part of this student's curriculum.", 400, "invalid_subject");

            var th = (item.ThGrade ?? string.Empty).Trim();
            var prg = (item.PrGrade ?? string.Empty).Trim();

            var entry = new StudentGradeEntry
            {
                Id = Guid.NewGuid(),
                StudentId = student.Id,
                CurriculumSubjectId = item.CurriculumSubjectId,
                ThGrade = th,
                PrGrade = prg,
                UpdatedAt = DateTimeOffset.UtcNow,
                UpdatedBy = _current.UserId
            };

            await _grades.UpsertAsync(entry, ct);
        }

        await _uow.SaveChangesAsync(ct);
    }

    public async Task SubmitToHoDAsync(string prn, GradeEntrySubmitRequestDto dto, CancellationToken ct = default)
    {
        EnsureClerk();

        // Save grades first (server-side validation for missing grades happens below).
        await SaveDraftAsync(prn, new GradeEntrySaveDraftRequestDto(dto.Items), ct);

        var rawPrn = (prn ?? string.Empty).Trim();
        var student = await _profiles.GetUserByPrnAsync(rawPrn, ct);
        if (student is null) throw AppException.NotFound("Student not found for this PRN.");

        var profile = student.StudentProfile!;
        if (string.IsNullOrWhiteSpace(profile.Program))
            throw new AppException("Student profile does not have Program set.", 400, "profile_program_missing");

        // Ensure the clerk-stage submitted request exists.
        var requests = await _requests.GetByStudentIdAsync(student.Id, ct);
        var req = requests.FirstOrDefault(x => x.Status == TranscriptRequestStatus.Submitted && x.CurrentStage == TranscriptStage.Clerk);
        if (req is null)
            throw new AppException("No clerk-stage submitted transcript request found for this student. Ask student to submit transcript request first.", 400, "request_missing");

        if (!await _documents.AreRequiredApprovedAsync(req.Id, ct))
            throw new AppException("Student documents are not verified yet. Verify Documents first (Marksheet, Government ID, Authority Letter) before submitting to HoD.", 400, "documents_not_verified");

        // Validate that all required grade parts are filled before forwarding.
        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        var subjectMap = subjects.ToDictionary(x => x.Id, x => x);

        // Load latest grades (after upsert).
        var gradeEntries = await _grades.GetByStudentIdAsync(student.Id, ct);
        var gradeMap = gradeEntries.ToDictionary(x => x.CurriculumSubjectId, x => x);

        foreach (var s in subjects)
        {
            gradeMap.TryGetValue(s.Id, out var ge);
            var th = (ge?.ThGrade ?? string.Empty).Trim();
            var prg = (ge?.PrGrade ?? string.Empty).Trim();

            if (GradeCalc.IsGradeMissing(th, s.ThCredits) || GradeCalc.IsGradeMissing(prg, s.PrCredits))
                throw new AppException("Please enter grades for all subjects (TH/PR) before submitting to HoD.", 400, "grades_incomplete");
        }

        await _workflow.ForwardToHoDAsync(req.Id, dto.Remarks, ct);
    }

    private static string BuildYearTitle(string program, int? admissionYear, int semesterNumber)
    {
        // Sem 1-2 => BE-I, 3-4 => BE-II, etc.
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
        // Month range is template-only; exact ranges can come from AcademicYear master later.
        var months = (semesterNumber % 2) == 1 ? "(JUL - NOV)" : "(DEC - MAY)";
        var ay = admissionYear.HasValue ? $"{admissionYear + ((semesterNumber - 1) / 2)}" : string.Empty;
        return string.IsNullOrWhiteSpace(ay) ? $"{term} {months}" : $"{term} {months} {ay}";
    }

    private void EnsureClerk()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Clerk && _current.Role != UserRole.Admin) throw AppException.Forbidden();
    }
}
