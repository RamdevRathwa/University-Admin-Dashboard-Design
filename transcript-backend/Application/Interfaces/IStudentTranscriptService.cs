using Application.DTOs.Student;

namespace Application.Interfaces;

public interface IStudentTranscriptService
{
    Task<IReadOnlyList<ApprovedTranscriptDto>> MyApprovedAsync(CancellationToken ct = default);
    Task<(string path, string fileName)> GetDownloadAsync(Guid transcriptId, CancellationToken ct = default);
}
