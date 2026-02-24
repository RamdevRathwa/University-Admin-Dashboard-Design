namespace Infrastructure.Services.Messaging;

public sealed class Msg91Options
{
    public const string SectionName = "Sms:Msg91";

    public string AuthKey { get; set; } = string.Empty;
    public string SenderId { get; set; } = "SENDOTP"; // DLT sender id
    public string? DltTemplateId { get; set; }

    public string BaseUrl { get; set; } = "https://control.msg91.com/api";
    public string DefaultCountryCode { get; set; } = "91";
}

