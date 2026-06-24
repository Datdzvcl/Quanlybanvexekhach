namespace BaseCore.Entities
{
    public class User
    {
        public int UserID { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }
        public byte? Gender { get; set; }
        public string? IdentityNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public byte Role { get; set; }
        public Operator? Operator { get; set; }      
        public DateTime? CreatedAt { get; set; }
         public int? OperatorID { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<SeatHold> SeatHolds { get; set; } = new List<SeatHold>();
        public ICollection<Promotion> Promotions { get; set; } = new List<Promotion>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }
}
