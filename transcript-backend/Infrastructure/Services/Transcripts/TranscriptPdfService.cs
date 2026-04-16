using System.Security.Cryptography;
using System.Text;
using Application.Common;
using Application.Interfaces;
using Domain.Entities;
using Domain.Interfaces;
using Microsoft.Extensions.Options;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Infrastructure.Services.Transcripts;

public sealed class TranscriptPdfService : ITranscriptPdfService
{
    private readonly ITranscriptRepository _transcripts;
    private readonly IUnitOfWork _uow;
    private readonly TranscriptStorageOptions _opt;

    public TranscriptPdfService(
        ITranscriptRepository transcripts,
        IUnitOfWork uow,
        IOptions<TranscriptStorageOptions> opt)
    {
        _transcripts = transcripts;
        _uow = uow;
        _opt = opt.Value;
    }

    public async Task<(string relativePath, string verificationCode)> GeneratePdfAsync(Guid transcriptId, CancellationToken ct = default)
    {
        var t = await _transcripts.GetByIdAsync(transcriptId, ct);
        if (t is null) throw AppException.NotFound("Transcript not found.");

        var verificationCode = GenerateVerificationCode();
        var (salt, hash) = ComputeVerificationHash(verificationCode);
        t.VerificationSalt = salt;
        t.VerificationHash = hash;

        var root = ResolveRoot(_opt.RootPath);
        Directory.CreateDirectory(root);

        var fileName = GenerateTranscriptFileName(t.Id);
        var absPath = Path.Combine(root, fileName);

        var doc = new OfficialTranscriptDocument(t, verificationCode);
        doc.GeneratePdf(absPath);

        await _transcripts.UpdateAsync(t, ct);
        await _uow.SaveChangesAsync(ct);

        var relative = NormalizeRelative(_opt.RootPath, fileName);
        return (relative, verificationCode);
    }

