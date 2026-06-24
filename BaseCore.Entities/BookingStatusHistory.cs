namespace BaseCore.Entities
{
    public class BookingStatusHistory
    {
        public int HistoryID { get; set; }
        public int BookingID { get; set; }
        public byte OldStatus { get; set; }
        public byte NewStatus { get; set; }
        public DateTime? ChangedAt { get; set; }
        public int? ChangedBy { get; set; }
        public string? Note { get; set; }

        public Booking? Booking { get; set; }
    }
}