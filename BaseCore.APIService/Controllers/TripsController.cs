using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public TripsController(MySqlDbContext context)
        {
            _context = context;
        }

        // GET /api/trips?page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page     = 1,
            [FromQuery] int pageSize = 20)
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            page     = Math.Max(page, 1);

            var query = _context.Trips
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .OrderBy(x => x.DepartureTime);

            var total = await query.CountAsync();

            var trips = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
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
                    BusType      = x.Bus != null ? x.Bus.BusType      : null,
                    OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null
                })
                .ToListAsync();

            return Ok(new
            {
                data       = trips,
                page,
                pageSize,
                total,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            });
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminTrips(
            [FromQuery] string? departureLocation,
            [FromQuery] string? arrivalLocation,
            [FromQuery] DateTime? departureDate,
            [FromQuery] int? operatorId,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(departureLocation))
            {
                var keyword = departureLocation.Trim();
                query = query.Where(x => EF.Functions.Like(x.DepartureLocation, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(arrivalLocation))
            {
                var keyword = arrivalLocation.Trim();
                query = query.Where(x => EF.Functions.Like(x.ArrivalLocation, $"%{keyword}%"));
            }

            if (departureDate.HasValue)
            {
                var start = departureDate.Value.Date;
                var end = start.AddDays(1);
                query = query.Where(x => x.DepartureTime >= start && x.DepartureTime < end);
            }

            if (operatorId.HasValue)
                query = query.Where(x => x.Bus != null && x.Bus.OperatorID == operatorId.Value);

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = NormalizeStatus(status);
                query = query.Where(x => x.Status == normalizedStatus);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.DepartureTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
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
                    LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
                    OperatorID = x.Bus != null ? x.Bus.OperatorID : (int?)null,
                    OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var trip = await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .Where(x => x.TripID == id)
                .Select(x => new
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
                    Capacity = x.Bus != null ? x.Bus.Capacity : 0,
                    BusType = x.Bus != null ? x.Bus.BusType : null,
                    LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
                    OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
                    OperatorImageUrl = (string?)null,
                    Bus = x.Bus == null ? null : new
                    {
                        x.Bus.BusID,
                        x.Bus.OperatorID,
                        x.Bus.LicensePlate,
                        x.Bus.Capacity,
                        x.Bus.BusType
                    },
                    Operator = x.Bus == null || x.Bus.Operator == null ? null : new
                    {
                        x.Bus.Operator.OperatorID,
                        x.Bus.Operator.Name,
                        x.Bus.Operator.Description,
                        x.Bus.Operator.ContactPhone,
                        x.Bus.Operator.Email,
                        ImageUrl = (string?)null
                    }
                })
                .FirstOrDefaultAsync();

            if (trip == null)
                return NotFound();

            return Ok(trip);
        }

        [HttpGet("{id}/stops")]
        public async Task<IActionResult> GetStops(int id)
        {
            var tripExists = await _context.Trips.AsNoTracking().AnyAsync(x => x.TripID == id);
            if (!tripExists)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var stops = await _context.StopPoints
                .AsNoTracking()
                .Where(x => x.TripID == id && x.IsActive)
                .OrderBy(x => x.StopOrder)
                .Select(x => new
                {
                    stopPointID = x.StopPointID,
                    tripID = x.TripID,
                    stopName = x.StopName,
                    stopAddress = x.StopAddress,
                    stopOrder = x.StopOrder,
                    stopType = x.StopType,
                    arrivalOffset = x.ArrivalOffset
                })
                .ToListAsync();

            return Ok(new
            {
                pickupStops = stops.Where(x => x.stopType == 1 || x.stopType == 3).ToList(),
                dropoffStops = stops.Where(x => x.stopType == 2 || x.stopType == 3).ToList(),
                items = stops
            });
        }

        [HttpGet("{id}/bookings")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTripBookings(
            int id,
            [FromQuery] string? bookingStatus,
            [FromQuery] string? paymentStatus)
        {
            var tripExists = await _context.Trips.AsNoTracking().AnyAsync(x => x.TripID == id);
            if (!tripExists)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var query = _context.Bookings
                .AsNoTracking()
                .Where(x => x.TripID == id);

            if (!string.IsNullOrWhiteSpace(bookingStatus))
            {
                var keyword = bookingStatus.Trim();
                query = query.Where(x => x.BookingStatus == keyword);
            }

            if (!string.IsNullOrWhiteSpace(paymentStatus))
            {
                var keyword = paymentStatus.Trim();
                query = query.Where(x => x.PaymentStatus == keyword);
            }

            var bookings = await query
                .OrderByDescending(x => x.BookingDate)
                .Select(x => new
                {
                    bookingID = x.BookingID,
                    customerName = x.CustomerName,
                    customerPhone = x.CustomerPhone,
                    totalSeats = x.TotalSeats,
                    totalPrice = x.TotalPrice,
                    paymentStatus = x.PaymentStatus,
                    bookingStatus = x.BookingStatus ?? "PendingConfirm",
                    bookingDate = x.BookingDate
                })
                .ToListAsync();

            return Ok(bookings);
        }

        // GET /api/trips/search?from=HN&to=DN&departureDate=2026-05-20&page=1&pageSize=10
        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? from,
            [FromQuery] string? to,
            [FromQuery] DateTime? departureDate,
            [FromQuery] DateTime? returnDate,
            [FromQuery] string? busType,
            [FromQuery] int? operatorId,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? departureTimeRange,
            [FromQuery] string? arrivalTimeRange,
            [FromQuery] int? pickupStopId,
            [FromQuery] int? dropoffStopId,
            [FromQuery] string? sortBy,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] DateTime? date = null)
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            page = Math.Max(page, 1);
            departureDate ??= date;

            var query = _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .Where(x =>
                    x.AvailableSeats > 0 &&
                    x.DepartureTime >= DateTime.Now &&
                    x.Status != "Cancelled" &&
                    x.Status != "Completed");

            if (!string.IsNullOrWhiteSpace(from))
            {
                var fromKeyword = from.Trim();
                query = query.Where(x => EF.Functions.Like(x.DepartureLocation, $"%{fromKeyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(to))
            {
                var toKeyword = to.Trim();
                query = query.Where(x => EF.Functions.Like(x.ArrivalLocation, $"%{toKeyword}%"));
            }

            if (departureDate.HasValue)
            {
                var startDate = departureDate.Value.Date;
                var endDate = startDate.AddDays(1);
                query = query.Where(x => x.DepartureTime >= startDate && x.DepartureTime < endDate);
            }

            if (!string.IsNullOrWhiteSpace(busType))
            {
                var busTypeKeyword = busType.Trim();
                query = query.Where(x => x.Bus != null && EF.Functions.Like(x.Bus.BusType, $"%{busTypeKeyword}%"));
            }

            if (operatorId.HasValue)
                query = query.Where(x => x.Bus != null && x.Bus.OperatorID == operatorId.Value);

            if (minPrice.HasValue)
                query = query.Where(x => x.Price >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(x => x.Price <= maxPrice.Value);

            if (TryParseTimeRange(departureTimeRange, out var departureStart, out var departureEnd))
                query = query.Where(x => x.DepartureTime.TimeOfDay >= departureStart && x.DepartureTime.TimeOfDay <= departureEnd);

            if (TryParseTimeRange(arrivalTimeRange, out var arrivalStart, out var arrivalEnd))
                query = query.Where(x => x.ArrivalTime.TimeOfDay >= arrivalStart && x.ArrivalTime.TimeOfDay <= arrivalEnd);

            if (pickupStopId.HasValue)
                query = query.Where(x => x.StopPoints.Any(s => s.StopPointID == pickupStopId.Value && s.IsActive));

            if (dropoffStopId.HasValue)
                query = query.Where(x => x.StopPoints.Any(s => s.StopPointID == dropoffStopId.Value && s.IsActive));

            var total = await query.CountAsync();
            query = ApplySearchSort(query, sortBy);

            var trips = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    tripID = x.TripID,
                    operatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
                    operatorImageUrl = (string?)null,
                    busType = x.Bus != null ? x.Bus.BusType : null,
                    licensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
                    departureLocation = x.DepartureLocation,
                    arrivalLocation = x.ArrivalLocation,
                    departureTime = x.DepartureTime,
                    arrivalTime = x.ArrivalTime,
                    price = x.Price,
                    availableSeats = x.AvailableSeats,
                    status = x.Status
                })
                .ToListAsync();

            return Ok(new
            {
                items = trips,
                totalCount = total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(Trip trip)
        {
            var validationResult = await ValidateTripRequest(trip);
            if (validationResult != null)
                return validationResult;

            var bus = await _context.Buses.AsNoTracking().FirstAsync(x => x.BusID == trip.BusID);
            if (trip.AvailableSeats <= 0)
                trip.AvailableSeats = bus.Capacity;

            trip.Status = NormalizeStatus(trip.Status);
            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();
            return Ok(trip);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, Trip trip)
        {
            if (id != trip.TripID)
                return BadRequest("ID không khớp");

            var validationResult = await ValidateTripRequest(trip);
            if (validationResult != null)
                return validationResult;

            trip.Status = NormalizeStatus(trip.Status);
            _context.Entry(trip).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return Ok(trip);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var trip = await _context.Trips.FindAsync(id);
            if (trip == null) return NotFound();

            var hasBookings = await _context.Bookings.AnyAsync(x => x.TripID == id);
            if (hasBookings)
                return Conflict(new { message = "Không thể xóa chuyến đã có booking" });

            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();
            return Ok();
        }

        [HttpGet("locations")]
        public async Task<IActionResult> GetLocations()
        {
            var departures = await _context.Trips.Select(x => x.DepartureLocation).Distinct().ToListAsync();
            var arrivals   = await _context.Trips.Select(x => x.ArrivalLocation).Distinct().ToListAsync();
            var all        = departures.Union(arrivals)
                .Where(x => !string.IsNullOrEmpty(x))
                .OrderBy(x => x)
                .ToList();
            return Ok(all);
        }

        private static string NormalizeStatus(string? status)
        {
            var value = (status ?? string.Empty).Trim();
            return value.ToLowerInvariant() switch
            {
                "active"    => "Scheduled",
                "scheduled" => "Scheduled",
                "on-going"  => "On-going",
                "ongoing"   => "On-going",
                "completed" => "Completed",
                "cancelled" => "Cancelled",
                "canceled"  => "Cancelled",
                _           => "Scheduled"
            };
        }

        private async Task<IActionResult?> ValidateTripRequest(Trip trip)
        {
            var bus = await _context.Buses
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BusID == trip.BusID);

            if (bus == null)
                return BadRequest(new { message = "BusID không tồn tại" });

            if (trip.DepartureTime >= trip.ArrivalTime)
                return BadRequest(new { message = "DepartureTime phải nhỏ hơn ArrivalTime" });

            if (trip.Price <= 0)
                return BadRequest(new { message = "Price phải lớn hơn 0" });

            if (trip.AvailableSeats < 0)
                return BadRequest(new { message = "AvailableSeats không được âm" });

            if (trip.AvailableSeats > bus.Capacity)
                return BadRequest(new { message = "AvailableSeats không được lớn hơn Capacity của xe" });

            return null;
        }

        private static IQueryable<Trip> ApplySearchSort(IQueryable<Trip> query, string? sortBy)
        {
            return (sortBy ?? string.Empty).Trim().ToLowerInvariant() switch
            {
                "price_asc" => query
                    .OrderByDescending(x => x.Status == "Scheduled")
                    .ThenBy(x => x.Price)
                    .ThenBy(x => x.DepartureTime),
                "price_desc" => query
                    .OrderByDescending(x => x.Status == "Scheduled")
                    .ThenByDescending(x => x.Price)
                    .ThenBy(x => x.DepartureTime),
                "departure_desc" => query
                    .OrderByDescending(x => x.Status == "Scheduled")
                    .ThenByDescending(x => x.DepartureTime),
                _ => query
                    .OrderByDescending(x => x.Status == "Scheduled")
                    .ThenBy(x => x.DepartureTime)
            };
        }

        private static bool TryParseTimeRange(string? value, out TimeSpan start, out TimeSpan end)
        {
            start = TimeSpan.Zero;
            end = TimeSpan.Zero;

            if (string.IsNullOrWhiteSpace(value))
                return false;

            var parts = value.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2)
                return false;

            return TimeSpan.TryParse(parts[0], out start) &&
                   TimeSpan.TryParse(parts[1], out end) &&
                   start <= end;
        }
    }
}
