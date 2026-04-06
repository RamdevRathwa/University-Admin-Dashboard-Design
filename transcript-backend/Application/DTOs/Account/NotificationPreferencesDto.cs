namespace Application.DTOs.Account;

public sealed record NotificationPreferencesDto(
    bool EmailNotifications,
    bool InAppAlerts,
    bool ApprovalUpdates,
    bool QueueUpdates,
    bool ReturnedCases,
    bool FinalApprovalQueue,
    bool PublishFollowUp
);
