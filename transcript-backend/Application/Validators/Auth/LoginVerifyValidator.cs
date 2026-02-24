using Application.DTOs.Auth;
using FluentValidation;

namespace Application.Validators.Auth;

public sealed class LoginVerifyValidator : AbstractValidator<LoginVerifyDto>
{
    public LoginVerifyValidator()
    {
        RuleFor(x => x.Identifier).NotEmpty().MaximumLength(254);
        RuleFor(x => x.Otp).NotEmpty().Length(6);
        RuleFor(x => x.Role).IsInEnum();
    }
}

