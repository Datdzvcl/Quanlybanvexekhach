using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services
{
    public class TripService : ITripService
    {
        private readonly MySqlDbContext _context;

        public TripService(MySqlDbContext context)
        {
            _context = context;
        }

        public async Task<List<Trip>> GetAllTripsAsync()
        {
            return await _context.Trips
                .OrderBy(x => x.TripID)
                .ToListAsync();
        }

        public async Task<Trip?> GetTripByIdAsync(int id)
        {
            return await _context.Trips.FindAsync(id);
        }

        public async Task<List<Trip>> SearchTripsAsync(string? from, string? to, DateTime? date)
        {
            var query = _context.Trips.AsQueryable();

            if (!string.IsNullOrWhiteSpace(from))
                query = query.Where(x => x.DepartureLocation.Contains(from));

            if (!string.IsNullOrWhiteSpace(to))
                query = query.Where(x => x.ArrivalLocation.Contains(to));

            if (date.HasValue)
                query = query.Where(x => x.DepartureTime.Date == date.Value.Date);

            return await query.ToListAsync();
        }

        public async Task<Trip> CreateTripAsync(Trip trip)
        {
            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();
            return trip;
        }

        public async Task UpdateTripAsync(Trip trip)
        {
            _context.Trips.Update(trip);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteTripAsync(int id)
        {
            var trip = await _context.Trips.FindAsync(id);

            if (trip != null)
            {
                _context.Trips.Remove(trip);
                await _context.SaveChangesAsync();
            }
        }
    }
}