using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/dashboard")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class DashboardController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public DashboardController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalRevenue = await _context.Bookings
                .Where(x => x.PaymentStatus == "Paid")
                .SumAsync(x => (decimal?)x.TotalPrice) ?? 0;

            return Ok(new
            {
                totalTickets = await _context.TicketSeats.CountAsync(),
                totalBuses = await _context.Buses.CountAsync(),
                totalOperators = await _context.Operators.CountAsync(),
                totalRevenue,
                totalTrips = await _context.Trips.CountAsync(),
                totalUsers = await _context.Users.CountAsync()
            });
        }
    }
}
