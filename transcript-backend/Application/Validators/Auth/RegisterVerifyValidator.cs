using Application.DTOs.Auth;
using FluentValidation;

namespace Application.Validators.Auth;

public sealed class RegisterVerifyValidator : AbstractValidator<RegisterVerifyDto>
{
    public RegisterVerifyValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Mobile)
            .NotEmpty()
            .Matches(@"^\d{10}$").WithMessage("Mobile must be a valid 10-digit number.");

        RuleFor(x => x.EmailOtp).NotEmpty().Length(6);
        RuleFor(x => x.MobileOtp).NotEmpty().Length(6);
    }
}

