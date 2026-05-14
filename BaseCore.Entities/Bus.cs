namespace BaseCore.Entities
{
    public class Bus
    {
        public int BusID { get; set; }
        public int OperatorID { get; set; }
        public string LicensePlate { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string BusType { get; set; } = string.Empty;

        public Operator? Operator { get; set; }
        public List<Trip> Trips { get; set; } = new();
    }
}
