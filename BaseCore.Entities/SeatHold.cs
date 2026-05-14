namespace BaseCore.Entities
{
    public class SeatHold
    {
        public int SeatHoldID { get; set; }
        public int TripID { get; set; }
        public string SeatLabel { get; set; } = string.Empty;
        public int? UserID { get; set; }
        public string? SessionId { get; set; }
        public int? BookingID { get; set; }
        public DateTime HoldExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;

        public Trip? Trip { get; set; }
        public User? User { get; set; }
        public Booking? Booking { get; set; }
    }
}
