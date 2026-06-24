// namespace BaseCore.Entities
// {
//     public class Review
//     {
//         public int ReviewID { get; set; }
//         public int BookingID { get; set; }
//         public int UserID { get; set; }
//         // public int TripID { get; set; }
//         public byte Rating { get; set; }
//         public string? Comment { get; set; }
//         public DateTime? CreatedAt { get; set; }

//         public Booking? Booking { get; set; }
//         public User? User { get; set; }
//         // public Trip? Trip { get; set; }
//     }
// }
namespace BaseCore.Entities
{
    public class Review
    {
        public int ReviewID { get; set; }
        public int BookingID { get; set; }
        public int UserID { get; set; }
        public byte Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
        public string? ReplyContent { get; set; }
        public DateTime? RepliedAt { get; set; }
        public bool IsHidden { get; set; } = false;

        public Booking? Booking { get; set; }
        public User? User { get; set; }
    }
}