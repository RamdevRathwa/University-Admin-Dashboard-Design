using Application.DTOs.Clerk.GradeEntry;
using FluentValidation;

namespace Application.Validators.Clerk.GradeEntry;

public sealed class GradeEntryUpsertValidator : AbstractValidator<GradeEntryUpsertDto>
{
    private static readonly HashSet<string> Allowed =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "O", "A+", "A", "B+", "B", "C", "P", "S", "P/S", "F", "-", "--", ""
        };

    public GradeEntryUpsertValidator()
    {
        RuleFor(x => x.CurriculumSubjectId).NotEmpty();

        RuleFor(x => x.ThGrade)
            .Must(BeAllowed)
            .WithMessage("Invalid TH grade.");

        RuleFor(x => x.PrGrade)
            .Must(BeAllowed)
            .WithMessage("Invalid PR grade.");
    }

    private static bool BeAllowed(string? grade)
    {
        var g = (grade ?? string.Empty).Trim().ToUpperInvariant();
        return Allowed.Contains(g);
    }
}

