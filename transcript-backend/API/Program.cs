using System.Text;
using System.Text.Json.Serialization;
using Application.Extensions;
using Application.Interfaces;
using API.Middleware;
using API.Services;
using Infrastructure.Extensions;
using Infrastructure.Services.Jwt;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using FluentValidation.AspNetCore;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// QuestPDF 2024+ requires explicit license selection (Community is fine for eligible use-cases).
QuestPDF.Settings.License = LicenseType.Community;

builder.Host.UseSerilog((ctx, services, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext();
});

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddTransient<ExceptionHandlingMiddleware>();
builder.Services.AddTransient<RequestAuditMiddleware>();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddFluentValidationAutoValidation();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("frontend", p =>
    {
        // Dev convenience: allow any origin to prevent "NetworkError" when the Vite origin differs
        // (127.0.0.1 vs localhost vs LAN IP). Avoid credentials so AllowAnyOrigin is valid.
        if (builder.Environment.IsDevelopment())
        {
            p.AllowAnyOrigin()
             .AllowAnyHeader()
             .AllowAnyMethod();
            return;
        }

        p.AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()
         .WithOrigins(
             "http://localhost:5173",
             "http://127.0.0.1:5173"
         );
    });
});

var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.SigningKey))
{
    // Avoid silent misconfig; the JwtService will also throw if missing.
    builder.Logging.AddFilter("Microsoft", LogLevel.Warning);
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey ?? string.Empty))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var path = context.HttpContext.Request.Path.Value ?? string.Empty;
                var isStudentDownload = path.StartsWith("/api/student/transcripts/", StringComparison.OrdinalIgnoreCase)
                    && path.EndsWith("/download", StringComparison.OrdinalIgnoreCase);
                var isAdminDownload = path.StartsWith("/api/admin/transcripts/", StringComparison.OrdinalIgnoreCase)
                    && path.EndsWith("/download", StringComparison.OrdinalIgnoreCase);

                if (isStudentDownload || isAdminDownload)
                {
                    var tokenFromQuery = context.Request.Query["access_token"].FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(tokenFromQuery))
                        context.Token = tokenFromQuery;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();

app.UseSwagger();
app.UseSwaggerUI();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("frontend");

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<RequestAuditMiddleware>();

app.MapControllers();

// Bootstrap minimal admin schema extensions (idempotent).
// This keeps local dev unblocked without requiring migrations.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.V2.V2DbContext>();
    await Infrastructure.Persistence.V2.V2Bootstrapper.EnsureAppCompatSchemaAsync(db);
}

app.Run();
