namespace BaseCore.Entities
{
    public class Operator
    {
        public int OperatorID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        public List<Bus> Buses { get; set; } = new();
    }
}
