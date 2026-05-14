using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class BusesController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public BusesController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? licensePlate,
            [FromQuery] string? busType,
            [FromQuery] int? operatorId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Buses
                .AsNoTracking()
                .Include(x => x.Operator)
                .AsQueryable();

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

            if (operatorId.HasValue)
                query = query.Where(x => x.OperatorID == operatorId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(x => x.BusID)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.BusID,
                    x.OperatorID,
                    x.LicensePlate,
                    x.Capacity,
                    x.BusType,
                    OperatorName = x.Operator != null ? x.Operator.Name : null
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

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var bus = await _context.Buses
                .AsNoTracking()
                .Include(x => x.Operator)
                .Where(x => x.BusID == id)
                .Select(x => new
                {
                    x.BusID,
                    x.OperatorID,
                    x.LicensePlate,
                    x.Capacity,
                    x.BusType,
                    OperatorName = x.Operator != null ? x.Operator.Name : null
                })
                .FirstOrDefaultAsync();

            if (bus == null)
                return NotFound();

            return Ok(bus);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Bus bus)
        {
            if (!await _context.Operators.AnyAsync(x => x.OperatorID == bus.OperatorID))
                return BadRequest(new { message = "Operator không tồn tại" });

            _context.Buses.Add(bus);
            await _context.SaveChangesAsync();

            return Ok(bus);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Bus bus)
        {
            if (id != bus.BusID)
                return BadRequest("ID không khớp");

            if (!await _context.Operators.AnyAsync(x => x.OperatorID == bus.OperatorID))
                return BadRequest(new { message = "Operator không tồn tại" });

            _context.Entry(bus).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(bus);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var bus = await _context.Buses.FindAsync(id);

            if (bus == null)
                return NotFound();

            _context.Buses.Remove(bus);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
