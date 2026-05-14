namespace BaseCore.Entities
{
    public class StopPoint
    {
        public int StopPointID { get; set; }
        public int TripID { get; set; }
        public string StopName { get; set; } = string.Empty;
        public string? StopAddress { get; set; }
        public int StopOrder { get; set; }
        public int StopType { get; set; }
        public int? ArrivalOffset { get; set; }
        public bool IsActive { get; set; }

        public Trip? Trip { get; set; }
    }
}
