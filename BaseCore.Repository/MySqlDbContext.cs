using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository
{
    public class MySqlDbContext : DbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options) : base(options)
        {
        }
        public DbSet<User> Users { get; set; }
        public DbSet<Operator> Operators { get; set; }
        public DbSet<Bus> Buses { get; set; }
        public DbSet<Trip> Trips { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<TicketSeat> TicketSeats { get; set; }
        public DbSet<StopPoint> StopPoints { get; set; }
        public DbSet<SeatHold> SeatHolds { get; set; }
        public DbSet<Promotion> Promotions { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<BookingStatusHistory> BookingStatusHistory { get; set; }
        public DbSet<BusImage> BusImages { get; set; }
        public DbSet<TripIncident> TripIncidents { get; set; }
        public DbSet<BusStation> BusStations { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Operator>(entity =>
            {
                entity.ToTable("Operators");
                entity.HasKey(e => e.OperatorID);

                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.ContactPhone).HasMaxLength(20).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.RejectReason).HasMaxLength(500);
            });

            modelBuilder.Entity<Bus>(entity =>
            {
                entity.ToTable("Buses");
                entity.HasKey(e => e.BusID);

                entity.Property(e => e.LicensePlate).HasMaxLength(20).IsRequired();
                entity.Property(e => e.BusType).HasMaxLength(50).IsRequired();
                entity.Property(e => e.BrandModel).HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);

                entity.HasOne(e => e.Operator)
                      .WithMany(e => e.Buses)
                      .HasForeignKey(e => e.OperatorID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<BusImage>(entity =>
            {
                entity.ToTable("BusImages");
                entity.HasKey(e => e.ImageID);

                entity.Property(e => e.ImageURL).HasMaxLength(500).IsRequired();
                entity.Property(e => e.IsAvatar).HasDefaultValue(false);
                entity.Property(e => e.SortOrder).HasDefaultValue(0);
                entity.Property(e => e.UploadedAt).HasDefaultValueSql("getdate()");

                entity.HasIndex(e => new { e.BusID, e.IsAvatar })
                      .IsUnique()
                      .HasFilter("[IsAvatar] = 1");

                entity.HasOne(e => e.Bus)
                      .WithMany(e => e.BusImages)
                      .HasForeignKey(e => e.BusID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Trip>(entity =>
            {
                entity.ToTable("Trips");
                entity.HasKey(e => e.TripID);

                entity.Property(e => e.DepartureLocation).HasMaxLength(100).IsRequired();
                entity.Property(e => e.ArrivalLocation).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 2);
                entity.Property(e => e.Status).HasMaxLength(20);
                entity.Property(e => e.DelayedDepartureTime).IsRequired(false);

                entity.HasOne(e => e.Bus)
                      .WithMany(e => e.Trips)
                      .HasForeignKey(e => e.BusID)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Driver)
                      .WithMany()
                      .HasForeignKey(e => e.DriverID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<StopPoint>(entity =>
            {
                entity.ToTable("StopPoints");
                entity.HasKey(e => e.StopPointID);

                entity.Property(e => e.StopName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.StopAddress).HasMaxLength(300);
                entity.Property(e => e.IsActive).HasDefaultValue(true);

                entity.HasOne(e => e.Trip)
                      .WithMany(e => e.StopPoints)
                      .HasForeignKey(e => e.TripID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Booking>(entity =>
            {
                entity.ToTable(tb => tb.HasTrigger("TRG_CancelTicketSeats"));
                entity.HasKey(e => e.BookingID);
                entity.ToTable("Bookings");
                entity.HasKey(e => e.BookingID);

                entity.Property(e => e.CustomerName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.CustomerPhone).HasMaxLength(20).IsRequired();
                entity.Property(e => e.CustomerEmail).HasMaxLength(100);
                entity.Property(e => e.TotalPrice).HasPrecision(18, 2);
                entity.Property(e => e.PaymentMethod).HasMaxLength(20);
                entity.Property(e => e.PaymentStatus).HasDefaultValue((byte)0);
                entity.Property(e => e.BookingStatus).HasDefaultValue((byte)0);
                entity.Property(e => e.PickupStopID);
                entity.Property(e => e.DropoffStopID);
                entity.Property(e => e.CancelReason).HasMaxLength(300);
                entity.Property(e => e.RefundAmount).HasPrecision(18, 2);
                entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);

                entity.HasOne(e => e.Trip)
                      .WithMany(e => e.Bookings)
                      .HasForeignKey(e => e.TripID)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User)
                      .WithMany(e => e.Bookings)
                      .HasForeignKey(e => e.UserID)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Promotion)
                      .WithMany(e => e.Bookings)
                      .HasForeignKey(e => e.PromotionID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Promotion>(entity =>
            {
                entity.ToTable("Promotions");
                entity.HasKey(e => e.PromotionID);

                entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.DiscountValue).HasPrecision(18, 2);
                entity.Property(e => e.MinOrderValue).HasPrecision(18, 2);
                entity.Property(e => e.MaxDiscount).HasPrecision(18, 2);
                entity.Property(e => e.UsedCount).HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.IsPublic).HasDefaultValue(true);
                entity.Property(e => e.IsNewUserOnly).HasDefaultValue(false);

                entity.HasIndex(e => e.Code).IsUnique();
                entity.HasOne(e => e.User)
                      .WithMany(e => e.Promotions)
                      .HasForeignKey(e => e.UserID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Payment>(entity =>
            {
                entity.ToTable("Payments");
                entity.HasKey(e => e.PaymentID);

                entity.Property(e => e.Amount).HasPrecision(18, 2);
                entity.Property(e => e.PaymentMethod).HasMaxLength(30).IsRequired();
            //     entity.Property(e => e.PaymentStatus).HasMaxLength(30).IsRequired();
                entity.Property(e => e.TransactionCode).HasMaxLength(100);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("getdate()");

                entity.HasIndex(e => e.BookingID);
                entity.HasOne(e => e.Booking)
                      .WithMany(e => e.Payments)
                      .HasForeignKey(e => e.BookingID)
                      .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<BookingStatusHistory>(entity =>
            {
            entity.ToTable("BookingStatusHistory");
            entity.HasKey(e => e.HistoryID);
            entity.Property(e => e.Note).HasMaxLength(300);
            entity.HasOne(e => e.Booking)
                  .WithMany()
                  .HasForeignKey(e => e.BookingID);
            });
            modelBuilder.Entity<Review>(entity =>
            {
                entity.ToTable("Reviews");
                entity.HasKey(e => e.ReviewID);

                entity.Property(e => e.Comment).HasMaxLength(500);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("getdate()");

                entity.HasIndex(e => e.BookingID).IsUnique();
                entity.HasCheckConstraint("CK_Rating", "[Rating] >= 1 AND [Rating] <= 5");

                entity.HasOne(e => e.Booking)
                      .WithOne(e => e.Review)
                      .HasForeignKey<Review>(e => e.BookingID)
                      .OnDelete(DeleteBehavior.Restrict);

            //     entity.HasOne(e => e.Trip)
            //           .WithMany(e => e.Reviews)
            //           .HasForeignKey(e => e.TripID)
            //           .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User)
                      .WithMany(e => e.Reviews)
                      .HasForeignKey(e => e.UserID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Notification>(entity =>
            {
                entity.ToTable("Notifications");
                entity.HasKey(e => e.NotificationID);

                entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Message).HasMaxLength(500).IsRequired();
                entity.Property(e => e.Type).HasDefaultValue((byte)1);
                entity.Property(e => e.IsRead).HasDefaultValue(false);
                entity.Property(e => e.Link).HasMaxLength(200);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("getdate()");

                entity.HasIndex(e => e.UserID);
                entity.HasOne(e => e.User)
                      .WithMany(e => e.Notifications)
                      .HasForeignKey(e => e.UserID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SeatHold>(entity =>
            {
                entity.ToTable("SeatHolds");
                entity.HasKey(e => e.SeatHoldID);

                entity.Property(e => e.SeatLabel).HasMaxLength(10).IsRequired();
                entity.Property(e => e.SessionId).HasMaxLength(100);
                entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("getdate()");
                entity.HasIndex(e => new { e.TripID, e.SeatLabel })
                      .IsUnique()
                      .HasFilter("[Status] = 'Holding'");

                entity.HasOne(e => e.Trip)
                      .WithMany(e => e.SeatHolds)
                      .HasForeignKey(e => e.TripID)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                      .WithMany(e => e.SeatHolds)
                      .HasForeignKey(e => e.UserID)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Booking)
                      .WithMany(e => e.SeatHolds)
                      .HasForeignKey(e => e.BookingID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<TicketSeat>(entity =>
            {
                entity.ToTable("TicketSeats");
                entity.HasKey(e => e.TicketSeatID);

                entity.Property(e => e.SeatLabel).HasMaxLength(10).IsRequired();
                entity.Property(e => e.QRCode);
                entity.Property(e => e.IsActive).HasDefaultValue(true);

                entity.HasOne(e => e.Booking)
                      .WithMany(e => e.TicketSeats)
                      .HasForeignKey(e => e.BookingID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TripIncident>(entity =>
            {
                entity.ToTable("TripIncidents");
                entity.HasKey(e => e.IncidentID);

                entity.Property(e => e.IncidentType).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Description).HasMaxLength(1000).IsRequired();
                entity.Property(e => e.ReportedAt).HasDefaultValueSql("getdate()");

                entity.HasOne(e => e.Trip)
                      .WithMany(e => e.Incidents)
                      .HasForeignKey(e => e.TripID)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Driver)
                      .WithMany()
                      .HasForeignKey(e => e.DriverID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<BusStation>(entity =>
            {
                entity.ToTable("BusStations");
                entity.HasKey(e => e.StationID);
                entity.Property(e => e.Province).HasMaxLength(100).IsRequired();
                entity.Property(e => e.StationName).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Address).HasMaxLength(300);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.UserID);

                entity.Property(e => e.FullName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Phone).HasMaxLength(20).IsRequired();
                entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Role).HasMaxLength(20);
                entity.Property(e => e.CreatedAt);
                entity.Property(e => e.OperatorID);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.Phone).IsUnique();
                 entity.HasOne(e => e.Operator)
                .WithMany()
                .HasForeignKey(e => e.OperatorID)
                .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
