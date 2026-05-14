using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IBookingRepositoryEF : IRepository<Booking>
    {
        Task<List<Booking>> GetByUserAsync(int userId);
        Task<Booking?> GetWithDetailsAsync(int bookingId);
    }

    public class BookingRepositoryEF : Repository<Booking>, IBookingRepositoryEF
    {
        public BookingRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<List<Booking>> GetByUserAsync(int userId)
        {
            return await _dbSet
                .Include(b => b.Trip)
                .ThenInclude(t => t.Bus)
                .ThenInclude(bus => bus.Operator)
                .Where(b => b.UserID == userId)
                .OrderByDescending(b => b.BookingDate)
                .ToListAsync();
        }

        public async Task<Booking?> GetWithDetailsAsync(int bookingId)
        {
            return await _dbSet
                .Include(b => b.Trip)
                .ThenInclude(t => t.Bus)
                .ThenInclude(bus => bus.Operator)
                .Include(b => b.TicketSeats)
                .FirstOrDefaultAsync(b => b.BookingID == bookingId);
        }
    }

    public interface ITicketSeatRepositoryEF : IRepository<TicketSeat>
    {
        Task<List<TicketSeat>> GetByBookingAsync(int bookingId);
    }

    public class TicketSeatRepositoryEF : Repository<TicketSeat>, ITicketSeatRepositoryEF
    {
        public TicketSeatRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<List<TicketSeat>> GetByBookingAsync(int bookingId)
        {
            return await _dbSet
                .Where(t => t.BookingID == bookingId)
                .ToListAsync();
        }
    }
}