// using Microsoft.AspNetCore.Mvc;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.EntityFrameworkCore;
// using BaseCore.Entities;
// using BaseCore.Repository;
// using BaseCore.Common;
// using System.Security.Claims;
// namespace BaseCore.APIService.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     public class TripsController : ControllerBase
//     {
//         private readonly MySqlDbContext _context;

//         public TripsController(MySqlDbContext context)
//         {
//             _context = context;
//         }
//         private async Task<int?> GetCurrentOperatorId()
//         {
//             if (!User.IsInRole("Operator")) return null;
//             var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
//             if (!int.TryParse(userIdClaim, out var userId)) return null;
//             var user = await _context.Users.AsNoTracking()
//                 .FirstOrDefaultAsync(x => x.UserID == userId);
//             return user?.OperatorID;
//         }
//         // GET /api/trips?page=1&pageSize=20
//         [HttpGet]
//         public async Task<IActionResult> GetAll(
//             [FromQuery] int page     = 1,
//             [FromQuery] int pageSize = 20)
//         {
//             pageSize = Math.Clamp(pageSize, 1, 100);
//             page     = Math.Max(page, 1);

//             var query = _context.Trips
//                 .Include(x => x.Bus).ThenInclude(x => x.Operator)
//                 .OrderBy(x => x.DepartureTime);

//             var total = await query.CountAsync();

//             var trips = await query
//                 .Skip((page - 1) * pageSize)
//                 .Take(pageSize)
//                 .Select(x => new
//                 {
//                     x.TripID,
//                     x.BusID,
//                     x.DepartureLocation,
//                     x.ArrivalLocation,
//                     x.DepartureTime,
//                     x.ArrivalTime,
//                     x.Price,
//                     x.AvailableSeats,
//                     x.Status,
//                     BusType      = x.Bus != null ? x.Bus.BusType      : null,
//                     OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
//                     AverageRating = x.Bus == null
//                         ? 0
//                         : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                             ? Math.Round(_context.Reviews
//                                 .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                                 .Average(r => r.Rating), 1)
//                             : 0),
// //                             namespace BaseCore.Entities
// // {
// //     public class Review
// //     {
// //         public int ReviewID { get; set; }
// //         public int BookingID { get; set; }
// //         public int UserID { get; set; }
// //         // public int TripID { get; set; }
// //         public byte Rating { get; set; }
// //         public string? Comment { get; set; }
// //         public DateTime? CreatedAt { get; set; }

// //         public Booking? Booking { get; set; }
// //         public User? User { get; set; }
// //         // public Trip? Trip { get; set; }
// //     }
// // }

//                     ReviewCount = x.Bus == null
//                         ? 0
//                         : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                 })
//                 .ToListAsync();

//             return Ok(new
//             {
//                 data       = trips,
//                 page,
//                 pageSize,
//                 total,
//                 totalPages = (int)Math.Ceiling((double)total / pageSize)
//             });
//         }

//         [HttpGet("admin")]
//         [Authorize(Roles = "Operator")]
//         public async Task<IActionResult> GetAdminTrips(
//             [FromQuery] string? departureLocation,
//             [FromQuery] string? arrivalLocation,
//             [FromQuery] DateTime? departureDate,
//             [FromQuery] int? operatorId,
//             [FromQuery] string? status,
//             [FromQuery] int page = 1,
//             [FromQuery] int pageSize = 10)
//         {
//             page = Math.Max(page, 1);
//             pageSize = Math.Clamp(pageSize, 1, 100);

//             var query = _context.Trips
//                 .AsNoTracking()
//                 .Include(x => x.Bus).ThenInclude(x => x.Operator)
//                 .AsQueryable();

//             if (!string.IsNullOrWhiteSpace(departureLocation))
//             {
//                 var keyword = departureLocation.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.DepartureLocation, $"%{keyword}%"));
//             }

//             if (!string.IsNullOrWhiteSpace(arrivalLocation))
//             {
//                 var keyword = arrivalLocation.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.ArrivalLocation, $"%{keyword}%"));
//             }

//             if (departureDate.HasValue)
//             {
//                 var start = departureDate.Value.Date;
//                 var end = start.AddDays(1);
//                 query = query.Where(x => x.DepartureTime >= start && x.DepartureTime < end);
//             }

//             if (operatorId.HasValue)
//                 query = query.Where(x => x.Bus != null && x.Bus.OperatorID == operatorId.Value);

//             // if (!string.IsNullOrWhiteSpace(status))
//             // {
//             //     var normalizedStatus = NormalizeStatus(status);
//             //     query = query.Where(x => x.Status == normalizedStatus);
//             // }
//             if (!string.IsNullOrWhiteSpace(status))
// {
//                 var statusByte = status.Trim().ToLowerInvariant() switch
//                 {
//                     "active"    => TripStatusConstant.Scheduled,
//                     "scheduled" => TripStatusConstant.Scheduled,
//                     "on-going"  => TripStatusConstant.Ongoing,
//                     "ongoing"   => TripStatusConstant.Ongoing,
//                     "completed" => TripStatusConstant.Completed,
//                     "cancelled" => TripStatusConstant.Cancelled,
//                     "canceled"  => TripStatusConstant.Cancelled,
//                     _           => TripStatusConstant.Scheduled
//                 };
//                 query = query.Where(x => x.Status == statusByte);
//             }
//             var totalCount = await query.CountAsync();
//             var items = await query
//                 .OrderByDescending(x => x.DepartureTime)
//                 .Skip((page - 1) * pageSize)
//                 .Take(pageSize)
//                 .Select(x => new
//                 {
//                     x.TripID,
//                     x.BusID,
//                     x.DepartureLocation,
//                     x.ArrivalLocation,
//                     x.DepartureTime,
//                     x.ArrivalTime,
//                     x.Price,
//                     x.AvailableSeats,
//                     x.Status,
//                     BusType = x.Bus != null ? x.Bus.BusType : null,
//                     LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
//                     OperatorID = x.Bus != null ? x.Bus.OperatorID : (int?)null,
//                     OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
//                     AverageRating = x.Bus == null
//                         ? 0
//                         : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                             ? Math.Round(_context.Reviews
//                                 .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                                 .Average(r => r.Rating), 1)
//                             : 0),
//                     ReviewCount = x.Bus == null
//                         ? 0
//                         : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                 })
//                 .ToListAsync();

//             return Ok(new
//             {
//                 items,
//                 totalCount,
//                 page,
//                 pageSize,
//                 totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
//             });
//         }

//         [HttpGet("{id}")]
//         [AllowAnonymous]
//         public async Task<IActionResult> GetById(int id)
//         {
//             var trip = await _context.Trips
//                 .AsNoTracking()
//                 .Include(x => x.Bus).ThenInclude(x => x.Operator)
//                 .Where(x => x.TripID == id)
//                 .Select(x => new
//                 {
//                     x.TripID,
//                     x.BusID,
//                     x.DepartureLocation,
//                     x.ArrivalLocation,
//                     x.DepartureTime,
//                     x.ArrivalTime,
//                     x.Price,
//                     x.AvailableSeats,
//                     x.Status,
//                     Capacity = x.Bus != null ? x.Bus.Capacity : 0,
//                     BusType = x.Bus != null ? x.Bus.BusType : null,
//                     LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
//                     OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
//                     OperatorImageUrl = (string?)null,
//                     Bus = x.Bus == null ? null : new
//                     {
//                         x.Bus.BusID,
//                         x.Bus.OperatorID,
//                         x.Bus.LicensePlate,
//                         x.Bus.Capacity,
//                         x.Bus.BusType
//                     },
//                     Operator = x.Bus == null || x.Bus.Operator == null ? null : new
//                     {
//                         x.Bus.Operator.OperatorID,
//                         x.Bus.Operator.Name,
//                         x.Bus.Operator.Description,
//                         x.Bus.Operator.ContactPhone,
//                         x.Bus.Operator.Email,
//                         ImageUrl = (string?)null
//                     }
//                 })
//                 .FirstOrDefaultAsync();

//             if (trip == null)
//                 return NotFound();

//             return Ok(trip);
//         }

//         [HttpGet("{id}/stops")]
//         public async Task<IActionResult> GetStops(int id)
//         {
//             var trip = await _context.Trips.AsNoTracking().FirstOrDefaultAsync(x => x.TripID == id);
//             if (trip == null)
//                 return NotFound(new { message = "Không tìm thấy chuyến xe" });

//             var hasActiveStops = await _context.StopPoints.AnyAsync(x => x.TripID == id && x.IsActive);
//             if (!hasActiveStops)
//             {
//                 AddDefaultStopPoints(trip);
//                 await _context.SaveChangesAsync();
//             }

