using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Persistence.V2.Entities;

public sealed class V2Student
{
    [Column("student_id")]
    public long StudentId { get; set; }

    [Column("user_id")]
    public long UserId { get; set; }

    [Column("program_id")]
    public int? ProgramId { get; set; }

    [Column("prn")]
    public string? Prn { get; set; }

    [Column("admission_year_id")]
    public int? AdmissionYearId { get; set; }

    [Column("graduation_year_id")]
    public int? GraduationYearId { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2StudentProfile
{
    [Column("student_id")]
    public long StudentId { get; set; }

    [Column("nationality")]
    public string? Nationality { get; set; }

    [Column("date_of_birth")]
    public DateTime? DateOfBirthRaw { get; set; } // mapped as DateOnly in app layer

    [Column("birth_place")]
    public string? BirthPlace { get; set; }

    [Column("permanent_address")]
    public string? PermanentAddress { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class V2Faculty
{
    [Column("faculty_id")]
    public int FacultyId { get; set; }

    [Column("faculty_code")]
    public string FacultyCode { get; set; } = string.Empty;

    [Column("faculty_name")]
    public string FacultyName { get; set; } = string.Empty;

    [Column("dean_user_id")]
    public long? DeanUserId { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2Department
{
    [Column("department_id")]
    public int DepartmentId { get; set; }

    [Column("faculty_id")]
    public int FacultyId { get; set; }

    [Column("dept_code")]
    public string DeptCode { get; set; } = string.Empty;

    [Column("dept_name")]
    public string DeptName { get; set; } = string.Empty;

    [Column("hod_user_id")]
    public long? HodUserId { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2Program
{
    [Column("program_id")]
    public int ProgramId { get; set; }

    [Column("department_id")]
    public int DepartmentId { get; set; }

    [Column("program_code")]
    public string ProgramCode { get; set; } = string.Empty;

    [Column("program_name")]
    public string ProgramName { get; set; } = string.Empty;

    [Column("degree_name")]
    public string DegreeName { get; set; } = string.Empty;

    [Column("duration_years")]
    public byte DurationYears { get; set; }

    [Column("grading_scheme_id")]
    public int GradingSchemeId { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2GradingScheme
{
    [Column("grading_scheme_id")]
    public int GradingSchemeId { get; set; }

    [Column("scheme_code")]
    public string SchemeCode { get; set; } = string.Empty;

    [Column("scheme_name")]
    public string SchemeName { get; set; } = string.Empty;

    [Column("max_grade_point")]
    public decimal MaxGradePoint { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class V2AcademicYear
{
    [Column("academic_year_id")]
    public int AcademicYearId { get; set; }

    [Column("year_code")]
    public string YearCode { get; set; } = string.Empty;

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    public DateTime EndDate { get; set; }

    [Column("is_current")]
    public bool IsCurrent { get; set; }

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}
