using BaseCore.Entities;
using BaseCore.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/promotions")]
    [ApiController]
    public class PromotionsController : ControllerBase
    {
        private readonly MySqlDbContext _context;

        public PromotionsController(MySqlDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> GetAll()
        {
            var currentUserId = GetCurrentUserId();
            var isAdmin = User.IsInRole("Admin");
            var query = _context.Promotions
                .AsNoTracking()
                .Include(x => x.User)
                .AsQueryable();

            if (!isAdmin)
                query = query.Where(x => x.UserID == currentUserId);

            var items = await query
                .OrderByDescending(x => x.PromotionID)
                .Select(x => new
                {
                    x.PromotionID,
                    x.Code,
                    x.Description,
                    x.DiscountType,
                    x.DiscountValue,
                    x.MinOrderValue,
                    x.MaxDiscount,
                    x.UsageLimit,
                    x.UsedCount,
                    RemainingUses = x.UsageLimit.HasValue ? x.UsageLimit.Value - x.UsedCount : (int?)null,
                    x.StartDate,
                    x.EndDate,
                    x.IsActive,
                    x.IsPublic,
                    x.UserID,
                    ownerName = x.User != null ? x.User.FullName : null
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic()
        {
            var now = DateTime.Now;
            var items = await _context.Promotions
                .AsNoTracking()
                .Where(x => x.IsActive
                    && x.IsPublic
                    && x.StartDate <= now
                    && x.EndDate >= now
                    && (!x.UsageLimit.HasValue || x.UsedCount < x.UsageLimit.Value))
                .OrderBy(x => x.EndDate)
                .ThenByDescending(x => x.PromotionID)
                .Select(x => new
                {
                    x.PromotionID,
                    x.Code,
                    x.Description,
                    x.DiscountType,
                    x.DiscountValue,
                    x.MinOrderValue,
                    x.MaxDiscount,
                    x.UsageLimit,
                    x.UsedCount,
                    RemainingUses = x.UsageLimit.HasValue ? x.UsageLimit.Value - x.UsedCount : (int?)null,
                    x.StartDate,
                    x.EndDate
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Operator")]
        public async Task<IActionResult> GetById(int id)
        {
            var currentUserId = GetCurrentUserId();
            var isAdmin = User.IsInRole("Admin");
            var promotion = await _context.Promotions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PromotionID == id && (isAdmin || x.UserID == currentUserId));

            return promotion == null ? NotFound() : Ok(promotion);
        }

        [HttpPost]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> Create([FromBody] PromotionRequest request)
        {
            var code = NormalizeCode(request.Code);
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Mã giảm giá là bắt buộc." });

            if (await _context.Promotions.AnyAsync(x => x.Code == code))
                return Conflict(new { message = "Mã giảm giá đã tồn tại." });

            var validationError = ValidatePromotionRequest(request);
            if (validationError != null)
                return BadRequest(new { message = validationError });

            var promotion = new Promotion
            {
                UserID = GetCurrentUserId()
            };

            ApplyRequest(promotion, request, code);
            _context.Promotions.Add(promotion);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = promotion.PromotionID }, promotion);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> Update(int id, [FromBody] PromotionRequest request)
        {
            var currentUserId = GetCurrentUserId();
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null)
                return NotFound();

            if (promotion.UserID != currentUserId)
                return Forbid();

            var code = NormalizeCode(request.Code);
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Mã giảm giá là bắt buộc." });

            if (await _context.Promotions.AnyAsync(x => x.PromotionID != id && x.Code == code))
                return Conflict(new { message = "Mã giảm giá đã tồn tại." });

            var validationError = ValidatePromotionRequest(request);
            if (validationError != null)
                return BadRequest(new { message = validationError });

            ApplyRequest(promotion, request, code);
            await _context.SaveChangesAsync();

            return Ok(promotion);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> Disable(int id)
        {
            var currentUserId = GetCurrentUserId();
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null)
                return NotFound();

            if (promotion.UserID != currentUserId)
                return Forbid();

            promotion.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { promotion.PromotionID, promotion.Code, promotion.IsActive });
        }

        [HttpPost("validate")]
        [AllowAnonymous]
        public async Task<IActionResult> Validate([FromBody] PromotionValidateRequest request)
        {
            var result = await ValidatePromotionAsync(
                request.Code,
                request.OrderValue,
                GetCurrentUserId());

            return Ok(result);
        }

        internal static PromotionValidationResult ValidatePromotionEntity(
            Promotion promotion,
            decimal orderValue,
            int? currentUserId,
            DateTime now)
        {
            if (!promotion.IsActive)
                return PromotionValidationResult.Invalid("Mã giảm giá đang tắt.", orderValue);

            if (now < promotion.StartDate)
                return PromotionValidationResult.Invalid("Mã giảm giá chưa đến ngày sử dụng.", orderValue);

            if (now > promotion.EndDate)
                return PromotionValidationResult.Invalid("Mã giảm giá đã hết hạn.", orderValue);

            if (promotion.MinOrderValue.HasValue && orderValue < promotion.MinOrderValue.Value)
                return PromotionValidationResult.Invalid($"Đơn hàng tối thiểu {promotion.MinOrderValue.Value:n0} VND.", orderValue);

            if (promotion.UsageLimit.HasValue && promotion.UsedCount >= promotion.UsageLimit.Value)
                return PromotionValidationResult.Invalid("Mã giảm giá đã hết lượt sử dụng.", orderValue);

            if (!promotion.IsPublic)
            {
                if (!currentUserId.HasValue || promotion.UserID != currentUserId.Value)
                    return PromotionValidationResult.Invalid("Mã giảm giá không áp dụng cho tài khoản này.", orderValue);
            }

            var discountAmount = CalculateDiscountAmount(promotion, orderValue);
            return new PromotionValidationResult
            {
                Valid = discountAmount > 0,
                PromotionId = promotion.PromotionID,
                DiscountAmount = discountAmount,
                FinalAmount = Math.Max(0, orderValue - discountAmount),
                Message = discountAmount > 0 ? "Áp dụng mã thành công." : "Mã giảm giá không tạo ra mức giảm hợp lệ."
            };
        }

        private async Task<PromotionValidationResult> ValidatePromotionAsync(
            string? code,
            decimal orderValue,
            int? currentUserId)
        {
            var normalizedCode = NormalizeCode(code);
            if (string.IsNullOrWhiteSpace(normalizedCode))
                return PromotionValidationResult.Invalid("Vui lòng nhập mã giảm giá.", orderValue);

            if (orderValue <= 0)
                return PromotionValidationResult.Invalid("Giá trị đơn hàng không hợp lệ.", orderValue);

            var promotion = await _context.Promotions.FirstOrDefaultAsync(x => x.Code == normalizedCode);
            if (promotion == null)
                return PromotionValidationResult.Invalid("Mã giảm giá không tồn tại.", orderValue);

            return ValidatePromotionEntity(promotion, orderValue, currentUserId, DateTime.Now);
        }

        private static string? ValidatePromotionRequest(PromotionRequest request)
        {
            if (request.DiscountValue <= 0)
                return "Giá trị giảm phải lớn hơn 0.";

            if (request.DiscountType == 1 && request.DiscountValue > 100)
                return "Giảm theo phần trăm không được vượt quá 100.";

            if (request.EndDate < request.StartDate)
                return "Ngày kết thúc phải sau ngày bắt đầu.";

            return null;
        }

        private static decimal CalculateDiscountAmount(Promotion promotion, decimal orderValue)
        {
            decimal discountAmount = promotion.DiscountType == 1
                ? orderValue * promotion.DiscountValue / 100m
                : promotion.DiscountValue;

            if (promotion.MaxDiscount.HasValue)
                discountAmount = Math.Min(discountAmount, promotion.MaxDiscount.Value);

            return Math.Min(Math.Max(0, Math.Round(discountAmount, 0)), orderValue);
        }

        private static void ApplyRequest(Promotion promotion, PromotionRequest request, string code)
        {
            promotion.Code = code;
            promotion.Description = NormalizeOptionalText(request.Description);
            promotion.DiscountType = request.DiscountType;
            promotion.DiscountValue = request.DiscountValue;
            promotion.MinOrderValue = request.MinOrderValue;
            promotion.MaxDiscount = request.MaxDiscount;
            promotion.UsageLimit = request.UsageLimit;
            promotion.StartDate = request.StartDate;
            promotion.EndDate = request.EndDate;
            promotion.IsActive = request.IsActive;
            promotion.IsPublic = request.IsPublic;
            if (promotion.PromotionID == 0)
                promotion.UsedCount = 0;
        }

        private int? GetCurrentUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claimValue, out var userId) ? userId : null;
        }

        private static string NormalizeCode(string? code)
        {
            return string.IsNullOrWhiteSpace(code) ? string.Empty : code.Trim().ToUpperInvariant();
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }

    public class PromotionRequest
    {
        public string? Code { get; set; }
        public string? Description { get; set; }
        public byte DiscountType { get; set; } = 1;
        public decimal DiscountValue { get; set; }
        public decimal? MinOrderValue { get; set; }
        public decimal? MaxDiscount { get; set; }
        public int? UsageLimit { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsPublic { get; set; } = true;
    }

    public class PromotionValidateRequest
    {
        public string? Code { get; set; }
        public decimal OrderValue { get; set; }
    }

    public class PromotionValidationResult
    {
        public bool Valid { get; set; }
        public int? PromotionId { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public string Message { get; set; } = string.Empty;

        public static PromotionValidationResult Invalid(string message, decimal orderValue = 0)
        {
            return new PromotionValidationResult
            {
                Valid = false,
                DiscountAmount = 0,
                FinalAmount = Math.Max(0, orderValue),
                Message = message
            };
        }
    }
}
