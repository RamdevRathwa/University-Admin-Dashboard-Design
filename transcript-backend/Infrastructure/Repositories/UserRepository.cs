using Domain.Entities;
using Domain.Interfaces;
using Domain.Enums;
using Infrastructure.Persistence.V2;
using Infrastructure.Persistence.V2.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly V2DbContext _db;
    public UserRepository(V2DbContext db) => _db = db;

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var map = await _db.MapUsers.AsNoTracking().FirstOrDefaultAsync(x => x.LegacyUserGuid == id, ct);
        if (map is null) return null;

        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == map.UserId, ct);
        if (u is null) return null;

        var roleId = await _db.UserRoles.AsNoTracking()
            .Where(x => x.UserId == u.UserId)
            .Select(x => (short?)x.RoleId)
            .OrderByDescending(x => x)
            .FirstOrDefaultAsync(ct) ?? (short)UserRole.Student;

        return ToDomain(id, u, roleId);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var norm = NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(norm)) return null;

        var u = await _db.Users.FirstOrDefaultAsync(x => x.NormalizedEmail == norm, ct);
        if (u is null) return null;

        var legacy = await EnsureLegacyUserGuidAsync(u.UserId, ct);
        var roleId = await GetPrimaryRoleIdAsync(u.UserId, ct);
        return ToDomain(legacy, u, roleId);
    }

    public async Task<User?> GetByMobileAsync(string mobile, CancellationToken ct = default)
    {
        var norm = NormalizeMobile(mobile);
        if (string.IsNullOrWhiteSpace(norm)) return null;

        var u = await _db.Users.FirstOrDefaultAsync(x => x.NormalizedMobile == norm, ct);
        if (u is null) return null;

        var legacy = await EnsureLegacyUserGuidAsync(u.UserId, ct);
        var roleId = await GetPrimaryRoleIdAsync(u.UserId, ct);
        return ToDomain(legacy, u, roleId);
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
    {
        var norm = NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(norm)) return Task.FromResult(false);
        return _db.Users.AsNoTracking().AnyAsync(x => x.NormalizedEmail == norm, ct);
    }

    public Task<bool> MobileExistsAsync(string mobile, CancellationToken ct = default)
    {
        var norm = NormalizeMobile(mobile);
        if (string.IsNullOrWhiteSpace(norm)) return Task.FromResult(false);
        return _db.Users.AsNoTracking().AnyAsync(x => x.NormalizedMobile == norm, ct);
    }

    public async Task AddAsync(User user, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var email = (user.Email ?? string.Empty).Trim();
        var mobile = (user.Mobile ?? string.Empty).Trim();
        var normEmail = NormalizeEmail(email);
        var normMobile = NormalizeMobile(mobile);

        var row = new V2User
        {
            FullName = (user.FullName ?? string.Empty).Trim(),
            Email = email,
            Mobile = mobile,
            IsEmailVerified = user.IsEmailVerified,
            IsMobileVerified = user.IsMobileVerified,
            IsActive = user.IsActive,
            DeletedAt = user.DeletedAt,
            CreatedAt = user.CreatedAt == default ? now : user.CreatedAt,
            UpdatedAt = now
        };

        await _db.Users.AddAsync(row, ct);
        await _db.SaveChangesAsync(ct); // need identity

        // Ensure mapping exists
        if (!await _db.MapUsers.AnyAsync(x => x.LegacyUserGuid == user.Id, ct))
        {
            await _db.MapUsers.AddAsync(new V2MapUser { LegacyUserGuid = user.Id, UserId = row.UserId }, ct);
        }

        // Assign role (single primary)
        var roleId = (short)user.Role;
        if (!await _db.UserRoles.AnyAsync(x => x.UserId == row.UserId && x.RoleId == roleId, ct))
        {
            await _db.UserRoles.AddAsync(new V2UserRole
            {
                UserId = row.UserId,
                RoleId = roleId,
                AssignedAt = now,
                AssignedBy = null
            }, ct);
        }
    }

    public Task UpdateAsync(User user, CancellationToken ct = default)
    {
        // We update by mapped V2 user_id. If mapping is missing, treat as not found.
        return UpdateInternalAsync(user, ct);
    }

    private async Task UpdateInternalAsync(User user, CancellationToken ct)
    {
        var map = await _db.MapUsers.FirstOrDefaultAsync(x => x.LegacyUserGuid == user.Id, ct);
        if (map is null) return;

        var u = await _db.Users.FirstOrDefaultAsync(x => x.UserId == map.UserId, ct);
        if (u is null) return;

        u.FullName = (user.FullName ?? string.Empty).Trim();
        u.Email = (user.Email ?? string.Empty).Trim();
        u.Mobile = (user.Mobile ?? string.Empty).Trim();
        u.IsEmailVerified = user.IsEmailVerified;
        u.IsMobileVerified = user.IsMobileVerified;
        u.IsActive = user.IsActive;
        u.DeletedAt = user.DeletedAt;
        u.UpdatedAt = DateTimeOffset.UtcNow;

        // Keep a single role row (highest priority). If changed, update mapping.
        var targetRoleId = (short)user.Role;
        var existing = await _db.UserRoles.Where(x => x.UserId == u.UserId).ToListAsync(ct);
        if (!existing.Any(x => x.RoleId == targetRoleId))
        {
            await _db.UserRoles.AddAsync(new V2UserRole
            {
                UserId = u.UserId,
                RoleId = targetRoleId,
                AssignedAt = DateTimeOffset.UtcNow,
                AssignedBy = null
            }, ct);
        }
    }

    private async Task<Guid> EnsureLegacyUserGuidAsync(long userId, CancellationToken ct)
    {
        var existing = await _db.MapUsers.FirstOrDefaultAsync(x => x.UserId == userId, ct);
        if (existing is not null) return existing.LegacyUserGuid;

        var legacy = Guid.NewGuid();
        await _db.MapUsers.AddAsync(new V2MapUser { LegacyUserGuid = legacy, UserId = userId }, ct);
        await _db.SaveChangesAsync(ct);
        return legacy;
    }

    private async Task<short> GetPrimaryRoleIdAsync(long userId, CancellationToken ct)
    {
        return await _db.UserRoles.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => (short?)x.RoleId)
            .OrderByDescending(x => x)
            .FirstOrDefaultAsync(ct) ?? (short)UserRole.Student;
    }

    private static User ToDomain(Guid legacyId, V2User u, short roleId)
    {
        return new User
        {
            Id = legacyId,
            FullName = u.FullName ?? string.Empty,
            Email = u.Email ?? string.Empty,
            Mobile = u.Mobile ?? string.Empty,
            Role = Enum.IsDefined(typeof(UserRole), (int)roleId) ? (UserRole)roleId : UserRole.Student,
            IsEmailVerified = u.IsEmailVerified,
            IsMobileVerified = u.IsMobileVerified,
            IsActive = u.IsActive,
            Locked = false, // V2 base schema does not include lock flag yet.
            LastLoginAt = null,
            DeletedAt = u.DeletedAt,
            CreatedAt = u.CreatedAt
        };
    }

    private static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static string NormalizeMobile(string? mobile)
    {
        var s = (mobile ?? string.Empty).Trim();
        var chars = new List<char>(s.Length);
        foreach (var ch in s)
        {
            if (ch >= '0' && ch <= '9') chars.Add(ch);
        }
        return new string(chars.ToArray());
    }
}
