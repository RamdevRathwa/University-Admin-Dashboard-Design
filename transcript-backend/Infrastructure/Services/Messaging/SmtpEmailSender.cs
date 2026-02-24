using System.Net;
using System.Net.Mail;
using Application.Common;
using Application.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Messaging;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _opt;
    private readonly ILogger<SmtpEmailSender> _log;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> log)
    {
        _opt = options.Value;
        _log = log;
    }

    public async Task SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        Validate();

        var fromEmail = (_opt.FromEmail ?? string.Empty).Trim();
        var fromName = (_opt.FromName ?? string.Empty).Trim();
        var to = (toEmail ?? string.Empty).Trim();

        using var msg = new MailMessage();
        try
        {
            msg.From = new MailAddress(fromEmail, fromName);
            msg.To.Add(new MailAddress(to));
        }
        catch (FormatException ex)
        {
            throw new AppException($"Invalid email address configuration (from/to). {ex.Message}", 502, "email_invalid_address");
        }
        msg.Subject = subject;
        msg.Body = body;
        msg.IsBodyHtml = false;

        using var client = new SmtpClient(_opt.Host, _opt.Port)
        {
            EnableSsl = _opt.UseSsl,
            Credentials = new NetworkCredential((_opt.Username ?? string.Empty).Trim(), (_opt.Password ?? string.Empty).Trim())
        };

        _log.LogInformation("Sending SMTP email to={To} subject={Subject}", to, subject);
        try
        {
            await client.SendMailAsync(msg, ct);
        }
        catch (SmtpException ex)
        {
            throw new AppException($"SMTP send failed. {ex.Message}", 502, "email_send_failed");
        }
    }

    private void Validate()
    {
        if (string.IsNullOrWhiteSpace(_opt.Host)) throw new InvalidOperationException("SMTP Host is missing.");
        if (string.IsNullOrWhiteSpace(_opt.Username)) throw new InvalidOperationException("SMTP Username is missing.");
        if (string.IsNullOrWhiteSpace(_opt.Password)) throw new InvalidOperationException("SMTP Password is missing.");
        if (string.IsNullOrWhiteSpace(_opt.FromEmail)) throw new InvalidOperationException("SMTP FromEmail is missing.");
        if (_opt.Port <= 0) throw new InvalidOperationException("SMTP Port is invalid.");
    }
}
