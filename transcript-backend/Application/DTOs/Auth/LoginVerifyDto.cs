namespace Application.DTOs.Auth;

public sealed record LoginVerifyDto(string Identifier, string Otp);
