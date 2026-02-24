using Application.DTOs.Auth;
using FluentValidation;

namespace Application.Validators.Auth;

public sealed class LoginRequestOtpValidator : AbstractValidator<LoginRequestOtpDto>
{
    public LoginRequestOtpValidator()
    {
        RuleFor(x => x.Identifier).NotEmpty().MaximumLength(254);
    }
}

