namespace BaseCore.Entities
{
    public class Bus
    {
        public int BusID { get; set; }
        public int OperatorID { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string BusType { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Amenities { get; set; }
        public string? SeatLayoutType { get; set; }
        public string? SeatLayout { get; set; }

        public Operator? Operator { get; set; }
        public List<Trip> Trips { get; set; } = new();
    }
}
