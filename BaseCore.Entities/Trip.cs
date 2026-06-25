namespace BaseCore.Entities
{
    public class Trip
    {
        public int TripID { get; set; }
        public int BusID { get; set; }
        public int? DriverID { get; set; }
        public string DepartureLocation { get; set; } = string.Empty;
        public string ArrivalLocation { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public DateTime ArrivalTime { get; set; }
        public decimal Price { get; set; }
        public int AvailableSeats { get; set; }
        public byte Status { get; set; }
        public DateTime? ActualDepartureTime { get; set; }
        public DateTime? ActualArrivalTime { get; set; }
        public DateTime? DelayedDepartureTime { get; set; } // giờ khởi hành mới khi bị Delayed

        public Bus? Bus { get; set; }
        public User? Driver { get; set; }
        public List<Booking> Bookings { get; set; } = new();
        public List<StopPoint> StopPoints { get; set; } = new();
        public List<SeatHold> SeatHolds { get; set; } = new();
        public List<TripIncident> Incidents { get; set; } = new();
    }
}
