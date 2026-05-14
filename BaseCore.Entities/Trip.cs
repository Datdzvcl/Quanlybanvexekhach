namespace BaseCore.Entities
{
    public class Trip
    {
        public int TripID { get; set; }
        public int BusID { get; set; }
        public string DepartureLocation { get; set; } = string.Empty;
        public string ArrivalLocation { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public DateTime ArrivalTime { get; set; }
        public decimal Price { get; set; }
        public int AvailableSeats { get; set; }
        public string Status { get; set; } = string.Empty;

        public Bus? Bus { get; set; }
        public List<Booking> Bookings { get; set; } = new();
        public List<StopPoint> StopPoints { get; set; } = new();
        public List<SeatHold> SeatHolds { get; set; } = new();
    }
}
