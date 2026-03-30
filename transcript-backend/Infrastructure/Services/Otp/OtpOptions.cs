namespace Infrastructure.Services.Otp;

public sealed class OtpOptions
{
    public const string SectionName = "Otp";

    public int Length { get; set; } = 6;
    public int TtlSeconds { get; set; } = 300; // 5 min
    public int MaxSendPerIdentifierPerHour { get; set; } = 20;
    public int MaxVerifyAttemptsPerOtp { get; set; } = 5;
    public string HashKey { get; set; } = string.Empty; // used for HMAC hashing

    // Development/testing convenience. If set, this OTP will be accepted/issued.
    public string? FixedCode { get; set; }
}
