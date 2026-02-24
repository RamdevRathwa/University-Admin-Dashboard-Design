namespace Application.Interfaces;

public interface ITranscriptPdfService
{
    Task<(string relativePath, string verificationCode)> GeneratePdfAsync(Guid transcriptId, CancellationToken ct = default);
}

