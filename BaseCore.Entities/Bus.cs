namespace BaseCore.Entities
{
    public class Bus
    {
        public int BusID { get; set; }
        public int OperatorID { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string BusType { get; set; } = string.Empty;
        public string? Amenities { get; set; }
        public string? SeatLayout { get; set; }
        public string? BrandModel { get; set; }
        public string? Description { get; set; }

        public Operator? Operator { get; set; }
        public List<Trip> Trips { get; set; } = new();
        public List<BusImage> BusImages { get; set; } = new();
    }
}
