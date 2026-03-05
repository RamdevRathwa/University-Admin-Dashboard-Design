using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2CurriculumVersion
{
    [Column("curriculum_version_id")]
    public int CurriculumVersionId { get; set; }

    [Column("program_id")]
    public int ProgramId { get; set; }

    [Column("academic_year_id")]
    public int AcademicYearId { get; set; }

    [Column("version_no")]
    public int VersionNo { get; set; }

    [Column("version_label")]
    public string VersionLabel { get; set; } = string.Empty;

    [Column("is_published")]
    public bool IsPublished { get; set; }

    [Column("published_at")]
    public DateTimeOffset? PublishedAt { get; set; }

    [Column("created_by")]
    public long? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2Subject
{
    [Column("subject_id")]
    public int SubjectId { get; set; }

    [Column("subject_code")]
    public string SubjectCode { get; set; } = string.Empty;

    [Column("subject_name")]
    public string SubjectName { get; set; } = string.Empty;

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2SubjectVersion
{
    [Column("subject_version_id")]
    public int SubjectVersionId { get; set; }

    [Column("subject_id")]
    public int SubjectId { get; set; }

    [Column("version_label")]
    public string VersionLabel { get; set; } = string.Empty;

    [Column("effective_from")]
    public DateTime EffectiveFrom { get; set; }

    [Column("effective_to")]
    public DateTime? EffectiveTo { get; set; }

    [Column("title_on_transcript")]
    public string TitleOnTranscript { get; set; } = string.Empty;

    [Column("has_theory")]
    public bool HasTheory { get; set; }

    [Column("has_practical")]
    public bool HasPractical { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2CurriculumSubject
{
    [Column("curriculum_subject_id")]
    public long CurriculumSubjectId { get; set; }

    [Column("curriculum_version_id")]
    public int CurriculumVersionId { get; set; }

    [Column("subject_version_id")]
    public int SubjectVersionId { get; set; }

    [Column("semester_number")]
    public byte SemesterNumber { get; set; }

    [Column("display_order")]
    public int? DisplayOrder { get; set; }

    [Column("th_hours_per_week")]
    public decimal ThHoursPerWeek { get; set; }

    [Column("pr_hours_per_week")]
    public decimal PrHoursPerWeek { get; set; }

    [Column("th_credits")]
    public decimal ThCredits { get; set; }

    [Column("pr_credits")]
    public decimal PrCredits { get; set; }

    [Column("is_elective")]
    public bool IsElective { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }
}