//             var stops = await _context.StopPoints
//                 .AsNoTracking()
//                 .Where(x => x.TripID == id && x.IsActive)
//                 .OrderBy(x => x.StopOrder)
//                 .Select(x => new
//                 {
//                     stopPointID = x.StopPointID,
//                     tripID = x.TripID,
//                     stopName = x.StopName,
//                     stopAddress = x.StopAddress,
//                     stopOrder = x.StopOrder,
//                     stopType = x.StopType,
//                     arrivalOffset = x.ArrivalOffset
//                 })
//                 .ToListAsync();

//             return Ok(new
//             {
//                 pickupStops = stops.Where(x => x.stopType == 1 || x.stopType == 3).ToList(),
//                 dropoffStops = stops.Where(x => x.stopType == 2 || x.stopType == 3).ToList(),
//                 items = stops
//             });
//         }

//         [HttpGet("{id}/bookings")]
//         [Authorize(Roles = "Operator")] 
//         public async Task<IActionResult> GetTripBookings(
//             int id,
//             // [FromQuery] string? bookingStatus,
//             // [FromQuery] string? paymentStatus
//             [FromQuery] byte? bookingStatus)
//         {
//             var tripExists = await _context.Trips.AsNoTracking().AnyAsync(x => x.TripID == id);
//             if (!tripExists)
//                 return NotFound(new { message = "Không tìm thấy chuyến xe" });

//             var query = _context.Bookings
//                 .AsNoTracking()
//                 .Where(x => x.TripID == id);

//             // if (!string.IsNullOrWhiteSpace(bookingStatus))
//             // {
//             //     var keyword = bookingStatus.Trim();
//             //     query = query.Where(x => x.BookingStatus == keyword);
//             // }

//             // if (!string.IsNullOrWhiteSpace(paymentStatus))
//             // {
//             //     var keyword = paymentStatus.Trim();
//             //     query = query.Where(x => x.PaymentStatus == keyword);
//             // }
//             if (bookingStatus.HasValue)
//             {
//                 query = query.Where(x => x.BookingStatus == bookingStatus.Value);
//             }
//             var bookings = await query
//                 .OrderByDescending(x => x.BookingDate)
//                 .Select(x => new
//                 {
//                     // bookingID = x.BookingID,
//                     // customerName = x.CustomerName,
//                     // customerPhone = x.CustomerPhone,
//                     // totalSeats = x.TotalSeats,
//                     // totalPrice = x.TotalPrice,
//                     // paymentStatus = x.PaymentStatus,
//                     // bookingStatus = x.BookingStatus ?? "PendingConfirm",
//                     // bookingDate = x.BookingDate
//                     bookingID     = x.BookingID,
//                     customerName  = x.CustomerName,
//                     customerPhone = x.CustomerPhone,
//                     totalSeats    = x.TotalSeats,
//                     totalPrice    = x.TotalPrice,
//                     bookingStatus = x.BookingStatus,
//                     bookingDate   = x.BookingDate
//                 })
//                 .ToListAsync();

//             return Ok(bookings);
//         }

//         // GET /api/trips/search?from=HN&to=DN&departureDate=2026-05-20&page=1&pageSize=10
//         [HttpGet("search")]
//         public async Task<IActionResult> Search(
//             [FromQuery] string? from,
//             [FromQuery] string? to,
//             [FromQuery] DateTime? departureDate,
//             [FromQuery] DateTime? returnDate,
//             [FromQuery] string? busType,
//             [FromQuery] int? operatorId,
//             [FromQuery] decimal? minPrice,
//             [FromQuery] decimal? maxPrice,
//             [FromQuery] string? departureTimeRange,
//             [FromQuery] string? arrivalTimeRange,
//             [FromQuery] int? pickupStopId,
//             [FromQuery] int? dropoffStopId,
//             [FromQuery] string? sortBy,
//             [FromQuery] int page = 1,
//             [FromQuery] int pageSize = 10,
//             [FromQuery] DateTime? date = null)
//         {
//             pageSize = Math.Clamp(pageSize, 1, 100);
//             page = Math.Max(page, 1);
//             departureDate ??= date;

//             var query = _context.Trips
//                 .AsNoTracking()
//                 .Include(x => x.Bus).ThenInclude(x => x.Operator)
//                 .Where(x =>
//                     x.AvailableSeats > 0 &&
//                     x.DepartureTime >= DateTime.Now &&
//                     x.Status != BookingStatusConstant.Cancelled &&
//                     x.Status != BookingStatusConstant.Completed);

//             if (!string.IsNullOrWhiteSpace(from))
//             {
//                 var fromKeyword = from.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.DepartureLocation, $"%{fromKeyword}%"));
//             }

//             if (!string.IsNullOrWhiteSpace(to))
//             {
//                 var toKeyword = to.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.ArrivalLocation, $"%{toKeyword}%"));
//             }

//             if (departureDate.HasValue)
//             {
//                 var startDate = departureDate.Value.Date;
//                 var endDate = startDate.AddDays(1);
//                 query = query.Where(x => x.DepartureTime >= startDate && x.DepartureTime < endDate);
//             }

//             if (!string.IsNullOrWhiteSpace(busType))
//             {
//                 var busTypeKeyword = busType.Trim();
//                 query = query.Where(x => x.Bus != null && EF.Functions.Like(x.Bus.BusType, $"%{busTypeKeyword}%"));
//             }

//             if (operatorId.HasValue)
//                 query = query.Where(x => x.Bus != null && x.Bus.OperatorID == operatorId.Value);

//             if (minPrice.HasValue)
//                 query = query.Where(x => x.Price >= minPrice.Value);

//             if (maxPrice.HasValue)
//                 query = query.Where(x => x.Price <= maxPrice.Value);

//             if (TryParseTimeRange(departureTimeRange, out var departureStart, out var departureEnd))
//                 query = query.Where(x => x.DepartureTime.TimeOfDay >= departureStart && x.DepartureTime.TimeOfDay <= departureEnd);

//             if (TryParseTimeRange(arrivalTimeRange, out var arrivalStart, out var arrivalEnd))
//                 query = query.Where(x => x.ArrivalTime.TimeOfDay >= arrivalStart && x.ArrivalTime.TimeOfDay <= arrivalEnd);

//             if (pickupStopId.HasValue)
//                 query = query.Where(x => x.StopPoints.Any(s => s.StopPointID == pickupStopId.Value && s.IsActive));

//             if (dropoffStopId.HasValue)
//                 query = query.Where(x => x.StopPoints.Any(s => s.StopPointID == dropoffStopId.Value && s.IsActive));

//             var total = await query.CountAsync();
//             query = ApplySearchSort(query, sortBy);

//             var trips = await query
//                 .Skip((page - 1) * pageSize)
//                 .Take(pageSize)
//                 .Select(x => new
//                 {
//                     tripID = x.TripID,
//                     busID = x.BusID,
//                     operatorID = x.Bus != null ? x.Bus.OperatorID : (int?)null,
//                     operatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
//                     operatorImageUrl = (string?)null,
//                     busType = x.Bus != null ? x.Bus.BusType : null,
//                     licensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
//                     departureLocation = x.DepartureLocation,
//                     arrivalLocation = x.ArrivalLocation,
//                     departureTime = x.DepartureTime,
//                     arrivalTime = x.ArrivalTime,
//                     price = x.Price,
//                     availableSeats = x.AvailableSeats,
//                     status = x.Status,
//                     averageRating = x.Bus == null
//                         ? 0
//                         : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                             ? Math.Round(_context.Reviews
//                                 .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                                 .Average(r => r.Rating), 1)
//                             : 0),
//                     reviewCount = x.Bus == null
//                         ? 0
//                         : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                 })
//                 .ToListAsync();

//             return Ok(new
//             {
//                 items = trips,
//                 totalCount = total,
//                 page,
//                 pageSize,
//                 totalPages = (int)Math.Ceiling((double)total / pageSize)
//             });
//         }

//         [HttpPost]
//         [Authorize(Roles = "Operator")] 
//         public async Task<IActionResult> Create(Trip trip)
//         {
//             var validationResult = await ValidateTripRequest(trip);
//             if (validationResult != null)
//                 return validationResult;

//             var bus = await _context.Buses.AsNoTracking().FirstAsync(x => x.BusID == trip.BusID);
//             if (trip.AvailableSeats <= 0)
//                 trip.AvailableSeats = bus.Capacity;

//             trip.Status = TripStatusConstant.Scheduled;
//             _context.Trips.Add(trip);
//             await _context.SaveChangesAsync();

