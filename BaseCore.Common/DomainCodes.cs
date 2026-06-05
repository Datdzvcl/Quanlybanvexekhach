namespace BaseCore.Common
{
    public static class DomainCodes
    {
        public const byte BookingPendingConfirm = 0;
        public const byte BookingConfirmed = 1;
        public const byte BookingCancelRequested = 2;
        public const byte BookingCancelled = 3;
        public const byte BookingCompleted = 4;

        public const byte TripScheduled = 0;
        public const byte TripOnGoing = 1;
        public const byte TripCompleted = 2;
        public const byte TripCancelled = 3;

        public const byte RoleCustomer = 0;
        public const byte RoleAdmin = 1;
        public const byte RoleOperator = 2;

        public const byte SeatHoldHolding = 0;
        public const byte SeatHoldReleased = 1;
        public const byte SeatHoldConvertedToBooking = 2;

        public static string ToBookingStatusName(byte status) => status switch
        {
            BookingConfirmed => "Confirmed",
            BookingCancelRequested => "CancelRequested",
            BookingCancelled => "Cancelled",
            BookingCompleted => "Completed",
            _ => "PendingConfirm"
        };

        public static byte ToBookingStatusCode(string? status)
        {
            var value = Normalize(status);
            return value switch
            {
                "1" or "confirmed" => BookingConfirmed,
                "2" or "cancelrequested" => BookingCancelRequested,
                "3" or "cancelled" or "canceled" => BookingCancelled,
                "4" or "completed" => BookingCompleted,
                _ => BookingPendingConfirm
            };
        }

        public static string ToTripStatusName(byte status) => status switch
        {
            TripOnGoing => "On-going",
            TripCompleted => "Completed",
            TripCancelled => "Cancelled",
            _ => "Scheduled"
        };

        public static byte ToTripStatusCode(string? status)
        {
            var value = Normalize(status);
            return value switch
            {
                "1" or "ongoing" or "on-going" => TripOnGoing,
                "2" or "completed" => TripCompleted,
                "3" or "cancelled" or "canceled" => TripCancelled,
                _ => TripScheduled
            };
        }

        public static string ToRoleName(byte role) => role switch
        {
            RoleAdmin => RoleConstant.Admin,
            RoleOperator => RoleConstant.Operator,
            _ => RoleConstant.Customer
        };

        public static byte ToRoleCode(string? role)
        {
            var value = Normalize(role);
            return value switch
            {
                "1" or "admin" => RoleAdmin,
                "2" or "operator" => RoleOperator,
                _ => RoleCustomer
            };
        }

        public static bool IsValidRole(string? role)
        {
            var value = Normalize(role);
            return value is "" or "0" or "customer" or "1" or "admin" or "2" or "operator";
        }

        private static string Normalize(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().ToLowerInvariant().Replace(" ", string.Empty);
        }
    }
}
