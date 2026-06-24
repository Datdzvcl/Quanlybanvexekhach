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
//     public class BusesController : ControllerBase
//     {
//         private readonly MySqlDbContext _context;

//         public BusesController(MySqlDbContext context)
//         {
//             _context = context;
//         }

//         [HttpGet]
//         public async Task<IActionResult> GetAll(
//             [FromQuery] string? licensePlate,
//             [FromQuery] string? busType,
//             [FromQuery] int? operatorId,
//             [FromQuery] int page = 1,
//             [FromQuery] int pageSize = 10)
//         {
//             page = Math.Max(page, 1);
//             pageSize = Math.Clamp(pageSize, 1, 100);

//             var query = _context.Buses
//                 .AsNoTracking()
//                 .Include(x => x.Operator)
//                 .AsQueryable();

//             if (!string.IsNullOrWhiteSpace(licensePlate))
//             {
//                 var keyword = licensePlate.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.LicensePlate, $"%{keyword}%"));
//             }

//             if (!string.IsNullOrWhiteSpace(busType))
//             {
//                 var keyword = busType.Trim();
//                 query = query.Where(x => EF.Functions.Like(x.BusType, $"%{keyword}%"));
//             }

//             if (operatorId.HasValue)
//                 query = query.Where(x => x.OperatorID == operatorId.Value);

//             var totalCount = await query.CountAsync();
//             var items = await query
//                 .OrderBy(x => x.BusID)
//                 .Skip((page - 1) * pageSize)
//                 .Take(pageSize)
//                 .Select(x => new
//                 {
//                     x.BusID,
//                     x.OperatorID,
//                     x.LicensePlate,
//                     x.Capacity,
//                     x.BusType,
//                     OperatorName = x.Operator != null ? x.Operator.Name : null
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

//         [HttpGet("{id:int}")]
//         public async Task<IActionResult> GetById(int id)
//         {
//             var bus = await _context.Buses
//                 .AsNoTracking()
//                 .Include(x => x.Operator)
//                 .Where(x => x.BusID == id)
//                 .Select(x => new
//                 {
//                     x.BusID,
//                     x.OperatorID,
//                     x.LicensePlate,
//                     x.Capacity,
//                     x.BusType,
//                     OperatorName = x.Operator != null ? x.Operator.Name : null
//                 })
//                 .FirstOrDefaultAsync();

//             if (bus == null)
//                 return NotFound();

//             return Ok(bus);
//         }

//         [HttpPost]
//         public async Task<IActionResult> Create([FromBody] Bus bus)
//         {
//             if (!await _context.Operators.AnyAsync(x => x.OperatorID == bus.OperatorID))
//                 return BadRequest(new { message = "Operator không tồn tại" });

//             _context.Buses.Add(bus);
//             await _context.SaveChangesAsync();

//             return Ok(bus);
//         }

//         [HttpPut("{id:int}")]
//         public async Task<IActionResult> Update(int id, [FromBody] Bus bus)
//         {
//             if (id != bus.BusID)
//                 return BadRequest("ID không khớp");

//             if (!await _context.Operators.AnyAsync(x => x.OperatorID == bus.OperatorID))
//                 return BadRequest(new { message = "Operator không tồn tại" });

//             _context.Entry(bus).State = EntityState.Modified;
//             await _context.SaveChangesAsync();

//             return Ok(bus);
//         }

//         [HttpDelete("{id:int}")]
//         public async Task<IActionResult> Delete(int id)
//         {
//             var bus = await _context.Buses.FindAsync(id);

//             if (bus == null)
//                 return NotFound();

