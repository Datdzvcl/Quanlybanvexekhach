using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/operator-portal")]
    [ApiController]
    [Authorize(Roles = "Operator")]
    public class OperatorPortalController : ControllerBase
    {
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
                    scope.User.Role
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
                new { key = "Sleeper", name = "Xe giuong nam", suggestedCapacity = 34, description = "So do 2 tang, moi hang 4 giuong" },
                new { key = "Limousine", name = "Limousine", suggestedCapacity = 22, description = "So do phong/ghe rieng, rong hon xe thuong" },
                new { key = "Seater", name = "Ghe ngoi", suggestedCapacity = 45, description = "So do ghe ngoi 4 ghe moi hang" }
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
                    BusType = x.BusType
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
                    BusType = x.BusType
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

            var bus = new Bus
            {
                OperatorID = scope.Operator.OperatorID,
                LicensePlate = request.LicensePlate.Trim(),
                Capacity = request.Capacity,
                BusType = request.BusType.Trim()
            };

            _context.Buses.Add(bus);
            await _context.SaveChangesAsync();

            return Ok(ProjectBus(new BusListItem
            {
                BusID = bus.BusID,
                OperatorID = bus.OperatorID,
                LicensePlate = bus.LicensePlate,
                Capacity = bus.Capacity,
                BusType = bus.BusType
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

            await _context.SaveChangesAsync();

            return Ok(ProjectBus(new BusListItem
            {
                BusID = bus.BusID,
                OperatorID = bus.OperatorID,
                LicensePlate = bus.LicensePlate,
                Capacity = bus.Capacity,
                BusType = bus.BusType
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
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BusID == request.BusID && x.OperatorID == scope.Operator.OperatorID);

            if (bus == null)
                return BadRequest(new { message = "BusID khong thuoc nha xe hien tai" });

            var validation = ValidateTripRequest(request, bus.Capacity);
            if (validation != null)
                return validation;

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
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.BusID == request.BusID && x.OperatorID == scope.Operator.OperatorID);

            if (bus == null)
                return BadRequest(new { message = "BusID khong thuoc nha xe hien tai" });

            var validation = ValidateTripRequest(request, bus.Capacity);
            if (validation != null)
                return validation;

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
                    Status = "Scheduled"
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
            if (user == null || !string.Equals(user.Role, "Operator", StringComparison.OrdinalIgnoreCase))
                return null;

            var email = user.Email.Trim();
            var phone = user.Phone.Trim();
            var operatorInfo = await _context.Operators
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    (!string.IsNullOrWhiteSpace(email) && x.Email == email) ||
                    (!string.IsNullOrWhiteSpace(phone) && x.ContactPhone == phone));

            return operatorInfo == null ? null : new OperatorScope(user, operatorInfo);
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
                trip.Status,
                EstimatedDurationMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes)),
                BusType = trip.Bus?.BusType,
                LicensePlate = trip.Bus?.LicensePlate,
                Capacity = trip.Bus?.Capacity ?? 0,
                Amenities = BuildAmenities(trip.Bus?.BusType),
                BusImageUrl = BuildBusImageUrl(trip.Bus?.BusType)
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
                trip.Status,
                EstimatedDurationMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes)),
                Bus = trip.Bus == null ? null : ProjectBus(new BusListItem
                {
                    BusID = trip.Bus.BusID,
                    OperatorID = trip.Bus.OperatorID,
                    LicensePlate = trip.Bus.LicensePlate,
                    Capacity = trip.Bus.Capacity,
                    BusType = trip.Bus.BusType
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
            return new
            {
                bus.BusID,
                bus.OperatorID,
                bus.LicensePlate,
                bus.Capacity,
                bus.BusType,
                LayoutType = ResolveLayoutType(bus.BusType),
                Amenities = BuildAmenities(bus.BusType),
                ImageUrl = BuildBusImageUrl(bus.BusType),
                SeatMap = BuildSeatMap(bus.BusType, bus.Capacity)
            };
        }

        private static object BuildSeatMap(string? busType, int capacity)
        {
            var layoutType = ResolveLayoutType(busType);
            var seatsPerRow = layoutType == "Limousine" ? 3 : 4;
            var floors = layoutType == "Sleeper" ? 2 : 1;
            var labels = GenerateSeatLabels(capacity, layoutType);

            return new
            {
                layoutType,
                capacity,
                floors,
                seatsPerRow,
                rows = (int)Math.Ceiling(capacity / (double)seatsPerRow),
                seats = labels
            };
        }

        private static List<string> GenerateSeatLabels(int capacity, string layoutType)
        {
            var prefix = layoutType == "Limousine" ? "L" : layoutType == "Sleeper" ? "G" : "S";
            return Enumerable.Range(1, Math.Max(0, capacity))
                .Select(x => $"{prefix}{x:00}")
                .ToList();
        }

        private static string ResolveLayoutType(string? busType)
        {
            var value = (busType ?? string.Empty).ToLowerInvariant();
            if (value.Contains("limousine"))
                return "Limousine";

            if (value.Contains("giuong") || value.Contains("giường") || value.Contains("cabin"))
                return "Sleeper";

            return "Seater";
        }

        private static List<string> BuildAmenities(string? busType)
        {
            var layoutType = ResolveLayoutType(busType);
            var amenities = new List<string> { "Wifi", "Nuoc uong", "Cong sac" };

            if (layoutType == "Limousine")
                amenities.AddRange(new[] { "Man hinh rieng", "Ghe massage" });

            if (layoutType == "Sleeper")
                amenities.AddRange(new[] { "Chan goi", "Rèm rieng tu" });

            return amenities;
        }

        private static string BuildBusImageUrl(string? busType)
        {
            var layoutType = ResolveLayoutType(busType);
            return layoutType switch
            {
                "Limousine" => "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
                "Sleeper" => "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=900&q=80",
                _ => "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&w=900&q=80"
            };
        }

        private static string NormalizeStatus(string? status)
        {
            var value = (status ?? string.Empty).Trim();
            return value.ToLowerInvariant() switch
            {
                "active" => "Scheduled",
                "scheduled" => "Scheduled",
                "on-going" => "On-going",
                "ongoing" => "On-going",
                "completed" => "Completed",
                "cancelled" => "Cancelled",
                "canceled" => "Cancelled",
                _ => "Scheduled"
            };
        }

        private sealed record OperatorScope(User User, Operator Operator);

        private sealed class BusListItem
        {
            public int BusID { get; set; }
            public int OperatorID { get; set; }
            public string LicensePlate { get; set; } = string.Empty;
            public int Capacity { get; set; }
            public string BusType { get; set; } = string.Empty;
        }

        public class OperatorBusRequest
        {
            public string LicensePlate { get; set; } = string.Empty;
            public int Capacity { get; set; }
            public string BusType { get; set; } = string.Empty;
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
