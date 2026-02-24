namespace Application.DTOs.Auth;

public sealed record AuthResponseDto(string Token, UserDto User);