    private static string ResolveRoot(string rootPath)
    {
        var p = (rootPath ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(p)) p = "Storage/Transcripts";
        return Path.IsPathRooted(p) ? p : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, p));
    }

    private static string NormalizeRelative(string rootPath, string fileName)
    {
        var basePath = (rootPath ?? "Storage/Transcripts").Trim().TrimEnd('\\', '/');
        if (string.IsNullOrWhiteSpace(basePath)) basePath = "Storage/Transcripts";
        return $"{basePath.Replace('\\', '/')}/{fileName}";
    }

    private static string GenerateTranscriptFileName(Guid transcriptId)
    {
        return $"MSU_Transcript_{transcriptId:N}_{DateTime.UtcNow:yyyyMMddHHmmssfff}_{Guid.NewGuid():N}.pdf";
    }

    private static string GenerateVerificationCode()
    {
        // Public, human-friendly verification code (not a secret).
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<byte> bytes = stackalloc byte[10];
        RandomNumberGenerator.Fill(bytes);
        var sb = new StringBuilder(10);
        for (var i = 0; i < bytes.Length; i++)
            sb.Append(chars[bytes[i] % chars.Length]);
        return sb.ToString();
    }

    private (string salt, string hash) ComputeVerificationHash(string code)
    {
        Span<byte> saltBytes = stackalloc byte[16];
        RandomNumberGenerator.Fill(saltBytes);
        var saltB64 = Convert.ToBase64String(saltBytes);

        var key = Encoding.UTF8.GetBytes((_opt.VerificationKey ?? string.Empty).Trim());
        if (key.Length < 16) key = Encoding.UTF8.GetBytes("DEV_ONLY__CHANGE_ME__LONGER_KEY");

        using var hmac = new HMACSHA256(key);
        var data = Encoding.UTF8.GetBytes($"{saltB64}:{code}");
        var hashBytes = hmac.ComputeHash(data);
        var hashB64 = Convert.ToBase64String(hashBytes);
        return (saltB64, hashB64);
    }

    private sealed class OfficialTranscriptDocument : IDocument
    {
        private readonly Transcript _t;
        private readonly string _verificationCode;

        public OfficialTranscriptDocument(Transcript t, string verificationCode)
        {
            _t = t;
            _verificationCode = verificationCode;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(25);
                page.DefaultTextStyle(x => x.FontFamily("Times New Roman").FontSize(10));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
        }

        private void ComposeHeader(IContainer c)
        {
            c.Border(1).Padding(8).Row(r =>
            {
                r.ConstantItem(110).AlignMiddle().Element(LogoLeft);
                r.RelativeItem().AlignMiddle().Column(col =>
                {
                    col.Item().AlignCenter().Text("Faculty of Technology & Engineering").SemiBold().FontSize(14);
                    col.Item().AlignCenter().Text("THE MAHARAJA SAYAJIRAO UNIVERSITY OF BARODA").SemiBold().FontSize(11);
                    col.Item().AlignCenter().Text("Post Box Number : 51, Kalabhavan,").FontSize(9);
                    col.Item().AlignCenter().Text("Vadodara - 390 001").FontSize(9);
                    col.Item().AlignCenter().Text("☎  +91-265-2434188     ✆  +91-265-2423898").FontSize(9);
                    col.Item().AlignCenter().Text("E-mail: dean-tech@msubaroda.ac.in  &  deantech@yahoo.in").FontSize(9);
                    col.Item().AlignCenter().Text("ACCREDITED GRADE “A+” BY NAAC").SemiBold().FontSize(10);
                });
                r.ConstantItem(110).AlignMiddle().Element(LogoRight);
            });
        }

        private void LogoLeft(IContainer c)
        {
            // File is optional. If missing, keep the space.
            var p = ResolveUniversityLogoPath();
            if (File.Exists(p))
            {
                var bytes = File.ReadAllBytes(p);
                c.AlignCenter().AlignMiddle().Width(82).Height(82).Padding(2)
                    .Image(bytes)
                    .FitArea();
            }
            else
                c.Width(82).Height(82);
        }

        private void LogoRight(IContainer c)
        {
            // Placeholder for the 75-years emblem. Keep empty for now.
            c.Width(82).Height(82);
        }

        private static string ResolveUniversityLogoPath()
        {
            var candidates = new List<string>
            {
                Path.Combine(AppContext.BaseDirectory, "Assets", "university-logo.jpg"),
                Path.Combine(AppContext.BaseDirectory, "Assets", "university-logo.png")
            };

            var cursor = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            for (var i = 0; i < 8 && !string.IsNullOrWhiteSpace(cursor); i++)
            {
                candidates.Add(Path.Combine(cursor, "Assets", "university-logo.jpg"));
                candidates.Add(Path.Combine(cursor, "Assets", "university-logo.png"));
                candidates.Add(Path.Combine(cursor, "API", "Assets", "university-logo.jpg"));
                candidates.Add(Path.Combine(cursor, "API", "Assets", "university-logo.png"));

                var parent = Directory.GetParent(cursor);
                if (parent is null) break;
                cursor = parent.FullName;
            }

            return candidates.FirstOrDefault(File.Exists) ?? candidates[0];
        }

        private void ComposeFooter(IContainer c)
        {
            c.PaddingTop(6).Row(r =>
            {
                r.RelativeItem().AlignLeft().Text($"Verification Code: {_verificationCode}").FontSize(9);
                r.RelativeItem().AlignCenter().Text(x =>
                {
                    x.DefaultTextStyle(s => s.FontSize(9));
                    x.Span("PAGE ");
                    x.CurrentPageNumber();
                    x.Span(" OF ");
                    x.TotalPages();
                });
                r.RelativeItem().AlignRight().Text("");
            });
        }

        private void ComposeContent(IContainer c)
        {
            var profile = _t.Student.StudentProfile;
            var studentName = _t.Student.FullName;

            c.Column(col =>
            {
                col.Spacing(8);

                col.Item().Row(r =>
                {
                    r.RelativeItem().Text("TRANSCRIPT OF THE ACADEMIC RECORD").SemiBold();
                    r.ConstantItem(160).AlignRight().Text($"Date : {DateTime.Now:dd.MM.yyyy}").SemiBold();
                });

                col.Item().Text(txt =>
                {
                    txt.DefaultTextStyle(s => s.FontSize(9.5f));
                    txt.Span("This is the Transcript of the academic record of ");
                    txt.Span(studentName.ToUpperInvariant()).SemiBold();
                    txt.Span(" in the Faculty of Technology and Engineering of The Maharaja Sayajirao University of Baroda, Vadodara, Gujarat State, India.");
                });

                col.Item().Text("PERSONAL DETAILS :").SemiBold();

                col.Item().Element(x => PersonalDetails(x, profile, studentName));

                col.Item().Text("The details of the Academic Progress Record is as under :").FontSize(10);

                // Keep this line on the first page, then start semester tables on next page.
                col.Item().PageBreak();

                var semestersList = _t.Semesters.OrderBy(x => x.SemesterNumber).ToList();
                for (var idx = 0; idx < semestersList.Count; idx++)
                {
                    // Keep transcript tables year-wise: two semesters per page.
                    if (idx > 0 && idx % 2 == 0)
                        col.Item().PageBreak();

                    var sem = semestersList[idx];
                    var cumulativeSemestersUpTo = semestersList.Take(idx + 1).ToList();
                    var cumulativeCGPA = CalculateCumulativeCGPA(cumulativeSemestersUpTo);
                    var cumulativePercentage = CalculateCumulativePercentage(cumulativeSemestersUpTo);
                    var cumulativeEGP = CalculateCumulativeEGP(cumulativeSemestersUpTo);
                    var cumulativeGrade = DetermineGrade(cumulativePercentage);
                    col.Item().Element(x => SemesterBlock(x, sem, cumulativeCGPA, cumulativePercentage, cumulativeEGP, cumulativeGrade));
                }

                col.Item().PageBreak();
                col.Item().Element(LastPageBlock);
            });
        }

        private void PersonalDetails(IContainer c, StudentProfile? p, string fullName)
        {
            // Simple two-column layout like the official print (number + label : value)
            c.Column(col =>
            {
                col.Spacing(8);
                DetailRow(col, "1", "Permanent Registration No.", p?.PRN ?? "");
                DetailRow(col, "2", "Full Name", fullName);
                DetailRow(col, "3", "Nationality", p?.Nationality ?? "");
                DetailRow(col, "4", "Date of Birth", p?.DOB.HasValue == true ? p.DOB.Value.ToString("dd MMMM yyyy") : "");
                DetailRow(col, "5", "Birth Place", p?.BirthPlace ?? "");
                DetailRow(col, "6", "Permanent Address", p?.Address ?? "");
                DetailRow(col, "7", "Degree to be Awarded", $"{p?.Program}".Trim());
                DetailRow(col, "8", "Joined Course in", ResolveJoinedCourseText(p));
                DetailRow(col, "9", "Course Duration", ResolveCourseDurationText(p));
            });
        }

        private string ResolveJoinedCourseText(StudentProfile? p)
        {
            if (p?.AdmissionYear.HasValue == true)
                return $"July {p.AdmissionYear.Value}";

            var firstSemester = _t.Semesters
                .OrderBy(x => x.SemesterNumber)
                .FirstOrDefault();

            var yearSource = $"{firstSemester?.YearTitle} {firstSemester?.TermTitle}";
            if (string.IsNullOrWhiteSpace(yearSource))
                return string.Empty;

            var match = System.Text.RegularExpressions.Regex.Match(yearSource, @"\b(19|20)\d{2}\b");
            return match.Success ? $"July {match.Value}" : string.Empty;
        }

        private string ResolveCourseDurationText(StudentProfile? p)
        {
            if (p?.AdmissionYear.HasValue == true && p.GraduationYear.HasValue == true && p.GraduationYear >= p.AdmissionYear)
            {
                var years = p.GraduationYear.Value - p.AdmissionYear.Value;
                if (years > 0)
                    return years == 1 ? "1 Year" : $"{years} Years";
            }

            var semesterCount = _t.Semesters
                .Select(x => x.SemesterNumber)
                .DefaultIfEmpty(0)
                .Max();

            if (semesterCount > 0)
            {
                var derivedYears = (int)Math.Ceiling(semesterCount / 2m);
                if (derivedYears > 0)
                    return derivedYears == 1 ? "1 Year" : $"{derivedYears} Years";
            }

            return string.Empty;
        }

        private static void DetailRow(ColumnDescriptor col, string no, string label, string value)
        {
            col.Item().PaddingBottom(2).Row(r =>
            {
                r.ConstantItem(18).Text(no).FontSize(9.5f);
                r.ConstantItem(175).Text($"{label} :").FontSize(9.5f);
                r.RelativeItem().Text(value).FontSize(9.5f);
            });
        }

        private void SemesterBlock(IContainer c, TranscriptSemesterSnapshot sem, decimal cumulativeCGPA, decimal cumulativePercentage, decimal cumulativeEGP, string cumulativeGrade)
        {
            c.Column(col =>
            {
                col.Spacing(4);

                col.Item().AlignCenter().Text(sem.YearTitle).SemiBold();
                col.Item().Text(sem.TermTitle).SemiBold().FontSize(10);

                col.Item().Element(x => SemesterTable(x, sem, cumulativeCGPA, cumulativePercentage, cumulativeEGP, cumulativeGrade));
            });
        }

        private void SemesterTable(IContainer c, TranscriptSemesterSnapshot sem, decimal cumulativeCGPA, decimal cumulativePercentage, decimal cumulativeEGP, string cumulativeGrade)
        {
            var subjects = sem.Subjects.OrderBy(x => x.SN).ToList();
            var padTo = 8;
            var missing = Math.Max(0, padTo - subjects.Count);

            c.Table(t =>
            {
                t.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(25);   // SN
                    cols.RelativeColumn();     // Subjects
                    cols.ConstantColumn(28);   // A TH hours
                    cols.ConstantColumn(28);   // B PR hours
                    cols.ConstantColumn(28);   // C TH credits
                    cols.ConstantColumn(28);   // D PR credits
                    cols.ConstantColumn(30);   // E TH grade
                    cols.ConstantColumn(30);   // F PR grade
                    cols.ConstantColumn(30);   // G TH gp
                    cols.ConstantColumn(30);   // H PR gp
                    cols.ConstantColumn(36);   // I TH earned
                    cols.ConstantColumn(36);   // J TH out of
                    cols.ConstantColumn(36);   // K PR earned
                    cols.ConstantColumn(36);   // L PR out of
                });

                void HeaderCell(string text)
                {
                    var cell = t.Cell().Border(1).Padding(2).AlignCenter().AlignMiddle();
                    cell.Text(text).SemiBold().FontSize(8);
                }

                // Row 1
                HeaderCell("SN");
                HeaderCell("Subjects");
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Teaching Hours /\nWeek").SemiBold().FontSize(8);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Credits").SemiBold().FontSize(8);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Grade Obtained").SemiBold().FontSize(8);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Grade Points (See\nTable-1 at the End)").SemiBold().FontSize(8);
                t.Cell().ColumnSpan(4).Border(1).Padding(2).AlignCenter().Text("Earned Grade Points").SemiBold().FontSize(8);

                // Row 2
                HeaderCell("");
                HeaderCell("");
                HeaderCell("TH");
                HeaderCell("PR");
                HeaderCell("TH");
                HeaderCell("PR");
                HeaderCell("TH");
                HeaderCell("PR");
                HeaderCell("TH");
                HeaderCell("PR");
                HeaderCell("TH");
                HeaderCell("Out of");
                HeaderCell("PR");
                HeaderCell("Out of");

                // Row 3 (A-L)
                HeaderCell("");
                HeaderCell("");
                HeaderCell("A");
                HeaderCell("B");
                HeaderCell("C");
                HeaderCell("D");
                HeaderCell("E");
                HeaderCell("F");
                HeaderCell("G");
                HeaderCell("H");
                HeaderCell("I=C*G");
                HeaderCell("J");
                HeaderCell("K=D*H");
                HeaderCell("L");

                void BodyCell(string text, bool left = false)
                {
                    var cell = t.Cell().Border(1).Padding(2).AlignMiddle();
                    var displayText = string.IsNullOrWhiteSpace(text) ? "-" : text;
                    if (left) cell.AlignLeft().Text(displayText).FontSize(8.5f);
                    else cell.AlignCenter().Text(displayText).FontSize(8.5f);
                }

                foreach (var s in subjects)
                {
                    BodyCell(s.SN.ToString());
                    BodyCell(s.SubjectName, left: true);
                    BodyCell(FormatDec(s.ThHours));
                    BodyCell(FormatDec(s.PrHours));
                    BodyCell(FormatDec(s.ThCredits));
                    BodyCell(FormatDec(s.PrCredits));
                    BodyCell(s.ThGrade);
                    BodyCell(s.PrGrade);
                    BodyCell(FormatDec(s.ThGradePoint));
                    BodyCell(FormatDec(s.PrGradePoint));
                    BodyCell(FormatDec(s.ThEarned));
                    BodyCell(FormatDec(GradeCalc.ToOutOf(s.ThCredits, sem.CreditPointScheme)));
                    BodyCell(FormatDec(s.PrEarned));
                    BodyCell(FormatDec(GradeCalc.ToOutOf(s.PrCredits, sem.CreditPointScheme)));
                }

                for (var i = 0; i < missing; i++)
                {
                    BodyCell((subjects.Count + i + 1).ToString());
                    BodyCell("");
                    for (var j = 0; j < 12; j++) BodyCell("");
                }

                // Semester Total row
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignLeft().Text("Semester Total").SemiBold().FontSize(8.5f);
                BodyCell(FormatDec(sem.ThHoursTotal));
                BodyCell(FormatDec(sem.PrHoursTotal));
                BodyCell(FormatDec(sem.ThCreditsTotal));
                BodyCell(FormatDec(sem.PrCreditsTotal));
                BodyCell("");
                BodyCell("");
                BodyCell(FormatDec(sem.ThGradePointsSum));
                BodyCell(FormatDec(sem.PrGradePointsSum));
                BodyCell(FormatDec(sem.ThEarnedTotal));
                BodyCell(FormatDec(sem.ThOutOfTotal));
                BodyCell(FormatDec(sem.PrEarnedTotal));
                BodyCell(FormatDec(sem.PrOutOfTotal));

                // Summary rows (approximate official placement)
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Semester").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("SGPA").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(FormatDec(sem.SGPA)).FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Grade").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(DetermineGrade(sem.Percentage)).FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Result=").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(sem.Result).FontSize(8.5f);

                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("").FontSize(8.5f);
                t.Cell().ColumnSpan(4).Border(1).Padding(2).AlignCenter().Text("Percentage").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(FormatDec(Math.Round(sem.Percentage, 2))).FontSize(8.5f);
                t.Cell().ColumnSpan(4).Border(1).Padding(2).AlignCenter().Text("EGP").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(FormatDec(sem.EGP)).FontSize(8.5f);

                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Cumulative").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("CGPA").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(FormatDec(cumulativeCGPA)).FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("Grade").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(cumulativeGrade).FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("").FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("").FontSize(8.5f);

                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text("").FontSize(8.5f);
                t.Cell().ColumnSpan(4).Border(1).Padding(2).AlignCenter().Text("Percentage").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(FormatDec(Math.Round(cumulativePercentage, 2))).FontSize(8.5f);
                t.Cell().ColumnSpan(4).Border(1).Padding(2).AlignCenter().Text("EGP").SemiBold().FontSize(8.5f);
                t.Cell().ColumnSpan(2).Border(1).Padding(2).AlignCenter().Text(FormatDec(cumulativeEGP)).FontSize(8.5f);
            });
        }

        private void LastPageBlock(IContainer c)
        {
            c.Column(col =>
            {
                col.Spacing(12);

                col.Item().AlignCenter().Text("Percentage - Grade - Grade Point - Mapping").SemiBold();
                col.Item().AlignCenter().Element(PercentageGradeMappingTable);

                col.Item().AlignCenter().Text("Grade Point - Class Mapping").SemiBold();
                col.Item().AlignCenter().Element(GradePointClassMappingTable);

                col.Item().AlignLeft().Text("Abbreviations:").SemiBold();
                col.Item().Element(AbbrevTable);

                col.Item().PaddingTop(24).Row(r =>
                {
                    r.RelativeItem().Text("PREPARED BY:").FontSize(10);
                    r.RelativeItem().AlignCenter().Text("DEAN").SemiBold().FontSize(11);
                    r.RelativeItem().Text("CHECKED BY:").FontSize(10);
                });
            });
        }

        private void PercentageGradeMappingTable(IContainer c)
        {
            c.Table(t =>
            {
                t.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn();
                    cols.ConstantColumn(60);
                    cols.ConstantColumn(80);
                    cols.RelativeColumn();
                });

                void H(string s) => t.Cell().Border(1).Padding(4).AlignCenter().Text(s).SemiBold().FontSize(9);
                void B(string s) => t.Cell().Border(1).Padding(4).AlignCenter().Text(s).FontSize(9);

                H("Range of Percentage"); H("Grade"); H("Grade Point"); H("Remarks");

                Row("85.00 - 100.00", "O", "10", "Outstanding");
                Row("75.00 - 84.99", "A+", "9", "Excellent");
                Row("65.00 - 74.99", "A", "8", "Very Good");
                Row("55.00 - 64.99", "B+", "7", "Good");
                Row("50.00 - 54.99", "B", "6", "Above Average");
                Row("45.00 - 49.99", "C", "5.5", "Average");
                Row("40.00 - 44.99", "P/S", "5", "Pass");
                Row("0.00 - 39.99", "F", "0", "Fail");

                void Row(string p, string g, string gp, string r)
                {
                    B(p); B(g); B(gp); B(r);
                }
            });
        }

        private void GradePointClassMappingTable(IContainer c)
        {
            c.Table(t =>
            {
                t.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn();
                    cols.RelativeColumn();
                });

                void H(string s) => t.Cell().Border(1).Padding(4).AlignCenter().Text(s).SemiBold().FontSize(9);
                void B(string s) => t.Cell().Border(1).Padding(4).AlignCenter().Text(s).FontSize(9);

                H("Range of"); H("Class");
                B("7.25 - 10.00"); B("First Class");
                B("6.75 - 7.24"); B("First Class");
                B("5.75 - 6.74"); B("Second Class");
                B("5.00 - 5.74"); B("Pass Class");
            });
        }

        private void AbbrevTable(IContainer c)
        {
            c.Table(t =>
            {
                t.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(60);
                    cols.RelativeColumn();
                });

                void Row(string k, string v)
                {
                    t.Cell().Border(1).Padding(4).AlignCenter().Text(k).SemiBold().FontSize(9);
                    t.Cell().Border(1).Padding(4).AlignLeft().Text(v).FontSize(9);
                }

                Row("TH", "Theory");
                Row("PR", "Practical");
                Row("EGP", "Earned Grade Points");
                Row("SGPA", "Semester Grade Point Average");
                Row("CGPA", "Cumulative Grade Point Average");
            });
        }

        private static string FormatDec(decimal v)
        {
            var r = Math.Round(v, 2, MidpointRounding.AwayFromZero);
            return r % 1 == 0 ? ((int)r).ToString() : r.ToString("0.##");
        }

        private decimal CalculateCumulativeCGPA(List<TranscriptSemesterSnapshot> semesters)
        {
            if (semesters.Count == 0) return 0;
            var sumSGPA = semesters.Sum(s => s.SGPA);
            return sumSGPA / semesters.Count;
        }

        private decimal CalculateCumulativePercentage(List<TranscriptSemesterSnapshot> semesters)
        {
            if (semesters.Count == 0) return 0;
            var totalCredits = semesters.Sum(s => s.ThCreditsTotal + s.PrCreditsTotal);
            if (totalCredits == 0) return 0;
            var sumPercentageWeighted = semesters.Sum(s => s.Percentage * (s.ThCreditsTotal + s.PrCreditsTotal));
            return sumPercentageWeighted / totalCredits;
        }

        private decimal CalculateCumulativeEGP(List<TranscriptSemesterSnapshot> semesters)
        {
            if (semesters.Count == 0) return 0;
            return semesters.Sum(s => s.EGP);
        }

        private string DetermineGrade(decimal percentage)
        {
            if (percentage >= 85) return "O";
            if (percentage >= 75) return "A+";
            if (percentage >= 65) return "A";
            if (percentage >= 55) return "B+";
            if (percentage >= 50) return "B";
            if (percentage >= 45) return "C";
            if (percentage >= 40) return "P/S";
            return "F";
        }
    }
}