//             AddDefaultStopPoints(trip);
//             await _context.SaveChangesAsync();

//             return Ok(await BuildTripResponse(trip.TripID));
//         }

//         [HttpPut("{id}")]
//         [Authorize(Roles = "Operator")] 
//         public async Task<IActionResult> Update(int id, Trip trip)
//         {
//             if (id != trip.TripID)
//                 return BadRequest("ID không khớp");

//             var validationResult = await ValidateTripRequest(trip);
//             if (validationResult != null)
//                 return validationResult;

//             var currentTrip = await _context.Trips
//                 .AsNoTracking()
//                 .FirstOrDefaultAsync(x => x.TripID == id);
//             if (currentTrip == null)
//                 return NotFound();

//             // trip.Status = NormalizeStatus(trip.Status);
//             _context.Entry(trip).State = EntityState.Modified;

//             var timeChanged = currentTrip.DepartureTime != trip.DepartureTime 
//                || currentTrip.ArrivalTime != trip.ArrivalTime;

//             // Thay string.Equals bằng so sánh byte
//             var cancelled = currentTrip.Status != TripStatusConstant.Cancelled
//              && trip.Status == TripStatusConstant.Cancelled;

//             if (timeChanged || cancelled)
//             {
//                 var userIds = await _context.Bookings
//                     .Where(x => x.TripID == id && x.UserID.HasValue)
//                     .Select(x => x.UserID)
//                     .Distinct()
//                     .ToListAsync();

//                 foreach (var userId in userIds)
//                 {
//                     NotificationsController.AddNotification(
//                         _context,
//                         userId,
//                         cancelled ? "Chuyến xe đã bị hủy" : "Chuyến xe thay đổi thời gian",
//                         cancelled
//                             ? $"Chuyến {trip.DepartureLocation} - {trip.ArrivalLocation} đã bị hủy. Vui lòng kiểm tra vé của bạn."
//                             : $"Chuyến {trip.DepartureLocation} - {trip.ArrivalLocation} đã thay đổi thời gian khởi hành.",
//                         2);
//                 }
//             }

//             await _context.SaveChangesAsync();

//             var hasActiveStops = await _context.StopPoints
//                 .AnyAsync(x => x.TripID == id && x.IsActive);
//             if (!hasActiveStops)
//             {
//                 AddDefaultStopPoints(trip);
//                 await _context.SaveChangesAsync();
//             }

//             return Ok(await BuildTripResponse(id));
//         }

//         [HttpDelete("{id}")]
//         [Authorize(Roles = "Operator")] 
//         public async Task<IActionResult> Delete(int id)
//         {
//             var trip = await _context.Trips.FindAsync(id);
//             if (trip == null) return NotFound();

//             var hasBookings = await _context.Bookings.AnyAsync(x => x.TripID == id);
//             if (hasBookings)
//                 return Conflict(new { message = "Không thể xóa chuyến đã có booking" });

//             _context.Trips.Remove(trip);
//             await _context.SaveChangesAsync();
//             return Ok();
//         }

//         [HttpGet("locations")]
//         public async Task<IActionResult> GetLocations()
//         {
//             var departures = await _context.Trips.Select(x => x.DepartureLocation).Distinct().ToListAsync();
//             var arrivals   = await _context.Trips.Select(x => x.ArrivalLocation).Distinct().ToListAsync();
//             var all        = departures.Union(arrivals)
//                 .Where(x => !string.IsNullOrEmpty(x))
//                 .OrderBy(x => x)
//                 .ToList();
//             return Ok(all);
//         }

//         // private static string NormalizeStatus(string? status)
//         // {
//         //     var value = (status ?? string.Empty).Trim();
//         //     return value.ToLowerInvariant() switch
//         //     {
//         //         "active"    => "Scheduled",
//         //         "scheduled" => "Scheduled",
//         //         "on-going"  => "On-going",
//         //         "ongoing"   => "On-going",
//         //         "completed" => "Completed",
//         //         "cancelled" => "Cancelled",
//         //         "canceled"  => "Cancelled",
//         //         _           => "Scheduled"
//         //     };
//         // }

//         private async Task<IActionResult?> ValidateTripRequest(Trip trip)
//         {
//             var bus = await _context.Buses
//                 .AsNoTracking()
//                 .FirstOrDefaultAsync(x => x.BusID == trip.BusID);

//             if (bus == null)
//                 return BadRequest(new { message = "BusID không tồn tại" });

//             if (trip.DepartureTime >= trip.ArrivalTime)
//                 return BadRequest(new { message = "DepartureTime phải nhỏ hơn ArrivalTime" });

//             if (trip.Price <= 0)
//                 return BadRequest(new { message = "Price phải lớn hơn 0" });

//             if (trip.AvailableSeats < 0)
//                 return BadRequest(new { message = "AvailableSeats không được âm" });

//             if (trip.AvailableSeats > bus.Capacity)
//                 return BadRequest(new { message = "AvailableSeats không được lớn hơn Capacity của xe" });

//             return null;
//         }

//         private async Task<object?> BuildTripResponse(int tripId)
//         {
//             return await _context.Trips
//                 .AsNoTracking()
//                 .Include(x => x.Bus).ThenInclude(x => x.Operator)
//                 .Where(x => x.TripID == tripId)
//                 .Select(x => new
//                 {
//                     x.TripID,
//                     x.BusID,
//                     x.DepartureLocation,
//                     x.ArrivalLocation,
//                     x.DepartureTime,
//                     x.ArrivalTime,
//                     x.Price,
//                     x.AvailableSeats,
//                     x.Status,
//                     BusType = x.Bus != null ? x.Bus.BusType : null,
//                     LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
//                     OperatorID = x.Bus != null ? x.Bus.OperatorID : (int?)null,
//                     OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
//                     AverageRating = x.Bus == null
//                         ? 0
//                         : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                             ? Math.Round(_context.Reviews
//                                 .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                                 .Average(r => r.Rating), 1)
//                             : 0),
//                     ReviewCount = x.Bus == null
//                         ? 0
//                         : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
//                 })
//                 .FirstOrDefaultAsync();
//         }

//         private void AddDefaultStopPoints(Trip trip)
//         {
//             var totalMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes));
//             var middleOffset = totalMinutes > 0 ? Math.Max(1, totalMinutes / 2) : 0;

//             _context.StopPoints.AddRange(
//                 new StopPoint
//                 {
//                     TripID = trip.TripID,
//                     StopName = $"Bến xe {trip.DepartureLocation}",
//                     StopAddress = $"Trung tâm {trip.DepartureLocation}",
//                     StopOrder = 1,
//                     StopType = 1,
//                     ArrivalOffset = 0,
//                     IsActive = true
//                 },
//                 new StopPoint
//                 {
//                     TripID = trip.TripID,
//                     StopName = $"Trạm dừng giữa tuyến {trip.DepartureLocation} - {trip.ArrivalLocation}",
//                     StopAddress = $"Quốc lộ chính tuyến {trip.DepartureLocation} - {trip.ArrivalLocation}",
//                     StopOrder = 2,
//                     StopType = 3,
//                     ArrivalOffset = middleOffset,
//                     IsActive = true
//                 },
//                 new StopPoint
//                 {
//                     TripID = trip.TripID,
//                     StopName = $"Bến xe {trip.ArrivalLocation}",
//                     StopAddress = $"Trung tâm {trip.ArrivalLocation}",
//                     StopOrder = 3,
//                     StopType = 2,
//                     ArrivalOffset = totalMinutes,
//                     IsActive = true
//                 }
//             );
//         }

//         private static IQueryable<Trip> ApplySearchSort(IQueryable<Trip> query, string? sortBy)
//         {
//             return (sortBy ?? string.Empty).Trim().ToLowerInvariant() switch
//             {
//                 "price_asc" => query
//                     .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
//                     .ThenBy(x => x.Price)
//                     .ThenBy(x => x.DepartureTime),
//                 "price_desc" => query
//                     .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
//                     .ThenByDescending(x => x.Price)
//                     .ThenBy(x => x.DepartureTime),
//                 "departure_desc" => query
//                     .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
//                     .ThenByDescending(x => x.DepartureTime),
//                 _ => query
//                     .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
//                     .ThenBy(x => x.DepartureTime)
//             };
//         }

//         private static bool TryParseTimeRange(string? value, out TimeSpan start, out TimeSpan end)
//         {
//             start = TimeSpan.Zero;
//             end = TimeSpan.Zero;

//             if (string.IsNullOrWhiteSpace(value))
//                 return false;

//             var parts = value.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
//             if (parts.Length != 2)
//                 return false;

