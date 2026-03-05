namespace Application.DTOs.Admin;

public sealed record AdminSettingsDto(
    string AppName,
    string ContactEmail,
    bool MaintenanceMode,
    object Otp,
    object Smtp,
    object Payment
);

