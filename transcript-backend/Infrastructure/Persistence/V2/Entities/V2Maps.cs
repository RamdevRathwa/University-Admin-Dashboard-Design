using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2MapUser
{
    [Column("legacy_user_guid")]
    public Guid LegacyUserGuid { get; set; }

    [Column("user_id")]
    public long UserId { get; set; }
}

public sealed class V2MapStudent
{
    [Column("legacy_user_guid")]
    public Guid LegacyUserGuid { get; set; }

    [Column("student_id")]
    public long StudentId { get; set; }
}

public sealed class V2MapRequest
{
    [Column("legacy_request_guid")]
    public Guid LegacyRequestGuid { get; set; }

    [Column("transcript_request_id")]
    public long TranscriptRequestId { get; set; }

    [Column("request_no")]
    public string? RequestNo { get; set; }
}

public sealed class V2MapTranscript
{
    [Column("legacy_transcript_guid")]
    public Guid LegacyTranscriptGuid { get; set; }

    [Column("transcript_id")]
    public long TranscriptId { get; set; }
}

public sealed class V2MapCurriculumSubject
{
    [Column("legacy_curriculum_subject_guid")]
    public Guid LegacyCurriculumSubjectGuid { get; set; }

    [Column("curriculum_subject_id")]
    public long CurriculumSubjectId { get; set; }
}

