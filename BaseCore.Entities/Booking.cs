namespace BaseCore.Entities
{
    public class Booking
    {
        public int BookingID { get; set; }
        public int TripID { get; set; }
        public int? UserID { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string? CustomerEmail { get; set; }
        public int TotalSeats { get; set; }
        public decimal TotalPrice { get; set; }
        public string? PaymentMethod { get; set; }
        public string? PaymentStatus { get; set; }
        public byte BookingStatus { get; set; }
        public DateTime? BookingDate { get; set; }
        public int? PickupStopID { get; set; }
        public int? DropoffStopID { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CancelReason { get; set; }
        public decimal? RefundAmount { get; set; }
        public int? PromotionID { get; set; }
        public decimal? DiscountAmount { get; set; }
        public User? User { get; set; }
        public Trip? Trip { get; set; }
        public Promotion? Promotion { get; set; }
        public List<TicketSeat>? TicketSeats { get; set; }
        public List<SeatHold>? SeatHolds { get; set; }
        public Review? Review { get; set; }
        public List<Notification>? Notifications { get; set; }
    }
}
