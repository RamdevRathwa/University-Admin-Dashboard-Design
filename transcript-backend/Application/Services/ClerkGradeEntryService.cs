using Application.Common;
using Application.DTOs.Clerk.GradeEntry;
using Application.Interfaces;
using Domain.Entities;
using Domain.Interfaces;

namespace Application.Services;

public sealed class ClerkGradeEntryService : IClerkGradeEntryService
{
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IStudentGradeEntryRepository _grades;
    private readonly IStudentProfileRepository _profiles;

    public ClerkGradeEntryService(
        IStudentProfileRepository profiles,
        ICurriculumSubjectRepository curriculum,
        IStudentGradeEntryRepository grades)
    {
        _profiles = profiles;
        _curriculum = curriculum;
        _grades = grades;
    }

    public async Task<GradeEntryResponseDto> GetByPrnAsync(string prn, CancellationToken ct = default)
    {
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

        return new GradeEntryResponseDto(studentDto, semesters);
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
}
