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
        public string? ImageUrls { get; set; } // JSON array: ["url1","url2"]
        public string? Severity { get; set; } = "medium"; // "low" | "medium" | "high"

        public Trip? Trip { get; set; }
        public User? Driver { get; set; }
    }
}
