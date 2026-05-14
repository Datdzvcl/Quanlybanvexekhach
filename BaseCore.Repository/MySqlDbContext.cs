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
            });

            modelBuilder.Entity<Bus>(entity =>
            {
                entity.ToTable("Buses");
                entity.HasKey(e => e.BusID);

                entity.Property(e => e.LicensePlate).HasMaxLength(20).IsRequired();
                entity.Property(e => e.BusType).HasMaxLength(50).IsRequired();

                entity.HasOne(e => e.Operator)
                      .WithMany(e => e.Buses)
                      .HasForeignKey(e => e.OperatorID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Trip>(entity =>
            {
                entity.ToTable("Trips");
                entity.HasKey(e => e.TripID);

                entity.Property(e => e.DepartureLocation).HasMaxLength(100).IsRequired();
                entity.Property(e => e.ArrivalLocation).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Price).HasPrecision(18, 2);
                entity.Property(e => e.Status).HasMaxLength(20);

                entity.HasOne(e => e.Bus)
                      .WithMany(e => e.Trips)
                      .HasForeignKey(e => e.BusID)
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
                entity.ToTable("Bookings");
                entity.HasKey(e => e.BookingID);

                entity.Property(e => e.CustomerName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.CustomerPhone).HasMaxLength(20).IsRequired();
                entity.Property(e => e.CustomerEmail).HasMaxLength(100);
                entity.Property(e => e.TotalPrice).HasPrecision(18, 2);
                entity.Property(e => e.PaymentMethod).HasMaxLength(20);
                entity.Property(e => e.PaymentStatus).HasMaxLength(20);
                entity.Property(e => e.BookingStatus).HasMaxLength(30);
                entity.Property(e => e.PickupStopID);
                entity.Property(e => e.DropoffStopID);
                entity.Property(e => e.CancelReason).HasMaxLength(300);
                entity.Property(e => e.RefundAmount).HasPrecision(18, 2);

                entity.HasOne(e => e.Trip)
                      .WithMany(e => e.Bookings)
                      .HasForeignKey(e => e.TripID)
                      .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User)
                      .WithMany(e => e.Bookings)
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

                entity.HasOne(e => e.Booking)
                      .WithMany(e => e.TicketSeats)
                      .HasForeignKey(e => e.BookingID)
                      .OnDelete(DeleteBehavior.Cascade);
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

                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.Phone).IsUnique();
            });
        }
    }
}
