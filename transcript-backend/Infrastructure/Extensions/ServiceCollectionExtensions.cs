using Application.Interfaces;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Infrastructure.Persistence.V2;
using Infrastructure.Repositories;
using Infrastructure.Services.Jwt;
using Infrastructure.Services.Messaging;
using Infrastructure.Services.Otp;
using Infrastructure.Services.Documents;
using Infrastructure.Services.Transcripts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<JwtOptions>(config.GetSection(JwtOptions.SectionName));
        services.Configure<OtpOptions>(config.GetSection(OtpOptions.SectionName));
        services.Configure<SmtpOptions>(config.GetSection(SmtpOptions.SectionName));
        services.Configure<Msg91Options>(config.GetSection(Msg91Options.SectionName));
        services.Configure<TranscriptStorageOptions>(config.GetSection(TranscriptStorageOptions.SectionName));
        services.Configure<DocumentStorageOptions>(config.GetSection(DocumentStorageOptions.SectionName));

        // V2 DbContext (enterprise schema). All repositories are being migrated to V2.
        services.AddDbContext<V2DbContext>(opt =>
        {
            var cs = config.GetConnectionString("DefaultConnection");
            opt.UseSqlServer(cs);
        });

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IOtpVerificationRepository, OtpVerificationRepository>();
        services.AddScoped<IStudentProfileRepository, StudentProfileRepository>();
        services.AddScoped<ITranscriptRequestRepository, TranscriptRequestRepository>();
        services.AddScoped<ITranscriptApprovalRepository, TranscriptApprovalRepository>();
        services.AddScoped<ICurriculumSubjectRepository, CurriculumSubjectRepository>();
        services.AddScoped<IStudentGradeEntryRepository, StudentGradeEntryRepository>();
        services.AddScoped<ITranscriptRepository, TranscriptRepository>();
        services.AddScoped<ITranscriptDocumentRepository, TranscriptDocumentRepository>();
        services.AddScoped<IAdminRepository, AdminRepository>();

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<ITranscriptPdfService, TranscriptPdfService>();
        services.AddScoped<IDocumentStorage, FileSystemDocumentStorage>();

        services.AddScoped<IEmailSender, SmtpEmailSender>();
        var fixedOtp = (config.GetSection(OtpOptions.SectionName).GetValue<string>("FixedCode") ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(fixedOtp))
        {
            services.AddScoped<ISmsSender, NoOpSmsSender>();
        }
        else
        {
            services.AddHttpClient<Msg91SmsSender>();
            services.AddScoped<ISmsSender, Msg91SmsSender>();
        }

        return services;
    }
}
