using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.APIService.Controllers
{
    [Route("api/stations")]
    [ApiController]
    public class BusStationsController : ControllerBase
    {
        private readonly MySqlDbContext _context;
        public BusStationsController(MySqlDbContext context) => _context = context;

        // GET /api/stations?q=&province= — dùng cho dropdown operator tạo chuyến
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] string? q, [FromQuery] string? province)
        {
            var query = _context.BusStations.AsNoTracking().Where(s => s.IsActive);
            if (!string.IsNullOrWhiteSpace(province))
                query = query.Where(s => s.Province.Contains(province));
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(s => s.StationName.Contains(q) || s.Province.Contains(q));

            var list = await query.OrderBy(s => s.Province).ThenBy(s => s.StationName)
                .Select(s => new { s.StationID, s.Province, s.StationName, s.Address })
                .ToListAsync();
            return Ok(list);
        }

        // GET /api/stations/admin — Admin quản lý danh mục
        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdmin([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 15)
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page = Math.Max(page, 1);

            var query = _context.BusStations.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(s => s.StationName.Contains(q) || s.Province.Contains(q));

            var total = await query.CountAsync();
            var items = await query.OrderBy(s => s.Province).ThenBy(s => s.StationName)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();

            return Ok(new { items, totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize) });
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] BusStation dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Province) || string.IsNullOrWhiteSpace(dto.StationName))
                return BadRequest("Tỉnh và tên bến xe là bắt buộc.");
            var entity = new BusStation { Province = dto.Province.Trim(), StationName = dto.StationName.Trim(), Address = dto.Address?.Trim(), IsActive = true };
            _context.BusStations.Add(entity);
            await _context.SaveChangesAsync();
            return Ok(entity);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] BusStation dto)
        {
            var entity = await _context.BusStations.FindAsync(id);
            if (entity == null) return NotFound();
            entity.Province = dto.Province.Trim();
            entity.StationName = dto.StationName.Trim();
            entity.Address = dto.Address?.Trim();
            entity.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();
            return Ok(entity);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.BusStations.FindAsync(id);
            if (entity == null) return NotFound();
            _context.BusStations.Remove(entity);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}
