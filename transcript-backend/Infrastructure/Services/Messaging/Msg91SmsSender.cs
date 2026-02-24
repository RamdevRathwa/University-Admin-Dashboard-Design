using System.Text.RegularExpressions;
using Application.Common;
using Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Messaging;

public sealed class Msg91SmsSender : ISmsSender
{
    private static readonly Regex OtpRegex = new(@"\b(\d{4,10})\b", RegexOptions.Compiled);

    private readonly HttpClient _http;
    private readonly Msg91Options _opt;
    private readonly ILogger<Msg91SmsSender> _log;

    public Msg91SmsSender(HttpClient http, IOptions<Msg91Options> options, ILogger<Msg91SmsSender> log)
    {
        _http = http;
        _opt = options.Value;
        _log = log;
    }

    public async Task SendAsync(string toMobile, string message, CancellationToken ct = default)
    {
        Validate();

        var mobile = NormalizeMsg91Mobile(toMobile);
        var msg = (message ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(msg)) throw new AppException("SMS message is empty.", 500, "sms_invalid_message");

        // MSG91 supports different APIs. This uses the classic sendotp endpoint and passes OTP if detectable.
        // Your SMS template should be DLT-approved. Provide DltTemplateId in config if required.
        var otpMatch = OtpRegex.Match(msg);
        var otp = otpMatch.Success ? otpMatch.Groups[1].Value : null;

        var baseUrl = (_opt.BaseUrl ?? string.Empty).Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "https://control.msg91.com/api";

        var url = $"{baseUrl}/sendotp.php" +
                  $"?authkey={Uri.EscapeDataString((_opt.AuthKey ?? string.Empty).Trim())}" +
                  $"&mobile={Uri.EscapeDataString(mobile)}" +
                  $"&sender={Uri.EscapeDataString((_opt.SenderId ?? string.Empty).Trim())}" +
                  $"&message={Uri.EscapeDataString(msg)}";

        if (!string.IsNullOrWhiteSpace(otp))
            url += $"&otp={Uri.EscapeDataString(otp)}";

        if (!string.IsNullOrWhiteSpace(_opt.DltTemplateId))
            url += $"&DLT_TE_ID={Uri.EscapeDataString(_opt.DltTemplateId!.Trim())}";

        _log.LogInformation("Sending MSG91 SMS to={To}", mobile);

        HttpResponseMessage resp;
        try
        {
            resp = await _http.GetAsync(url, ct);
        }
        catch (Exception ex)
        {
            throw new AppException($"MSG91 request failed. {ex.Message}", 502, "sms_send_failed");
        }

        var body = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new AppException($"MSG91 SMS send failed. HTTP {(int)resp.StatusCode}: {body}", 502, "sms_send_failed");

        // MSG91 returns JSON-ish text sometimes; we just log it.
        _log.LogInformation("MSG91 response: {Body}", body);
    }

    private void Validate()
    {
        if (string.IsNullOrWhiteSpace(_opt.AuthKey))
            throw new AppException("MSG91 AuthKey is missing.", 500, "sms_config_missing");
        if (string.IsNullOrWhiteSpace(_opt.SenderId))
            throw new AppException("MSG91 SenderId is missing.", 500, "sms_config_missing");
    }

    private string NormalizeMsg91Mobile(string input)
    {
        var raw = (input ?? string.Empty).Trim();
        if (raw.StartsWith("+", StringComparison.Ordinal)) raw = raw[1..];

        var digits = new string(raw.Where(char.IsDigit).ToArray());
        if (digits.Length == 10) return $"{(_opt.DefaultCountryCode ?? "91").Trim()}{digits}";
        return digits;
    }
}

