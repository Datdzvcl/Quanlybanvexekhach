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
    public class OperatorsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public OperatorsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? name,
            [FromQuery] string? phone,
            [FromQuery] string? email,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.Operators.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
            {
                var keyword = name.Trim();
                query = query.Where(x => EF.Functions.Like(x.Name, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(phone))
            {
                var keyword = phone.Trim();
                query = query.Where(x => EF.Functions.Like(x.ContactPhone, $"%{keyword}%"));
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                var keyword = email.Trim();
                query = query.Where(x => x.Email != null && EF.Functions.Like(x.Email, $"%{keyword}%"));
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(x => x.OperatorID)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
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
            var item = await _context.Operators
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OperatorID == id);

            if (item == null)
                return NotFound();

            return Ok(item);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Operator item)
        {
            _context.Operators.Add(item);
            await _context.SaveChangesAsync();

            return Ok(item);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Operator item)
        {
            if (id != item.OperatorID)
                return BadRequest("ID không khớp");

            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(item);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.Operators.FindAsync(id);

            if (item == null)
                return NotFound();

            _context.Operators.Remove(item);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