//             _context.Buses.Remove(bus);
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
using BaseCore.Common;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Operator")]  // Chỉ nhà xe quản lý xe
    public class BusesController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public BusesController(MySqlDbContext context)
        {
            _context = context;
        }

        private async Task<int?> GetCurrentOperatorId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? licensePlate,
            [FromQuery] string? busType,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] string? tripFilter,   // "has_trip" | "no_trip"
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var operatorId = await GetCurrentOperatorId();
            if (!operatorId.HasValue)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var query = _context.Buses
                .AsNoTracking()
                .Include(x => x.Operator)
                .Where(x => x.OperatorID == operatorId.Value)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(licensePlate))
                query = query.Where(x => EF.Functions.Like(x.LicensePlate, $"%{licensePlate.Trim()}%"));

            if (!string.IsNullOrWhiteSpace(busType))
                query = query.Where(x => EF.Functions.Like(x.BusType, $"%{busType.Trim()}%"));

            bool hasDateRange = fromDate.HasValue && toDate.HasValue;
            if (hasDateRange)
            {
                var from = fromDate!.Value.Date;
                var to   = toDate!.Value.Date.AddDays(1); // toDate inclusive

                if (tripFilter == "has_trip")
                    query = query.Where(x => x.Trips.Any(t =>
                        t.Status != 3 &&
                        t.DepartureTime >= from && t.DepartureTime < to));

                else if (tripFilter == "no_trip")
                    query = query.Where(x => !x.Trips.Any(t =>
                        t.Status != 3 &&
                        t.DepartureTime >= from && t.DepartureTime < to));
            }

            var totalCount = await query.CountAsync();
            var now = DateTime.Now;

            if (hasDateRange)
            {
                var from = fromDate!.Value.Date;
                var to   = toDate!.Value.Date.AddDays(1);

                var items = await query
                    .OrderBy(x => x.BusID)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new
                    {
                        x.BusID, x.OperatorID, x.LicensePlate, x.Capacity,
                        x.BusType, x.Amenities, x.SeatLayout, x.BrandModel, x.Description,
                        OperatorName = x.Operator != null ? x.Operator.Name : null,
                        BusStatus = x.Trips.Any(t => t.Status == 1 ||
                                                     (t.Status == 0 && t.DepartureTime <= now && t.ArrivalTime >= now))
                                            ? "ongoing"
                                  : x.Trips.Any(t => t.Status == 0 && t.DepartureTime > now) ? "scheduled"
                                  : "idle",
                        HasTripInRange = x.Trips.Any(t =>
                            t.Status != 3 &&
                            t.DepartureTime >= from && t.DepartureTime < to),
                        TripCountInRange = x.Trips.Count(t =>
                            t.Status != 3 &&
                            t.DepartureTime >= from && t.DepartureTime < to)
                    })
                    .ToListAsync();

                return Ok(new { items, totalCount, page, pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
            }
            else
            {
                var items = await query
                    .OrderBy(x => x.BusID)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new
                    {
                        x.BusID, x.OperatorID, x.LicensePlate, x.Capacity,
                        x.BusType, x.Amenities, x.SeatLayout, x.BrandModel, x.Description,
                        OperatorName = x.Operator != null ? x.Operator.Name : null,
                        BusStatus = x.Trips.Any(t => t.Status == 1 ||
                                                     (t.Status == 0 && t.DepartureTime <= now && t.ArrivalTime >= now))
                                            ? "ongoing"
                                  : x.Trips.Any(t => t.Status == 0 && t.DepartureTime > now) ? "scheduled"
                                  : "idle",
                        HasTripInRange = (bool?)null,
                        TripCountInRange = (int?)null
                    })
                    .ToListAsync();

                return Ok(new { items, totalCount, page, pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var operatorId = await GetCurrentOperatorId();
            if (!operatorId.HasValue)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var bus = await _context.Buses
                .AsNoTracking()
                .Include(x => x.Operator)
                .Where(x => x.BusID == id && x.OperatorID == operatorId.Value)
                .Select(x => new
                {
                    x.BusID, x.OperatorID, x.LicensePlate, x.Capacity,
                    x.BusType, x.Amenities, x.SeatLayout, x.BrandModel, x.Description,
                    OperatorName = x.Operator != null ? x.Operator.Name : null
                })
                .FirstOrDefaultAsync();

            if (bus == null) return NotFound();
            return Ok(bus);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Bus bus)
        {
            var operatorId = await GetCurrentOperatorId();
            if (!operatorId.HasValue)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            // Ép OperatorID = nhà xe đang login, không cho tạo xe cho nhà xe khác
            bus.OperatorID = operatorId.Value;

            _context.Buses.Add(bus);
            await _context.SaveChangesAsync();
            return Ok(bus);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Bus bus)
        {
            if (id != bus.BusID)
                return BadRequest("ID không khớp");

            var operatorId = await GetCurrentOperatorId();
            if (!operatorId.HasValue)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var existing = await _context.Buses.AsNoTracking()
                .FirstOrDefaultAsync(x => x.BusID == id);
            if (existing == null) return NotFound();
            if (existing.OperatorID != operatorId.Value) return Forbid();

            bus.OperatorID = operatorId.Value;
            _context.Entry(bus).State = EntityState.Modified;

            // Nếu capacity thay đổi → đồng bộ AvailableSeats của các chuyến chưa khởi hành
            if (bus.Capacity != existing.Capacity)
            {
                var futureTrips = await _context.Trips
                    .Where(t => t.BusID == id
                             && t.DepartureTime > DateTime.Now
                             && t.Status != TripStatusConstant.Cancelled)
                    .ToListAsync();

                foreach (var trip in futureTrips)
                {
                    var bookedSeats = existing.Capacity - trip.AvailableSeats;
                    trip.AvailableSeats = Math.Max(0, bus.Capacity - bookedSeats);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(bus);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var operatorId = await GetCurrentOperatorId();
            if (!operatorId.HasValue)
                return BadRequest(new { message = "Tài khoản chưa liên kết với nhà xe" });

            var bus = await _context.Buses.FirstOrDefaultAsync(x => x.BusID == id);
            if (bus == null) return NotFound();
            if (bus.OperatorID != operatorId.Value) return Forbid();

            _context.Buses.Remove(bus);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}