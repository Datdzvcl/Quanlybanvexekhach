namespace BaseCore.Entities
{
    public class BusStation
    {
        public int StationID { get; set; }
        public string Province { get; set; } = string.Empty;
        public string StationName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
