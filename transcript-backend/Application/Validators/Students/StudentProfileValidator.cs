using Application.DTOs.Students;
using FluentValidation;

namespace Application.Validators.Students;

public sealed class StudentProfileValidator : AbstractValidator<StudentProfileDto>
{
    public StudentProfileValidator()
    {
        RuleFor(x => x.PRN).MaximumLength(50);
        RuleFor(x => x.Faculty).MaximumLength(100);
        RuleFor(x => x.Department).MaximumLength(100);
        RuleFor(x => x.Program).MaximumLength(100);
        RuleFor(x => x.Nationality).MaximumLength(60);
        RuleFor(x => x.BirthPlace).MaximumLength(120);
        RuleFor(x => x.Address).MaximumLength(500);

        RuleFor(x => x.AdmissionYear)
            .InclusiveBetween(1950, 2100)
            .When(x => x.AdmissionYear.HasValue);

        RuleFor(x => x.GraduationYear)
            .InclusiveBetween(1950, 2100)
            .When(x => x.GraduationYear.HasValue);
    }
}

