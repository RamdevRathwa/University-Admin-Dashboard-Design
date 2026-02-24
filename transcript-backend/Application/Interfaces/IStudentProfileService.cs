using Application.DTOs.Students;

namespace Application.Interfaces;

public interface IStudentProfileService
{
    Task<StudentProfileDto?> GetMyProfileAsync(CancellationToken ct = default);
    Task<StudentProfileDto> UpsertMyProfileAsync(StudentProfileDto dto, CancellationToken ct = default);
    Task<bool> IsMyProfileCompleteAsync(CancellationToken ct = default);
}

