
namespace BaseCore.Entities
{
    public class Booking
    {
        public int BookingID { get; set; }
        public int TripID { get; set; }
        public int? UserID { get; set; }
        public string? CustomerName { get; set; }    // ← thêm ?
        public string? CustomerPhone { get; set; }   // ← thêm ?
        public string? CustomerEmail { get; set; }   // ← thêm ?
        public int TotalSeats { get; set; }
        public decimal TotalPrice { get; set; }
        public string? PaymentMethod { get; set; }   // ← thêm ?
        public string? PaymentStatus { get; set; }   // ← thêm ?
        public string? BookingStatus { get; set; }
        public DateTime? BookingDate { get; set; }
        public int? PickupStopID { get; set; }
        public int? DropoffStopID { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CancelReason { get; set; }
        public decimal? RefundAmount { get; set; }
        public User? User { get; set; }
        public Trip? Trip { get; set; }
        public List<TicketSeat>? TicketSeats { get; set; }
        public List<SeatHold>? SeatHolds { get; set; }
    }
}
