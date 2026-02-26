using Domain.Enums;

namespace Application.Interfaces;

public interface IDocumentStorage
{
    Task<string> SaveAsync(
        Guid transcriptRequestId,
        TranscriptDocumentType type,
        string originalFileName,
        string contentType,
        Stream content,
        CancellationToken ct = default);

    Task<(Stream stream, string fileName, string contentType)?> OpenAsync(string storagePath, CancellationToken ct = default);
}

