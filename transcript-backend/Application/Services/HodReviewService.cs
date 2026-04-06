using Application.Common;
using Application.DTOs.Approvals;
using Application.DTOs.Clerk.GradeEntry;
using Application.DTOs.Dean;
using Application.DTOs.Transcripts;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using System.Text.Json;

namespace Application.Services;

public sealed class HodReviewService : IHodReviewService
{
    private readonly ICurrentUserService _current;
    private readonly IUserRepository _users;
    private readonly IStudentProfileRepository _profiles;
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IStudentGradeEntryRepository _grades;
    private readonly ITranscriptRequestRepository _requests;
    private readonly IAdminRepository _settings;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public HodReviewService(
        ICurrentUserService current,
        IUserRepository users,
        IStudentProfileRepository profiles,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades,
        ITranscriptRequestRepository requests,
        IAdminRepository settings)
    {
        _current = current;
        _users = users;
        _profiles = profiles;
        _curriculum = curriculum;
        _grades = grades;
        _requests = requests;
        _settings = settings;
    }

    public async Task<DeanReviewDto> GetReviewAsync(Guid requestId, CancellationToken ct = default)
    {
        EnsureHod();

        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null) throw AppException.NotFound("Transcript request not found.");
        if (req.Status != TranscriptRequestStatus.ForwardedToHoD || req.CurrentStage != TranscriptStage.HoD)
            throw new AppException("Only HoD-stage requests can be reviewed.", 400, "invalid_status");

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

        var subjectsBySemester = subjects
            .GroupBy(x => x.SemesterNumber)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.SubjectCode).ThenBy(x => x.SubjectName).ToList());

        var actualMaxSemester = subjectsBySemester.Keys.DefaultIfEmpty(0).Max();
        var expectedSemesterCount = ResolveExpectedSemesterCount(profile.Program, profile.AdmissionYear, profile.GraduationYear, actualMaxSemester);
        var gradeOverrides = gradeMap.ToDictionary(
            x => x.Key,
            x => ((x.Value.ThGrade ?? string.Empty).Trim(), (x.Value.PrGrade ?? string.Empty).Trim()));
        var electiveSelections = await LoadElectiveSelectionsAsync(profile.PRN, ct);

        var semesters = BuildSemesterDtos(profile.Program ?? string.Empty, profile.AdmissionYear, profile.GraduationYear, subjectsBySemester, expectedSemesterCount, gradeOverrides, electiveSelections);

        var studentDto = new GradeEntryStudentDto(
            student.Id,
            student.FullName,
            profile.PRN,
            profile.Faculty,
            profile.Department,
            profile.Program ?? string.Empty,
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

    private void EnsureHod()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.HoD && _current.Role != UserRole.Admin) throw AppException.Forbidden();
    }

    private static TranscriptRequestDto Map(Domain.Entities.TranscriptRequest r) =>
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

    private async Task<Dictionary<Guid, string>> LoadElectiveSelectionsAsync(string? prn, CancellationToken ct)
    {
        var normalizedPrn = (prn ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedPrn)) return new Dictionary<Guid, string>();

        var setting = await _settings.GetSettingAsync($"grade_entry_electives:{normalizedPrn.ToUpperInvariant()}", ct);
        if (setting is null || string.IsNullOrWhiteSpace(setting.SettingValue))
            return new Dictionary<Guid, string>();

        try
        {
            return JsonSerializer.Deserialize<Dictionary<Guid, string>>(setting.SettingValue, JsonOptions) ?? new Dictionary<Guid, string>();
        }
        catch (JsonException)
        {
            return new Dictionary<Guid, string>();
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
}
