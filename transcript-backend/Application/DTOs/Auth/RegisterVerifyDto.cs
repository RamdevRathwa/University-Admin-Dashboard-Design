namespace Application.DTOs.Auth;

public sealed record RegisterVerifyDto(
    string FullName,
    string Email,
    string Mobile,
    string EmailOtp,
    string MobileOtp
);

