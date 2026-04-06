using Infrastructure.Persistence.V2.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace Infrastructure.Persistence.V2;

public sealed class V2DbContext : DbContext
{
    public V2DbContext(DbContextOptions<V2DbContext> options) : base(options) { }

    public DbSet<V2User> Users => Set<V2User>();
    public DbSet<V2Role> Roles => Set<V2Role>();
    public DbSet<V2UserRole> UserRoles => Set<V2UserRole>();

    public DbSet<V2OtpVerification> OtpVerifications => Set<V2OtpVerification>();
    public DbSet<V2LoginLog> LoginLogs => Set<V2LoginLog>();

    public DbSet<V2MapUser> MapUsers => Set<V2MapUser>();
    public DbSet<V2MapStudent> MapStudents => Set<V2MapStudent>();
    public DbSet<V2MapRequest> MapRequests => Set<V2MapRequest>();
    public DbSet<V2MapTranscript> MapTranscripts => Set<V2MapTranscript>();
    public DbSet<V2MapCurriculumSubject> MapCurriculumSubjects => Set<V2MapCurriculumSubject>();

    public DbSet<V2Student> Students => Set<V2Student>();
    public DbSet<V2StudentProfile> StudentProfiles => Set<V2StudentProfile>();

    public DbSet<V2Faculty> Faculties => Set<V2Faculty>();
    public DbSet<V2Department> Departments => Set<V2Department>();
    public DbSet<V2Program> Programs => Set<V2Program>();
    public DbSet<V2GradingScheme> GradingSchemes => Set<V2GradingScheme>();
    public DbSet<V2AcademicYear> AcademicYears => Set<V2AcademicYear>();

    public DbSet<V2CurriculumVersion> CurriculumVersions => Set<V2CurriculumVersion>();
    public DbSet<V2CurriculumSubject> CurriculumSubjects => Set<V2CurriculumSubject>();
    public DbSet<V2Subject> Subjects => Set<V2Subject>();
    public DbSet<V2SubjectVersion> SubjectVersions => Set<V2SubjectVersion>();

    public DbSet<V2TranscriptStatus> TranscriptStatuses => Set<V2TranscriptStatus>();
    public DbSet<V2TranscriptRequest> TranscriptRequests => Set<V2TranscriptRequest>();
    public DbSet<V2TranscriptApproval> TranscriptApprovals => Set<V2TranscriptApproval>();

    public DbSet<V2StudentMark> StudentMarks => Set<V2StudentMark>();

    public DbSet<V2Transcript> Transcripts => Set<V2Transcript>();
    public DbSet<V2TranscriptFile> TranscriptFiles => Set<V2TranscriptFile>();
    public DbSet<V2TranscriptSemesterSnapshot> TranscriptSemesterSnapshots => Set<V2TranscriptSemesterSnapshot>();
    public DbSet<V2TranscriptSubjectSnapshot> TranscriptSubjectSnapshots => Set<V2TranscriptSubjectSnapshot>();

    // Governance
    public DbSet<V2AuditLog> AuditLogs => Set<V2AuditLog>();
    public DbSet<V2SystemSetting> SystemSettings => Set<V2SystemSetting>();

