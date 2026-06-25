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
        private async Task<int?> GetCurrentOperatorId()
        {
            if (!User.IsInRole("Operator")) return null;
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId)) return null;
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserID == userId);
            return user?.OperatorID;
        }
        [HttpGet]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetAll()
        {
            var currentOperatorId = await GetCurrentOperatorId();
            var items = await _context.Promotions
                .AsNoTracking()
                .Where(x => x.OperatorID == currentOperatorId)
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
                    x.StartDate,
                    x.EndDate,
                    x.IsActive,
                    x.IsPublic,
                    x.UserID
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("public")]
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
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> GetById(int id)
        {
            var promotion = await _context.Promotions.AsNoTracking().FirstOrDefaultAsync(x => x.PromotionID == id);
            return promotion == null ? NotFound() : Ok(promotion);
        }

        [HttpPost]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> Create([FromBody] PromotionRequest request)
        {
            var code = NormalizeCode(request.Code);
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Ma giam gia la bat buoc" });

            if (await _context.Promotions.AnyAsync(x => x.Code == code))
                return Conflict(new { message = "Ma giam gia da ton tai" });

            var promotion = new Promotion();
            promotion.OperatorID = await GetCurrentOperatorId();
            ApplyRequest(promotion, request, code);

            _context.Promotions.Add(promotion);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = promotion.PromotionID }, promotion);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> Update(int id, [FromBody] PromotionRequest request)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null)
                return NotFound();
            var currentOperatorId = await GetCurrentOperatorId();
            if (promotion.OperatorID != currentOperatorId)
                return Forbid();

            var code = NormalizeCode(request.Code);
            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Ma giam gia la bat buoc" });

            var exists = await _context.Promotions.AnyAsync(x => x.PromotionID != id && x.Code == code);
            if (exists)
                return Conflict(new { message = "Ma giam gia da ton tai" });

            ApplyRequest(promotion, request, code);
            await _context.SaveChangesAsync();

            return Ok(promotion);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Operator")]
        public async Task<IActionResult> Disable(int id)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null)
                return NotFound();
            var currentOperatorId = await GetCurrentOperatorId();
            if (promotion.OperatorID != currentOperatorId)
                return Forbid();

            promotion.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { promotion.PromotionID, promotion.Code, promotion.IsActive });
        }

        [HttpPost("validate")]
        public async Task<IActionResult> Validate([FromBody] PromotionValidateRequest request)
        {
            var result = await ValidatePromotionAsync(
                request.Code,
                request.OrderValue,
                GetCurrentUserId(),
                incrementUsage: false);

            return Ok(result);
        }

        internal static PromotionValidationResult ValidatePromotionEntity(
            Promotion promotion,
            decimal orderValue,
            int? currentUserId,
            DateTime now)
        {
            if (!promotion.IsActive)
                return PromotionValidationResult.Invalid("Ma giam gia dang tat");

            if (now < promotion.StartDate)
                return PromotionValidationResult.Invalid("Ma giam gia chua den ngay su dung");

            if (now > promotion.EndDate)
                return PromotionValidationResult.Invalid("Ma giam gia da het han");

            if (promotion.MinOrderValue.HasValue && orderValue < promotion.MinOrderValue.Value)
                return PromotionValidationResult.Invalid($"Don hang toi thieu {promotion.MinOrderValue.Value:n0} VND");

            if (promotion.UsageLimit.HasValue && promotion.UsedCount >= promotion.UsageLimit.Value)
                return PromotionValidationResult.Invalid("Ma giam gia da het luot su dung");

            if (!promotion.IsPublic)
            {
                if (!currentUserId.HasValue || promotion.UserID != currentUserId.Value)
                    return PromotionValidationResult.Invalid("Ma giam gia khong ap dung cho tai khoan nay");
            }

            var discountAmount = CalculateDiscountAmount(promotion, orderValue);
            return new PromotionValidationResult
            {
                Valid = discountAmount > 0,
                PromotionId = promotion.PromotionID,
                DiscountAmount = discountAmount,
                FinalAmount = orderValue - discountAmount,
                Message = discountAmount > 0 ? "Ap dung ma thanh cong" : "Ma giam gia khong tao ra giam gia"
            };
        }

        private async Task<PromotionValidationResult> ValidatePromotionAsync(
            string? code,
            decimal orderValue,
            int? currentUserId,
            bool incrementUsage)
        {
            var normalizedCode = NormalizeCode(code);
            if (string.IsNullOrWhiteSpace(normalizedCode))
                return PromotionValidationResult.Invalid("Vui long nhap ma giam gia", orderValue);

            if (orderValue <= 0)
                return PromotionValidationResult.Invalid("Gia tri don hang khong hop le", orderValue);

            var promotion = await _context.Promotions.FirstOrDefaultAsync(x => x.Code == normalizedCode);
            if (promotion == null)
                return PromotionValidationResult.Invalid("Ma giam gia khong ton tai", orderValue);

            var result = ValidatePromotionEntity(promotion, orderValue, currentUserId, DateTime.Now);
            if (result.Valid && incrementUsage)
                promotion.UsedCount += 1;

            return result;
        }

        private static decimal CalculateDiscountAmount(Promotion promotion, decimal orderValue)
        {
            decimal discountAmount;
            if (promotion.DiscountType == 1)
            {
                discountAmount = orderValue * promotion.DiscountValue / 100m;
            }
            else
            {
                discountAmount = promotion.DiscountValue;
            }

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
            promotion.UserID = request.IsPublic ? null : request.UserID; // khách hàng cụ thể (private promo)
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
        public int? UserID { get; set; }
    }

    public class PromotionValidateRequest
    {
        public string? Code { get; set; }
        public int? UserId { get; set; }
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
