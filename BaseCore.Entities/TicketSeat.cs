namespace BaseCore.Entities
{
    public class TicketSeat
    {
        public int TicketSeatID { get; set; }
        public int BookingID { get; set; }
        public string SeatLabel { get; set; } = string.Empty;
        public string QRCode { get; set; } = string.Empty;

        public Booking? Booking { get; set; }
    }
}
