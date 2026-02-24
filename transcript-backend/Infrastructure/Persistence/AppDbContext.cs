using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<TranscriptRequest> TranscriptRequests => Set<TranscriptRequest>();
    public DbSet<TranscriptApproval> TranscriptApprovals => Set<TranscriptApproval>();
    public DbSet<CurriculumSubject> CurriculumSubjects => Set<CurriculumSubject>();
    public DbSet<StudentGradeEntry> StudentGradeEntries => Set<StudentGradeEntry>();
    public DbSet<Transcript> Transcripts => Set<Transcript>();
    public DbSet<TranscriptSemesterSnapshot> TranscriptSemesterSnapshots => Set<TranscriptSemesterSnapshot>();
    public DbSet<TranscriptSubjectSnapshot> TranscriptSubjectSnapshots => Set<TranscriptSubjectSnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.FullName).HasMaxLength(120).IsRequired();
            b.Property(x => x.Email).HasMaxLength(254).IsRequired();
            b.Property(x => x.Mobile).HasMaxLength(20).IsRequired();
            b.HasIndex(x => x.Email).IsUnique();
            b.HasIndex(x => x.Mobile).IsUnique();

            b.HasOne(x => x.StudentProfile)
                .WithOne(x => x.User)
                .HasForeignKey<StudentProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OtpVerification>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Identifier).HasMaxLength(254).IsRequired();
            b.Property(x => x.OtpCode).HasMaxLength(512).IsRequired();
            b.HasIndex(x => new { x.Identifier, x.Purpose, x.IsUsed, x.ExpiresAt });
            b.HasOne(x => x.User)
                .WithMany(x => x.OtpVerifications)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudentProfile>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.PRN).HasMaxLength(50);
            b.Property(x => x.Faculty).HasMaxLength(100);
            b.Property(x => x.Department).HasMaxLength(100);
            b.Property(x => x.Program).HasMaxLength(100);
            b.Property(x => x.Nationality).HasMaxLength(60);
            b.Property(x => x.BirthPlace).HasMaxLength(120);
            b.Property(x => x.Address).HasMaxLength(500);
        });

        modelBuilder.Entity<TranscriptRequest>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasOne(x => x.Student)
                .WithMany(x => x.TranscriptRequests)
                .HasForeignKey(x => x.StudentId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasIndex(x => new { x.StudentId, x.Status, x.CreatedAt });
        });

        modelBuilder.Entity<TranscriptApproval>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Remarks).HasMaxLength(1000);
            b.HasOne(x => x.TranscriptRequest)
                .WithMany(x => x.Approvals)
                .HasForeignKey(x => x.TranscriptRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CurriculumSubject>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Program).HasMaxLength(100).IsRequired();
            b.Property(x => x.SubjectCode).HasMaxLength(30);
            b.Property(x => x.SubjectName).HasMaxLength(255).IsRequired();
            b.HasIndex(x => new { x.Program, x.SemesterNumber, x.SubjectCode });
        });

        modelBuilder.Entity<StudentGradeEntry>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.ThGrade).HasMaxLength(5);
            b.Property(x => x.PrGrade).HasMaxLength(5);
            b.HasIndex(x => new { x.StudentId, x.CurriculumSubjectId }).IsUnique();

            b.HasOne(x => x.Student)
                .WithMany()
                .HasForeignKey(x => x.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.CurriculumSubject)
                .WithMany()
                .HasForeignKey(x => x.CurriculumSubjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Transcript>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.PdfPath).HasMaxLength(600);
            b.Property(x => x.VerificationSalt).HasMaxLength(200);
            b.Property(x => x.VerificationHash).HasMaxLength(200);
            b.HasIndex(x => new { x.StudentId, x.ApprovedAt });
            b.HasIndex(x => x.TranscriptRequestId).IsUnique();

            b.HasOne(x => x.Student)
                .WithMany()
                .HasForeignKey(x => x.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.TranscriptRequest)
                .WithOne()
                .HasForeignKey<Transcript>(x => x.TranscriptRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TranscriptSemesterSnapshot>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.YearTitle).HasMaxLength(200);
            b.Property(x => x.TermTitle).HasMaxLength(200);
            b.Property(x => x.SemesterGrade).HasMaxLength(10);
            b.Property(x => x.Result).HasMaxLength(20);
            b.HasIndex(x => new { x.TranscriptId, x.SemesterNumber }).IsUnique();

            b.HasOne(x => x.Transcript)
                .WithMany(x => x.Semesters)
                .HasForeignKey(x => x.TranscriptId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TranscriptSubjectSnapshot>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.SubjectName).HasMaxLength(255);
            b.Property(x => x.SubjectCode).HasMaxLength(30);
            b.Property(x => x.ThGrade).HasMaxLength(5);
            b.Property(x => x.PrGrade).HasMaxLength(5);
            b.HasIndex(x => new { x.TranscriptSemesterSnapshotId, x.SN }).IsUnique();

            b.HasOne(x => x.Semester)
                .WithMany(x => x.Subjects)
                .HasForeignKey(x => x.TranscriptSemesterSnapshotId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
