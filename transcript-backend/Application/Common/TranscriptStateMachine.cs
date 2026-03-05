using Domain.Entities;
using Domain.Enums;

namespace Application.Common;

/// <summary>
/// Centralized workflow guards for TranscriptRequest status + stage.
/// Keep transitions strict to prevent bypassing Clerk -> HoD -> Dean.
/// </summary>
public static class TranscriptStateMachine
{
    public static void EnsureState(TranscriptRequest req, TranscriptRequestStatus status, TranscriptStage stage, string message, string code = "invalid_status")
    {
        if (req.Status != status || req.CurrentStage != stage)
            throw new AppException(message, 400, code);
    }

    public static void EnsureEditableByStudent(TranscriptRequest req)
    {
        // Student can edit/upload only while Draft/Student OR Submitted/Clerk (returned for doc fixes).
        var ok =
            (req.Status == TranscriptRequestStatus.Draft && req.CurrentStage == TranscriptStage.Student) ||
            (req.Status == TranscriptRequestStatus.Submitted && req.CurrentStage == TranscriptStage.Clerk);

        if (!ok) throw new AppException("Request is locked at this stage.", 400, "request_locked");
    }

    public static void EnsureClerkCanEditGrades(TranscriptRequest req)
    {
        // Clerk can only enter/edit grades while the request is at Clerk stage.
        EnsureState(req, TranscriptRequestStatus.Submitted, TranscriptStage.Clerk,
            "Grades can only be edited for clerk-stage submitted requests.", "grades_locked");
    }

    public static void EnsureCanSubmitByStudent(TranscriptRequest req)
    {
        EnsureState(req, TranscriptRequestStatus.Draft, TranscriptStage.Student,
            "Only draft requests can be submitted.", "invalid_status");
    }
}

