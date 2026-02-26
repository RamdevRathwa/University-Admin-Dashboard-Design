namespace Infrastructure.Services.Documents;

public sealed class DocumentStorageOptions
{
    public const string SectionName = "DocumentStorage";

    // Relative to content root. Example: "Storage/Documents"
    public string RootPath { get; set; } = "Storage/Documents";
}

