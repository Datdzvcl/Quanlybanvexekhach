using BaseCore.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IBookingService
    {
        Task<List<Booking>> GetAllBookingsAsync();
        Task<Booking?> GetBookingByIdAsync(int id);
        Task<Booking> CreateBookingAsync(Booking booking);
        Task DeleteBookingAsync(int id);
    }
}