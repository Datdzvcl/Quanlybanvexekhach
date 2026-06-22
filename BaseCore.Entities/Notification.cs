namespace BaseCore.Entities
{
    public class Notification
    {
        public int NotificationID { get; set; }
        public int UserID { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public byte Type { get; set; }
        public bool IsRead { get; set; }
        public DateTime? CreatedAt { get; set; }
        public int? BookingID { get; set; }

        public User? User { get; set; }
        public Booking? Booking { get; set; }
    }
}
