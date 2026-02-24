using Application.DTOs.Auth;

namespace Application.Interfaces;

public interface IAuthService
{
    Task RequestRegistrationOtpAsync(RegisterRequestOtpDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> VerifyRegistrationAsync(RegisterVerifyDto dto, CancellationToken ct = default);
    Task RequestLoginOtpAsync(LoginRequestOtpDto dto, CancellationToken ct = default);
    Task<AuthResponseDto> VerifyLoginAsync(LoginVerifyDto dto, CancellationToken ct = default);
}

