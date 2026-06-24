namespace BaseCore.Common
{
    public static class PaymentStatusConstant
    {
        public const byte Pending       = 0;  // Chưa thanh toán
        public const byte Paid          = 1;  // Đã thanh toán
        public const byte PendingRefund = 2;  // Chờ hoàn tiền (admin xử lý)
        public const byte Refunded      = 3;  // Đã hoàn tiền
    }
}
