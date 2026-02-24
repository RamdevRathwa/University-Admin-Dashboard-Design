using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class StudentProfileRepository : IStudentProfileRepository
{
    private readonly AppDbContext _db;
    public StudentProfileRepository(AppDbContext db) => _db = db;

    public Task<StudentProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        _db.StudentProfiles.FirstOrDefaultAsync(x => x.UserId == userId, ct);

    public Task<User?> GetUserByPrnAsync(string prn, CancellationToken ct = default)
    {
        var p = (prn ?? string.Empty).Trim();
        return _db.Users
            .Include(x => x.StudentProfile)
            .FirstOrDefaultAsync(x => x.StudentProfile != null && x.StudentProfile.PRN == p, ct);
    }

    public Task AddAsync(StudentProfile profile, CancellationToken ct = default) =>
        _db.StudentProfiles.AddAsync(profile, ct).AsTask();

    public Task UpdateAsync(StudentProfile profile, CancellationToken ct = default)
    {
        _db.StudentProfiles.Update(profile);
        return Task.CompletedTask;
    }
}
