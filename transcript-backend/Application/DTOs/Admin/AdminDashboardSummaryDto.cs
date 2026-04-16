namespace Application.DTOs.Admin;

public sealed record AdminDashboardSummaryDto(
    int TotalStudents,
    int TotalStaff,
    int PendingTranscripts,
    int ApprovedTranscripts,
    decimal TotalPaymentsReceived,
    int SystemAlerts,
    int TotalFaculties,
    int TotalDepartments,
    int TotalPrograms
);

