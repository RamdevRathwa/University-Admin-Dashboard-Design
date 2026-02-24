using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        _db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);

    public Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default) =>
        _db.Users.FirstOrDefaultAsync(x => x.Mobile == mobile, ct);

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().AnyAsync(x => x.Email == email, ct);

    public Task<bool> MobileExistsAsync(string mobile, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().AnyAsync(x => x.Mobile == mobile, ct);

    public Task AddAsync(User user, CancellationToken ct = default) => _db.Users.AddAsync(user, ct).AsTask();

    public Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Update(user);
        return Task.CompletedTask;
    }
}

