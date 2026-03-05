using Application.Common;
using Application.DTOs.Approvals;
using Application.DTOs.Clerk.GradeEntry;
using Application.DTOs.Dean;
using Application.DTOs.Transcripts;
using Application.Interfaces;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class HodReviewService : IHodReviewService
{
    private readonly ICurrentUserService _current;
    private readonly IUserRepository _users;
    private readonly IStudentProfileRepository _profiles;
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IStudentGradeEntryRepository _grades;
    private readonly ITranscriptRequestRepository _requests;

    public HodReviewService(
        ICurrentUserService current,
        IUserRepository users,
        IStudentProfileRepository profiles,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades,
        ITranscriptRequestRepository requests)
    {
        _current = current;
        _users = users;
        _profiles = profiles;
        _curriculum = curriculum;
        _grades = grades;
        _requests = requests;
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

