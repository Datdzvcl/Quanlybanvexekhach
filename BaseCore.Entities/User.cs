namespace BaseCore.Entities
{
    public class User
    {
        public int UserID { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public byte Role { get; set; }

        public DateTime? CreatedAt { get; set; }

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();
        public ICollection<SeatHold> SeatHolds { get; set; } = new List<SeatHold>();
    }
}
