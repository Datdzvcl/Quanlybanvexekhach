using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Entities;
using System.Linq.Expressions;

namespace BaseCore.APIService.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public AdminController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> Statistics()
        {
            var totalTrips = await _context.Trips.CountAsync();
            var totalBookings = await _context.Bookings.CountAsync();
            var totalUsers = await _context.Users.CountAsync();
            var revenue = await _context.Bookings
                .Where(x => x.PaymentStatus == "Paid")
                .SumAsync(x => x.TotalPrice);

            return Ok(new
            {
                totalTrips,
                totalBookings,
                totalUsers,
                revenue
            });
        }

        // [HttpGet("trips")]
        // public async Task<IActionResult> Trips()
        // {
        //     var trips = await BuildTripQuery()
        //         .OrderBy(x => x.DepartureTime)
        //         .Select(ProjectTrip())
        //         .ToListAsync();

        //     return Ok(trips);
        // }
        [HttpGet("trips")]
        public async Task<IActionResult> Trips()
        {
            var trips = await BuildTripQuery()
                .OrderBy(x => x.DepartureTime)
                .Select(ProjectTrip())
                .ToListAsync();

            return Ok(trips);
        }

        // Thêm endpoint riêng cho upcoming trips
        [HttpGet("upcoming-trips")]
        public async Task<IActionResult> UpcomingTrips()
        {
            var now = DateTime.Now;
            var trips = await BuildTripQuery()
                .Where(x => x.DepartureTime >= now) // ← chỉ lấy chuyến chưa chạy
                .OrderBy(x => x.DepartureTime)
                .Take(10)
                .Select(ProjectTrip())
                .ToListAsync();

            return Ok(trips);
        }
        // [HttpGet("bookings")]
        // public async Task<IActionResult> Bookings()
        // {
        //     return Ok(await _context.Bookings
        //         .Include(x => x.Trip)
        //         .OrderByDescending(x => x.BookingDate)
        //         .Select(x => new
        //         {
        //             x.BookingID,
        //             x.TripID,
        //             x.UserID,
        //             x.CustomerName,
        //             x.CustomerPhone,
        //             x.CustomerEmail,
        //             x.TotalSeats,
        //             x.TotalPrice,
        //             x.PaymentMethod,
        //             x.PaymentStatus,
        //             x.BookingDate,
        //             Route = x.Trip != null ? $"{x.Trip.DepartureLocation} -> {x.Trip.ArrivalLocation}" : null
        //         })
        //         .ToListAsync());
        // }
        [HttpGet("bookings")]
        public async Task<IActionResult> Bookings()
        {
            var list = await _context.Bookings
                .Include(x => x.Trip)
                .OrderByDescending(x => x.BookingDate)
                .ToListAsync();

            return Ok(list.Select(x => new
            {
                x.BookingID,
                x.TripID,
                x.UserID,
                CustomerName = x.CustomerName ?? "",
                CustomerPhone = x.CustomerPhone ?? "",
                CustomerEmail = x.CustomerEmail ?? "",
                x.TotalSeats,
                x.TotalPrice,
                PaymentMethod = x.PaymentMethod ?? "",
                PaymentStatus = x.PaymentStatus ?? "",
                x.BookingDate,
                Route = x.Trip != null
                    ? (x.Trip.DepartureLocation ?? "") + " -> " + (x.Trip.ArrivalLocation ?? "")
                    : "Chưa rõ"
            }));
        }
        [HttpGet("buses")]
        public async Task<IActionResult> Buses()
        {
            return Ok(await _context.Buses
                .Include(x => x.Operator)
                .OrderBy(x => x.BusID)
                .Select(x => new
                {
                    x.BusID,
                    x.OperatorID,
                    x.LicensePlate,
                    x.Capacity,
                    x.BusType,
                    OperatorName = x.Operator != null ? x.Operator.Name : null
                })
                .ToListAsync());
        }

        [HttpGet("operators")]
        public async Task<IActionResult> Operators()
        {
            return Ok(await _context.Operators
                .OrderBy(x => x.OperatorID)
                .ToListAsync());
        }

        [HttpGet("ticket-seats")]
        public async Task<IActionResult> TicketSeats()
        {
            var seats = await _context.TicketSeats
                .Include(x => x.Booking)
                .ThenInclude(x => x.Trip)
                .OrderByDescending(x => x.TicketSeatID)
                .Select(x => new
                {
                    x.TicketSeatID,
                    x.BookingID,
                    x.SeatLabel,
                    x.QRCode,
                    TripID = x.Booking != null ? x.Booking.TripID : (int?)null,
                    CustomerName = x.Booking != null ? x.Booking.CustomerName : null,
                    CustomerPhone = x.Booking != null ? x.Booking.CustomerPhone : null,
                    Route = x.Booking != null && x.Booking.Trip != null
                        ? $"{x.Booking.Trip.DepartureLocation} -> {x.Booking.Trip.ArrivalLocation}"
                        : null,
                    PaymentStatus = x.Booking != null ? x.Booking.PaymentStatus : null,
                    BookingDate = x.Booking != null ? x.Booking.BookingDate : null
                })
                .ToListAsync();

            return Ok(seats);
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> Transactions()
        {
            var transactions = await _context.Bookings
                .Include(x => x.Trip)
                .OrderByDescending(x => x.BookingDate)
                .Select(x => new
                {
                    Id = x.BookingID,
                    x.BookingID,
                    x.TripID,
                    x.CustomerName,
                    x.CustomerPhone,
                    x.TotalSeats,
                    x.TotalPrice,
                    x.PaymentMethod,
                    x.PaymentStatus,
                    x.BookingDate,
                    Route = x.Trip != null ? $"{x.Trip.DepartureLocation} -> {x.Trip.ArrivalLocation}" : null
                })
                .ToListAsync();

            return Ok(transactions);
        }

        private IQueryable<Trip> BuildTripQuery()
        {
            return _context.Trips
                .Include(x => x.Bus)
                .ThenInclude(x => x.Operator);
        }

        private static Expression<Func<Trip, object>> ProjectTrip()
        {
            return x => new
            {
                x.TripID,
                x.BusID,
                x.DepartureLocation,
                x.ArrivalLocation,
                x.DepartureTime,
                x.ArrivalTime,
                x.Price,
                x.AvailableSeats,
                x.Status,
                BusType = x.Bus != null ? x.Bus.BusType : null,
                OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null
            };
        }
        [HttpGet("users")]
        public async Task<IActionResult> Users()
        {
            return Ok(await _context.Users
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new {
                    x.UserID,
                    x.FullName,
                    x.Email,
                    x.Phone,
                    x.Role,
                    x.CreatedAt
                })
                .ToListAsync());
        }

        [HttpGet("revenue-stats")]
        public async Task<IActionResult> RevenueStats()
        {
            var stats = await _context.Bookings
                .Where(x => x.PaymentStatus == "Paid" && x.BookingDate.HasValue)
                .GroupBy(x => new { x.BookingDate.Value.Year, x.BookingDate.Value.Month })
                .Select(g => new {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Revenue = g.Sum(x => x.TotalPrice),
                    Count = g.Count()
                })
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToListAsync();
            return Ok(stats);
        }

        [HttpGet("invoice/{bookingId}")]
        public async Task<IActionResult> Invoice(int bookingId)
        {
            var booking = await _context.Bookings
                .Include(x => x.Trip)
                    .ThenInclude(t => t.Bus)
                        .ThenInclude(b => b.Operator)
                .Include(x => x.TicketSeats)
                .FirstOrDefaultAsync(x => x.BookingID == bookingId);

            if (booking == null) return NotFound();

            return Ok(new {
                booking.BookingID,
                booking.CustomerName,
                booking.CustomerPhone,
                booking.CustomerEmail,
                booking.TotalSeats,
                booking.TotalPrice,
                booking.PaymentMethod,
                booking.PaymentStatus,
                booking.BookingDate,
                Trip = booking.Trip != null ? new {
                    booking.Trip.DepartureLocation,
                    booking.Trip.ArrivalLocation,
                    booking.Trip.DepartureTime,
                    booking.Trip.ArrivalTime,
                    booking.Trip.Price,
                    BusType = booking.Trip.Bus != null ? booking.Trip.Bus.BusType : null,
                    OperatorName = booking.Trip.Bus != null && booking.Trip.Bus.Operator != null
                        ? booking.Trip.Bus.Operator.Name : null,
                    LicensePlate = booking.Trip.Bus != null ? booking.Trip.Bus.LicensePlate : null
                } : null,
                Seats = booking.TicketSeats != null
                    ? booking.TicketSeats.Select(s => s.SeatLabel).ToList()
                    : new List<string>()
            });
        }
    }
}
