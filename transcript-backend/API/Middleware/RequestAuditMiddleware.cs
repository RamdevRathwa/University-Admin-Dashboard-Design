using System.Text;
using Application.Interfaces;
using Domain.Enums;

namespace API.Middleware;

public sealed class RequestAuditMiddleware : IMiddleware
{
    private static readonly HashSet<string> AdminMethods = new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH", "DELETE" };

    private readonly IAuditTrailService _audit;
    private readonly ICurrentUserService _current;
    private readonly ILogger<RequestAuditMiddleware> _log;

    public RequestAuditMiddleware(IAuditTrailService audit, ICurrentUserService current, ILogger<RequestAuditMiddleware> log)
    {
        _audit = audit;
        _current = current;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var method = context.Request.Method ?? "GET";
        var shouldAttempt = ShouldAudit(path, method);
        string? requestPayload = null;

        if (shouldAttempt && ShouldCaptureBody(context.Request))
        {
            requestPayload = await ReadRequestBodyAsync(context.Request);
        }

        await next(context);

        if (!shouldAttempt || context.Response.StatusCode >= 400)
            return;

        try
        {
            var routeValues = context.GetRouteData()?.Values;
            var controller = routeValues?["controller"]?.ToString();
            var entity = !string.IsNullOrWhiteSpace(controller)
                ? controller!
                : ResolveEntityFromPath(path);

            var recordId =
                routeValues?["id"]?.ToString() ??
                routeValues?["requestId"]?.ToString() ??
                routeValues?["prn"]?.ToString() ??
                routeValues?["transcriptId"]?.ToString();

            var action = ResolveAction(path, method);
            var actorUserId = _current.IsAuthenticated ? _current.UserId : (Guid?)null;

            if (path.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase) &&
                AdminMethods.Contains(method))
            {
                return;
            }

            if (!_current.IsAuthenticated && action != "DOWNLOAD")
                return;

            await _audit.LogAsync(
                action,
                entity,
                recordId,
                null,
                requestPayload,
                actorUserId,
                context.Connection.RemoteIpAddress?.ToString(),
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Failed to write request audit log for {Method} {Path}", method, path);
        }
    }

    private static bool ShouldAudit(string path, string method)
    {
        if (string.IsNullOrWhiteSpace(path)) return false;
        if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)) return false;
        if (path.StartsWith("/api/admin/audit", StringComparison.OrdinalIgnoreCase)) return false;

        if (path.EndsWith("/download", StringComparison.OrdinalIgnoreCase)) return true;
        if (HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method))
            return true;

        return false;
    }

    private static bool ShouldCaptureBody(HttpRequest request)
    {
        if (request.ContentLength is null || request.ContentLength <= 0) return false;
        var contentType = request.ContentType ?? string.Empty;
        return contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase) ||
               contentType.Contains("application/problem+json", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<string?> ReadRequestBodyAsync(HttpRequest request)
    {
        request.EnableBuffering();
        request.Body.Position = 0;

        using var reader = new StreamReader(request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        body = body?.Trim();
        if (string.IsNullOrWhiteSpace(body)) return null;
        return body.Length > 4000 ? body[..4000] : body;
    }

    private static string ResolveAction(string path, string method)
    {
        if (path.Contains("/submit-to-hod", StringComparison.OrdinalIgnoreCase)) return "SUBMIT_TO_HOD";
        if (path.Contains("/forward-to-hod", StringComparison.OrdinalIgnoreCase)) return "FORWARD_TO_HOD";
        if (path.Contains("/save-draft", StringComparison.OrdinalIgnoreCase)) return "SAVE_DRAFT";
        if (path.Contains("/approve", StringComparison.OrdinalIgnoreCase)) return "APPROVE";
        if (path.Contains("/reject", StringComparison.OrdinalIgnoreCase)) return "REJECT";
        if (path.Contains("/return", StringComparison.OrdinalIgnoreCase)) return "RETURN";
        if (path.Contains("/submit", StringComparison.OrdinalIgnoreCase)) return "SUBMIT";
        if (path.Contains("/upload", StringComparison.OrdinalIgnoreCase)) return "UPLOAD";
        if (path.EndsWith("/download", StringComparison.OrdinalIgnoreCase)) return "DOWNLOAD";

        if (HttpMethods.IsPost(method)) return "INSERT";
        if (HttpMethods.IsPut(method) || HttpMethods.IsPatch(method)) return "UPDATE";
        if (HttpMethods.IsDelete(method)) return "DELETE";
        return method.ToUpperInvariant();
    }

    private static string ResolveEntityFromPath(string path)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 3 && string.Equals(segments[0], "api", StringComparison.OrdinalIgnoreCase))
            return $"{segments[1]}_{segments[2]}";
        if (segments.Length >= 2 && string.Equals(segments[0], "api", StringComparison.OrdinalIgnoreCase))
            return segments[1];
        return "Request";
    }
}
