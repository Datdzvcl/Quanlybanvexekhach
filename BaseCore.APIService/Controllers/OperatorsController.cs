// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using BaseCore.Entities;
// using BaseCore.Repository;

// namespace BaseCore.APIService.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     [Authorize(Roles = "Admin")]
//     public class OperatorsController : ControllerBase
//     {
//         private readonly MySqlDbContext _context;

//         public OperatorsController(MySqlDbContext context)
//         {
//             _context = context;
//         }

//         [HttpGet]
//         public async Task<IActionResult> GetAll(
//             [FromQuery] string? name,
//             [FromQuery] string? phone,
//             [FromQuery] string? email,
//             [FromQuery] int page = 1,
//             [FromQuery] int pageSize = 10)
//         {
//             page = Math.Max(page, 1);
//             pageSize = Math.Clamp(pageSize, 1, 100);

//             var query = _context.Operators.AsNoTracking().AsQueryable();

//             if (!string.IsNullOrWhiteSpace(name))
//             {
//                 var keyword = name.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.Name, $"%{keyword}%"));
//             }

//             if (!string.IsNullOrWhiteSpace(phone))
//             {
//                 var keyword = phone.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.ContactPhone, $"%{keyword}%"));
//             }

//             if (!string.IsNullOrWhiteSpace(email))
//             {
//                 var keyword = email.Trim();
//                 query = query.Where(x => x.Email != null && EF.Functions.Like(x.Email, $"%{keyword}%"));
//             }

//             var totalCount = await query.CountAsync();
//             var items = await query
//                 .OrderBy(x => x.OperatorID)
//                 .Skip((page - 1) * pageSize)
//                 .Take(pageSize)
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

//         [HttpGet("{id:int}")]
//         public async Task<IActionResult> GetById(int id)
//         {
//             var item = await _context.Operators
//                 .AsNoTracking()
//                 .FirstOrDefaultAsync(x => x.OperatorID == id);

//             if (item == null)
//                 return NotFound();

//             return Ok(item);
//         }

//         [HttpPost]
//         public async Task<IActionResult> Create([FromBody] Operator item)
//         {
//             _context.Operators.Add(item);
//             await _context.SaveChangesAsync();

//             return Ok(item);
//         }

//         [HttpPut("{id:int}")]
//         public async Task<IActionResult> Update(int id, [FromBody] Operator item)
//         {
//             if (id != item.OperatorID)
//                 return BadRequest("ID không khớp");

//             _context.Entry(item).State = EntityState.Modified;
//             await _context.SaveChangesAsync();

//             return Ok(item);
//         }

//         [HttpDelete("{id:int}")]
//         public async Task<IActionResult> Delete(int id)
//         {
//             var item = await _context.Operators.FindAsync(id);

//             if (item == null)
//                 return NotFound();

//             _context.Operators.Remove(item);
//             await _context.SaveChangesAsync();

//             return Ok();
//         }
//     }
// }