    // App-compat extension table (created by V2Bootstrapper)
    public DbSet<V2TranscriptRequestDocument> TranscriptRequestDocuments => Set<V2TranscriptRequestDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<V2User>(b =>
        {
            b.ToTable("users").HasKey(x => x.UserId);

            // Computed columns in V2 (indexed). Must be read-only from EF inserts/updates.
            b.Property(x => x.NormalizedEmail)
                .HasComputedColumnSql("(lower(ltrim(rtrim(CONVERT([nvarchar](254),[email])))))", stored: false)
                .ValueGeneratedOnAddOrUpdate();
            b.Property(x => x.NormalizedEmail).Metadata.SetBeforeSaveBehavior(PropertySaveBehavior.Ignore);
            b.Property(x => x.NormalizedEmail).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);

            b.Property(x => x.NormalizedMobile)
                .HasComputedColumnSql("(CONVERT([nvarchar](20),replace(replace(replace(replace(replace(ltrim(rtrim(CONVERT([nvarchar](20),[mobile]))),' ',''),'-',''),'(',''),')',''),'+','')))", stored: false)
                .ValueGeneratedOnAddOrUpdate();
            b.Property(x => x.NormalizedMobile).Metadata.SetBeforeSaveBehavior(PropertySaveBehavior.Ignore);
            b.Property(x => x.NormalizedMobile).Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
        });
        modelBuilder.Entity<V2Role>().ToTable("roles").HasKey(x => x.RoleId);
        modelBuilder.Entity<V2UserRole>().ToTable("user_roles").HasKey(x => x.UserRoleId);

        modelBuilder.Entity<V2OtpVerification>().ToTable("otp_verifications").HasKey(x => x.OtpId);
        modelBuilder.Entity<V2LoginLog>().ToTable("login_logs").HasKey(x => x.LoginLogId);

        modelBuilder.Entity<V2MapUser>().ToTable("map_users").HasKey(x => x.LegacyUserGuid);
        modelBuilder.Entity<V2MapStudent>().ToTable("map_students").HasKey(x => x.LegacyUserGuid);
        modelBuilder.Entity<V2MapRequest>().ToTable("map_requests").HasKey(x => x.LegacyRequestGuid);
        modelBuilder.Entity<V2MapTranscript>().ToTable("map_transcripts").HasKey(x => x.LegacyTranscriptGuid);
        modelBuilder.Entity<V2MapCurriculumSubject>().ToTable("map_curriculum_subjects").HasKey(x => x.LegacyCurriculumSubjectGuid);

        modelBuilder.Entity<V2Student>().ToTable("students").HasKey(x => x.StudentId);
        modelBuilder.Entity<V2StudentProfile>().ToTable("student_profiles").HasKey(x => x.StudentId);

        modelBuilder.Entity<V2Faculty>().ToTable("faculties").HasKey(x => x.FacultyId);
        modelBuilder.Entity<V2Department>().ToTable("departments").HasKey(x => x.DepartmentId);
        modelBuilder.Entity<V2Program>().ToTable("programs").HasKey(x => x.ProgramId);
        modelBuilder.Entity<V2GradingScheme>(b =>
        {
            b.ToTable("grading_schemes").HasKey(x => x.GradingSchemeId);
            b.Property(x => x.MaxGradePoint).HasPrecision(5, 2);
        });
        modelBuilder.Entity<V2AcademicYear>().ToTable("academic_years").HasKey(x => x.AcademicYearId);

        modelBuilder.Entity<V2CurriculumVersion>().ToTable("curriculum_versions").HasKey(x => x.CurriculumVersionId);
        modelBuilder.Entity<V2CurriculumSubject>().ToTable("curriculum_subjects").HasKey(x => x.CurriculumSubjectId);
        modelBuilder.Entity<V2Subject>().ToTable("subjects").HasKey(x => x.SubjectId);
        modelBuilder.Entity<V2SubjectVersion>().ToTable("subject_versions").HasKey(x => x.SubjectVersionId);

        modelBuilder.Entity<V2TranscriptStatus>().ToTable("transcript_statuses").HasKey(x => x.StatusId);
        modelBuilder.Entity<V2TranscriptRequest>()
            .ToTable("transcript_requests", tb => tb.HasTrigger("tr_transcript_requests_enforce_transition"))
            .HasKey(x => x.TranscriptRequestId);
        modelBuilder.Entity<V2TranscriptApproval>().ToTable("transcript_approvals").HasKey(x => x.TranscriptApprovalId);

        modelBuilder.Entity<V2StudentMark>().ToTable("student_marks").HasKey(x => x.StudentMarkId);

        modelBuilder.Entity<V2Transcript>().ToTable("transcripts").HasKey(x => x.TranscriptId);
        modelBuilder.Entity<V2TranscriptFile>().ToTable("transcript_files").HasKey(x => x.TranscriptFileId);
        modelBuilder.Entity<V2TranscriptSemesterSnapshot>()
            .ToTable("transcript_semester_snapshots", tb => tb.HasTrigger("tr_tss_immutable"))
            .HasKey(x => x.TranscriptSemesterSnapshotId);
        modelBuilder.Entity<V2TranscriptSubjectSnapshot>()
            .ToTable("transcript_subject_snapshots", tb => tb.HasTrigger("tr_tsub_immutable"))
            .HasKey(x => x.TranscriptSubjectSnapshotId);

        modelBuilder.Entity<V2AuditLog>().ToTable("audit_logs").HasKey(x => x.AuditLogId);
        modelBuilder.Entity<V2SystemSetting>().ToTable("system_settings").HasKey(x => x.SettingId);

        modelBuilder.Entity<V2TranscriptRequestDocument>().ToTable("transcript_request_documents").HasKey(x => x.TranscriptRequestDocumentId);

        // Match SQL Server precision/scale to avoid EF Core truncation warnings.
        modelBuilder.Entity<V2CurriculumSubject>(b =>
        {
            b.Property(x => x.ThHoursPerWeek).HasPrecision(5, 2);
            b.Property(x => x.PrHoursPerWeek).HasPrecision(5, 2);
            b.Property(x => x.ThCredits).HasPrecision(5, 2);
            b.Property(x => x.PrCredits).HasPrecision(5, 2);
        });

        modelBuilder.Entity<V2Transcript>(b =>
        {
            b.Property(x => x.Cgpa).HasPrecision(6, 3);
            b.Property(x => x.Percentage).HasPrecision(6, 2);
            b.Property(x => x.CreditsEarned).HasPrecision(10, 2);

            // dbo.transcripts.is_locked is a computed column (based on locked_at). Never write to it.
            b.Property(x => x.IsLocked).ValueGeneratedOnAddOrUpdate();
            b.Property(x => x.IsLocked).Metadata.SetBeforeSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            b.Property(x => x.IsLocked).Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
        });

        modelBuilder.Entity<V2TranscriptSemesterSnapshot>(b =>
        {
            b.Property(x => x.ThHoursTotal).HasPrecision(7, 2);
            b.Property(x => x.PrHoursTotal).HasPrecision(7, 2);
            b.Property(x => x.ThCreditsTotal).HasPrecision(7, 2);
            b.Property(x => x.PrCreditsTotal).HasPrecision(7, 2);
            b.Property(x => x.ThGradePointsSum).HasPrecision(10, 2);
            b.Property(x => x.PrGradePointsSum).HasPrecision(10, 2);
            b.Property(x => x.ThEarnedTotal).HasPrecision(10, 2);
            b.Property(x => x.PrEarnedTotal).HasPrecision(10, 2);
            b.Property(x => x.ThOutOfTotal).HasPrecision(10, 2);
            b.Property(x => x.PrOutOfTotal).HasPrecision(10, 2);
            b.Property(x => x.Sgpa).HasPrecision(6, 3);
            b.Property(x => x.Percentage).HasPrecision(6, 2);
            b.Property(x => x.Egp).HasPrecision(10, 2);
        });

        modelBuilder.Entity<V2TranscriptSubjectSnapshot>(b =>
        {
            b.Property(x => x.ThHours).HasPrecision(5, 2);
            b.Property(x => x.PrHours).HasPrecision(5, 2);
            b.Property(x => x.ThCredits).HasPrecision(5, 2);
            b.Property(x => x.PrCredits).HasPrecision(5, 2);
            b.Property(x => x.ThGradePoint).HasPrecision(5, 2);
            b.Property(x => x.PrGradePoint).HasPrecision(5, 2);
            b.Property(x => x.ThEarned).HasPrecision(10, 2);
            b.Property(x => x.PrEarned).HasPrecision(10, 2);
        });
    }
}
