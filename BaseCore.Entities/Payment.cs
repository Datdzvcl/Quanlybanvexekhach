namespace BaseCore.Entities
{
    public class Payment
    {
        public int PaymentID { get; set; }
        public int BookingID { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        // public string PaymentStatus { get; set; } = string.Empty;
        public string? TransactionCode { get; set; }
        public DateTime? PaidAt { get; set; }
        public DateTime CreatedAt { get; set; }

        public Booking? Booking { get; set; }
    }
}
