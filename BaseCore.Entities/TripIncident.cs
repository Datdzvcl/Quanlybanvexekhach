namespace BaseCore.Entities
{
    public class TripIncident
    {
        public int IncidentID { get; set; }
        public int TripID { get; set; }
        public int DriverID { get; set; }
        public string IncidentType { get; set; } = string.Empty; // accident | breakdown | delay | other
        public string Description { get; set; } = string.Empty;
        public DateTime ReportedAt { get; set; }
        public bool IsResolved { get; set; } = false;

        public Trip? Trip { get; set; }
        public User? Driver { get; set; }
    }
}
