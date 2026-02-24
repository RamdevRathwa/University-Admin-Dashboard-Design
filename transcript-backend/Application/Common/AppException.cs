namespace Application.Common;

public sealed class AppException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }

    public AppException(string message, int statusCode = 400, string code = "bad_request") : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public static AppException NotFound(string message = "Not found", string code = "not_found") =>
        new(message, 404, code);

    public static AppException Unauthorized(string message = "Unauthorized", string code = "unauthorized") =>
        new(message, 401, code);

    public static AppException Forbidden(string message = "Forbidden", string code = "forbidden") =>
        new(message, 403, code);

    public static AppException Conflict(string message = "Conflict", string code = "conflict") =>
        new(message, 409, code);
}

