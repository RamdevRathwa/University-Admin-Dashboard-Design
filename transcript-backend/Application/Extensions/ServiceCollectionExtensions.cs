using Application.Interfaces;
using Application.Services;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Application.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IStudentProfileService, StudentProfileService>();
        services.AddScoped<ITranscriptService, TranscriptService>();
        services.AddScoped<IClerkGradeEntryService, ClerkGradeEntryService>();
        services.AddScoped<IClerkWorkflowService, ClerkWorkflowService>();
        services.AddScoped<IHodWorkflowService, HodWorkflowService>();
        services.AddScoped<IHodReviewService, HodReviewService>();
        services.AddScoped<IDeanApprovalService, DeanApprovalService>();
        services.AddScoped<IStudentTranscriptService, StudentTranscriptService>();
        services.AddScoped<IAdminService, AdminService>();

        services.AddValidatorsFromAssembly(typeof(ServiceCollectionExtensions).Assembly);
        return services;
    }
}
