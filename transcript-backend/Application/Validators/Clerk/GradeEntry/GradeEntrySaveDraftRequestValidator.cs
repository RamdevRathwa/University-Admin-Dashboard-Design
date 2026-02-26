using Application.DTOs.Clerk.GradeEntry;
using FluentValidation;

namespace Application.Validators.Clerk.GradeEntry;

public sealed class GradeEntrySaveDraftRequestValidator : AbstractValidator<GradeEntrySaveDraftRequestDto>
{
    public GradeEntrySaveDraftRequestValidator()
    {
        RuleFor(x => x.Items).NotNull();
        RuleForEach(x => x.Items).SetValidator(new GradeEntryUpsertValidator());
    }
}

