// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using BaseCore.Repository;
// using BaseCore.Common;

// namespace BaseCore.APIService.Controllers
// {
//     [Route("api/dashboard")]
//     [ApiController]
//     [Authorize(Roles = "Admin")]
//     public class DashboardController : ControllerBase
//     {
//         private readonly MySqlDbContext _context;

//         public DashboardController(MySqlDbContext context)
//         {
//             _context = context;
//         }

//         [HttpGet("stats")]
//         public async Task<IActionResult> GetStats()
//         {
//             var totalRevenue = await _context.Bookings
//                 .Where(x => x.BookingStatus == BookingStatusConstant.Confirmed)
//                 .SumAsync(x => (decimal?)x.TotalPrice) ?? 0;

//             return Ok(new
//             {
//                 totalTickets = await _context.TicketSeats.CountAsync(),
//                 totalBuses = await _context.Buses.CountAsync(),
//                 totalOperators = await _context.Operators.CountAsync(),
//                 totalRevenue,
//                 totalTrips = await _context.Trips.CountAsync(),
//                 totalUsers = await _context.Users.CountAsync()
//             });
//         }
//     }
// }
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Common;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/dashboard")]
    [ApiController]
    [Authorize(Roles = "Admin,Operator")]
    public class DashboardController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public DashboardController(MySqlDbContext context)
        {
            _context = context;
        }

        private async Task<int?> GetCurrentOperatorId()
        {
            if (!User.IsInRole("Operator")) return null;
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var operatorId = await GetCurrentOperatorId();

            if (operatorId.HasValue)
            {
                // Nhà xe - chỉ thống kê của mình
                var totalRevenue = await _context.Bookings
                    .Where(x => x.BookingStatus == BookingStatusConstant.Confirmed
                        && x.Trip.Bus.OperatorID == operatorId.Value)
                    .SumAsync(x => (decimal?)x.TotalPrice) ?? 0;

                return Ok(new
                {
                    totalTickets   = await _context.TicketSeats
                        .Where(x => x.Booking.Trip.Bus.OperatorID == operatorId.Value)
                        .CountAsync(),
                    totalBuses     = await _context.Buses
                        .Where(x => x.OperatorID == operatorId.Value)
                        .CountAsync(),
                    totalOperators = 1,
                    totalRevenue,
                    totalTrips     = await _context.Trips
                        .Where(x => x.Bus.OperatorID == operatorId.Value)
                        .CountAsync(),
                    totalUsers     = 0
                });
            }
            else
            {
                // Admin - thống kê toàn hệ thống
                var totalRevenue = await _context.Bookings
                    .Where(x => x.BookingStatus == BookingStatusConstant.Confirmed)
                    .SumAsync(x => (decimal?)x.TotalPrice) ?? 0;

                return Ok(new
                {
                    totalTickets   = await _context.TicketSeats.CountAsync(),
                    totalBuses     = await _context.Buses.CountAsync(),
                    totalOperators = await _context.Operators.CountAsync(),
                    totalRevenue,
                    totalTrips     = await _context.Trips.CountAsync(),
                    totalUsers     = await _context.Users.CountAsync()
                });
            }
        }
    }
}