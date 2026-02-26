using Application.DTOs.Clerk.GradeEntry;
using FluentValidation;

namespace Application.Validators.Clerk.GradeEntry;

public sealed class GradeEntrySubmitRequestValidator : AbstractValidator<GradeEntrySubmitRequestDto>
{
    public GradeEntrySubmitRequestValidator()
    {
        RuleFor(x => x.Items).NotNull().NotEmpty();
        RuleForEach(x => x.Items).SetValidator(new GradeEntryUpsertValidator());
        RuleFor(x => x.Remarks).MaximumLength(1000);
    }
}

