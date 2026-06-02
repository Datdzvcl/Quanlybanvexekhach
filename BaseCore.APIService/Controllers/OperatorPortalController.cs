using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Common;
using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace BaseCore.APIService.Controllers
{
    [Route("api/operator-portal")]
    [ApiController]
    [Authorize(Roles = "Operator")]
    public class OperatorPortalController : ControllerBase
    {
        private const string LayoutLimousine = "Limousine";
        private const string LayoutOneFloor = "1 tầng";
        private const string LayoutTwoFloors = "2 tầng";

        private readonly MySqlDbContext _context;

        public OperatorPortalController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            return Ok(new
            {
                scope.Operator.OperatorID,
                scope.Operator.Name,
                scope.Operator.Description,
                scope.Operator.ContactPhone,
                scope.Operator.Email,
                Account = new
                {
                    scope.User.UserID,
                    scope.User.FullName,
                    scope.User.Email,
                    scope.User.Phone,
                    Role = DomainCodes.ToRoleName(scope.User.Role)
                }
            });
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var operatorId = scope.Operator.OperatorID;
            var tripQuery = ScopedTrips(operatorId);
            var bookingQuery = ScopedBookings(operatorId);
            var paidBookingQuery = bookingQuery.Where(x => x.PaymentStatus == "Paid");

            var today = DateTime.Today;
            var upcomingTripEntities = await tripQuery
                .Where(x => x.DepartureTime >= DateTime.Now)
                .OrderBy(x => x.DepartureTime)
                .Take(5)
                .ToListAsync();

            return Ok(new
            {
                totalBuses = await _context.Buses.CountAsync(x => x.OperatorID == operatorId),
                totalTrips = await tripQuery.CountAsync(),
                upcomingTrips = await tripQuery.CountAsync(x => x.DepartureTime >= DateTime.Now),
                todayTrips = await tripQuery.CountAsync(x => x.DepartureTime >= today && x.DepartureTime < today.AddDays(1)),
                totalBookings = await bookingQuery.CountAsync(),
                totalRevenue = await paidBookingQuery.SumAsync(x => (decimal?)x.TotalPrice) ?? 0,
                upcoming = upcomingTripEntities.Select(ProjectTripSummary)
            });
        }

        [HttpGet("seat-layouts")]
        public IActionResult SeatLayouts()
        {
            return Ok(new[]
            {
                new { key = LayoutLimousine, name = "Limousine", suggestedCapacity = 22, description = "Sơ đồ phòng/ghế riêng cho xe Limousine" },
                new { key = LayoutTwoFloors, name = "Xe giường nằm 2 tầng", suggestedCapacity = 34, description = "Sơ đồ chia tầng 1 và tầng 2" },
                new { key = LayoutOneFloor, name = "Xe giường nằm 1 tầng", suggestedCapacity = 22, description = "Sơ đồ một tầng cho xe giường nằm hoặc ghế ngồi" }
            });
        }

        [HttpGet("buses")]
        public async Task<IActionResult> GetBuses(
            [FromQuery] string? licensePlate,
            [FromQuery] string? busType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Buses
                .AsNoTracking()
                .Where(x => x.OperatorID == scope.Operator.OperatorID);

            if (!string.IsNullOrWhiteSpace(licensePlate))
            {
                var keyword = licensePlate.Trim();
                query = query.Where(x => EF.Functions.Like(x.LicensePlate, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(busType))
            {
                var keyword = busType.Trim();
                query = query.Where(x => EF.Functions.Like(x.BusType, $"%{keyword}%"));
            }

            var totalCount = await query.CountAsync();
            var buses = await query
                .OrderBy(x => x.BusID)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new BusListItem
                {
                    BusID = x.BusID,
                    OperatorID = x.OperatorID,
                    LicensePlate = x.LicensePlate,
                    Capacity = x.Capacity,
                    BusType = x.BusType,
                    ImageUrl = x.ImageUrl,
                    Amenities = x.Amenities,
                    SeatLayoutType = x.SeatLayoutType,
                    SeatLayout = x.SeatLayout
                })
                .ToListAsync();

            return Ok(new
            {
                items = buses.Select(ProjectBus),
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpGet("buses/{id:int}")]
        public async Task<IActionResult> GetBusById(int id)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var bus = await _context.Buses
                .AsNoTracking()
                .Where(x => x.OperatorID == scope.Operator.OperatorID && x.BusID == id)
                .Select(x => new BusListItem
                {
                    BusID = x.BusID,
                    OperatorID = x.OperatorID,
                    LicensePlate = x.LicensePlate,
                    Capacity = x.Capacity,
                    BusType = x.BusType,
                    ImageUrl = x.ImageUrl,
                    Amenities = x.Amenities,
                    SeatLayoutType = x.SeatLayoutType,
                    SeatLayout = x.SeatLayout
                })
                .FirstOrDefaultAsync();

            if (bus == null)
                return NotFound(new { message = "Khong tim thay xe cua nha xe hien tai" });

            return Ok(ProjectBus(bus));
        }

        [HttpPost("buses")]
        public async Task<IActionResult> CreateBus([FromBody] OperatorBusRequest request)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var validation = ValidateBusRequest(request);
            if (validation != null)
                return validation;

            var layoutType = NormalizeSeatLayoutType(request.SeatLayoutType, request.BusType, request.Capacity);

            var bus = new Bus
            {
                OperatorID = scope.Operator.OperatorID,
                LicensePlate = request.LicensePlate.Trim(),
                Capacity = request.Capacity,
                BusType = request.BusType.Trim(),
                ImageUrl = NormalizeOptionalText(request.ImageUrl),
                Amenities = NormalizeAmenitiesForStorage(request.Amenities),
                SeatLayoutType = layoutType,
                SeatLayout = NormalizeSeatLayoutForStorage(request.SeatLayout, layoutType, request.Capacity)
            };

            _context.Buses.Add(bus);
            await _context.SaveChangesAsync();

            return Ok(ProjectBus(new BusListItem
            {
                BusID = bus.BusID,
                OperatorID = bus.OperatorID,
                LicensePlate = bus.LicensePlate,
                Capacity = bus.Capacity,
                BusType = bus.BusType,
                ImageUrl = bus.ImageUrl,
                Amenities = bus.Amenities,
                SeatLayoutType = bus.SeatLayoutType,
                SeatLayout = bus.SeatLayout
            }));
        }

        [HttpPut("buses/{id:int}")]
        public async Task<IActionResult> UpdateBus(int id, [FromBody] OperatorBusRequest request)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var validation = ValidateBusRequest(request);
            if (validation != null)
                return validation;

            var bus = await _context.Buses.FirstOrDefaultAsync(x =>
                x.BusID == id && x.OperatorID == scope.Operator.OperatorID);

            if (bus == null)
                return NotFound(new { message = "Khong tim thay xe cua nha xe hien tai" });

            if (request.Capacity < bus.Capacity)
            {
                var hasFutureTripOverCapacity = await _context.Trips.AnyAsync(x =>
                    x.BusID == id &&
                    x.DepartureTime >= DateTime.Now &&
                    x.AvailableSeats > request.Capacity);

                if (hasFutureTripOverCapacity)
                    return Conflict(new { message = "Khong the giam suc chua vi dang co chuyen sap chay co so ghe trong lon hon suc chua moi" });
            }

            bus.LicensePlate = request.LicensePlate.Trim();
            bus.Capacity = request.Capacity;
            bus.BusType = request.BusType.Trim();
            if (request.ImageUrl != null)
                bus.ImageUrl = NormalizeOptionalText(request.ImageUrl);
            if (request.Amenities != null)
                bus.Amenities = NormalizeAmenitiesForStorage(request.Amenities);
            var layoutType = NormalizeSeatLayoutType(request.SeatLayoutType, request.BusType, request.Capacity);
            bus.SeatLayoutType = layoutType;
            bus.SeatLayout = NormalizeSeatLayoutForStorage(request.SeatLayout, layoutType, request.Capacity);

            await _context.SaveChangesAsync();

            return Ok(ProjectBus(new BusListItem
            {
                BusID = bus.BusID,
                OperatorID = bus.OperatorID,
                LicensePlate = bus.LicensePlate,
                Capacity = bus.Capacity,
                BusType = bus.BusType,
                ImageUrl = bus.ImageUrl,
                Amenities = bus.Amenities,
                SeatLayoutType = bus.SeatLayoutType,
                SeatLayout = bus.SeatLayout
            }));
        }

        [HttpDelete("buses/{id:int}")]
        public async Task<IActionResult> DeleteBus(int id)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var bus = await _context.Buses.FirstOrDefaultAsync(x =>
                x.BusID == id && x.OperatorID == scope.Operator.OperatorID);

            if (bus == null)
                return NotFound(new { message = "Khong tim thay xe cua nha xe hien tai" });

            var hasTrips = await _context.Trips.AnyAsync(x => x.BusID == id);
            if (hasTrips)
                return Conflict(new { message = "Xe da co lich chay, khong the xoa. Hay cap nhat trang thai chuyen thay vi xoa xe." });

            _context.Buses.Remove(bus);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpGet("trips")]
        public async Task<IActionResult> GetTrips(
            [FromQuery] int? busId,
            [FromQuery] string? route,
            [FromQuery] DateTime? departureDate,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = ScopedTrips(scope.Operator.OperatorID);

            if (busId.HasValue)
                query = query.Where(x => x.BusID == busId.Value);

            if (!string.IsNullOrWhiteSpace(route))
            {
                var keyword = route.Trim();
                query = query.Where(x =>
                    EF.Functions.Like(x.DepartureLocation, $"%{keyword}%") ||
                    EF.Functions.Like(x.ArrivalLocation, $"%{keyword}%"));
            }

            if (departureDate.HasValue)
            {
                var start = departureDate.Value.Date;
                var end = start.AddDays(1);
                query = query.Where(x => x.DepartureTime >= start && x.DepartureTime < end);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = NormalizeStatus(status);
                query = query.Where(x => x.Status == normalizedStatus);
            }

            var totalCount = await query.CountAsync();
            var tripEntities = await query
                .OrderByDescending(x => x.DepartureTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                items = tripEntities.Select(ProjectTripSummary),
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpGet("trips/{id:int}")]
        public async Task<IActionResult> GetTripById(int id)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var trip = await ScopedTrips(scope.Operator.OperatorID)
                .AsNoTracking()
                .Include(x => x.StopPoints)
                .Where(x => x.TripID == id)
                .FirstOrDefaultAsync();

            if (trip == null)
                return NotFound(new { message = "Khong tim thay chuyen xe cua nha xe hien tai" });

            return Ok(ProjectTripDetail(trip));
        }

        [HttpPost("trips")]
        public async Task<IActionResult> CreateTrip([FromBody] OperatorTripRequest request)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var bus = await _context.Buses
                .FirstOrDefaultAsync(x => x.BusID == request.BusID && x.OperatorID == scope.Operator.OperatorID);

            if (bus == null)
                return BadRequest(new { message = "BusID khong thuoc nha xe hien tai" });

            var validation = ValidateTripRequest(request, bus.Capacity);
            if (validation != null)
                return validation;

            ApplySeatLayoutToBus(bus, request.SeatLayoutType, request.SeatLayout);

            var trip = new Trip
            {
                BusID = request.BusID,
                DepartureLocation = request.DepartureLocation.Trim(),
                ArrivalLocation = request.ArrivalLocation.Trim(),
                DepartureTime = request.DepartureTime,
                ArrivalTime = request.ArrivalTime,
                Price = request.Price,
                AvailableSeats = request.AvailableSeats > 0 ? request.AvailableSeats : bus.Capacity,
                Status = NormalizeStatus(request.Status)
            };

            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();

            AddStops(trip, request.StopPoints);
            await _context.SaveChangesAsync();

            return Ok(new { trip.TripID });
        }

        [HttpPut("trips/{id:int}")]
        public async Task<IActionResult> UpdateTrip(int id, [FromBody] OperatorTripRequest request)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var trip = await _context.Trips
                .Include(x => x.Bus)
                .FirstOrDefaultAsync(x =>
                    x.TripID == id &&
                    x.Bus != null &&
                    x.Bus.OperatorID == scope.Operator.OperatorID);

            if (trip == null)
                return NotFound(new { message = "Khong tim thay chuyen xe cua nha xe hien tai" });

            var bus = await _context.Buses
                .FirstOrDefaultAsync(x => x.BusID == request.BusID && x.OperatorID == scope.Operator.OperatorID);

            if (bus == null)
                return BadRequest(new { message = "BusID khong thuoc nha xe hien tai" });

            var validation = ValidateTripRequest(request, bus.Capacity);
            if (validation != null)
                return validation;

            ApplySeatLayoutToBus(bus, request.SeatLayoutType, request.SeatLayout);

            trip.BusID = request.BusID;
            trip.DepartureLocation = request.DepartureLocation.Trim();
            trip.ArrivalLocation = request.ArrivalLocation.Trim();
            trip.DepartureTime = request.DepartureTime;
            trip.ArrivalTime = request.ArrivalTime;
            trip.Price = request.Price;
            trip.AvailableSeats = request.AvailableSeats > 0 ? request.AvailableSeats : bus.Capacity;
            trip.Status = NormalizeStatus(request.Status);

            if (request.StopPoints != null)
            {
                await DeactivateOldStops(id);
                AddStops(trip, request.StopPoints);
            }

            await _context.SaveChangesAsync();

            return Ok(new { trip.TripID });
        }

        [HttpDelete("trips/{id:int}")]
        public async Task<IActionResult> DeleteTrip(int id)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var trip = await _context.Trips
                .Include(x => x.Bus)
                .FirstOrDefaultAsync(x =>
                    x.TripID == id &&
                    x.Bus != null &&
                    x.Bus.OperatorID == scope.Operator.OperatorID);

            if (trip == null)
                return NotFound(new { message = "Khong tim thay chuyen xe cua nha xe hien tai" });

            var hasBookings = await _context.Bookings.AnyAsync(x => x.TripID == id);
            if (hasBookings)
                return Conflict(new { message = "Chuyen xe da co booking, khong the xoa" });

            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("trips/{id:int}/clone")]
        public async Task<IActionResult> CloneTrip(int id, [FromBody] CloneTripRequest request)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var baseTrip = await ScopedTrips(scope.Operator.OperatorID)
                .Include(x => x.StopPoints)
                .FirstOrDefaultAsync(x => x.TripID == id);

            if (baseTrip == null)
                return NotFound(new { message = "Khong tim thay chuyen xe cua nha xe hien tai" });

            var intervalDays = string.Equals(request.RepeatType, "week", StringComparison.OrdinalIgnoreCase) ? 7 : 1;
            var count = Math.Clamp(request.Count, 1, 60);
            var clonedTrips = new List<Trip>();

            for (var index = 1; index <= count; index++)
            {
                var dayOffset = intervalDays * index;
                var trip = new Trip
                {
                    BusID = baseTrip.BusID,
                    DepartureLocation = baseTrip.DepartureLocation,
                    ArrivalLocation = baseTrip.ArrivalLocation,
                    DepartureTime = baseTrip.DepartureTime.AddDays(dayOffset),
                    ArrivalTime = baseTrip.ArrivalTime.AddDays(dayOffset),
                    Price = baseTrip.Price,
                    AvailableSeats = baseTrip.Bus?.Capacity ?? baseTrip.AvailableSeats,
                    Status = DomainCodes.TripScheduled
                };

                _context.Trips.Add(trip);
                clonedTrips.Add(trip);
            }

            await _context.SaveChangesAsync();

            var activeStops = baseTrip.StopPoints
                .Where(x => x.IsActive)
                .OrderBy(x => x.StopOrder)
                .ToList();

            foreach (var trip in clonedTrips)
            {
                foreach (var stop in activeStops)
                {
                    _context.StopPoints.Add(new StopPoint
                    {
                        TripID = trip.TripID,
                        StopName = stop.StopName,
                        StopAddress = stop.StopAddress,
                        StopOrder = stop.StopOrder,
                        StopType = stop.StopType,
                        ArrivalOffset = stop.ArrivalOffset,
                        IsActive = true
                    });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                items = clonedTrips.Select(x => new
                {
                    x.TripID,
                    x.DepartureTime,
                    x.ArrivalTime
                })
            });
        }

        [HttpGet("reports/revenue")]
        public async Task<IActionResult> RevenueReport(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? tripId,
            [FromQuery] int? busId)
        {
            var scope = await GetOperatorScope();
            if (scope == null)
                return OperatorScopeNotFound();

            var query = ScopedBookings(scope.Operator.OperatorID)
                .Where(x => x.PaymentStatus == "Paid");

            if (from.HasValue)
                query = query.Where(x => x.BookingDate.HasValue && x.BookingDate.Value >= from.Value.Date);

            if (to.HasValue)
            {
                var end = to.Value.Date.AddDays(1);
                query = query.Where(x => x.BookingDate.HasValue && x.BookingDate.Value < end);
            }

            if (tripId.HasValue)
                query = query.Where(x => x.TripID == tripId.Value);

            if (busId.HasValue)
                query = query.Where(x => x.Trip != null && x.Trip.BusID == busId.Value);

            var totalRevenue = await query.SumAsync(x => (decimal?)x.TotalPrice) ?? 0;
            var totalBookings = await query.CountAsync();
            var totalSeats = await query.SumAsync(x => (int?)x.TotalSeats) ?? 0;

            var byTrip = await query
                .GroupBy(x => new
                {
                    x.TripID,
                    x.Trip!.DepartureLocation,
                    x.Trip.ArrivalLocation,
                    x.Trip.DepartureTime,
                    x.Trip.BusID,
                    x.Trip.Bus!.LicensePlate
                })
                .Select(g => new
                {
                    g.Key.TripID,
                    g.Key.BusID,
                    g.Key.LicensePlate,
                    g.Key.DepartureLocation,
                    g.Key.ArrivalLocation,
                    g.Key.DepartureTime,
                    Revenue = g.Sum(x => x.TotalPrice),
                    BookingCount = g.Count(),
                    SeatCount = g.Sum(x => x.TotalSeats)
                })
                .OrderByDescending(x => x.Revenue)
                .ToListAsync();

            var byBus = await query
                .GroupBy(x => new
                {
                    x.Trip!.BusID,
                    x.Trip.Bus!.LicensePlate,
                    x.Trip.Bus.BusType
                })
                .Select(g => new
                {
                    g.Key.BusID,
                    g.Key.LicensePlate,
                    g.Key.BusType,
                    Revenue = g.Sum(x => x.TotalPrice),
                    BookingCount = g.Count(),
                    SeatCount = g.Sum(x => x.TotalSeats)
                })
                .OrderByDescending(x => x.Revenue)
                .ToListAsync();

            var rawByDate = await query
                .Where(x => x.BookingDate.HasValue)
                .GroupBy(x => new
                {
                    x.BookingDate!.Value.Year,
                    x.BookingDate.Value.Month,
                    x.BookingDate.Value.Day
                })
                .Select(g => new
                {
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.Day,
                    Revenue = g.Sum(x => x.TotalPrice),
                    BookingCount = g.Count(),
                    SeatCount = g.Sum(x => x.TotalSeats)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.Day)
                .ToListAsync();

            return Ok(new
            {
                totalRevenue,
                totalBookings,
                totalSeats,
                byTrip,
                byBus,
                byDate = rawByDate.Select(x => new
                {
                    Date = new DateTime(x.Year, x.Month, x.Day),
                    x.Revenue,
                    x.BookingCount,
                    x.SeatCount
                })
            });
        }

        private IQueryable<Trip> ScopedTrips(int operatorId)
        {
            return _context.Trips
                .Include(x => x.Bus)
                .ThenInclude(x => x.Operator)
                .Where(x => x.Bus != null && x.Bus.OperatorID == operatorId);
        }

        private IQueryable<Booking> ScopedBookings(int operatorId)
        {
            return _context.Bookings
                .Include(x => x.Trip)
                .ThenInclude(x => x!.Bus)
                .Where(x => x.Trip != null && x.Trip.Bus != null && x.Trip.Bus.OperatorID == operatorId);
        }

        private async Task<OperatorScope?> GetOperatorScope()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
                return null;

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserID == userId);
            if (user == null || user.Role != DomainCodes.RoleOperator)
                return null;

            var email = NormalizeEmail(user.Email);
            var phone = NormalizePhone(user.Phone);
            var operatorInfo = await _context.Operators
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    (!string.IsNullOrWhiteSpace(email) && x.Email.Trim().ToLower() == email) ||
                    (!string.IsNullOrWhiteSpace(phone) && x.ContactPhone.Replace(" ", "").Replace("-", "").Replace(".", "") == phone));

            if (operatorInfo != null)
                return new OperatorScope(user, operatorInfo);

            operatorInfo = await FindOperatorByProfileName(user);

            return operatorInfo == null ? null : new OperatorScope(user, operatorInfo);
        }

        private async Task<Operator?> FindOperatorByProfileName(User user)
        {
            var userKeys = GetOperatorNameKeys(user).ToList();
            if (userKeys.Count == 0)
                return null;

            var operators = await _context.Operators
                .AsNoTracking()
                .OrderBy(x => x.OperatorID)
                .ToListAsync();

            return operators.FirstOrDefault(operatorInfo =>
            {
                var operatorKey = NormalizeOperatorName(operatorInfo.Name);
                return !string.IsNullOrWhiteSpace(operatorKey) &&
                    userKeys.Any(userKey =>
                        operatorKey == userKey ||
                        operatorKey.Contains(userKey) ||
                        userKey.Contains(operatorKey));
            });
        }

        private static IEnumerable<string> GetOperatorNameKeys(User user)
        {
            var keys = new[]
            {
                NormalizeOperatorName(user.FullName),
                NormalizeOperatorName(user.Email.Split('@')[0])
            };

            return keys
                .Where(x => x.Length >= 4)
                .Distinct();
        }

        private static string NormalizeEmail(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().ToLowerInvariant();
        }

        private static string NormalizePhone(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            return new string(value.Where(char.IsDigit).ToArray());
        }

        private static string NormalizeOperatorName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var normalized = RemoveVietnameseSigns(value)
                .ToLowerInvariant()
                .Where(char.IsLetterOrDigit)
                .Aggregate(new StringBuilder(), (builder, ch) => builder.Append(ch), builder => builder.ToString());

            foreach (var prefix in new[] { "nhaxe", "operator" })
            {
                if (normalized.StartsWith(prefix))
                    normalized = normalized[prefix.Length..];
            }

            return normalized;
        }

        private static string RemoveVietnameseSigns(string value)
        {
            var normalized = value.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var ch in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    builder.Append(ch);
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }
        private IActionResult OperatorScopeNotFound()
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Tai khoan Operator chua duoc gan voi nha xe. Hay dat Email hoac SDT cua Users trung voi Operators.Email hoac Operators.ContactPhone."
            });
        }

        private IActionResult? ValidateBusRequest(OperatorBusRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Du lieu xe khong hop le" });

            if (string.IsNullOrWhiteSpace(request.LicensePlate))
                return BadRequest(new { message = "Bien so xe la bat buoc" });

            if (string.IsNullOrWhiteSpace(request.BusType))
                return BadRequest(new { message = "Loai xe la bat buoc" });

            if (request.Capacity <= 0 || request.Capacity > 80)
                return BadRequest(new { message = "Suc chua xe phai tu 1 den 80" });

            var seatLayoutValidation = ValidateSeatLayoutRequest(request.SeatLayoutType, request.SeatLayout);
            if (seatLayoutValidation != null)
                return seatLayoutValidation;

            return null;
        }

        private IActionResult? ValidateTripRequest(OperatorTripRequest request, int busCapacity)
        {
            if (request == null)
                return BadRequest(new { message = "Du lieu chuyen xe khong hop le" });

            if (string.IsNullOrWhiteSpace(request.DepartureLocation))
                return BadRequest(new { message = "Diem di la bat buoc" });

            if (string.IsNullOrWhiteSpace(request.ArrivalLocation))
                return BadRequest(new { message = "Diem den la bat buoc" });

            if (request.DepartureTime >= request.ArrivalTime)
                return BadRequest(new { message = "Gio den phai lon hon gio di" });

            if (request.Price <= 0)
                return BadRequest(new { message = "Gia ve phai lon hon 0" });

            if (request.AvailableSeats < 0)
                return BadRequest(new { message = "So ghe trong khong duoc am" });

            if (request.AvailableSeats > busCapacity)
                return BadRequest(new { message = "So ghe trong khong duoc lon hon suc chua xe" });

            var seatLayoutValidation = ValidateSeatLayoutRequest(request.SeatLayoutType, request.SeatLayout);
            if (seatLayoutValidation != null)
                return seatLayoutValidation;

            return null;
        }

        private IActionResult? ValidateSeatLayoutRequest(string? layoutType, string? seatLayout)
        {
            if (!string.IsNullOrWhiteSpace(layoutType) && !IsKnownSeatLayoutType(layoutType))
                return BadRequest(new { message = "Loai so do ghe phai la Limousine, 1 tang hoac 2 tang" });

            if (!string.IsNullOrWhiteSpace(seatLayout))
            {
                try
                {
                    JsonDocument.Parse(seatLayout);
                }
                catch (JsonException)
                {
                    return BadRequest(new { message = "SeatLayout phai la JSON hop le" });
                }
            }

            return null;
        }

        private async Task DeactivateOldStops(int tripId)
        {
            var oldStops = await _context.StopPoints
                .Where(x => x.TripID == tripId && x.IsActive)
                .ToListAsync();

            foreach (var stop in oldStops)
            {
                stop.IsActive = false;
            }
        }

        private void AddStops(Trip trip, List<OperatorStopPointRequest>? stops)
        {
            var activeStops = stops?
                .Where(x => !string.IsNullOrWhiteSpace(x.StopName))
                .OrderBy(x => x.StopOrder)
                .ToList();

            if (activeStops == null || activeStops.Count == 0)
            {
                AddDefaultStopPoints(trip);
                return;
            }

            var order = 1;
            foreach (var stop in activeStops)
            {
                _context.StopPoints.Add(new StopPoint
                {
                    TripID = trip.TripID,
                    StopName = stop.StopName.Trim(),
                    StopAddress = string.IsNullOrWhiteSpace(stop.StopAddress) ? null : stop.StopAddress.Trim(),
                    StopOrder = stop.StopOrder > 0 ? stop.StopOrder : order,
                    StopType = stop.StopType is 1 or 2 or 3 ? stop.StopType : 3,
                    ArrivalOffset = stop.ArrivalOffset,
                    IsActive = true
                });
                order++;
            }
        }

        private void AddDefaultStopPoints(Trip trip)
        {
            var totalMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes));
            var middleOffset = totalMinutes > 0 ? Math.Max(1, totalMinutes / 2) : 0;

            _context.StopPoints.AddRange(
                new StopPoint
                {
                    TripID = trip.TripID,
                    StopName = $"Ben xe {trip.DepartureLocation}",
                    StopAddress = $"Trung tam {trip.DepartureLocation}",
                    StopOrder = 1,
                    StopType = 1,
                    ArrivalOffset = 0,
                    IsActive = true
                },
                new StopPoint
                {
                    TripID = trip.TripID,
                    StopName = $"Tram dung giua tuyen {trip.DepartureLocation} - {trip.ArrivalLocation}",
                    StopAddress = $"Quoc lo chinh tuyen {trip.DepartureLocation} - {trip.ArrivalLocation}",
                    StopOrder = 2,
                    StopType = 3,
                    ArrivalOffset = middleOffset,
                    IsActive = true
                },
                new StopPoint
                {
                    TripID = trip.TripID,
                    StopName = $"Ben xe {trip.ArrivalLocation}",
                    StopAddress = $"Trung tam {trip.ArrivalLocation}",
                    StopOrder = 3,
                    StopType = 2,
                    ArrivalOffset = totalMinutes,
                    IsActive = true
                }
            );
        }

        private static object ProjectTripSummary(Trip trip)
        {
            var layoutType = NormalizeSeatLayoutType(trip.Bus?.SeatLayoutType, trip.Bus?.BusType, trip.Bus?.Capacity ?? 0);

            return new
            {
                trip.TripID,
                trip.BusID,
                trip.DepartureLocation,
                trip.ArrivalLocation,
                trip.DepartureTime,
                trip.ArrivalTime,
                trip.Price,
                trip.AvailableSeats,
                Status = DomainCodes.ToTripStatusName(trip.Status),
                EstimatedDurationMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes)),
                BusType = trip.Bus?.BusType,
                LicensePlate = trip.Bus?.LicensePlate,
                Capacity = trip.Bus?.Capacity ?? 0,
                LayoutType = layoutType,
                SeatMap = ProjectSeatMap(trip.Bus?.SeatLayout, layoutType, trip.Bus?.Capacity ?? 0),
                Amenities = ReadAmenities(trip.Bus?.Amenities),
                BusImageUrl = trip.Bus?.ImageUrl
            };
        }

        private static object ProjectTripDetail(Trip trip)
        {
            return new
            {
                trip.TripID,
                trip.BusID,
                trip.DepartureLocation,
                trip.ArrivalLocation,
                trip.DepartureTime,
                trip.ArrivalTime,
                trip.Price,
                trip.AvailableSeats,
                Status = DomainCodes.ToTripStatusName(trip.Status),
                EstimatedDurationMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes)),
                Bus = trip.Bus == null ? null : ProjectBus(new BusListItem
                {
                    BusID = trip.Bus.BusID,
                    OperatorID = trip.Bus.OperatorID,
                    LicensePlate = trip.Bus.LicensePlate,
                    Capacity = trip.Bus.Capacity,
                    BusType = trip.Bus.BusType,
                    ImageUrl = trip.Bus.ImageUrl,
                    Amenities = trip.Bus.Amenities,
                    SeatLayoutType = trip.Bus.SeatLayoutType,
                    SeatLayout = trip.Bus.SeatLayout
                }),
                StopPoints = trip.StopPoints
                    .Where(x => x.IsActive)
                    .OrderBy(x => x.StopOrder)
                    .Select(x => new
                    {
                        x.StopPointID,
                        x.TripID,
                        x.StopName,
                        x.StopAddress,
                        x.StopOrder,
                        x.StopType,
                        x.ArrivalOffset
                    })
                    .ToList()
            };
        }

        private static object ProjectBus(BusListItem bus)
        {
            var layoutType = NormalizeSeatLayoutType(bus.SeatLayoutType, bus.BusType, bus.Capacity);

            return new
            {
                bus.BusID,
                bus.OperatorID,
                bus.LicensePlate,
                bus.Capacity,
                bus.BusType,
                LayoutType = layoutType,
                Amenities = ReadAmenities(bus.Amenities),
                bus.ImageUrl,
                SeatMap = ProjectSeatMap(bus.SeatLayout, layoutType, bus.Capacity)
            };
        }

        private static List<string> ReadAmenities(string? amenities)
        {
            if (string.IsNullOrWhiteSpace(amenities))
                return new List<string>();

            var value = amenities.Trim();
            if (value.StartsWith("["))
            {
                try
                {
                    return JsonSerializer.Deserialize<List<string>>(value)?
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(x => x.Trim())
                        .ToList() ?? new List<string>();
                }
                catch (JsonException)
                {
                    // Fall back to delimiter parsing below for legacy text values.
                }
            }

            return value
                .Split(new[] { ',', ';', '|', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToList();
        }

        private static string? NormalizeAmenitiesForStorage(string? amenities)
        {
            var items = ReadAmenities(amenities);
            return items.Count == 0 ? null : JsonSerializer.Serialize(items);
        }

        private void ApplySeatLayoutToBus(Bus bus, string? requestedLayoutType, string? requestedSeatLayout)
        {
            if (string.IsNullOrWhiteSpace(requestedLayoutType) && string.IsNullOrWhiteSpace(requestedSeatLayout))
                return;

            var layoutType = NormalizeSeatLayoutType(requestedLayoutType, bus.BusType, bus.Capacity);
            bus.SeatLayoutType = layoutType;
            bus.SeatLayout = NormalizeSeatLayoutForStorage(requestedSeatLayout, layoutType, bus.Capacity);
        }

        private static string NormalizeSeatLayoutType(string? layoutType, string? busType, int capacity)
        {
            if (TryMapSeatLayoutType(layoutType, capacity, out var normalized))
                return normalized;

            return InferSeatLayoutType(busType, capacity);
        }

        private static string InferSeatLayoutType(string? busType, int capacity)
        {
            var key = NormalizeLayoutKey(busType);
            if (key.Contains("limousine"))
                return LayoutLimousine;

            if (key.Contains("giuong") || key.Contains("sleeper") || key.Contains("cabin"))
                return capacity <= 24 ? LayoutOneFloor : LayoutTwoFloors;

            return LayoutOneFloor;
        }

        private static bool IsKnownSeatLayoutType(string layoutType)
        {
            return TryMapSeatLayoutType(layoutType, 0, out _);
        }

        private static bool TryMapSeatLayoutType(string? layoutType, int capacity, out string normalized)
        {
            normalized = string.Empty;

            if (string.IsNullOrWhiteSpace(layoutType))
                return false;

            var key = NormalizeLayoutKey(layoutType);
            if (key == "limousine")
            {
                normalized = LayoutLimousine;
                return true;
            }

            if (key is "1tang" or "mottang" or "onefloor" or "1floor" or "seater" or "ghengoi")
            {
                normalized = LayoutOneFloor;
                return true;
            }

            if (key is "2tang" or "haitang" or "twofloor" or "2floor")
            {
                normalized = LayoutTwoFloors;
                return true;
            }

            if (key is "sleeper" or "giuongnam")
            {
                normalized = capacity > 0 && capacity <= 24 ? LayoutOneFloor : LayoutTwoFloors;
                return true;
            }

            return false;
        }

        private static string NormalizeLayoutKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            return new string(RemoveVietnameseSigns(value)
                .ToLowerInvariant()
                .Where(char.IsLetterOrDigit)
                .ToArray());
        }

        private static string NormalizeSeatLayoutForStorage(string? seatLayout, string layoutType, int capacity)
        {
            var seats = ReadSeatLabels(seatLayout);
            if (seats.Count == 0)
                seats = BuildSeatLabels(layoutType, capacity);

            return JsonSerializer.Serialize(new
            {
                layoutType,
                seats
            });
        }

        private static object ProjectSeatMap(string? seatLayout, string layoutType, int capacity)
        {
            var parsed = ReadSeatLayout(seatLayout);
            if (parsed.HasValue)
                return parsed.Value;

            return new
            {
                layoutType,
                seats = BuildSeatLabels(layoutType, capacity)
            };
        }

        private static List<string> ReadSeatLabels(string? seatLayout)
        {
            if (string.IsNullOrWhiteSpace(seatLayout))
                return new List<string>();

            try
            {
                using var document = JsonDocument.Parse(seatLayout);
                var root = document.RootElement;
                if (root.ValueKind == JsonValueKind.Object)
                {
                    if (root.TryGetProperty("seats", out var seatsElement) ||
                        root.TryGetProperty("Seats", out seatsElement))
                    {
                        return ReadSeatLabels(seatsElement);
                    }

                    return new List<string>();
                }

                return ReadSeatLabels(root);
            }
            catch (JsonException)
            {
                return new List<string>();
            }
        }

        private static List<string> ReadSeatLabels(JsonElement seatsElement)
        {
            if (seatsElement.ValueKind != JsonValueKind.Array)
                return new List<string>();

            var seats = new List<string>();
            foreach (var item in seatsElement.EnumerateArray())
            {
                var label = item.ValueKind == JsonValueKind.String
                    ? item.GetString()
                    : TryReadSeatLabel(item);

                if (!string.IsNullOrWhiteSpace(label))
                    seats.Add(label.Trim());
            }

            return seats
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static string? TryReadSeatLabel(JsonElement item)
        {
            if (item.ValueKind != JsonValueKind.Object)
                return null;

            if (item.TryGetProperty("seatLabel", out var seatLabel) ||
                item.TryGetProperty("SeatLabel", out seatLabel) ||
                item.TryGetProperty("label", out seatLabel) ||
                item.TryGetProperty("Label", out seatLabel))
            {
                return seatLabel.ValueKind == JsonValueKind.String ? seatLabel.GetString() : null;
            }

            return null;
        }

        private static List<string> BuildSeatLabels(string layoutType, int capacity)
        {
            capacity = Math.Clamp(capacity, 0, 80);
            if (capacity == 0)
                return new List<string>();

            if (layoutType == LayoutTwoFloors)
            {
                var firstFloorCount = (int)Math.Ceiling(capacity / 2d);
                var secondFloorCount = capacity - firstFloorCount;

                return Enumerable.Range(1, firstFloorCount)
                    .Select(index => $"A{index:00}")
                    .Concat(Enumerable.Range(1, secondFloorCount).Select(index => $"B{index:00}"))
                    .ToList();
            }

            var prefix = layoutType == LayoutLimousine ? "L" : "G";
            return Enumerable.Range(1, capacity)
                .Select(index => $"{prefix}{index:00}")
                .ToList();
        }

        private static JsonElement? ReadSeatLayout(string? seatLayout)
        {
            if (string.IsNullOrWhiteSpace(seatLayout))
                return null;

            try
            {
                return JsonSerializer.Deserialize<JsonElement>(seatLayout);
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static byte NormalizeStatus(string? status) => DomainCodes.ToTripStatusCode(status);

        private sealed record OperatorScope(User User, Operator Operator);

        private sealed class BusListItem
        {
            public int BusID { get; set; }
            public int OperatorID { get; set; }
            public string LicensePlate { get; set; } = string.Empty;
            public int Capacity { get; set; }
            public string BusType { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public string? Amenities { get; set; }
            public string? SeatLayoutType { get; set; }
            public string? SeatLayout { get; set; }
        }

        public class OperatorBusRequest
        {
            public string LicensePlate { get; set; } = string.Empty;
            public int Capacity { get; set; }
            public string BusType { get; set; } = string.Empty;
            public string? ImageUrl { get; set; }
            public string? Amenities { get; set; }
            public string? SeatLayoutType { get; set; }
            public string? SeatLayout { get; set; }
        }

        public class OperatorTripRequest
        {
            public int BusID { get; set; }
            public string DepartureLocation { get; set; } = string.Empty;
            public string ArrivalLocation { get; set; } = string.Empty;
            public DateTime DepartureTime { get; set; }
            public DateTime ArrivalTime { get; set; }
            public decimal Price { get; set; }
            public int AvailableSeats { get; set; }
            public string? Status { get; set; }
            public string? SeatLayoutType { get; set; }
            public string? SeatLayout { get; set; }
            public List<OperatorStopPointRequest>? StopPoints { get; set; }
        }

        public class OperatorStopPointRequest
        {
            public string StopName { get; set; } = string.Empty;
            public string? StopAddress { get; set; }
            public int StopOrder { get; set; }
            public int StopType { get; set; }
            public int? ArrivalOffset { get; set; }
        }

        public class CloneTripRequest
        {
            public string RepeatType { get; set; } = "day";
            public int Count { get; set; } = 1;
        }
    }
}