using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;
using System.Security.Claims;
using BaseCore.Common;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OperatorsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public OperatorsController(MySqlDbContext context)
        {
            _context = context;
        }

        // Lấy OperatorID của user đang login
        private async Task<int?> GetCurrentOperatorId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;

            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }

        // ==================== ADMIN APIs ====================

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] string? name,
            [FromQuery] string? phone,
            [FromQuery] string? email,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Operators.AsNoTracking().AsQueryable();

            if (isActive.HasValue)
                query = query.Where(x => x.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim();
                query = query.Where(x =>
                    EF.Functions.Like(x.Name, $"%{kw}%") ||
                    EF.Functions.Like(x.ContactPhone, $"%{kw}%") ||
                    (x.Email != null && EF.Functions.Like(x.Email, $"%{kw}%")));
            }

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(x => EF.Functions.Like(x.Name, $"%{name.Trim()}%"));

            if (!string.IsNullOrWhiteSpace(phone))
                query = query.Where(x => EF.Functions.Like(x.ContactPhone, $"%{phone.Trim()}%"));

            if (!string.IsNullOrWhiteSpace(email))
                query = query.Where(x => x.Email != null && EF.Functions.Like(x.Email, $"%{email.Trim()}%"));

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(x => x.OperatorID)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { items, totalCount, page, pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.Operators.AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperatorID == id);
            return item == null ? NotFound() : Ok(item);
        }

        // Public: danh sách nhà xe cho filter tìm kiếm
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicList()
        {
            var items = await _context.Operators
                .AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Name)
                .Select(x => new {
                    x.OperatorID,
                    x.Name,
                    averageRating = _context.Reviews
                        .Where(r => r.Booking != null && r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.OperatorID)
                        .Select(r => (double?)r.Rating).Average() ?? 0,
                    reviewCount = _context.Reviews
                        .Count(r => r.Booking != null && r.Booking.Trip != null && r.Booking.Trip.Bus != null && r.Booking.Trip.Bus.OperatorID == x.OperatorID)
                })
                .ToListAsync();
            return Ok(items);
        }

        // Public: xem hồ sơ nhà xe (không cần đăng nhập)
        [HttpGet("{id:int}/profile")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProfile(int id)
        {
            var item = await _context.Operators.AsNoTracking()
                .Where(x => x.OperatorID == id && x.IsActive)
                .Select(x => new {
                    x.OperatorID, x.Name, x.Description, x.ContactPhone, x.Email
                })
                .FirstOrDefaultAsync();
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] Operator item)
        {
            _context.Operators.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] Operator item)
        {
            if (id != item.OperatorID)
                return BadRequest("ID không khớp");
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Operators.FindAsync(id);
            if (item == null) return NotFound();
            _context.Operators.Remove(item);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // Duyệt nhà xe: IsActive = true, cấp role Operator cho user liên kết
        [HttpPut("{id:int}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(int id)
        {
            var op = await _context.Operators.FindAsync(id);
            if (op == null) return NotFound();

            op.IsActive = true;
            op.RejectReason = null;

            // Cấp role Operator cho tất cả user liên kết với nhà xe này
            var linkedUsers = await _context.Users
                .Where(u => u.OperatorID == id)
                .ToListAsync();
            foreach (var u in linkedUsers)
                u.Role = RoleConstant.Operator;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã duyệt nhà xe", operatorID = id });
        }

        // Từ chối nhà xe: lưu lý do, giữ IsActive = false
        [HttpPut("{id:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectOperatorRequest request)
        {
            var op = await _context.Operators.FindAsync(id);
            if (op == null) return NotFound();

            op.IsActive = false;
            op.RejectReason = request.Reason?.Trim();

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã từ chối nhà xe", operatorID = id, reason = op.RejectReason });
        }

        // ==================== OPERATOR APIs ====================

        // Nhà xe xem thông tin của mình
        [HttpGet("me")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetMe()
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var item = await _context.Operators.AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperatorID == operatorId);
            return item == null ? NotFound() : Ok(item);
        }

        // Nhà xe cập nhật thông tin của mình
        [HttpPut("me")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> UpdateMe([FromBody] OperatorUpdateRequest request)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var item = await _context.Operators.FindAsync(operatorId);
            if (item == null) return NotFound();

            item.Name = request.Name ?? item.Name;
            item.Description = request.Description ?? item.Description;
            item.ContactPhone = request.ContactPhone ?? item.ContactPhone;
            item.Email = request.Email ?? item.Email;
            if (request.LogoUrl != null) item.LogoUrl = request.LogoUrl;

            await _context.SaveChangesAsync();
            return Ok(item);
        }

        // Nhà xe xem chuyến xe của mình
        [HttpGet("me/trips")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetMyTrips(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Trips
                .AsNoTracking()
                .Include(x => x.Bus)
                .Where(x => x.Bus.OperatorID == operatorId);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.DepartureTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.TripID, x.DepartureLocation, x.ArrivalLocation,
                    x.DepartureTime, x.ArrivalTime, x.Price,
                    x.AvailableSeats, x.Status,
                    BusType = x.Bus.BusType,
                    LicensePlate = x.Bus.LicensePlate
                })
                .ToListAsync();

            return Ok(new { items, totalCount, page, pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }

        // Nhà xe xem đơn đặt vé của mình
        [HttpGet("me/bookings")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetMyBookings(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] byte? status = null)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Bookings
                .AsNoTracking()
                .Include(x => x.Trip).ThenInclude(x => x.Bus)
                .Where(x => x.Trip.Bus.OperatorID == operatorId);

            if (status.HasValue)
                query = query.Where(x => x.BookingStatus == status.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.BookingDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.BookingID, x.CustomerName, x.CustomerPhone,
                    x.TotalSeats, x.TotalPrice, x.BookingStatus, x.BookingDate,
                    TripRoute = $"{x.Trip.DepartureLocation} - {x.Trip.ArrivalLocation}",
                    DepartureTime = x.Trip.DepartureTime
                })
                .ToListAsync();

            return Ok(new { items, totalCount, page, pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }

        // Nhà xe xem đánh giá của mình
        [HttpGet("me/reviews")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetMyReviews(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Reviews
                .AsNoTracking()
                .Include(x => x.Booking).ThenInclude(x => x.Trip).ThenInclude(x => x.Bus)
                .Include(x => x.User)
                .Where(x => x.Booking.Trip.Bus.OperatorID == operatorId);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.ReviewID, x.Rating, x.Comment, x.CreatedAt,
                    UserName = x.User.FullName,
                    TripRoute = $"{x.Booking.Trip.DepartureLocation} - {x.Booking.Trip.ArrivalLocation}"
                })
                .ToListAsync();

            return Ok(new { items, totalCount, page, pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                averageRating = totalCount == 0 ? 0 :
                    Math.Round(await query.AverageAsync(x => (double)x.Rating), 1) });
        }

        // Lấy danh sách tài xế thuộc nhà xe
        [HttpGet("me/drivers")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetMyDrivers()
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var drivers = await _context.Users
                .AsNoTracking()
                .Where(u => u.OperatorID == operatorId && u.Role == BaseCore.Common.RoleConstant.Driver)
                .Select(u => new
                {
                    u.UserID,
                    u.FullName,
                    u.Phone,
                    u.Email
                })
                .ToListAsync();

            return Ok(drivers);
        }

        // Danh sách sự cố chuyến xe thuộc nhà xe
        [HttpGet("me/incidents")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetMyIncidents(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            page     = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.TripIncidents
                .AsNoTracking()
                .Include(i => i.Trip).ThenInclude(t => t!.Bus)
                .Include(i => i.Driver)
                .Where(i => i.Trip != null && i.Trip.Bus != null && i.Trip.Bus.OperatorID == operatorId);

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

        // Đánh dấu sự cố đã xử lý
        [HttpPut("me/incidents/{incidentId:int}/resolve")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> ResolveIncident(int incidentId)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var incident = await _context.TripIncidents
                .Include(i => i.Trip).ThenInclude(t => t!.Bus)
                .FirstOrDefaultAsync(i => i.IncidentID == incidentId
                                       && i.Trip != null
                                       && i.Trip.Bus != null
                                       && i.Trip.Bus.OperatorID == operatorId);

            if (incident == null)
                return NotFound(new { message = "Không tìm thấy sự cố" });

            incident.IsResolved = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã đánh dấu xử lý", incidentID = incident.IncidentID });
        }

        // Gán / bỏ tài xế cho chuyến xe
        [HttpPut("me/trips/{tripId:int}/assign-driver")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> AssignDriver(int tripId, [FromBody] AssignDriverRequest request)
        {
            var operatorId = await GetCurrentOperatorId();
            if (operatorId == null)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var trip = await _context.Trips
                .Include(t => t.Bus)
                .FirstOrDefaultAsync(t => t.TripID == tripId && t.Bus!.OperatorID == operatorId);

            if (trip == null)
                return NotFound(new { message = "Không tìm thấy chuyến xe" });

            if (request.DriverID.HasValue)
            {
                var driverExists = await _context.Users
                    .AnyAsync(u => u.UserID == request.DriverID.Value &&
                                   u.OperatorID == operatorId &&
                                   u.Role == BaseCore.Common.RoleConstant.Driver);
                if (!driverExists)
                    return BadRequest(new { message = "Tài xế không thuộc nhà xe này" });

                // Kiểm tra lịch tài xế có trùng không (buffer 4 giờ nghỉ ngơi)
                var driverBuffer = TimeSpan.FromHours(12);
                var driverWindowStart = trip.DepartureTime.Subtract(driverBuffer);
                var driverWindowEnd   = trip.ArrivalTime.Add(driverBuffer);
                var driverConflict = await _context.Trips
                    .AsNoTracking()
                    .AnyAsync(x => x.DriverID == request.DriverID.Value
                                && x.TripID != tripId
                                && x.Status != TripStatusConstant.Cancelled
                                && x.DepartureTime < driverWindowEnd
                                && driverWindowStart < x.ArrivalTime);
                if (driverConflict)
                    return BadRequest(new { message = "Tài xế này đã có lịch lái trong khoảng thời gian này hoặc chưa đủ thời gian nghỉ ngơi (tối thiểu 12 giờ giữa các chuyến)." });

                trip.DriverID = request.DriverID.Value;
            }
            else
            {
                trip.DriverID = null;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật tài xế thành công", tripID = tripId, driverID = trip.DriverID });
        }
    }

    public class OperatorUpdateRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? ContactPhone { get; set; }
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
    }

    public class AssignDriverRequest
    {
        public int? DriverID { get; set; }
    }

    public class RejectOperatorRequest
    {
        public string? Reason { get; set; }
    }
}