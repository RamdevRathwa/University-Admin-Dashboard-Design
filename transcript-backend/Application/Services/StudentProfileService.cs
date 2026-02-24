using Application.Common;
using Application.DTOs.Students;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class StudentProfileService : IStudentProfileService
{
    private readonly ICurrentUserService _current;
    private readonly IStudentProfileRepository _profiles;
    private readonly IUnitOfWork _uow;

    public StudentProfileService(ICurrentUserService current, IStudentProfileRepository profiles, IUnitOfWork uow)
    {
        _current = current;
        _profiles = profiles;
        _uow = uow;
    }

    public async Task<StudentProfileDto?> GetMyProfileAsync(CancellationToken ct = default)
    {
        EnsureStudent();
        var profile = await _profiles.GetByUserIdAsync(_current.UserId, ct);
        return profile is null ? null : Map(profile);
    }

    public async Task<StudentProfileDto> UpsertMyProfileAsync(StudentProfileDto dto, CancellationToken ct = default)
    {
        EnsureStudent();
        var profile = await _profiles.GetByUserIdAsync(_current.UserId, ct);
        if (profile is null)
        {
            profile = new StudentProfile { Id = Guid.NewGuid(), UserId = _current.UserId };
            Apply(profile, dto);
            await _profiles.AddAsync(profile, ct);
        }
        else
        {
            Apply(profile, dto);
            await _profiles.UpdateAsync(profile, ct);
        }

        await _uow.SaveChangesAsync(ct);
        return Map(profile);
    }

    public async Task<bool> IsMyProfileCompleteAsync(CancellationToken ct = default)
    {
        EnsureStudent();
        var p = await _profiles.GetByUserIdAsync(_current.UserId, ct);
        if (p is null) return false;

        return
            !string.IsNullOrWhiteSpace(p.PRN) &&
            !string.IsNullOrWhiteSpace(p.Faculty) &&
            !string.IsNullOrWhiteSpace(p.Department) &&
            !string.IsNullOrWhiteSpace(p.Program) &&
            p.AdmissionYear.HasValue &&
            p.GraduationYear.HasValue &&
            !string.IsNullOrWhiteSpace(p.Nationality) &&
            p.DOB.HasValue &&
            !string.IsNullOrWhiteSpace(p.BirthPlace) &&
            !string.IsNullOrWhiteSpace(p.Address);
    }

    private void EnsureStudent()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Student) throw AppException.Forbidden();
    }

    private static void Apply(StudentProfile p, StudentProfileDto dto)
    {
        p.PRN = (dto.PRN ?? string.Empty).Trim();
        p.Faculty = (dto.Faculty ?? string.Empty).Trim();
        p.Department = (dto.Department ?? string.Empty).Trim();
        p.Program = (dto.Program ?? string.Empty).Trim();
        p.AdmissionYear = dto.AdmissionYear;
        p.GraduationYear = dto.GraduationYear;
        p.Nationality = (dto.Nationality ?? string.Empty).Trim();
        p.DOB = dto.DOB;
        p.BirthPlace = (dto.BirthPlace ?? string.Empty).Trim();
        p.Address = (dto.Address ?? string.Empty).Trim();
    }

    private static StudentProfileDto Map(StudentProfile p) =>
        new(
            p.PRN,
            p.Faculty,
            p.Department,
            p.Program,
            p.AdmissionYear,
            p.GraduationYear,
            p.Nationality,
            p.DOB,
            p.BirthPlace,
            p.Address
        );
}

