using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services
{
    public class BookingService : IBookingService
    {
        private readonly MySqlDbContext _context;

        public BookingService(MySqlDbContext context)
        {
            _context = context;
        }

        public async Task<List<Booking>> GetAllBookingsAsync()
        {
            return await _context.Bookings
                .OrderByDescending(x => x.BookingID)
                .ToListAsync();
        }

        public async Task<Booking?> GetBookingByIdAsync(int id)
        {
            return await _context.Bookings
                .FirstOrDefaultAsync(x => x.BookingID == id);
        }

        public async Task<Booking> CreateBookingAsync(Booking booking)
        {
            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            return booking;
        }

        public async Task DeleteBookingAsync(int id)
        {
            var booking = await _context.Bookings
                .FirstOrDefaultAsync(x => x.BookingID == id);

            if (booking != null)
            {
                _context.Bookings.Remove(booking);
                await _context.SaveChangesAsync();
            }
        }
    }
}