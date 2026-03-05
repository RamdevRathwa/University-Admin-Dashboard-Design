using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2TranscriptStatus
{
    [Column("status_id")]
    public short StatusId { get; set; }

    [Column("status_code")]
    public string StatusCode { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("is_terminal")]
    public bool IsTerminal { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2TranscriptRequest
{
    [Column("transcript_request_id")]
    public long TranscriptRequestId { get; set; }

    [Column("request_no")]
    public string RequestNo { get; set; } = string.Empty;

    [Column("student_id")]
    public long StudentId { get; set; }

    [Column("status_id")]
    public short StatusId { get; set; }

    [Column("current_stage_role_id")]
    public short CurrentStageRoleId { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("submitted_at")]
    public DateTimeOffset? SubmittedAt { get; set; }

    [Column("locked_at")]
    public DateTimeOffset? LockedAt { get; set; }

    [Column("last_updated_at")]
    public DateTimeOffset LastUpdatedAt { get; set; }
}

public sealed class V2TranscriptApproval
{
    [Column("transcript_approval_id")]
    public long TranscriptApprovalId { get; set; }

    [Column("transcript_request_id")]
    public long TranscriptRequestId { get; set; }

    [Column("role_id")]
    public short RoleId { get; set; }

    [Column("acted_by_user_id")]
    public long ActedByUserId { get; set; }

    [Column("action_code")]
    public string ActionCode { get; set; } = string.Empty; // Forward/Approve/Reject

    [Column("remarks")]
    public string? Remarks { get; set; }

    [Column("acted_at")]
    public DateTimeOffset ActedAt { get; set; }
}

public sealed class V2StudentMark
{
    [Column("student_mark_id")]
    public long StudentMarkId { get; set; }

    [Column("student_id")]
    public long StudentId { get; set; }

    [Column("curriculum_subject_id")]
    public long CurriculumSubjectId { get; set; }

    [Column("attempt_no")]
    public byte AttemptNo { get; set; }

    [Column("th_grade_letter")]
    public string? ThGradeLetter { get; set; }

    [Column("pr_grade_letter")]
    public string? PrGradeLetter { get; set; }

    [Column("entered_by")]
    public long EnteredBy { get; set; }

    [Column("entered_at")]
    public DateTimeOffset EnteredAt { get; set; }

    [Column("verified_by")]
    public long? VerifiedBy { get; set; }

    [Column("verified_at")]
    public DateTimeOffset? VerifiedAt { get; set; }

    [Column("is_final")]
    public bool IsFinal { get; set; }
}

public sealed class V2Transcript
{
    [Column("transcript_id")]
    public long TranscriptId { get; set; }

    [Column("transcript_request_id")]
    public long TranscriptRequestId { get; set; }

    [Column("student_id")]
    public long StudentId { get; set; }

    [Column("curriculum_version_id")]
    public int CurriculumVersionId { get; set; }

    [Column("approved_by_user_id")]
    public long ApprovedByUserId { get; set; }

    [Column("approved_at")]
    public DateTimeOffset ApprovedAt { get; set; }

    [Column("locked_at")]
    public DateTimeOffset? LockedAt { get; set; }

    [Column("is_locked")]
    public bool? IsLocked { get; set; }

    [Column("verification_salt")]
    public byte[] VerificationSalt { get; set; } = Array.Empty<byte>();

    [Column("verification_hash")]
    public byte[] VerificationHash { get; set; } = Array.Empty<byte>();

    [Column("cgpa")]
    public decimal Cgpa { get; set; }

    [Column("percentage")]
    public decimal Percentage { get; set; }

    [Column("credits_earned")]
    public decimal CreditsEarned { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    // Added by V2Bootstrapper (optional)
    [Column("published_at")]
    public DateTimeOffset? PublishedAt { get; set; }

    [Column("published_by_user_id")]
    public long? PublishedByUserId { get; set; }
}

public sealed class V2TranscriptFile
{
    [Column("transcript_file_id")]
    public long TranscriptFileId { get; set; }

    [Column("transcript_id")]
    public long TranscriptId { get; set; }

    [Column("file_type")]
    public string FileType { get; set; } = string.Empty;

    [Column("storage_path")]
    public string StoragePath { get; set; } = string.Empty;

    [Column("file_sha256")]
    public byte[]? FileSha256 { get; set; }

    [Column("generated_by")]
    public long GeneratedBy { get; set; }

    [Column("generated_at")]
    public DateTimeOffset GeneratedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }
}

public sealed class V2TranscriptSemesterSnapshot
{
    [Column("transcript_semester_snapshot_id")]
    public long TranscriptSemesterSnapshotId { get; set; }

    [Column("transcript_id")]
    public long TranscriptId { get; set; }

    [Column("semester_number")]
    public byte SemesterNumber { get; set; }

    [Column("year_title")]
    public string YearTitle { get; set; } = string.Empty;

    [Column("term_title")]
    public string TermTitle { get; set; } = string.Empty;

    [Column("credit_point_scheme")]
    public int CreditPointScheme { get; set; }

    [Column("th_hours_total")]
    public decimal ThHoursTotal { get; set; }

    [Column("pr_hours_total")]
    public decimal PrHoursTotal { get; set; }

    [Column("th_credits_total")]
    public decimal ThCreditsTotal { get; set; }

    [Column("pr_credits_total")]
    public decimal PrCreditsTotal { get; set; }

    [Column("th_grade_points_sum")]
    public decimal ThGradePointsSum { get; set; }

    [Column("pr_grade_points_sum")]
    public decimal PrGradePointsSum { get; set; }

    [Column("th_earned_total")]
    public decimal ThEarnedTotal { get; set; }

    [Column("pr_earned_total")]
    public decimal PrEarnedTotal { get; set; }

    [Column("th_out_of_total")]
    public decimal ThOutOfTotal { get; set; }

    [Column("pr_out_of_total")]
    public decimal PrOutOfTotal { get; set; }

    [Column("sgpa")]
    public decimal Sgpa { get; set; }

    [Column("semester_grade")]
    public string SemesterGrade { get; set; } = string.Empty;

    [Column("result_status")]
    public string ResultStatus { get; set; } = string.Empty;

    [Column("percentage")]
    public decimal Percentage { get; set; }

    [Column("egp")]
    public decimal Egp { get; set; }
}

public sealed class V2TranscriptSubjectSnapshot
{
    [Column("transcript_subject_snapshot_id")]
    public long TranscriptSubjectSnapshotId { get; set; }

    [Column("transcript_semester_snapshot_id")]
    public long TranscriptSemesterSnapshotId { get; set; }

    [Column("sn")]
    public int Sn { get; set; }

    [Column("subject_code")]
    public string SubjectCode { get; set; } = string.Empty;

    [Column("subject_name")]
    public string SubjectName { get; set; } = string.Empty;

    [Column("th_hours")]
    public decimal ThHours { get; set; }

    [Column("pr_hours")]
    public decimal PrHours { get; set; }

    [Column("th_credits")]
    public decimal ThCredits { get; set; }

    [Column("pr_credits")]
    public decimal PrCredits { get; set; }

    [Column("th_grade_letter")]
    public string ThGradeLetter { get; set; } = string.Empty;

    [Column("pr_grade_letter")]
    public string PrGradeLetter { get; set; } = string.Empty;

    [Column("th_grade_point")]
    public decimal ThGradePoint { get; set; }

    [Column("pr_grade_point")]
    public decimal PrGradePoint { get; set; }

    [Column("th_earned")]
    public decimal ThEarned { get; set; }

    [Column("pr_earned")]
    public decimal PrEarned { get; set; }
}

public sealed class V2TranscriptRequestDocument
{
    [Column("transcript_request_document_id")]
    public long TranscriptRequestDocumentId { get; set; }

    [Column("legacy_document_guid")]
    public Guid? LegacyDocumentGuid { get; set; }

    [Column("transcript_request_id")]
    public long TranscriptRequestId { get; set; }

    [Column("student_id")]
    public long StudentId { get; set; }

    [Column("document_type")]
    public string DocumentType { get; set; } = string.Empty;

    [Column("status_code")]
    public string StatusCode { get; set; } = "Pending"; // Pending/Approved/Returned

    [Column("file_name")]
    public string FileName { get; set; } = string.Empty;

    [Column("mime_type")]
    public string? MimeType { get; set; }

    [Column("size_bytes")]
    public long SizeBytes { get; set; }

    [Column("storage_path")]
    public string StoragePath { get; set; } = string.Empty;

    [Column("uploaded_at")]
    public DateTimeOffset UploadedAt { get; set; }

    [Column("uploaded_by")]
    public long? UploadedBy { get; set; }

    [Column("verified_by")]
    public long? VerifiedBy { get; set; }

    [Column("verified_at")]
    public DateTimeOffset? VerifiedAt { get; set; }

    [Column("remarks")]
    public string? Remarks { get; set; }
}
