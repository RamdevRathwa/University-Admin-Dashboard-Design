using Application.Common;
using Application.DTOs.Student;
using Application.Interfaces;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class StudentTranscriptService : IStudentTranscriptService
{
    private readonly ICurrentUserService _current;
    private readonly ITranscriptRepository _transcripts;

    public StudentTranscriptService(ICurrentUserService current, ITranscriptRepository transcripts)
    {
        _current = current;
        _transcripts = transcripts;
    }

    public async Task<IReadOnlyList<ApprovedTranscriptDto>> MyApprovedAsync(CancellationToken ct = default)
    {
        EnsureStudent();
        var list = await _transcripts.GetApprovedByStudentIdAsync(_current.UserId, ct);
        return list
            .OrderByDescending(x => x.ApprovedAt)
            .Select(x => new ApprovedTranscriptDto(
                x.Id,
                x.TranscriptRequestId,
                x.ApprovedAt,
                x.CGPA,
                x.SemesterFrom,
                x.SemesterTo,
                x.Locked,
                x.PdfPath
            ))
            .ToList();
    }

    public async Task<(string path, string fileName)> GetDownloadAsync(Guid transcriptId, CancellationToken ct = default)
    {
        EnsureStudent();
        var t = await _transcripts.GetByIdAsync(transcriptId, ct);
        if (t is null) throw AppException.NotFound("Transcript not found.");
        if (t.StudentId != _current.UserId) throw AppException.Forbidden();
        if (t.Locked != true) throw new AppException("Transcript is not available for download.", 400, "not_ready");
        if (string.IsNullOrWhiteSpace(t.PdfPath)) throw new AppException("Transcript PDF is missing.", 500, "pdf_missing");

        var fileName = $"Transcript_{t.Id:N}.pdf";
        return (t.PdfPath, fileName);
    }

    private void EnsureStudent()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Student) throw AppException.Forbidden();
    }
}

