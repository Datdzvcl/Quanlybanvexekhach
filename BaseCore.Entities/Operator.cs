namespace BaseCore.Entities
{
    public class Operator
    {
        public int OperatorID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public string? RejectReason { get; set; }
        public string? LogoUrl { get; set; }

        public List<Bus> Buses { get; set; } = new();
    }
}
