using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Entities;
using BaseCore.Common;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/driver")]
    [ApiController]
    [Authorize(Roles = "Driver")]
    public class DriverController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public DriverController(MySqlDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : null;
        }

        // GET /api/driver/trips?filter=today|upcoming|all
        [HttpGet("trips")]
        public async Task<IActionResult> GetMyTrips([FromQuery] string filter = "today")
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue)
                return Unauthorized();

            var now = DateTime.Now;
            var todayStart = now.Date;
            var todayEnd = todayStart.AddDays(1);

            var query = _context.Trips
                .AsNoTracking()
                .Include(t => t.Bus)
                .Where(t => t.DriverID == driverId.Value && t.Status != TripStatusConstant.Cancelled)
                .AsQueryable();

            query = filter switch
            {
                "today"    => query.Where(t => t.DepartureTime >= todayStart && t.DepartureTime < todayEnd),
                "upcoming" => query.Where(t => t.DepartureTime >= now && t.Status == TripStatusConstant.Scheduled),
                "ongoing"  => query.Where(t => t.Status == TripStatusConstant.Ongoing),
                _          => query.Where(t => t.DepartureTime >= todayStart)
            };

            var trips = await query
                .OrderBy(t => t.DepartureTime)
                .Select(t => new
                {
                    t.TripID,
                    t.DepartureLocation,
                    t.ArrivalLocation,
                    t.DepartureTime,
                    t.ArrivalTime,
                    t.ActualDepartureTime,
                    t.ActualArrivalTime,
                    t.Status,
                    t.AvailableSeats,
                    BusLicensePlate = t.Bus != null ? t.Bus.LicensePlate : null,
                    BusType = t.Bus != null ? t.Bus.BusType : null,
                    BusCapacity = t.Bus != null ? t.Bus.Capacity : 0,
                    TotalPassengers = t.Bookings.Count(b =>
                        b.BookingStatus != BookingStatusConstant.Cancelled &&
                        b.BookingStatus != BookingStatusConstant.Refunded &&
                        b.BookingStatus != BookingStatusConstant.CancelRequested)
                })
                .ToListAsync();

            return Ok(trips);
        }

        // GET /api/driver/trips/{id}
        [HttpGet("trips/{id:int}")]
        public async Task<IActionResult> GetTrip(int id)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var trip = await _context.Trips
                .AsNoTracking()
                .Include(t => t.Bus)
                .Include(t => t.Incidents)
                .Where(t => t.TripID == id && t.DriverID == driverId.Value)
                .Select(t => new
                {
                    t.TripID,
                    t.DepartureLocation,
                    t.ArrivalLocation,
                    t.DepartureTime,
                    t.ArrivalTime,
                    t.ActualDepartureTime,
                    t.ActualArrivalTime,
                    t.Status,
                    t.Price,
                    t.AvailableSeats,
                    BusLicensePlate = t.Bus != null ? t.Bus.LicensePlate : null,
                    BusType = t.Bus != null ? t.Bus.BusType : null,
                    BusCapacity = t.Bus != null ? t.Bus.Capacity : 0,
                    Incidents = t.Incidents.Select(i => new
                    {
                        i.IncidentID,
                        i.IncidentType,
                        i.Description,
                        i.ReportedAt,
                        i.IsResolved
                    })
                })
                .FirstOrDefaultAsync();

            if (trip == null) return NotFound(new { message = "Không tìm thấy chuyến xe" });
            return Ok(trip);
        }

        // GET /api/driver/trips/{id}/passengers
        [HttpGet("trips/{id:int}/passengers")]
        public async Task<IActionResult> GetPassengers(int id)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.TripID == id && t.DriverID == driverId.Value);
            if (!tripExists)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var passengers = await _context.Bookings
                .AsNoTracking()
                .Include(b => b.TicketSeats)
                .Where(b =>
                    b.TripID == id &&
                    b.BookingStatus != BookingStatusConstant.Cancelled &&
                    b.BookingStatus != BookingStatusConstant.Refunded &&
                    b.BookingStatus != BookingStatusConstant.CancelRequested)
                .Select(b => new
                {
                    b.BookingID,
                    b.CustomerName,
                    b.CustomerPhone,
                    b.TotalSeats,
                    b.BookingStatus,
                    b.PaymentMethod,
                    Seats = b.TicketSeats != null ? b.TicketSeats
                        .Where(s => s.IsActive)
                        .Select(s => new
                        {
                            s.TicketSeatID,
                            s.SeatLabel,
                            s.QRCode,
                            s.IsCheckedIn,
                            s.CheckedInAt
                        }) : null
                })
                .ToListAsync();

            var totalSeats    = passengers.Sum(p => p.TotalSeats);
            var checkedInSeats = passengers
                .SelectMany(p => p.Seats ?? Enumerable.Empty<dynamic>())
                .Count(s => s.IsCheckedIn);

            return Ok(new
            {
                tripID = id,
                totalPassengers = passengers.Count,
                totalSeats,
                checkedInSeats,
                passengers
            });
        }

        // POST /api/driver/trips/{id}/start
        [HttpPost("trips/{id:int}/start")]
        public async Task<IActionResult> StartTrip(int id)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.TripID == id && t.DriverID == driverId.Value);

            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            if (trip.Status != TripStatusConstant.Scheduled)
                return BadRequest(new { message = "Chỉ có thể bắt đầu chuyến xe ở trạng thái đã lên lịch" });

            trip.Status = TripStatusConstant.Ongoing;
            trip.ActualDepartureTime = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã bắt đầu chuyến xe", actualDepartureTime = trip.ActualDepartureTime });
        }

        // POST /api/driver/trips/{id}/end
        [HttpPost("trips/{id:int}/end")]
        public async Task<IActionResult> EndTrip(int id)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var trip = await _context.Trips
                .FirstOrDefaultAsync(t => t.TripID == id && t.DriverID == driverId.Value);

            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            if (trip.Status != TripStatusConstant.Ongoing)
                return BadRequest(new { message = "Chỉ có thể kết thúc chuyến xe đang chạy" });

            trip.Status = TripStatusConstant.Completed;
            trip.ActualArrivalTime = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã kết thúc chuyến xe", actualArrivalTime = trip.ActualArrivalTime });
        }

        // POST /api/driver/trips/{id}/checkin
        // body: { qrCode?, ticketSeatId? }
        [HttpPost("trips/{id:int}/checkin")]
        public async Task<IActionResult> CheckIn(int id, [FromBody] CheckInRequest request)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.TripID == id && t.DriverID == driverId.Value);
            if (!tripExists)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            TicketSeat? seat = null;

            if (request.TicketSeatId.HasValue)
            {
                seat = await _context.TicketSeats
                    .Include(s => s.Booking)
                    .FirstOrDefaultAsync(s =>
                        s.TicketSeatID == request.TicketSeatId.Value &&
                        s.Booking != null &&
                        s.Booking.TripID == id &&
                        s.IsActive);
            }
            else if (!string.IsNullOrWhiteSpace(request.QRCode))
            {
                seat = await _context.TicketSeats
                    .Include(s => s.Booking)
                    .FirstOrDefaultAsync(s =>
                        s.QRCode == request.QRCode.Trim() &&
                        s.Booking != null &&
                        s.Booking.TripID == id &&
                        s.IsActive);
            }

            if (seat == null)
                return NotFound(new { message = "Không tìm thấy vé hoặc vé không thuộc chuyến này" });

            if (seat.Booking?.BookingStatus == BookingStatusConstant.Cancelled ||
                seat.Booking?.BookingStatus == BookingStatusConstant.Refunded)
                return BadRequest(new { message = "Vé đã bị hủy" });

            if (seat.IsCheckedIn)
                return Ok(new
                {
                    message = "Hành khách đã được xác nhận trước đó",
                    alreadyCheckedIn = true,
                    seat.SeatLabel,
                    seat.CheckedInAt,
                    customerName = seat.Booking?.CustomerName
                });

            seat.IsCheckedIn = true;
            seat.CheckedInAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xác nhận lên xe thành công",
                alreadyCheckedIn = false,
                seat.SeatLabel,
                seat.CheckedInAt,
                customerName = seat.Booking?.CustomerName
            });
        }

        // POST /api/driver/trips/{id}/incident
        // body: { incidentType, description }
        [HttpPost("trips/{id:int}/incident")]
        public async Task<IActionResult> ReportIncident(int id, [FromBody] IncidentRequest request)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.TripID == id && t.DriverID == driverId.Value);
            if (!tripExists)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            if (string.IsNullOrWhiteSpace(request.Description))
                return BadRequest(new { message = "Mô tả sự cố không được để trống" });

            var incident = new TripIncident
            {
                TripID      = id,
                DriverID    = driverId.Value,
                IncidentType = request.IncidentType?.Trim() ?? "other",
                Description = request.Description.Trim(),
                ReportedAt  = DateTime.Now,
                IsResolved  = false
            };

            _context.TripIncidents.Add(incident);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã báo cáo sự cố", incidentID = incident.IncidentID });
        }

        // GET /api/driver/trips/{id}/passengers-by-stop
        [HttpGet("trips/{id:int}/passengers-by-stop")]
        public async Task<IActionResult> GetPassengersByStop(int id)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var trip = await _context.Trips
                .AsNoTracking()
                .Include(t => t.StopPoints)
                .FirstOrDefaultAsync(t => t.TripID == id && t.DriverID == driverId.Value);

            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var bookings = await _context.Bookings
                .AsNoTracking()
                .Include(b => b.TicketSeats)
                .Where(b =>
                    b.TripID == id &&
                    b.BookingStatus != BookingStatusConstant.Cancelled &&
                    b.BookingStatus != BookingStatusConstant.Refunded &&
                    b.BookingStatus != BookingStatusConstant.CancelRequested)
                .ToListAsync();

            var stopPoints = trip.StopPoints
                .Where(s => s.IsActive)
                .OrderBy(s => s.StopOrder)
                .ToList();

            var departureTime = trip.DepartureTime;

            var result = stopPoints.Select(stop => new
            {
                stop.StopPointID,
                stop.StopName,
                stop.StopAddress,
                stop.StopOrder,
                stop.StopType,
                EstimatedTime = stop.ArrivalOffset.HasValue
                    ? (DateTime?)departureTime.AddMinutes(stop.ArrivalOffset.Value)
                    : null,
                Passengers = bookings
                    .Where(b => b.PickupStopID == stop.StopPointID)
                    .Select(b => new
                    {
                        b.BookingID,
                        b.CustomerName,
                        b.CustomerPhone,
                        b.CustomerEmail,
                        b.TotalSeats,
                        b.BookingStatus,
                        Seats = (b.TicketSeats ?? new List<TicketSeat>())
                            .Where(s => s.IsActive)
                            .Select(s => new
                            {
                                s.TicketSeatID,
                                s.SeatLabel,
                                s.IsCheckedIn,
                                s.CheckedInAt
                            }).ToList()
                    }).ToList()
            }).ToList();

            // Hành khách không chọn điểm đón cụ thể
            var noStopBookings = bookings
                .Where(b => b.PickupStopID == null || !stopPoints.Any(s => s.StopPointID == b.PickupStopID))
                .Select(b => new
                {
                    b.BookingID,
                    b.CustomerName,
                    b.CustomerPhone,
                    b.CustomerEmail,
                    b.TotalSeats,
                    b.BookingStatus,
                    Seats = (b.TicketSeats ?? new List<TicketSeat>())
                        .Where(s => s.IsActive)
                        .Select(s => new
                        {
                            s.TicketSeatID,
                            s.SeatLabel,
                            s.IsCheckedIn,
                            s.CheckedInAt
                        }).ToList()
                }).ToList();

            return Ok(new
            {
                tripID = id,
                stops = result,
                noPickupStop = noStopBookings
            });
        }

        // GET /api/driver/trips/{id}/absent
        [HttpGet("trips/{id:int}/absent")]
        public async Task<IActionResult> GetAbsentPassengers(int id)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.TripID == id && t.DriverID == driverId.Value);
            if (!tripExists)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var absent = await _context.TicketSeats
                .AsNoTracking()
                .Include(s => s.Booking)
                .Where(s =>
                    s.Booking != null &&
                    s.Booking.TripID == id &&
                    s.IsActive &&
                    !s.IsCheckedIn &&
                    s.Booking.BookingStatus != BookingStatusConstant.Cancelled &&
                    s.Booking.BookingStatus != BookingStatusConstant.Refunded &&
                    s.Booking.BookingStatus != BookingStatusConstant.CancelRequested)
                .Select(s => new
                {
                    s.TicketSeatID,
                    s.SeatLabel,
                    s.BookingID,
                    CustomerName  = s.Booking != null ? s.Booking.CustomerName : null,
                    CustomerPhone = s.Booking != null ? s.Booking.CustomerPhone : null
                })
                .ToListAsync();

            return Ok(new { tripID = id, absentCount = absent.Count, absent });
        }

        // POST /api/driver/trips/{id}/delay  — tài xế xác nhận đang chờ, nhập giờ mới
        [HttpPost("trips/{id:int}/delay")]
        public async Task<IActionResult> DelayTrip(int id, [FromBody] DelayTripRequest request)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var trip = await _context.Trips
                .Include(t => t.Bus)
                .FirstOrDefaultAsync(t => t.TripID == id && t.DriverID == driverId.Value);
            if (trip == null) return NotFound(new { message = "Không tìm thấy chuyến xe" });

            if (trip.Status != TripStatusConstant.Scheduled && trip.Status != TripStatusConstant.Delayed)
                return BadRequest(new { message = "Chỉ có thể báo trễ khi chuyến đang ở trạng thái Scheduled hoặc Delayed" });

            if (request.NewDepartureTime <= DateTime.Now)
                return BadRequest(new { message = "Giờ khởi hành mới phải sau thời điểm hiện tại" });

            trip.Status = TripStatusConstant.Delayed;
            trip.DelayedDepartureTime = request.NewDepartureTime;
            await _context.SaveChangesAsync();

            // Thông báo cho tất cả khách đã đặt vé
            var bookings = await _context.Bookings
                .Where(b => b.TripID == id
                         && b.BookingStatus != BookingStatusConstant.Cancelled
                         && b.BookingStatus != BookingStatusConstant.Refunded)
                .Select(b => new { b.UserID, b.BookingID })
                .ToListAsync();

            var newTime = request.NewDepartureTime.ToString("HH:mm dd/MM/yyyy");
            foreach (var b in bookings)
            {
                NotificationsController.AddNotification(_context, b.UserID,
                    "Chuyến xe bị trễ giờ",
                    $"Chuyến xe của bạn (Đơn #{b.BookingID}) bị trễ. Dự kiến khởi hành lúc {newTime}.",
                    2, $"/my-tickets/{b.BookingID}");
            }

            // Thông báo cho nhà xe (operator)
            var operatorUser = await _context.Users
                .Where(u => u.OperatorID == trip.Bus!.OperatorID && u.Role == RoleConstant.Operator)
                .Select(u => new { u.UserID })
                .FirstOrDefaultAsync();
            if (operatorUser != null)
            {
                NotificationsController.AddNotification(_context, operatorUser.UserID,
                    "Tài xế báo trễ chuyến",
                    $"Chuyến #{trip.TripID} ({trip.DepartureLocation}→{trip.ArrivalLocation}) bị trễ. Giờ mới: {newTime}.",
                    2, $"/operator/trips");
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã cập nhật trạng thái trễ", newDepartureTime = trip.DelayedDepartureTime });
        }

        // POST /api/driver/trips/{tripId}/bookings/{bookingId}/confirm-payment
        [HttpPost("trips/{tripId:int}/bookings/{bookingId:int}/confirm-payment")]
        public async Task<IActionResult> ConfirmPayment(int tripId, int bookingId)
        {
            var driverId = GetCurrentUserId();
            if (!driverId.HasValue) return Unauthorized();

            var tripExists = await _context.Trips
                .AnyAsync(t => t.TripID == tripId && t.DriverID == driverId.Value);
            if (!tripExists) return NotFound(new { message = "Không tìm thấy chuyến xe" });

            var booking = await _context.Bookings
                .FirstOrDefaultAsync(b => b.BookingID == bookingId && b.TripID == tripId);
            if (booking == null) return NotFound(new { message = "Không tìm thấy đơn đặt vé" });

            if (booking.BookingStatus != BookingStatusConstant.Pending)
                return BadRequest(new { message = "Đơn này không cần thu tiền" });

            booking.BookingStatus = BookingStatusConstant.Confirmed;
            NotificationsController.AddNotification(
                _context,
                booking.UserID,
                "Đơn đặt vé đã được xác nhận",
                $"Đơn #{booking.BookingID} đã được xác nhận thanh toán.",
                1,
                $"/my-tickets/{booking.BookingID}");
            await _context.SaveChangesAsync();

            return Ok(new { bookingID = booking.BookingID, bookingStatus = booking.BookingStatus, message = "Đã xác nhận thu tiền" });
        }
    }

    public class CheckInRequest
    {
        public string? QRCode { get; set; }
        public int? TicketSeatId { get; set; }
    }

    public class IncidentRequest
    {
        public string? IncidentType { get; set; }
        public string? Description { get; set; }
    }

    public class DelayTripRequest
    {
        public DateTime NewDepartureTime { get; set; }
    }
}
