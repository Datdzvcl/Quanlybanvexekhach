namespace BaseCore.Entities
{
    public class Promotion
    {
        public int PromotionID { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public byte DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MinOrderValue { get; set; }
        public decimal? MaxDiscount { get; set; }
        public int? UsageLimit { get; set; }
        public int UsedCount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsPublic { get; set; }
        public bool IsNewUserOnly { get; set; } // chỉ áp dụng cho khách chưa đặt vé lần nào
        public int? UserID { get; set; }   // khách hàng được dùng (private promo)
        public int? OperatorID { get; set; } // nhà xe tạo ra mã này

        public User? User { get; set; }
        public Operator? Operator { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
