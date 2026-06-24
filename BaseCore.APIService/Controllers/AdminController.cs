using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Entities;
using System.Linq.Expressions;
using BaseCore.Common;
using System.Security.Claims;
namespace BaseCore.APIService.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin,Operator")] // ← cho phép cả Operator
    public class AdminController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public AdminController(MySqlDbContext context)
        {
            _context = context;
        }

        // Helper lấy OperatorID của user đang login
        private async Task<int?> GetCurrentOperatorId()
        {
            if (!User.IsInRole("Operator")) return null;
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }

        // Thêm filter theo operator vào booking query
        private IQueryable<Booking> FilterByOperator(IQueryable<Booking> query, int? operatorId)
        {
            if (operatorId == null) return query;
            return query.Where(x => x.Trip.Bus.OperatorID == operatorId);
        }

        // Thêm filter theo operator vào trip query
        private IQueryable<Trip> FilterTripByOperator(IQueryable<Trip> query, int? operatorId)
        {
            if (operatorId == null) return query;
            return query.Where(x => x.Bus.OperatorID == operatorId);
        }
        [HttpGet("statistics")]
        public async Task<IActionResult> Statistics()
        {
            var totalTrips = await _context.Trips.CountAsync();
            var totalBookings = await _context.Bookings.CountAsync();
            var totalUsers = await _context.Users.CountAsync();
            var revenue = await _context.Bookings
                .Where(x => x.BookingStatus == BookingStatusConstant.Confirmed)
                .SumAsync(x => x.TotalPrice);

            return Ok(new
            {
                totalTrips,
                totalBookings,
                totalUsers,
                revenue
            });
        }

        // [HttpGet("dashboard-summary")]
        // public async Task<IActionResult> DashboardSummary(DateTime? fromDate, DateTime? toDate)
        // {
        //     var (from, to) = NormalizeDateRange(fromDate, toDate);
        //     var today = DateTime.Today;
        //     var monthStart = new DateTime(today.Year, today.Month, 1);

        //     var validRevenueQuery = BuildValidRevenueBookings();
        //     var rangedRevenueQuery = ApplyBookingDateRange(validRevenueQuery, from, to);

        //     var totalRevenue = await validRevenueQuery.SumAsync(x => x.TotalPrice);
        //     var revenueInRange = await rangedRevenueQuery.SumAsync(x => x.TotalPrice);
        //     var todayRevenue = await ApplyBookingDateRange(validRevenueQuery, today, today.AddDays(1)).SumAsync(x => x.TotalPrice);
        //     var monthRevenue = await ApplyBookingDateRange(validRevenueQuery, monthStart, monthStart.AddMonths(1)).SumAsync(x => x.TotalPrice);

        //     var totalBookings = await _context.Bookings.CountAsync();
        //     var filteredBookings = await ApplyBookingDateRange(_context.Bookings.AsNoTracking(), from, to).CountAsync();
        //     var totalTicketsSold = await validRevenueQuery.SumAsync(x => (int?)x.TotalSeats) ?? 0;
        //     var ticketsSoldInRange = await rangedRevenueQuery.SumAsync(x => (int?)x.TotalSeats) ?? 0;

        //     var pendingPaymentCount = await _context.Bookings.CountAsync(x => x.BookingStatus == BookingStatusConstant.Pending || x.BookingStatus == null);
        //     var paidCount = await _context.Bookings.CountAsync(x => x.BookingStatus == BookingStatusConstant.Confirmed);
        //     var cancelRequestedCount = await _context.Bookings.CountAsync(x => x.BookingStatus == BookingStatusConstant.CancelRequested);
        //     var cancelledCount = await _context.Bookings.CountAsync(x =>
        //         x.BookingStatus == BookingStatusConstant.Cancelled ||
        //         x.BookingStatus == BookingStatusConstant.Cancelled ||
        //         x.BookingStatus == BookingStatusConstant.Refunded);

        //     return Ok(new
        //     {
        //         totalRevenue,
        //         revenueInRange,
        //         todayRevenue,
        //         monthRevenue,
        //         totalBookings,
        //         filteredBookings,
        //         totalTicketsSold,
        //         ticketsSoldInRange,
        //         totalTrips = await _context.Trips.CountAsync(),
        //         totalUsers = await _context.Users.CountAsync(),
        //         totalOperators = await _context.Operators.CountAsync(),
        //         totalBuses = await _context.Buses.CountAsync(),
        //         pendingPaymentCount,
        //         paidCount,
        //         cancelRequestedCount,
        //         cancelledCount,
        //         fromDate = from,
        //         toDate = to
        //     });
        // }
            [HttpGet("dashboard-summary")]
        public async Task<IActionResult> DashboardSummary(DateTime? fromDate, DateTime? toDate)
        {
            var (from, to) = NormalizeDateRange(fromDate, toDate);
            var today = DateTime.Today;
            var monthStart = new DateTime(today.Year, today.Month, 1);
            var operatorId = await GetCurrentOperatorId();

            var validRevenueQuery = FilterByOperator(BuildValidRevenueBookings(), operatorId);
            var rangedRevenueQuery = ApplyBookingDateRange(validRevenueQuery, from, to);

            var totalRevenue = await validRevenueQuery.SumAsync(x => x.TotalPrice);
            var revenueInRange = await rangedRevenueQuery.SumAsync(x => x.TotalPrice);
            var todayRevenue = await ApplyBookingDateRange(validRevenueQuery, today, today.AddDays(1)).SumAsync(x => x.TotalPrice);
            var monthRevenue = await ApplyBookingDateRange(validRevenueQuery, monthStart, monthStart.AddMonths(1)).SumAsync(x => x.TotalPrice);

            var bookingQuery = FilterByOperator(_context.Bookings.AsNoTracking().Include(x => x.Trip).ThenInclude(x => x.Bus), operatorId);
            var totalBookings = await bookingQuery.CountAsync();
            var filteredBookings = await ApplyBookingDateRange(bookingQuery, from, to).CountAsync();
            var totalTicketsSold = await validRevenueQuery.SumAsync(x => (int?)x.TotalSeats) ?? 0;
            var ticketsSoldInRange = await rangedRevenueQuery.SumAsync(x => (int?)x.TotalSeats) ?? 0;

            var pendingPaymentCount = await bookingQuery.CountAsync(x => x.BookingStatus == BookingStatusConstant.Pending);
            var paidCount = await bookingQuery.CountAsync(x => x.BookingStatus == BookingStatusConstant.Confirmed);
            var cancelRequestedCount = await bookingQuery.CountAsync(x => x.BookingStatus == BookingStatusConstant.CancelRequested);
            var cancelledCount = await bookingQuery.CountAsync(x =>
                x.BookingStatus == BookingStatusConstant.Cancelled ||
                x.BookingStatus == BookingStatusConstant.Refunded);

            var tripQuery = FilterTripByOperator(_context.Trips.AsNoTracking().Include(x => x.Bus), operatorId);
            var busQuery = operatorId.HasValue
                ? _context.Buses.AsNoTracking().Where(x => x.OperatorID == operatorId)
                : _context.Buses.AsNoTracking();

            var scheduledTripsCount  = await tripQuery.CountAsync(x => x.Status == TripStatusConstant.Scheduled);
            var ongoingTripsCount    = await tripQuery.CountAsync(x => x.Status == TripStatusConstant.Ongoing);
            var completedTripsCount  = await tripQuery.CountAsync(x => x.Status == TripStatusConstant.Completed);
            var cancelledTripsCount  = await tripQuery.CountAsync(x => x.Status == TripStatusConstant.Cancelled);

            return Ok(new
            {
                totalRevenue, revenueInRange, todayRevenue, monthRevenue,
                totalBookings, filteredBookings, totalTicketsSold, ticketsSoldInRange,
                totalTrips = scheduledTripsCount + ongoingTripsCount,
                scheduledTripsCount, ongoingTripsCount, completedTripsCount, cancelledTripsCount,
                totalUsers = User.IsInRole("Admin") ? await _context.Users.CountAsync() : 0,
                totalOperators = User.IsInRole("Admin") ? await _context.Operators.CountAsync() : 0,
                totalBuses = await busQuery.CountAsync(),
                pendingPaymentCount, paidCount, cancelRequestedCount, cancelledCount,
                fromDate = from, toDate = to
            });
        }

        // [HttpGet("revenue-by-day")]
        // public async Task<IActionResult> RevenueByDay(DateTime? fromDate, DateTime? toDate)
        // {
        //     var (from, to) = NormalizeDateRange(fromDate, toDate, 7);
        //     var stats = await ApplyBookingDateRange(BuildValidRevenueBookings(), from, to)
        //         .GroupBy(x => x.BookingDate!.Value.Date)
        //         .Select(g => new
        //         {
        //             date = g.Key,
        //             revenue = g.Sum(x => x.TotalPrice),
        //             bookingCount = g.Count(),
        //             ticketCount = g.Sum(x => x.TotalSeats)
        //         })
        //         .OrderBy(x => x.date)
        //         .ToListAsync();

        //     return Ok(stats);
        // }
        [HttpGet("revenue-by-day")]
        public async Task<IActionResult> RevenueByDay(DateTime? fromDate, DateTime? toDate)
        {
            var (from, to) = NormalizeDateRange(fromDate, toDate, 7);
            var operatorId = await GetCurrentOperatorId();
            var stats = await ApplyBookingDateRange(
                    FilterByOperator(BuildValidRevenueBookings(), operatorId), from, to)
                .GroupBy(x => x.BookingDate!.Value.Date)
                .Select(g => new { date = g.Key, revenue = g.Sum(x => x.TotalPrice),
                    bookingCount = g.Count(), ticketCount = g.Sum(x => x.TotalSeats) })
                .OrderBy(x => x.date)
                .ToListAsync();
            return Ok(stats);
        }
        [HttpGet("revenue-by-month")]
         public async Task<IActionResult> RevenueByMonth(DateTime? fromDate, DateTime? toDate)
        {
            var (from, to) = NormalizeDateRange(fromDate, toDate, 365);
            var operatorId = await GetCurrentOperatorId();
            var stats = await ApplyBookingDateRange(
                    FilterByOperator(BuildValidRevenueBookings(), operatorId), from, to)
                .GroupBy(x => new { x.BookingDate!.Value.Year, x.BookingDate.Value.Month })
                .Select(g => new { year = g.Key.Year, month = g.Key.Month,
                    revenue = g.Sum(x => x.TotalPrice), bookingCount = g.Count(),
                    ticketCount = g.Sum(x => x.TotalSeats) })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();
            return Ok(stats);
        }

        [HttpGet("top-routes")]
        public async Task<IActionResult> TopRoutes(DateTime? fromDate, DateTime? toDate, int take = 5)
        {
            var (from, to) = NormalizeDateRange(fromDate, toDate);
            var operatorId = await GetCurrentOperatorId();
            take = Math.Clamp(take, 1, 20);
            var routes = await ApplyBookingDateRange(
                    FilterByOperator(BuildValidRevenueBookings(), operatorId), from, to)
                .Where(x => x.Trip != null)
                .GroupBy(x => new { x.Trip!.DepartureLocation, x.Trip.ArrivalLocation })
                .Select(g => new { departureLocation = g.Key.DepartureLocation,
                    arrivalLocation = g.Key.ArrivalLocation,
                    route = g.Key.DepartureLocation + " - " + g.Key.ArrivalLocation,
                    revenue = g.Sum(x => x.TotalPrice), bookingCount = g.Count(),
                    ticketCount = g.Sum(x => x.TotalSeats) })
                .OrderByDescending(x => x.ticketCount).ThenByDescending(x => x.revenue)
                .Take(take).ToListAsync();
            return Ok(routes);
        }
        [HttpGet("top-operators")]
        [Authorize(Roles = "Admin")] // Chỉ Admin mới xem được
        public async Task<IActionResult> TopOperators(DateTime? fromDate, DateTime? toDate, int take = 5)
        {
            var (from, to) = NormalizeDateRange(fromDate, toDate);
            take = Math.Clamp(take, 1, 20);
            var operators = await ApplyBookingDateRange(BuildValidRevenueBookings(), from, to)
                .Where(x => x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.Operator != null)
                .GroupBy(x => new { x.Trip!.Bus!.OperatorID, x.Trip.Bus.Operator!.Name })
                .Select(g => new { operatorID = g.Key.OperatorID, operatorName = g.Key.Name,
                    revenue = g.Sum(x => x.TotalPrice), bookingCount = g.Count(),
                    ticketCount = g.Sum(x => x.TotalSeats) })
                .OrderByDescending(x => x.revenue).Take(take).ToListAsync();
            return Ok(operators);
        }

        // [HttpGet("booking-status-statistics")]
        // public async Task<IActionResult> BookingStatusStatistics(DateTime? fromDate, DateTime? toDate)
        // {
        //     var (from, to) = NormalizeDateRange(fromDate, toDate);
        //     var query = ApplyBookingDateRange(_context.Bookings.AsNoTracking(), from, to);

        //     var paymentStatuses = await query
        //         .GroupBy(x => x.BookingStatus)
        //         .Select(g => new { status = g.Key, count = g.Count() })
        //         .OrderByDescending(x => x.count)
        //         .ToListAsync();

        //     var bookingStatuses = await query
        //         .GroupBy(x => x.BookingStatus )
        //         .Select(g => new { status = g.Key, count = g.Count() })
        //         .OrderByDescending(x => x.count)
        //         .ToListAsync();

        //     return Ok(new { paymentStatuses, bookingStatuses });
        // }
        [HttpGet("booking-status-statistics")]
        public async Task<IActionResult> BookingStatusStatistics(DateTime? fromDate, DateTime? toDate)
        {
            var (from, to) = NormalizeDateRange(fromDate, toDate);
            var operatorId = await GetCurrentOperatorId();
            var query = ApplyBookingDateRange(
                FilterByOperator(_context.Bookings.AsNoTracking().Include(x => x.Trip).ThenInclude(x => x.Bus), operatorId),
                from, to);
            var bookingStatuses = await query.GroupBy(x => x.BookingStatus)
                .Select(g => new { status = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count).ToListAsync();
            var paymentStatuses = await query.GroupBy(x => x.PaymentStatus)
                .Select(g => new { status = g.Key, count = g.Count() })
                .OrderByDescending(x => x.count).ToListAsync();
            return Ok(new { paymentStatuses, bookingStatuses });
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
            var operatorId = await GetCurrentOperatorId();
            var trips = await FilterTripByOperator(BuildTripQuery(), operatorId)
                .OrderBy(x => x.DepartureTime)
                .Select(ProjectTrip())
                .ToListAsync();
            return Ok(trips);
        }
        // Thêm endpoint riêng cho upcoming trips
        [HttpGet("upcoming-trips")]
        public async Task<IActionResult> UpcomingTrips()
        {
            var operatorId = await GetCurrentOperatorId();
            var now = DateTime.Now;
            var trips = await FilterTripByOperator(BuildTripQuery(), operatorId)
                .Where(x => x.DepartureTime >= now && x.Status != TripStatusConstant.Cancelled)
                .OrderBy(x => x.DepartureTime).Take(10)
                .Select(ProjectTrip()).ToListAsync();
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
        // [HttpGet("bookings")]
        // public async Task<IActionResult> Bookings()
        // {
        //     var list = await _context.Bookings
        //         .Include(x => x.Trip)
        //         .OrderByDescending(x => x.BookingDate)
        //         .ToListAsync();

        //     return Ok(list.Select(x => new
        //     {
        //         x.BookingID,
        //         x.TripID,
        //         x.UserID,
        //         CustomerName = x.CustomerName ?? "",
        //         CustomerPhone = x.CustomerPhone ?? "",
        //         CustomerEmail = x.CustomerEmail ?? "",
        //         x.TotalSeats,
        //         x.TotalPrice,
        //         PaymentMethod = x.PaymentMethod ?? "",
        //         x.BookingStatus,
        //         x.BookingDate,
        //         Route = x.Trip != null
        //             ? (x.Trip.DepartureLocation ?? "") + " -> " + (x.Trip.ArrivalLocation ?? "")
        //             : "Chưa rõ"
        //     }));
        // }
        [HttpGet("bookings")]
        public async Task<IActionResult> Bookings()
        {
            var operatorId = await GetCurrentOperatorId();
            var query = FilterByOperator(
                _context.Bookings.Include(x => x.Trip).Include(x => x.Trip.Bus), operatorId)
                .OrderByDescending(x => x.BookingDate);

            var list = await query.ToListAsync();
            return Ok(list.Select(x => new
            {
                x.BookingID, x.TripID, x.UserID,
                CustomerName = x.CustomerName ?? "",
                CustomerPhone = x.CustomerPhone ?? "",
                CustomerEmail = x.CustomerEmail ?? "",
                x.TotalSeats, x.TotalPrice,
                PaymentMethod = x.PaymentMethod ?? "",
                x.BookingStatus, x.BookingDate,
                Route = x.Trip != null
                    ? (x.Trip.DepartureLocation ?? "") + " -> " + (x.Trip.ArrivalLocation ?? "")
                    : "Chưa rõ"
            }));
        }
        // [HttpGet("buses")]
        // public async Task<IActionResult> Buses()
        // {
        //     return Ok(await _context.Buses
        //         .Include(x => x.Operator)
        //         .OrderBy(x => x.BusID)
        //         .Select(x => new
        //         {
        //             x.BusID,
        //             x.OperatorID,
        //             x.LicensePlate,
        //             x.Capacity,
        //             x.BusType,
        //             OperatorName = x.Operator != null ? x.Operator.Name : null
        //         })
        //         .ToListAsync());
        // }
        [HttpGet("buses")]
        public async Task<IActionResult> Buses()
        {
            var operatorId = await GetCurrentOperatorId();
            var query = _context.Buses.Include(x => x.Operator).OrderBy(x => x.BusID).AsQueryable();
            if (operatorId.HasValue)
                query = query.Where(x => x.OperatorID == operatorId);

            return Ok(await query.Select(x => new
            {
                x.BusID, x.OperatorID, x.LicensePlate, x.Capacity, x.BusType,
                OperatorName = x.Operator != null ? x.Operator.Name : null
            }).ToListAsync());
        }
        // [HttpGet("operators")]
        // public async Task<IActionResult> Operators()
        // {
        //     return Ok(await _context.Operators
        //         .OrderBy(x => x.OperatorID)
        //         .ToListAsync());
        // }
        [HttpGet("operators")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Operators()
        {
            return Ok(await _context.Operators.OrderBy(x => x.OperatorID).ToListAsync());
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
                    BookingStatus = x.Booking != null ? x.Booking.BookingStatus : (byte?)null,
                    BookingDate   = x.Booking != null ? x.Booking.BookingDate   : null
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
                    x.BookingStatus,
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

        private IQueryable<Booking> BuildValidRevenueBookings()
        {
            return _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip)
                    .ThenInclude(x => x.Bus)
                        .ThenInclude(x => x.Operator)
                .Where(x =>
                    x.BookingDate.HasValue &&
                    (x.BookingStatus == BookingStatusConstant.Confirmed ||
                     x.BookingStatus == BookingStatusConstant.Completed));
        }

        private static IQueryable<Booking> ApplyBookingDateRange(IQueryable<Booking> query, DateTime? fromDate, DateTime? toDate)
        {
            if (fromDate.HasValue)
                query = query.Where(x => x.BookingDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(x => x.BookingDate < toDate.Value);

            return query;
        }

        private static (DateTime? from, DateTime? to) NormalizeDateRange(DateTime? fromDate, DateTime? toDate, int? defaultDays = null)
        {
            if (!fromDate.HasValue && !toDate.HasValue && defaultDays.HasValue)
            {
                var to = DateTime.Today.AddDays(1);
                return (to.AddDays(-defaultDays.Value), to);
            }

            var from = fromDate?.Date;
            var toDateExclusive = toDate?.Date.AddDays(1);
            return (from, toDateExclusive);
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
        // [HttpGet("users")]
        // public async Task<IActionResult> Users()
        // {
        //     return Ok(await _context.Users
        //         .OrderByDescending(x => x.CreatedAt)
        //         .Select(x => new {
        //             x.UserID,
        //             x.FullName,
        //             x.Email,
        //             x.Phone,
        //             x.Role,
        //             x.CreatedAt
        //         })
        //         .ToListAsync());
        // }
        [HttpGet("users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Users()
        {
            return Ok(await _context.Users.OrderByDescending(x => x.CreatedAt)
                .Select(x => new { x.UserID, x.FullName, x.Email, x.Phone, x.Role, x.CreatedAt })
                .ToListAsync());
        }
        [HttpGet("revenue-stats")]
        // public async Task<IActionResult> RevenueStats()
        // {
        //     var stats = await _context.Bookings
        //         .Where(x => x.BookingStatus == BookingStatusConstant.Confirmed && x.BookingDate.HasValue)
        //         .GroupBy(x => new { x.BookingDate.Value.Year, x.BookingDate.Value.Month })
        //         .Select(g => new {
        //             Year = g.Key.Year,
        //             Month = g.Key.Month,
        //             Revenue = g.Sum(x => x.TotalPrice),
        //             Count = g.Count()
        //         })
        //         .OrderBy(x => x.Year).ThenBy(x => x.Month)
        //         .ToListAsync();
        //     return Ok(stats);
        // }
         public async Task<IActionResult> RevenueStats()
        {
            var operatorId = await GetCurrentOperatorId();
            var query = FilterByOperator(
                _context.Bookings.AsNoTracking().Include(x => x.Trip).ThenInclude(x => x.Bus),
                operatorId)
                .Where(x => x.BookingStatus == BookingStatusConstant.Confirmed && x.BookingDate.HasValue);

            var stats = await query
                .GroupBy(x => new { x.BookingDate.Value.Year, x.BookingDate.Value.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month,
                    Revenue = g.Sum(x => x.TotalPrice), Count = g.Count() })
                .OrderBy(x => x.Year).ThenBy(x => x.Month).ToListAsync();
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
                booking.BookingStatus,
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

        // GET /api/admin/incidents — Admin xem tất cả sự cố
        [HttpGet("incidents")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllIncidents(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page     = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.TripIncidents
                .AsNoTracking()
                .Include(i => i.Trip).ThenInclude(t => t!.Bus).ThenInclude(b => b!.Operator)
                .Include(i => i.Driver)
                .AsQueryable();

            if (status == "pending")
                query = query.Where(i => !i.IsResolved);
            else if (status == "resolved")
                query = query.Where(i => i.IsResolved);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(i => i.ReportedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new
                {
                    i.IncidentID,
                    i.TripID,
                    departureLocation = i.Trip != null ? i.Trip.DepartureLocation : null,
                    arrivalLocation   = i.Trip != null ? i.Trip.ArrivalLocation   : null,
                    departureTime     = i.Trip != null ? i.Trip.DepartureTime      : (DateTime?)null,
                    operatorName      = i.Trip != null && i.Trip.Bus != null && i.Trip.Bus.Operator != null ? i.Trip.Bus.Operator.Name : null,
                    driverName        = i.Driver != null ? i.Driver.FullName : null,
                    i.IncidentType,
                    i.Description,
                    i.ReportedAt,
                    i.IsResolved,
                    i.ImageUrls,
                    i.Severity
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // PUT /api/admin/incidents/{id}/resolve — Admin đánh dấu đã xử lý
        [HttpPut("incidents/{id:int}/resolve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResolveIncident(int id)
        {
            var incident = await _context.TripIncidents.FindAsync(id);
            if (incident == null) return NotFound();
            incident.IsResolved = true;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã đánh dấu sự cố là đã xử lý." });
        }
    }
}
