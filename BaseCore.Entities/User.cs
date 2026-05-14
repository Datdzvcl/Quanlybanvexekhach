namespace BaseCore.Entities
{
    public class User
    {
        public int UserID { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string? Role { get; set; }

        public DateTime? CreatedAt { get; set; }

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<SeatHold> SeatHolds { get; set; } = new List<SeatHold>();
    }
}
