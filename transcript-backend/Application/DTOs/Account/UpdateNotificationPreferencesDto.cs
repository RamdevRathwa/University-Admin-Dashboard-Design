namespace Application.DTOs.Account;

public sealed record UpdateNotificationPreferencesDto(
    bool EmailNotifications,
    bool InAppAlerts,
    bool ApprovalUpdates,
    bool QueueUpdates,
    bool ReturnedCases,
    bool FinalApprovalQueue,
    bool PublishFollowUp
);
