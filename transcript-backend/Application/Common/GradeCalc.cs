using Domain.Entities;

namespace Application.Common;

public static class GradeCalc
{
    public static decimal GradePoint(string grade)
    {
        var g = (grade ?? string.Empty).Trim().ToUpperInvariant();
        return g switch
        {
            "O" => 10m,
            "A+" => 9m,
            "A" => 8m,
            "B+" => 7m,
            "B" => 6m,
            "C" => 5.5m,
            "P" => 5m,
            "S" => 5m,
            "P/S" => 5m,
            "F" => 0m,
            "-" => 0m,
            "--" => 0m,
            "" => 0m,
            _ => 0m
        };
    }

    public static bool IsGradeMissing(string grade, decimal credits)
    {
        if (credits <= 0) return false;
        return string.IsNullOrWhiteSpace((grade ?? string.Empty).Trim()) || (grade.Trim() == "-") || (grade.Trim() == "--");
    }

    public static string GradeFromGp(decimal gp)
    {
        if (gp >= 9.5m) return "O";
        if (gp >= 8.5m) return "A+";
        if (gp >= 7.5m) return "A";
        if (gp >= 6.5m) return "B+";
        if (gp >= 5.5m) return "B";
        if (gp >= 5.0m) return "P/S";
        return "F";
    }

    public static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    public static (decimal sgpa, decimal totalCredits, decimal totalEarned) ComputeSgpa(IEnumerable<(decimal credits, decimal earned)> rows)
    {
        decimal credits = 0m;
        decimal earned = 0m;
        foreach (var r in rows)
        {
            credits += r.credits;
            earned += r.earned;
        }

        var sgpa = credits <= 0 ? 0m : earned / credits;
        return (Round2(sgpa), Round2(credits), Round2(earned));
    }

    public static decimal ToOutOf(decimal credits, int scheme = 10) => Round2(credits * scheme);

    public static void EnsureNotLocked(TranscriptRequest req)
    {
        // Transcript is immutable once approved.
        if (req.Status == Domain.Enums.TranscriptRequestStatus.Approved)
            throw new AppException("Transcript is locked after Dean approval.", 400, "transcript_locked");
    }
}