//             return TimeSpan.TryParse(parts[0], out start) &&
//                    TimeSpan.TryParse(parts[1], out end) &&
//                    start <= end;
//         }
//     }
// }
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Common;
using System.Security.Claims;

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

        // ─────────────────────────────────────────────
        // HELPER: lấy OperatorID của user đang đăng nhập
        // Trả về null nếu không phải Operator
        // ─────────────────────────────────────────────
        private async Task<int?> GetCurrentOperatorId()
        {
            if (!User.IsInRole("Operator")) return null;
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }

        // ─────────────────────────────────────────────
        // GET /api/trips?page=1&pageSize=20
        // Public — dùng cho trang khách hàng (không cần đăng nhập)
        // ─────────────────────────────────────────────
        [HttpGet]
        [AllowAnonymous]
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
                    BusType      = x.Bus != null ? x.Bus.BusType : null,
                    Amenities    = x.Bus != null ? x.Bus.Amenities : null,
                    OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
                    AverageRating = x.Bus == null ? 0
                        : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                            ? Math.Round(_context.Reviews
                                .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                                .Average(r => r.Rating), 1)
                            : 0),
                    ReviewCount = x.Bus == null ? 0
                        : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
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

        // ─────────────────────────────────────────────
        // GET /api/trips/admin  — Quản lý chuyến xe
        // Admin   → thấy TẤT CẢ, có thể filter theo operatorId
        // Operator → chỉ thấy chuyến của NHÀ XE MÌNH, bỏ qua param operatorId
        // ─────────────────────────────────────────────
        [HttpGet("admin")]
        [Authorize(Roles = "Admin,Operator")]           // ✅ cả hai role
        public async Task<IActionResult> GetAdminTrips(
            [FromQuery] string?   departureLocation,
            [FromQuery] string?   arrivalLocation,
            [FromQuery] DateTime? departureDate,
            [FromQuery] int?      operatorId,           // Admin mới dùng được param này
            [FromQuery] string?   status,
            [FromQuery] decimal?  minPrice,
            [FromQuery] decimal?  maxPrice,
            [FromQuery] int       page     = 1,
            [FromQuery] int       pageSize = 10)
        {
            page     = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .Include(x => x.Driver)
                .AsQueryable();

            // ✅ Operator bắt buộc chỉ thấy chuyến của mình
            var currentOperatorId = await GetCurrentOperatorId();
            if (currentOperatorId.HasValue)
            {
                // Nhà xe — ép filter, bỏ qua operatorId từ query
                query = query.Where(x => x.Bus != null && x.Bus.OperatorID == currentOperatorId.Value);
            }
            else if (User.IsInRole("Admin") && operatorId.HasValue)
            {
                // Admin muốn lọc theo một nhà xe cụ thể
                query = query.Where(x => x.Bus != null && x.Bus.OperatorID == operatorId.Value);
            }

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
                var end   = start.AddDays(1);
                query = query.Where(x => x.DepartureTime >= start && x.DepartureTime < end);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var key = status.Trim().ToLowerInvariant();
                if (key == "on-going" || key == "ongoing")
                {
                    var now = DateTime.Now;
                    query = query.Where(x =>
                        x.Status == TripStatusConstant.Ongoing ||
                        (x.Status == TripStatusConstant.Scheduled &&
                         x.DepartureTime <= now && x.ArrivalTime >= now));
                }
                else
                {
                    var statusByte = key switch
                    {
                        "active"    => TripStatusConstant.Scheduled,
                        "scheduled" => TripStatusConstant.Scheduled,
                        "completed" => TripStatusConstant.Completed,
                        "cancelled" => TripStatusConstant.Cancelled,
                        "canceled"  => TripStatusConstant.Cancelled,
                        _           => TripStatusConstant.Scheduled
                    };
                    query = query.Where(x => x.Status == statusByte);
                }
            }

            if (minPrice.HasValue)
                query = query.Where(x => x.Price >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(x => x.Price <= maxPrice.Value);

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
                    x.DriverID,
                    DriverName = x.Driver != null ? x.Driver.FullName : null,
                    BusType      = x.Bus != null ? x.Bus.BusType      : null,
                    Amenities    = x.Bus != null ? x.Bus.Amenities    : null,
                    LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
                    OperatorID   = x.Bus != null ? x.Bus.OperatorID   : (int?)null,
                    OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
                    AverageRating = x.Bus == null ? 0
                        : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                            ? Math.Round(_context.Reviews
                                .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                                .Average(r => r.Rating), 1)
                            : 0),
                    ReviewCount = x.Bus == null ? 0
                        : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
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

        // ─────────────────────────────────────────────
        // GET /api/trips/{id}  — Public
        // ─────────────────────────────────────────────
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
                    Capacity         = x.Bus != null ? x.Bus.Capacity      : 0,
                    BusType          = x.Bus != null ? x.Bus.BusType        : null,
                    Amenities        = x.Bus != null ? x.Bus.Amenities      : null,
                    LicensePlate     = x.Bus != null ? x.Bus.LicensePlate   : null,
                    OperatorName     = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
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

            if (trip == null) return NotFound();
            return Ok(trip);
        }

        // ─────────────────────────────────────────────
        // GET /api/trips/{id}/stops  — Public
        // ─────────────────────────────────────────────
        [HttpGet("{id}/stops")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStops(int id)
        {
            var trip = await _context.Trips.AsNoTracking().FirstOrDefaultAsync(x => x.TripID == id);
            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var hasActiveStops = await _context.StopPoints.AnyAsync(x => x.TripID == id && x.IsActive);
            if (!hasActiveStops)
            {
                AddDefaultStopPoints(trip);
                await _context.SaveChangesAsync();
            }

            var stops = await _context.StopPoints
                .AsNoTracking()
                .Where(x => x.TripID == id && x.IsActive)
                .OrderBy(x => x.StopOrder)
                .Select(x => new
                {
                    stopPointID   = x.StopPointID,
                    tripID        = x.TripID,
                    stopName      = x.StopName,
                    stopAddress   = x.StopAddress,
                    stopOrder     = x.StopOrder,
                    stopType      = x.StopType,
                    arrivalOffset = x.ArrivalOffset
                })
                .ToListAsync();

            return Ok(new
            {
                pickupStops  = stops.Where(x => x.stopType == 1 || x.stopType == 3).ToList(),
                dropoffStops = stops.Where(x => x.stopType == 2 || x.stopType == 3).ToList(),
                items        = stops
            });
        }

        // ─────────────────────────────────────────────
        // GET /api/trips/{id}/bookings  — Quản lý đơn đặt vé
        // Admin   → xem booking của bất kỳ chuyến nào
        // Operator → chỉ xem booking của chuyến thuộc nhà xe mình
        // ─────────────────────────────────────────────
        [HttpGet("{id}/bookings")]
        [Authorize(Roles = "Admin,Operator")]            // ✅ cả hai role
        public async Task<IActionResult> GetTripBookings(
            int id,
            [FromQuery] byte? bookingStatus)
        {
            var trip = await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus)
                .FirstOrDefaultAsync(x => x.TripID == id);

            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            // ✅ Operator chỉ xem được booking của chuyến thuộc nhà xe mình
            var currentOperatorId = await GetCurrentOperatorId();
            if (currentOperatorId.HasValue && trip.Bus?.OperatorID != currentOperatorId.Value)
                return Forbid();

            var query = _context.Bookings
                .AsNoTracking()
                .Where(x => x.TripID == id);

            if (bookingStatus.HasValue)
                query = query.Where(x => x.BookingStatus == bookingStatus.Value);

            var bookings = await query
                .OrderByDescending(x => x.BookingDate)
                .Select(x => new
                {
                    bookingID     = x.BookingID,
                    customerName  = x.CustomerName,
                    customerPhone = x.CustomerPhone,
                    totalSeats    = x.TotalSeats,
                    totalPrice    = x.TotalPrice,
                    bookingStatus = x.BookingStatus,
                    bookingDate   = x.BookingDate
                })
                .ToListAsync();

            return Ok(bookings);
        }

        // ─────────────────────────────────────────────
        // GET /api/trips/search  — Public
        // ─────────────────────────────────────────────
        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search(
            [FromQuery] string?   from,
            [FromQuery] string?   to,
            [FromQuery] DateTime? departureDate,
            [FromQuery] DateTime? returnDate,
            [FromQuery] string?   busType,
            [FromQuery] int?      operatorId,
            [FromQuery] string?   operatorIds,
            [FromQuery] decimal?  minPrice,
            [FromQuery] decimal?  maxPrice,
            [FromQuery] string?   departureTimeRange,
            [FromQuery] string?   arrivalTimeRange,
            [FromQuery] int?      pickupStopId,
            [FromQuery] int?      dropoffStopId,
            [FromQuery] string?   sortBy,
            [FromQuery] int       page     = 1,
            [FromQuery] int       pageSize = 10,
            [FromQuery] DateTime? date     = null)
        {
            pageSize      = Math.Clamp(pageSize, 1, 100);
            page          = Math.Max(page, 1);
            departureDate ??= date;

            var query = _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .Where(x =>
                    x.AvailableSeats > 0 &&
                    x.DepartureTime >= DateTime.Now &&
                    x.Status != BookingStatusConstant.Cancelled &&
                    x.Status != BookingStatusConstant.Completed);

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
                var endDate   = startDate.AddDays(1);
                query = query.Where(x => x.DepartureTime >= startDate && x.DepartureTime < endDate);
            }

            if (!string.IsNullOrWhiteSpace(busType))
            {
                var busTypeKeyword = busType.Trim();
                query = query.Where(x => x.Bus != null && EF.Functions.Like(x.Bus.BusType, $"%{busTypeKeyword}%"));
            }

            // Lọc theo nhiều nhà xe (operatorIds=1,2,3) hoặc đơn (operatorId=1)
            var opIds = new List<int>();
            if (!string.IsNullOrWhiteSpace(operatorIds))
                opIds.AddRange(operatorIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => int.TryParse(s.Trim(), out var n) ? n : 0).Where(n => n > 0));
            if (operatorId.HasValue && !opIds.Contains(operatorId.Value))
                opIds.Add(operatorId.Value);
            if (opIds.Count > 0)
                query = query.Where(x => x.Bus != null && opIds.Contains(x.Bus.OperatorID));

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
                    tripID            = x.TripID,
                    busID             = x.BusID,
                    operatorID        = x.Bus != null ? x.Bus.OperatorID : (int?)null,
                    operatorName      = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
                    operatorImageUrl  = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.LogoUrl : null,
                    busType           = x.Bus != null ? x.Bus.BusType      : null,
                    licensePlate      = x.Bus != null ? x.Bus.LicensePlate : null,
                    departureLocation = x.DepartureLocation,
                    arrivalLocation   = x.ArrivalLocation,
                    departureTime     = x.DepartureTime,
                    arrivalTime       = x.ArrivalTime,
                    price             = x.Price,
                    availableSeats    = x.AvailableSeats,
                    status            = x.Status,
                    averageRating = x.Bus == null ? 0
                        : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                            ? Math.Round(_context.Reviews
                                .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                                .Average(r => r.Rating), 1)
                            : 0),
                    reviewCount = x.Bus == null ? 0
                        : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                })
                .ToListAsync();

            return Ok(new
            {
                items      = trips,
                totalCount = total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            });
        }

        // ─────────────────────────────────────────────
        // POST /api/trips  — Tạo chuyến xe mới
        // Operator → chỉ được tạo cho bus thuộc nhà xe mình
        // Admin    → không tạo chuyến (theo bảng phân quyền)
        // ─────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "Operator")]                  // ✅ chỉ Operator tạo chuyến
        public async Task<IActionResult> Create(Trip trip)
        {
            // ✅ Không cho tạo chuyến cho bus của nhà xe khác
            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue)
                return Forbid();

            var bus = await _context.Buses.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BusID == trip.BusID);

            if (bus == null)
                return BadRequest(new { message = "BusID không tồn tại" });

            if (bus.OperatorID != currentOperatorId.Value)
                return Forbid(); // xe không thuộc nhà xe này

            var validationResult = await ValidateTripRequest(trip);
            if (validationResult != null) return validationResult;

            if (trip.AvailableSeats <= 0)
                trip.AvailableSeats = bus.Capacity;

            trip.Status = TripStatusConstant.Scheduled;
            _context.Trips.Add(trip);
            await _context.SaveChangesAsync();

            AddDefaultStopPoints(trip);
            await _context.SaveChangesAsync();

            return Ok(await BuildTripResponse(trip.TripID));
        }

        // ─────────────────────────────────────────────
        // PUT /api/trips/{id}  — Cập nhật chuyến xe
        // Operator → chỉ sửa chuyến thuộc nhà xe mình
        // ─────────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize(Roles = "Operator")]                  // ✅ chỉ Operator sửa chuyến
        public async Task<IActionResult> Update(int id, Trip trip)
        {
            if (id != trip.TripID)
                return BadRequest("ID không khớp");

            // ✅ Không cho sửa chuyến của nhà xe khác
            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue)
                return Forbid();

            var currentTrip = await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus)
                .FirstOrDefaultAsync(x => x.TripID == id);

            if (currentTrip == null) return NotFound();

            if (currentTrip.Bus?.OperatorID != currentOperatorId.Value)
                return Forbid(); // chuyến không thuộc nhà xe này

            // Chỉ chạy conflict check khi lịch/xe/tài xế thực sự thay đổi
            bool scheduleChanged = currentTrip.BusID         != trip.BusID
                                || currentTrip.DepartureTime != trip.DepartureTime
                                || currentTrip.ArrivalTime   != trip.ArrivalTime
                                || currentTrip.DriverID      != trip.DriverID;
            var validationResult = await ValidateTripRequest(trip, skipScheduleCheck: !scheduleChanged);
            if (validationResult != null) return validationResult;

            _context.Entry(trip).State = EntityState.Modified;

            var timeChanged = currentTrip.DepartureTime != trip.DepartureTime
                           || currentTrip.ArrivalTime   != trip.ArrivalTime;

            var cancelled = currentTrip.Status != TripStatusConstant.Cancelled
                         && trip.Status        == TripStatusConstant.Cancelled;

            if (timeChanged || cancelled)
            {
                var userIds = await _context.Bookings
                    .Where(x => x.TripID == id && x.UserID.HasValue)
                    .Select(x => x.UserID)
                    .Distinct()
                    .ToListAsync();

                foreach (var userId in userIds)
                {
                    NotificationsController.AddNotification(
                        _context,
                        userId,
                        cancelled ? "Chuyến xe đã bị hủy" : "Chuyến xe thay đổi thời gian",
                        cancelled
                            ? $"Chuyến {trip.DepartureLocation} → {trip.ArrivalLocation} đã bị hủy. Vui lòng kiểm tra vé của bạn."
                            : $"Chuyến {trip.DepartureLocation} → {trip.ArrivalLocation} đã thay đổi thời gian khởi hành. Vui lòng kiểm tra lịch trình.",
                        2, "/my-tickets");
                }
            }

            await _context.SaveChangesAsync();

            var hasActiveStops = await _context.StopPoints
                .AnyAsync(x => x.TripID == id && x.IsActive);
            if (!hasActiveStops)
            {
                AddDefaultStopPoints(trip);
                await _context.SaveChangesAsync();
            }

            return Ok(await BuildTripResponse(id));
        }

        // ─────────────────────────────────────────────
        // POST /api/trips/{id}/cancel
        // Hủy chuyến chưa chạy, tự động hoàn tiền booking
        // ─────────────────────────────────────────────
        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> CancelTrip(int id)
        {
            var currentOperatorId = await GetCurrentOperatorId();

            var trip = await _context.Trips
                .Include(x => x.Bus)
                .FirstOrDefaultAsync(x => x.TripID == id);

            if (trip == null) return NotFound();

            if (currentOperatorId.HasValue && trip.Bus?.OperatorID != currentOperatorId.Value)
                return Forbid();

            if (trip.Status == TripStatusConstant.Cancelled)
                return BadRequest(new { message = "Chuyến đã bị hủy trước đó." });

            if (trip.Status == TripStatusConstant.Completed)
                return BadRequest(new { message = "Không thể hủy chuyến đã hoàn thành." });

            if (trip.Status == TripStatusConstant.Ongoing)
                return BadRequest(new { message = "Không thể hủy chuyến đang chạy." });

            trip.Status = TripStatusConstant.Cancelled;

            // Tất cả booking còn active
            var bookings = await _context.Bookings
                .Where(x => x.TripID == id &&
                            x.BookingStatus != BookingStatusConstant.Cancelled &&
                            x.BookingStatus != BookingStatusConstant.Completed &&
                            x.PaymentStatus  != PaymentStatusConstant.Refunded)
                .ToListAsync();

            var cancelReason = $"Chuyến {trip.DepartureLocation} → {trip.ArrivalLocation} ({trip.DepartureTime:HH:mm dd/MM/yyyy}) bị hủy bởi nhà xe.";
            int pendingRefundCount = 0;
            foreach (var booking in bookings)
            {
                booking.CancelReason = cancelReason;
                if (booking.PaymentStatus == PaymentStatusConstant.Paid)
                {
                    booking.BookingStatus = BookingStatusConstant.PendingRefund;
                    booking.PaymentStatus = PaymentStatusConstant.PendingRefund;
                    pendingRefundCount++;
                    NotificationsController.AddNotification(
                        _context, booking.UserID,
                        "Chuyến xe bị hủy — chờ hoàn tiền",
                        $"{cancelReason} Yêu cầu hoàn tiền đang chờ Admin xử lý.",
                        4, $"/my-tickets/{booking.BookingID}");
                }
                else
                {
                    booking.BookingStatus = BookingStatusConstant.Cancelled;
                    NotificationsController.AddNotification(
                        _context, booking.UserID,
                        "Chuyến xe bị hủy",
                        cancelReason,
                        4, $"/my-tickets/{booking.BookingID}");
                }
            }

            // Thông báo tài xế
            if (trip.DriverID.HasValue)
                NotificationsController.AddNotification(
                    _context, trip.DriverID.Value,
                    "Chuyến xe bị hủy",
                    $"Chuyến {trip.DepartureLocation} → {trip.ArrivalLocation} ({trip.DepartureTime:HH:mm dd/MM/yyyy}) đã bị hủy bởi nhà xe.",
                    4, "/driver");

            // Thông báo admin nếu có vé cần hoàn tiền
            if (pendingRefundCount > 0)
            {
                var adminUsers = await _context.Users
                    .Where(u => u.Role == RoleConstant.Admin)
                    .Select(u => new { u.UserID })
                    .ToListAsync();
                foreach (var admin in adminUsers)
                    NotificationsController.AddNotification(
                        _context, admin.UserID,
                        "Cần duyệt hoàn tiền",
                        $"Chuyến {trip.DepartureLocation} → {trip.ArrivalLocation} ({trip.DepartureTime:HH:mm dd/MM/yyyy}) bị hủy. {pendingRefundCount} vé cần Admin duyệt hoàn tiền.",
                        3, "/admin/bookings");
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Đã hủy chuyến xe. {pendingRefundCount} vé chờ Admin duyệt hoàn tiền, {bookings.Count - pendingRefundCount} vé hủy không cần hoàn tiền.",
                cancelledBookings = bookings.Count,
                pendingRefundCount
            });
        }

        // ─────────────────────────────────────────────
        // DELETE /api/trips/{id}
        // Operator → chỉ xóa chuyến thuộc nhà xe mình
        // ─────────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "Operator")]                  // ✅ chỉ Operator xóa chuyến
        public async Task<IActionResult> Delete(int id)
        {
            // ✅ Không cho xóa chuyến của nhà xe khác
            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue)
                return Forbid();

            var trip = await _context.Trips
                .Include(x => x.Bus)
                .FirstOrDefaultAsync(x => x.TripID == id);

            if (trip == null) return NotFound();

            if (trip.Bus?.OperatorID != currentOperatorId.Value)
                return Forbid();

            var hasBookings = await _context.Bookings.AnyAsync(x => x.TripID == id);
            if (hasBookings)
                return Conflict(new { message = "Không thể xóa chuyến đã có booking" });

            // Xóa các dữ liệu liên quan tham chiếu TripID trước khi xóa Trip
            var stopPoints = await _context.StopPoints.Where(x => x.TripID == id).ToListAsync();
            if (stopPoints.Count > 0) _context.StopPoints.RemoveRange(stopPoints);

            var seatHolds = await _context.SeatHolds.Where(x => x.TripID == id).ToListAsync();
            if (seatHolds.Count > 0) _context.SeatHolds.RemoveRange(seatHolds);

            _context.Trips.Remove(trip);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // ─────────────────────────────────────────────
        // GET /api/trips/locations  — Public
        // ─────────────────────────────────────────────
        // [HttpGet("locations")]
        // [AllowAnonymous]
        // public async Task<IActionResult> GetLocations(
        //     [FromQuery] string? type = null,
        //     [FromQuery] string? q = null,
        //     [FromQuery] int take = 40)
        // {
        //     take = Math.Clamp(take, 1, 100);
        //     var keyword = string.IsNullOrWhiteSpace(q) ? null : q.Trim();

        //     var query = _context.Trips
        //         .AsNoTracking()
        //         .Include(x => x.Bus)
        //         .AsQueryable();

        //     var currentOperatorId = await GetCurrentOperatorId();
        //     if (currentOperatorId.HasValue)
        //         query = query.Where(x => x.Bus != null && x.Bus.OperatorID == currentOperatorId.Value);

        //     var normalizedType = type?.Trim().ToLowerInvariant();

        //     async Task<List<string>> LoadLocations(IQueryable<string> source)
        //     {
        //         if (!string.IsNullOrWhiteSpace(keyword))
        //             source = source.Where(x => EF.Functions.Like(x, $"%{keyword}%"));

        //         return await source
        //             .Where(x => !string.IsNullOrWhiteSpace(x))
        //             .Distinct()
        //             .OrderBy(x => x)
        //             .Take(take)
        //             .ToListAsync();
        //     }

        //     if (normalizedType == "departure")
        //         return Ok(await LoadLocations(query.Select(x => x.DepartureLocation)));

        //     if (normalizedType == "arrival")
        //         return Ok(await LoadLocations(query.Select(x => x.ArrivalLocation)));

        //     var departures = await LoadLocations(query.Select(x => x.DepartureLocation));
        //     var arrivals = await LoadLocations(query.Select(x => x.ArrivalLocation));

        //     return Ok(new
        //     {
        //         departures,
        //         arrivals,
        //         all = departures.Union(arrivals).OrderBy(x => x).Take(take).ToList()
        //     });
        // }
        [HttpGet("locations")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLocations()
        {
            var departures = await _context.Trips
                .AsNoTracking()
                .Select(x => x.DepartureLocation)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToListAsync();

            var arrivals = await _context.Trips
                .AsNoTracking()
                .Select(x => x.ArrivalLocation)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToListAsync();

            var all = departures.Union(arrivals).Distinct().OrderBy(x => x).ToList();

            return Ok(new { departures = all, arrivals = all, all });
        }

        // ─────────────────────────────────────────────
        // POST /api/trips/clone  — Nhân bản chuyến sang ngày khác
        // ─────────────────────────────────────────────
        [HttpPost("clone")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> CloneTrips([FromBody] CloneTripsRequest request)
        {
            if (!DateTime.TryParse(request.SourceDate, out var sourceDate))
                return BadRequest(new { message = "Ngày nguồn không hợp lệ" });
            if (!DateTime.TryParse(request.TargetDate, out var targetDate))
                return BadRequest(new { message = "Ngày đích không hợp lệ" });
            if (targetDate.Date == sourceDate.Date)
                return BadRequest(new { message = "Ngày đích phải khác ngày nguồn" });

            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue) return Forbid();

            var start = sourceDate.Date;
            var end   = start.AddDays(1);
            var dayDiff = targetDate.Date - sourceDate.Date;

            var sourceTrips = await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus)
                .Include(x => x.StopPoints.Where(s => s.IsActive))
                .Where(x => x.DepartureTime >= start && x.DepartureTime < end
                         && x.Bus != null && x.Bus.OperatorID == currentOperatorId.Value)
                .ToListAsync();

            if (sourceTrips.Count == 0)
                return Ok(new { cloned = 0, message = "Không có chuyến nào trong ngày nguồn" });

            // Lấy trước các chuyến đã tồn tại của những xe liên quan trong ngày đích, để check trùng giờ
            var busIds = sourceTrips.Select(x => x.BusID).Distinct().ToList();
            var targetStart = targetDate.Date;
            var targetEnd   = targetStart.AddDays(1);
            var existingTargetTrips = await _context.Trips
                .AsNoTracking()
                .Where(x => busIds.Contains(x.BusID)
                         && x.Status != TripStatusConstant.Cancelled
                         && x.DepartureTime >= targetStart.AddDays(-1) && x.DepartureTime < targetEnd.AddDays(1))
                .Select(x => new { x.BusID, x.DepartureTime, x.ArrivalTime })
                .ToListAsync();

            var newTrips = new List<Trip>();
            var pairs = new List<(Trip Source, Trip New)>();
            var skipped = 0;
            var now = DateTime.Now;
            foreach (var t in sourceTrips)
            {
                var newDeparture = t.DepartureTime + dayDiff;
                var newArrival   = t.ArrivalTime   + dayDiff;

                if (newDeparture <= now)
                {
                    skipped++;
                    continue;
                }

                var conflict = existingTargetTrips.Any(x => x.BusID == t.BusID
                                && x.DepartureTime < newArrival && x.ArrivalTime > newDeparture)
                            || newTrips.Any(nt => nt.BusID == t.BusID
                                && nt.DepartureTime < newArrival && nt.ArrivalTime > newDeparture);
                if (conflict)
                {
                    skipped++;
                    continue;
                }

                var newTrip = new Trip
                {
                    BusID             = t.BusID,
                    DepartureLocation = t.DepartureLocation,
                    ArrivalLocation   = t.ArrivalLocation,
                    DepartureTime     = newDeparture,
                    ArrivalTime       = newArrival,
                    Price             = t.Price,
                    AvailableSeats    = t.Bus?.Capacity ?? t.AvailableSeats,
                    Status            = TripStatusConstant.Scheduled
                };
                _context.Trips.Add(newTrip);
                newTrips.Add(newTrip);
                pairs.Add((t, newTrip));
            }
            await _context.SaveChangesAsync(); // sau bước này pairs[].New.TripID đã có giá trị

            // Copy đúng các điểm dừng đã tùy chỉnh của chuyến nguồn (không tạo lại điểm mặc định)
            foreach (var (source, newTrip) in pairs)
            {
                if (source.StopPoints != null && source.StopPoints.Count > 0)
                {
                    foreach (var sp in source.StopPoints)
                    {
                        _context.StopPoints.Add(new StopPoint
                        {
                            TripID        = newTrip.TripID,
                            StopName      = sp.StopName,
                            StopAddress   = sp.StopAddress,
                            StopOrder     = sp.StopOrder,
                            StopType      = sp.StopType,
                            ArrivalOffset = sp.ArrivalOffset,
                            IsActive      = true
                        });
                    }
                }
                else
                {
                    AddDefaultStopPoints(newTrip);
                }
            }
            await _context.SaveChangesAsync();

            var message = $"Đã nhân bản {newTrips.Count} chuyến sang ngày {targetDate:dd/MM/yyyy}";
            if (skipped > 0)
                message += $" (bỏ qua {skipped} chuyến trùng giờ xe đã tồn tại)";

            return Ok(new
            {
                cloned  = newTrips.Count,
                skipped,
                message
            });
        }

        public record CloneTripsRequest(string SourceDate, string TargetDate);

        // ─────────────────────────────────────────────
        // POST /api/trips/clone-week  — Nhân bản cả tuần
        // ─────────────────────────────────────────────
        [HttpPost("clone-week")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> CloneWeek([FromBody] CloneWeekRequest request)
        {
            if (!DateTime.TryParse(request.SourceWeekStart, out var srcMonday))
                return BadRequest(new { message = "Tuần nguồn không hợp lệ" });
            if (!DateTime.TryParse(request.TargetWeekStart, out var tgtMonday))
                return BadRequest(new { message = "Tuần đích không hợp lệ" });

            srcMonday = srcMonday.Date;
            tgtMonday = tgtMonday.Date;

            if (srcMonday == tgtMonday)
                return BadRequest(new { message = "Tuần đích phải khác tuần nguồn" });

            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue) return Forbid();

            var dayDiff = tgtMonday - srcMonday;

            // Lấy toàn bộ chuyến trong tuần nguồn
            var srcEnd = srcMonday.AddDays(7);
            var sourceTrips = await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus)
                .Include(x => x.StopPoints.Where(s => s.IsActive))
                .Where(x => x.DepartureTime >= srcMonday && x.DepartureTime < srcEnd
                         && x.Bus != null && x.Bus.OperatorID == currentOperatorId.Value
                         && x.Status != TripStatusConstant.Cancelled)
                .ToListAsync();

            if (sourceTrips.Count == 0)
                return Ok(new { cloned = 0, skipped = 0, message = "Không có chuyến nào trong tuần nguồn" });

            // Lấy trước chuyến đã tồn tại trong tuần đích để check conflict
            var busIds = sourceTrips.Select(x => x.BusID).Distinct().ToList();
            var tgtEnd  = tgtMonday.AddDays(7);
            var existing = await _context.Trips
                .AsNoTracking()
                .Where(x => busIds.Contains(x.BusID)
                         && x.Status != TripStatusConstant.Cancelled
                         && x.DepartureTime >= tgtMonday && x.DepartureTime < tgtEnd)
                .Select(x => new { x.BusID, x.DepartureTime, x.ArrivalTime })
                .ToListAsync();

            var newTrips = new List<Trip>();
            var pairs    = new List<(Trip Source, Trip New)>();
            var skipped  = 0;
            var now      = DateTime.Now;

            foreach (var t in sourceTrips)
            {
                var newDep = t.DepartureTime + dayDiff;
                var newArr = t.ArrivalTime   + dayDiff;

                if (newDep <= now) { skipped++; continue; }

                var conflict = existing.Any(x => x.BusID == t.BusID
                                    && x.DepartureTime < newArr && x.ArrivalTime > newDep)
                            || newTrips.Any(nt => nt.BusID == t.BusID
                                    && nt.DepartureTime < newArr && nt.ArrivalTime > newDep);
                if (conflict) { skipped++; continue; }

                var newTrip = new Trip
                {
                    BusID             = t.BusID,
                    DepartureLocation = t.DepartureLocation,
                    ArrivalLocation   = t.ArrivalLocation,
                    DepartureTime     = newDep,
                    ArrivalTime       = newArr,
                    Price             = t.Price,
                    AvailableSeats    = t.Bus?.Capacity ?? t.AvailableSeats,
                    Status            = TripStatusConstant.Scheduled
                };
                _context.Trips.Add(newTrip);
                newTrips.Add(newTrip);
                pairs.Add((t, newTrip));
            }
            await _context.SaveChangesAsync();

            foreach (var (source, newTrip) in pairs)
            {
                if (source.StopPoints != null && source.StopPoints.Count > 0)
                    foreach (var sp in source.StopPoints)
                        _context.StopPoints.Add(new StopPoint
                        {
                            TripID = newTrip.TripID, StopName = sp.StopName,
                            StopAddress = sp.StopAddress, StopOrder = sp.StopOrder,
                            StopType = sp.StopType, ArrivalOffset = sp.ArrivalOffset, IsActive = true
                        });
                else
                    AddDefaultStopPoints(newTrip);
            }
            await _context.SaveChangesAsync();

            var msg = $"Đã nhân bản {newTrips.Count} chuyến từ tuần {srcMonday:dd/MM} – {srcMonday.AddDays(6):dd/MM} sang tuần {tgtMonday:dd/MM} – {tgtMonday.AddDays(6):dd/MM/yyyy}";
            if (skipped > 0) msg += $" (bỏ qua {skipped} chuyến trùng hoặc đã qua)";

            return Ok(new { cloned = newTrips.Count, skipped, message = msg });
        }

        public record CloneWeekRequest(string SourceWeekStart, string TargetWeekStart);

        // ─────────────────────────────────────────────
        // POST /api/trips/{id}/stops  — Operator thêm điểm dừng/đón/trả cho chuyến của mình
        // ─────────────────────────────────────────────
        [HttpPost("{id}/stops")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> AddStop(int id, [FromBody] StopPoint stop)
        {
            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue) return Forbid();

            var trip = await _context.Trips.Include(x => x.Bus).FirstOrDefaultAsync(x => x.TripID == id);
            if (trip == null) return NotFound(new { message = "Không tìm thấy chuyến xe" });
            if (trip.Bus?.OperatorID != currentOperatorId.Value) return Forbid();

            if (string.IsNullOrWhiteSpace(stop.StopName))
                return BadRequest(new { message = "Tên điểm dừng không được để trống" });
            if (stop.StopType < 1 || stop.StopType > 3)
                return BadRequest(new { message = "Loại điểm dừng không hợp lệ (1=Đón, 2=Trả, 3=Cả hai)" });

            var maxOrder = await _context.StopPoints
                .Where(x => x.TripID == id && x.IsActive)
                .Select(x => (int?)x.StopOrder)
                .MaxAsync() ?? 0;

            var newStop = new StopPoint
            {
                TripID        = id,
                StopName      = stop.StopName.Trim(),
                StopAddress   = stop.StopAddress?.Trim(),
                StopOrder     = stop.StopOrder > 0 ? stop.StopOrder : maxOrder + 1,
                StopType      = stop.StopType,
                ArrivalOffset = stop.ArrivalOffset,
                IsActive      = true
            };
            _context.StopPoints.Add(newStop);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                stopPointID   = newStop.StopPointID,
                tripID        = newStop.TripID,
                stopName      = newStop.StopName,
                stopAddress   = newStop.StopAddress,
                stopOrder     = newStop.StopOrder,
                stopType      = newStop.StopType,
                arrivalOffset = newStop.ArrivalOffset
            });
        }

        // ─────────────────────────────────────────────
        // PUT /api/trips/{tripId}/stops/{stopId}  — Operator sửa điểm dừng
        // ─────────────────────────────────────────────
        [HttpPut("{tripId}/stops/{stopId}")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> UpdateStop(int tripId, int stopId, [FromBody] StopPoint stop)
        {
            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue) return Forbid();

            var trip = await _context.Trips.Include(x => x.Bus).FirstOrDefaultAsync(x => x.TripID == tripId);
            if (trip == null) return NotFound(new { message = "Không tìm thấy chuyến xe" });
            if (trip.Bus?.OperatorID != currentOperatorId.Value) return Forbid();

            var existing = await _context.StopPoints.FirstOrDefaultAsync(x => x.StopPointID == stopId && x.TripID == tripId);
            if (existing == null) return NotFound(new { message = "Không tìm thấy điểm dừng" });

            if (string.IsNullOrWhiteSpace(stop.StopName))
                return BadRequest(new { message = "Tên điểm dừng không được để trống" });
            if (stop.StopType < 1 || stop.StopType > 3)
                return BadRequest(new { message = "Loại điểm dừng không hợp lệ (1=Đón, 2=Trả, 3=Cả hai)" });

            existing.StopName      = stop.StopName.Trim();
            existing.StopAddress   = stop.StopAddress?.Trim();
            existing.StopOrder     = stop.StopOrder;
            existing.StopType      = stop.StopType;
            existing.ArrivalOffset = stop.ArrivalOffset;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã cập nhật điểm dừng" });
        }

        // ─────────────────────────────────────────────
        // DELETE /api/trips/{tripId}/stops/{stopId}  — Operator xóa điểm dừng
        // ─────────────────────────────────────────────
        [HttpDelete("{tripId}/stops/{stopId}")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> DeleteStop(int tripId, int stopId)
        {
            var currentOperatorId = await GetCurrentOperatorId();
            if (!currentOperatorId.HasValue) return Forbid();

            var trip = await _context.Trips.Include(x => x.Bus).FirstOrDefaultAsync(x => x.TripID == tripId);
            if (trip == null) return NotFound(new { message = "Không tìm thấy chuyến xe" });
            if (trip.Bus?.OperatorID != currentOperatorId.Value) return Forbid();

            var existing = await _context.StopPoints.FirstOrDefaultAsync(x => x.StopPointID == stopId && x.TripID == tripId);
            if (existing == null) return NotFound(new { message = "Không tìm thấy điểm dừng" });

            // Nếu đã có booking dùng điểm này làm điểm đón/trả thì chỉ ẩn (IsActive=false), không xóa cứng
            var inUse = await _context.Bookings.AnyAsync(x => x.PickupStopID == stopId || x.DropoffStopID == stopId);
            if (inUse)
            {
                existing.IsActive = false;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Điểm dừng đang có booking sử dụng nên đã được ẩn thay vì xóa" });
            }

            _context.StopPoints.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã xóa điểm dừng" });
        }

        // ═════════════════════════════════════════════
        // PRIVATE HELPERS
        // ═════════════════════════════════════════════
        private static readonly TimeSpan BusRestBuffer    = TimeSpan.FromHours(12);
        private static readonly TimeSpan DriverRestBuffer = TimeSpan.FromHours(12);

        private async Task<IActionResult?> ValidateTripRequest(Trip trip, bool skipScheduleCheck = false)
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

            // Không cho tạo chuyến với giờ khởi hành đã qua
            if (trip.TripID == 0 && trip.DepartureTime < DateTime.Now)
                return BadRequest(new { message = "Không thể thêm chuyến với giờ khởi hành đã qua" });

            if (skipScheduleCheck)
                return null;

            // Kiểm tra trùng giờ xe (kèm 12 giờ nghỉ giữa các chuyến)
            var busWindowStart = trip.DepartureTime.Subtract(BusRestBuffer);
            var busWindowEnd   = trip.ArrivalTime.Add(BusRestBuffer);
            var busConflict = await _context.Trips
                .AsNoTracking()
                .AnyAsync(x => x.BusID == trip.BusID
                            && x.TripID != trip.TripID
                            && x.Status != TripStatusConstant.Cancelled
                            && x.DepartureTime < busWindowEnd
                            && busWindowStart < x.ArrivalTime);
            if (busConflict)
                return BadRequest(new { message = "Xe này đã có chuyến khác trùng hoặc quá gần — cần ít nhất 12 giờ nghỉ giữa các chuyến." });

            // Kiểm tra trùng lịch tài xế (kèm 12 giờ nghỉ ngơi)
            if (trip.DriverID.HasValue)
            {
                var driverWindowStart = trip.DepartureTime.Subtract(DriverRestBuffer);
                var driverWindowEnd   = trip.ArrivalTime.Add(DriverRestBuffer);
                var driverConflict = await _context.Trips
                    .AsNoTracking()
                    .AnyAsync(x => x.DriverID == trip.DriverID
                                && x.TripID != trip.TripID
                                && x.Status != TripStatusConstant.Cancelled
                                && x.DepartureTime < driverWindowEnd
                                && driverWindowStart < x.ArrivalTime);
                if (driverConflict)
                    return BadRequest(new { message = "Tài xế này đã có lịch lái trong khoảng thời gian này hoặc chưa đủ thời gian nghỉ ngơi (tối thiểu 12 giờ giữa các chuyến)." });
            }

            return null;
        }

        private async Task<object?> BuildTripResponse(int tripId)
        {
            return await _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus).ThenInclude(x => x.Operator)
                .Where(x => x.TripID == tripId)
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
                    Amenities    = x.Bus != null ? x.Bus.Amenities    : null,
                    LicensePlate = x.Bus != null ? x.Bus.LicensePlate : null,
                    OperatorID   = x.Bus != null ? x.Bus.OperatorID   : (int?)null,
                    OperatorName = x.Bus != null && x.Bus.Operator != null ? x.Bus.Operator.Name : null,
                    AverageRating = x.Bus == null ? 0
                        : (_context.Reviews.Any(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                            ? Math.Round(_context.Reviews
                                .Where(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                                .Average(r => r.Rating), 1)
                            : 0),
                    ReviewCount = x.Bus == null ? 0
                        : _context.Reviews.Count(r => r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.Bus.OperatorID)
                })
                .FirstOrDefaultAsync();
        }

        private void AddDefaultStopPoints(Trip trip)
        {
            var totalMinutes = Math.Max(0, (int)Math.Round((trip.ArrivalTime - trip.DepartureTime).TotalMinutes));

            _context.StopPoints.AddRange(
                new StopPoint
                {
                    TripID        = trip.TripID,
                    StopName      = $"Bến xe {trip.DepartureLocation}",
                    StopAddress   = $"Trung tâm {trip.DepartureLocation}",
                    StopOrder     = 1,
                    StopType      = 1,
                    ArrivalOffset = 0,
                    IsActive      = true
                },
                new StopPoint
                {
                    TripID        = trip.TripID,
                    StopName      = $"Bến xe {trip.ArrivalLocation}",
                    StopAddress   = $"Trung tâm {trip.ArrivalLocation}",
                    StopOrder     = 2,
                    StopType      = 2,
                    ArrivalOffset = totalMinutes,
                    IsActive      = true
                }
            );
        }

        private static IQueryable<Trip> ApplySearchSort(IQueryable<Trip> query, string? sortBy)
        {
            return (sortBy ?? string.Empty).Trim().ToLowerInvariant() switch
            {
                "price_asc" => query
                    .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
                    .ThenBy(x => x.Price)
                    .ThenBy(x => x.DepartureTime),
                "price_desc" => query
                    .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
                    .ThenByDescending(x => x.Price)
                    .ThenBy(x => x.DepartureTime),
                "departure_desc" => query
                    .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
                    .ThenByDescending(x => x.DepartureTime),
                _ => query
                    .OrderByDescending(x => x.Status == TripStatusConstant.Scheduled)
                    .ThenBy(x => x.DepartureTime)
            };
        }

        private static bool TryParseTimeRange(string? value, out TimeSpan start, out TimeSpan end)
        {
            start = TimeSpan.Zero;
            end   = TimeSpan.Zero;

            if (string.IsNullOrWhiteSpace(value))
                return false;

            var parts = value.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2) return false;

            return TimeSpan.TryParse(parts[0], out start) &&
                   TimeSpan.TryParse(parts[1], out end) &&
                   start <= end;
        }
    }
}
