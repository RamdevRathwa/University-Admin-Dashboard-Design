using Application.DTOs.Auth;
using FluentValidation;

namespace Application.Validators.Auth;

public sealed class RegisterRequestOtpValidator : AbstractValidator<RegisterRequestOtpDto>
{
    public RegisterRequestOtpValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Mobile)
            .NotEmpty()
            .Matches(@"^\d{10}$").WithMessage("Mobile must be a valid 10-digit number.");
    }
}

