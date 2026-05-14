using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TicketSeatsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public TicketSeatsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetByTrip(int tripId)
        {
            var seats = await _context.TicketSeats
                .Where(x => x.Booking.TripID == tripId)
                .Select(x => new
                {
                    x.TicketSeatID,
                    x.BookingID,
                    x.SeatLabel,
                    x.QRCode
                })
                .ToListAsync();

            return Ok(seats);
        }

        [HttpGet("booking/{bookingId}")]
        public async Task<IActionResult> GetByBooking(int bookingId)
        {
            var seats = await _context.TicketSeats
                .Where(x => x.BookingID == bookingId)
                .Select(x => new
                {
                    x.TicketSeatID,
                    x.BookingID,
                    x.SeatLabel,
                    x.QRCode
                })
                .ToListAsync();

            return Ok(seats);
        }

        [HttpPost]
        public async Task<IActionResult> Create(List<TicketSeat> seats)
        {
            if (seats == null || seats.Count == 0)
                return BadRequest("Danh sách ghế trống");

            var bookingId = seats.First().BookingID;

            var booking = await _context.Bookings.FindAsync(bookingId);
            if (booking == null)
                return BadRequest("Booking không tồn tại");

            foreach (var seat in seats)
            {
                bool exists = await _context.TicketSeats
                    .Include(x => x.Booking)
                    .AnyAsync(x =>
                        x.Booking.TripID == booking.TripID &&
                        x.SeatLabel == seat.SeatLabel);

                if (exists)
                    return BadRequest($"Ghế {seat.SeatLabel} đã được đặt");
            }

            _context.TicketSeats.AddRange(seats);
            await _context.SaveChangesAsync();

            return Ok(seats.Select(x => new
            {
                x.TicketSeatID,
                x.BookingID,
                x.SeatLabel,
                x.QRCode
            }));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var seat = await _context.TicketSeats.FindAsync(id);

            if (seat == null)
                return NotFound();

            _context.TicketSeats.Remove(seat);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpDelete("booking/{bookingId}")]
        public async Task<IActionResult> DeleteByBooking(int bookingId)
        {
            var seats = await _context.TicketSeats
                .Where(x => x.BookingID == bookingId)
                .ToListAsync();

            if (seats.Count == 0)
                return NotFound();

            _context.TicketSeats.RemoveRange(seats);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
