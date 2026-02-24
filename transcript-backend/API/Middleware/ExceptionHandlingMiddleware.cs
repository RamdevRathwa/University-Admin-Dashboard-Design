using System.Net;
using Application.Common;
using Serilog.Context;

namespace API.Middleware;

public sealed class ExceptionHandlingMiddleware : IMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _log;
    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> log) => _log = log;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var traceId = context.TraceIdentifier;
        using (LogContext.PushProperty("TraceId", traceId))
        {
            try
            {
                await next(context);
            }
            catch (AppException ex)
            {
                _log.LogWarning(ex, "Handled application exception: {Code}", ex.Code);
                await WriteProblem(context, ex.StatusCode, ex.Message, ex.Code, traceId);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unhandled exception");
                await WriteProblem(context, (int)HttpStatusCode.InternalServerError, "An unexpected error occurred.", "server_error", traceId);
            }
        }
    }

    private static async Task WriteProblem(HttpContext ctx, int status, string title, string code, string traceId)
    {
        ctx.Response.ContentType = "application/problem+json";
        ctx.Response.StatusCode = status;

        var payload = new
        {
            type = $"https://httpstatuses.com/{status}",
            title,
            status,
            code,
            traceId
        };

        await ctx.Response.WriteAsJsonAsync(payload);
    }
}

