namespace Infrastructure.Services.Jwt;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "msubaroda-transcripts";
    public string Audience { get; set; } = "msubaroda-transcripts";
    public string SigningKey { get; set; } = string.Empty; // 32+ chars recommended
    public int ExpiryMinutes { get; set; } = 720; // 12h
}

