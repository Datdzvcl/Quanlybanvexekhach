namespace BaseCore.Common
{
    public static class BookingStatusConstant
    {
        public const byte Pending   = 0;  // Chờ thanh toán
        public const byte Confirmed = 1;  // Đã xác nhận
        public const byte Cancelled = 2;  // Đã hủy
        public const byte Completed = 3;  // Hoàn thành
        public const byte Refunded  = 4;  // Đã hoàn tiền
        public const byte CancelRequested  = 5;
        public const byte CancelRejected   = 6;
        public const byte PendingRefund    = 7;  // Nhà xe đã duyệt hủy, chờ Admin hoàn tiền
    }
}