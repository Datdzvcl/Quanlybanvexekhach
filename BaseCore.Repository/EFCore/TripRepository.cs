using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface ITripRepositoryEF : IRepository<Trip>
    {
        Task<(List<Trip> Trips, int TotalCount)> SearchAsync(
            string? from,
            string? to,
            DateTime? date,
            int page,
            int pageSize
        );

        Task<Trip?> GetWithBusAsync(int id);
    }

    public class TripRepositoryEF : Repository<Trip>, ITripRepositoryEF
    {
        public TripRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<(List<Trip> Trips, int TotalCount)> SearchAsync(
            string? from,
            string? to,
            DateTime? date,
            int page,
            int pageSize
        )
        {
            var query = _dbSet
                .Include(t => t.Bus)
                .ThenInclude(b => b.Operator)
                .AsQueryable();

            if (!string.IsNullOrEmpty(from))
            {
                var fromLower = from.ToLower();
                query = query.Where(t => t.DepartureLocation.ToLower().Contains(fromLower));
            }

            if (!string.IsNullOrEmpty(to))
            {
                var toLower = to.ToLower();
                query = query.Where(t => t.ArrivalLocation.ToLower().Contains(toLower));
            }

            if (date.HasValue)
            {
                query = query.Where(t => t.DepartureTime.Date == date.Value.Date);
            }

            var totalCount = await query.CountAsync();

            var trips = await query
                .OrderBy(t => t.DepartureTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (trips, totalCount);
        }

        public async Task<Trip?> GetWithBusAsync(int id)
        {
            return await _dbSet
                .Include(t => t.Bus)
                .ThenInclude(b => b.Operator)
                .FirstOrDefaultAsync(t => t.TripID == id);
        }
    }
}