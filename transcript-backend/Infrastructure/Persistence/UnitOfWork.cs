using Domain.Interfaces;
using Infrastructure.Persistence.V2;

namespace Infrastructure.Persistence;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly V2DbContext _db;
    public UnitOfWork(V2DbContext db) => _db = db;
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
