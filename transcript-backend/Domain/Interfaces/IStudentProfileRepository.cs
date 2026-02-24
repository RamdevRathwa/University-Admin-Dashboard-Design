using Domain.Entities;

namespace Domain.Interfaces;

public interface IStudentProfileRepository
{
    Task<StudentProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<User?> GetUserByPrnAsync(string prn, CancellationToken ct = default);
    Task AddAsync(StudentProfile profile, CancellationToken ct = default);
    Task UpdateAsync(StudentProfile profile, CancellationToken ct = default);
}
