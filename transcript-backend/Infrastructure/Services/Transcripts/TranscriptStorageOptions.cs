namespace Infrastructure.Services.Transcripts;

public sealed class TranscriptStorageOptions
{
    public const string SectionName = "TranscriptStorage";

    // Relative or absolute directory. If relative, it is resolved against AppContext.BaseDirectory.
    public string RootPath { get; set; } = "Storage/Transcripts";

    // Secret key used for verification code hashing.
    public string VerificationKey { get; set; } = "DEV_ONLY__CHANGE_ME";
}

