using System.Text.RegularExpressions;
using Application.Interfaces;
using Domain.Enums;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Documents;

public sealed class FileSystemDocumentStorage : IDocumentStorage
{
    private static readonly Regex BadChars = new(@"[^a-zA-Z0-9\.\-_]+", RegexOptions.Compiled);
    private readonly string _root;

    public FileSystemDocumentStorage(IOptions<DocumentStorageOptions> opt)
    {
        var rel = (opt.Value.RootPath ?? "Storage/Documents").Trim().TrimStart('\\', '/');
        _root = Path.Combine(Directory.GetCurrentDirectory(), rel);
    }

    public async Task<string> SaveAsync(Guid transcriptRequestId, TranscriptDocumentType type, string originalFileName, string contentType, Stream content, CancellationToken ct = default)
    {
        var safeName = SanitizeFileName(originalFileName);
        var ext = Path.GetExtension(safeName);
        if (string.IsNullOrWhiteSpace(ext)) ext = GuessExtension(contentType) ?? ".bin";

        var fileId = Guid.NewGuid().ToString("N");
        var relative = Path.Combine(transcriptRequestId.ToString("N"), type.ToString(), $"{fileId}{ext}").Replace('\\', '/');
        var abs = Path.Combine(_root, relative.Replace('/', Path.DirectorySeparatorChar));

        Directory.CreateDirectory(Path.GetDirectoryName(abs)!);
        await using var fs = new FileStream(abs, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await content.CopyToAsync(fs, ct);
        await fs.FlushAsync(ct);

        return relative;
    }

    public Task<(Stream stream, string fileName, string contentType)?> OpenAsync(string storagePath, CancellationToken ct = default)
    {
        var rel = (storagePath ?? string.Empty).Trim().TrimStart('\\', '/');
        if (string.IsNullOrWhiteSpace(rel)) return Task.FromResult<(Stream, string, string)?>(null);

        var abs = Path.Combine(_root, rel.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(abs)) return Task.FromResult<(Stream, string, string)?>(null);

        var fileName = Path.GetFileName(abs);
        var contentType = "application/octet-stream";

        Stream s = new FileStream(abs, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        return Task.FromResult<(Stream, string, string)?>((s, fileName, contentType));
    }

    private static string SanitizeFileName(string name)
    {
        var n = (name ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(n)) return "file";
        n = n.Replace("..", ".");
        n = BadChars.Replace(n, "_");
        return n.Length > 120 ? n[..120] : n;
    }

    private static string? GuessExtension(string contentType)
    {
        var ct = (contentType ?? string.Empty).Trim().ToLowerInvariant();
        if (ct.Contains("pdf")) return ".pdf";
        if (ct.Contains("jpeg")) return ".jpg";
        if (ct.Contains("jpg")) return ".jpg";
        if (ct.Contains("png")) return ".png";
        return null;
    }
}
