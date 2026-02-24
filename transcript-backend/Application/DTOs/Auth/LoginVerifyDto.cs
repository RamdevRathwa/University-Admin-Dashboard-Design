using Domain.Enums;

namespace Application.DTOs.Auth;

public sealed record LoginVerifyDto(string Identifier, string Otp, UserRole Role);

