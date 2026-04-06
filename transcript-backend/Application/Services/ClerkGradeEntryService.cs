using Application.Common;
using Application.DTOs.Clerk.GradeEntry;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using System.Text.Json;

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
    private readonly IAdminRepository _settings;
    private readonly IUnitOfWork _uow;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public ClerkGradeEntryService(
        ICurrentUserService current,
        IStudentProfileRepository profiles,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades,
        ITranscriptRequestRepository requests,
        IClerkWorkflowService workflow,
        ITranscriptDocumentRepository documents,
        IAdminRepository settings,
        IUnitOfWork uow)
    {
        _current = current;
        _profiles = profiles;
        _curriculum = curriculum;
        _grades = grades;
        _requests = requests;
        _workflow = workflow;
        _documents = documents;
        _settings = settings;
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
        var electiveSelections = await LoadElectiveSelectionsAsync(rawPrn, ct);

        var subjectsBySemester = subjects
            .GroupBy(x => x.SemesterNumber)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.SubjectCode).ToList());

        var actualMaxSemester = subjectsBySemester.Keys.DefaultIfEmpty(0).Max();
        var expectedSemesterCount = ResolveExpectedSemesterCount(profile.Program, profile.AdmissionYear, profile.GraduationYear, actualMaxSemester);

        var gradeOverrides = gradeMap.ToDictionary(
            x => x.Key,
            x => ((x.Value.ThGrade ?? string.Empty).Trim(), (x.Value.PrGrade ?? string.Empty).Trim()));

        var semesters = BuildSemesterDtos(profile.Program, profile.AdmissionYear, profile.GraduationYear, subjectsBySemester, expectedSemesterCount, gradeOverrides, electiveSelections);

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

    public async Task<GradeEntryResponseDto> PreviewAsync(string prn, GradeEntrySaveDraftRequestDto dto, CancellationToken ct = default)
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
        var gradeOverrides = gradeEntries.ToDictionary(
            x => x.CurriculumSubjectId,
            x => ((x.ThGrade ?? string.Empty).Trim(), (x.PrGrade ?? string.Empty).Trim()));
        var electiveSelections = await LoadElectiveSelectionsAsync(rawPrn, ct);

        foreach (var item in dto.Items ?? Array.Empty<GradeEntryUpsertDto>())
        {
            if (item.CurriculumSubjectId == Guid.Empty) continue;
            gradeOverrides[item.CurriculumSubjectId] = ((item.ThGrade ?? string.Empty).Trim(), (item.PrGrade ?? string.Empty).Trim());
        }
        MergeElectiveSelections(electiveSelections, dto.Electives);

        var subjectsBySemester = subjects
            .GroupBy(x => x.SemesterNumber)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.SubjectCode).ToList());

        var actualMaxSemester = subjectsBySemester.Keys.DefaultIfEmpty(0).Max();
        var expectedSemesterCount = ResolveExpectedSemesterCount(profile.Program, profile.AdmissionYear, profile.GraduationYear, actualMaxSemester);
        var semesters = BuildSemesterDtos(profile.Program, profile.AdmissionYear, profile.GraduationYear, subjectsBySemester, expectedSemesterCount, gradeOverrides, electiveSelections);

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

        var electiveSelections = await LoadElectiveSelectionsAsync(rawPrn, ct);
        MergeElectiveSelections(electiveSelections, dto.Electives);

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

        await SaveElectiveSelectionsAsync(rawPrn, electiveSelections, ct);

        await _uow.SaveChangesAsync(ct);
    }

    public async Task SubmitToHoDAsync(string prn, GradeEntrySubmitRequestDto dto, CancellationToken ct = default)
    {
        EnsureClerk();

        // Save grades first (server-side validation for missing grades happens below).
        await SaveDraftAsync(prn, new GradeEntrySaveDraftRequestDto(dto.Items, dto.Electives), ct);

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
            throw new AppException("Student documents are not verified yet. Verify Marksheets and Government ID before submitting to HoD. Authority Letter is only needed if the student uploaded one.", 400, "documents_not_verified");

        // Validate that all required grade parts are filled before forwarding.
        var subjects = await _curriculum.GetByProgramAsync(profile.Program, ct);
        var subjectMap = subjects.ToDictionary(x => x.Id, x => x);

        // Load latest grades (after upsert).
        var gradeEntries = await _grades.GetByStudentIdAsync(student.Id, ct);
        var gradeMap = gradeEntries.ToDictionary(x => x.CurriculumSubjectId, x => x);

        var electiveSelections = await LoadElectiveSelectionsAsync(rawPrn, ct);

        foreach (var s in subjects)
        {
            gradeMap.TryGetValue(s.Id, out var ge);
            var th = (ge?.ThGrade ?? string.Empty).Trim();
            var prg = (ge?.PrGrade ?? string.Empty).Trim();

            if (GradeCalc.IsGradeMissing(th, s.ThCredits) || GradeCalc.IsGradeMissing(prg, s.PrCredits))
                throw new AppException("Please enter grades for all subjects (TH/PR) before submitting to HoD.", 400, "grades_incomplete");

            if (s.IsElective && (!electiveSelections.TryGetValue(s.Id, out var selectedValue) || string.IsNullOrWhiteSpace(selectedValue)))
                throw new AppException("Please select all elective subjects before submitting to HoD.", 400, "electives_incomplete");
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

        var ay = string.Empty;
        if (admissionYear.HasValue)
        {
            var startYear = admissionYear.Value + (yearIdx - 1);
            ay = $"{startYear}-{startYear + 1}";
        }
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

    private static int ResolveExpectedSemesterCount(string? program, int? admissionYear, int? graduationYear, int actualMaxSemester)
    {
        var maxSemester = Math.Max(actualMaxSemester, 0);

        if (admissionYear.HasValue && graduationYear.HasValue && graduationYear.Value >= admissionYear.Value)
        {
            var durationYears = graduationYear.Value - admissionYear.Value;
            if (durationYears > 0)
                maxSemester = Math.Max(maxSemester, durationYears * 2);
        }

        var normalizedProgram = (program ?? string.Empty).Trim().ToUpperInvariant();
        if (normalizedProgram.StartsWith("BE-", StringComparison.Ordinal) ||
            normalizedProgram.StartsWith("B.E", StringComparison.Ordinal) ||
            normalizedProgram.StartsWith("BTECH", StringComparison.Ordinal) ||
            normalizedProgram.StartsWith("B.TECH", StringComparison.Ordinal))
        {
            maxSemester = Math.Max(maxSemester, 8);
        }

        return maxSemester == 0 ? 8 : maxSemester;
    }

    private static List<GradeEntrySemesterDto> BuildSemesterDtos(
        string program,
        int? admissionYear,
        int? graduationYear,
        IReadOnlyDictionary<int, List<CurriculumSubject>> subjectsBySemester,
        int expectedSemesterCount,
        IReadOnlyDictionary<Guid, (string ThGrade, string PrGrade)> gradeMap,
        IReadOnlyDictionary<Guid, string> electiveSelections)
    {
        var cumulative = new RunningTotals();
        var semesters = new List<GradeEntrySemesterDto>();

        foreach (var semNo in Enumerable.Range(1, expectedSemesterCount))
        {
            var semesterSubjects = subjectsBySemester.GetValueOrDefault(semNo) ?? new List<CurriculumSubject>();
            var scheme = semesterSubjects.Select(x => x.CreditPointScheme).FirstOrDefault();
            var creditPointScheme = scheme == 0 ? 10 : scheme;
            var yearTitle = BuildYearTitle(program, admissionYear, semNo);
            var termTitle = BuildTermTitle(admissionYear, semNo);

            var subjectDtos = new List<GradeEntrySubjectDto>();
            var semester = new RunningTotals();

            foreach (var s in semesterSubjects)
            {
                gradeMap.TryGetValue(s.Id, out var grades);
                var thGrade = (grades.ThGrade ?? string.Empty).Trim();
                var prGrade = (grades.PrGrade ?? string.Empty).Trim();

                var thGradePoint = s.ThCredits > 0 ? GradeCalc.GradePoint(thGrade) : 0m;
                var prGradePoint = s.PrCredits > 0 ? GradeCalc.GradePoint(prGrade) : 0m;
                var thEarned = GradeCalc.Round2(thGradePoint * s.ThCredits);
                var prEarned = GradeCalc.Round2(prGradePoint * s.PrCredits);
                var thOutOf = GradeCalc.ToOutOf(s.ThCredits, creditPointScheme);
                var prOutOf = GradeCalc.ToOutOf(s.PrCredits, creditPointScheme);

                subjectDtos.Add(new GradeEntrySubjectDto(
                    s.Id,
                    (s.SubjectCode ?? string.Empty).Trim(),
                    s.SubjectName,
                    s.IsElective,
                    electiveSelections.GetValueOrDefault(s.Id),
                    s.ThHours,
                    s.PrHours,
                    s.ThCredits,
                    s.PrCredits,
                    creditPointScheme,
                    thGrade,
                    prGrade,
                    thGradePoint,
                    prGradePoint,
                    thEarned,
                    prEarned,
                    thOutOf,
                    prOutOf
                ));

                semester.ThHours += s.ThHours;
                semester.PrHours += s.PrHours;
                semester.ThCredits += s.ThCredits;
                semester.PrCredits += s.PrCredits;
                semester.ThGradePointsSum += thGradePoint;
                semester.PrGradePointsSum += prGradePoint;
                semester.ThEarned += thEarned;
                semester.PrEarned += prEarned;
                semester.ThOutOf += thOutOf;
                semester.PrOutOf += prOutOf;
            }

            cumulative.Add(semester);

            var semCredits = semester.ThCredits + semester.PrCredits;
            var semEarned = semester.ThEarned + semester.PrEarned;
            var sgpa = semCredits <= 0 ? 0m : GradeCalc.Round2(semEarned / semCredits);
            var percentage = GradeCalc.Round2(sgpa * 10m);

            var cumCredits = cumulative.ThCredits + cumulative.PrCredits;
            var cumEarned = cumulative.ThEarned + cumulative.PrEarned;
            var cgpa = cumCredits <= 0 ? 0m : GradeCalc.Round2(cumEarned / cumCredits);
            var cumulativePercentage = GradeCalc.Round2(cgpa * 10m);

            var summary = new GradeEntrySemesterSummaryDto(
                GradeCalc.Round2(semester.ThHours),
                GradeCalc.Round2(semester.PrHours),
                GradeCalc.Round2(semester.ThCredits),
                GradeCalc.Round2(semester.PrCredits),
                GradeCalc.Round2(semester.ThGradePointsSum),
                GradeCalc.Round2(semester.PrGradePointsSum),
                GradeCalc.Round2(semester.ThEarned),
                GradeCalc.Round2(semester.PrEarned),
                GradeCalc.Round2(semester.ThOutOf),
                GradeCalc.Round2(semester.PrOutOf),
                GradeCalc.Round2(semEarned),
                sgpa,
                percentage,
                GradeCalc.Round2(cumulative.ThHours),
                GradeCalc.Round2(cumulative.PrHours),
                GradeCalc.Round2(cumulative.ThCredits),
                GradeCalc.Round2(cumulative.PrCredits),
                GradeCalc.Round2(cumulative.ThGradePointsSum),
                GradeCalc.Round2(cumulative.PrGradePointsSum),
                GradeCalc.Round2(cumulative.ThEarned),
                GradeCalc.Round2(cumulative.PrEarned),
                GradeCalc.Round2(cumulative.ThOutOf),
                GradeCalc.Round2(cumulative.PrOutOf),
                GradeCalc.Round2(cumEarned),
                cgpa,
                cumulativePercentage
            );

            semesters.Add(new GradeEntrySemesterDto(semNo, yearTitle, termTitle, creditPointScheme, subjectDtos, summary));
        }

        return semesters;
    }

    private async Task<Dictionary<Guid, string>> LoadElectiveSelectionsAsync(string prn, CancellationToken ct)
    {
        var setting = await _settings.GetSettingAsync(GetElectiveSettingKey(prn), ct);
        if (setting is null || string.IsNullOrWhiteSpace(setting.SettingValue))
            return new Dictionary<Guid, string>();

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<Guid, string>>(setting.SettingValue, JsonOptions);
            return parsed?.Where(x => x.Key != Guid.Empty && !string.IsNullOrWhiteSpace(x.Value))
                .ToDictionary(x => x.Key, x => x.Value.Trim()) ?? new Dictionary<Guid, string>();
        }
        catch (JsonException)
        {
            return new Dictionary<Guid, string>();
        }
    }

    private async Task SaveElectiveSelectionsAsync(string prn, IReadOnlyDictionary<Guid, string> selections, CancellationToken ct)
    {
        await _settings.UpsertSettingAsync(new SystemSetting
        {
            SettingKey = GetElectiveSettingKey(prn),
            SettingValue = JsonSerializer.Serialize(selections, JsonOptions),
            UpdatedAt = DateTimeOffset.UtcNow,
            UpdatedBy = _current.UserId
        }, ct);
    }

    private static string GetElectiveSettingKey(string prn) => $"grade_entry_electives:{prn.Trim().ToUpperInvariant()}";

    private static void MergeElectiveSelections(IDictionary<Guid, string> destination, IReadOnlyList<GradeEntryElectiveSelectionDto>? incoming)
    {
        foreach (var item in incoming ?? Array.Empty<GradeEntryElectiveSelectionDto>())
        {
            if (item.CurriculumSubjectId == Guid.Empty) continue;

            var value = (item.SelectedValue ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(value))
            {
                destination.Remove(item.CurriculumSubjectId);
                continue;
            }

            destination[item.CurriculumSubjectId] = value;
        }
    }

    private sealed class RunningTotals
    {
        public decimal ThHours { get; set; }
        public decimal PrHours { get; set; }
        public decimal ThCredits { get; set; }
        public decimal PrCredits { get; set; }
        public decimal ThGradePointsSum { get; set; }
        public decimal PrGradePointsSum { get; set; }
        public decimal ThEarned { get; set; }
        public decimal PrEarned { get; set; }
        public decimal ThOutOf { get; set; }
        public decimal PrOutOf { get; set; }

        public void Add(RunningTotals other)
        {
            ThHours += other.ThHours;
            PrHours += other.PrHours;
            ThCredits += other.ThCredits;
            PrCredits += other.PrCredits;
            ThGradePointsSum += other.ThGradePointsSum;
            PrGradePointsSum += other.PrGradePointsSum;
            ThEarned += other.ThEarned;
            PrEarned += other.PrEarned;
            ThOutOf += other.ThOutOf;
            PrOutOf += other.PrOutOf;
        }
    }

    private void EnsureClerk()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Clerk && _current.Role != UserRole.Admin) throw AppException.Forbidden();
    }
}
