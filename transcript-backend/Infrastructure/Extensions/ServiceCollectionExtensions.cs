using Application.Interfaces;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Infrastructure.Services.Jwt;
using Infrastructure.Services.Messaging;
using Infrastructure.Services.Otp;
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

        services.AddDbContext<AppDbContext>(opt =>
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

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<ITranscriptPdfService, TranscriptPdfService>();

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
