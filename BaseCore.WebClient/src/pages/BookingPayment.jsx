import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../layouts/UserLayout";
import { formatVND, pick } from "../api";
import { bookingApi } from "../services/bookingApi";
import { promotionApi } from "../services/promotionApi";

const PENDING_BOOKING_KEY = "pendingBooking";
const HOLD_STORAGE_KEY = "currentSeatHold";
const PAYMENT_EXPIRES_KEY = "paymentExpiresAt";
const ROUND_TRIP_KEY = "roundTripBooking";
const SUCCESS_BOOKINGS_KEY = "lastSuccessfulBookingIds";

const paymentMethods = [
  { value: "Cash", label: "Tien mat", icon: "fa-money-bill-wave" },
  {
    value: "BankTransfer",
    label: "Chuyen khoan ngan hang",
    icon: "fa-building-columns",
  },
  { value: "VNPay", label: "Vi dien tu/VNPay gia lap", icon: "fa-wallet" },
];

function readPendingBooking() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_BOOKING_KEY) || "null");
  } catch {
    return null;
  }
}

function readRoundTripBooking() {
  try {
    return JSON.parse(localStorage.getItem(ROUND_TRIP_KEY) || "null");
  } catch {
    return null;
  }
}

function buildBookingRequest(booking, paymentMethod, promotionCode) {
  return {
    tripId: booking.tripId,
    sessionId: booking.sessionId,
    customerName: booking.contact.customerName,
    customerPhone: booking.contact.customerPhone,
    customerEmail: booking.contact.customerEmail,
    seatLabels: booking.seatLabels,
    pickupStopId: booking.pickupStopId,
    dropoffStopId: booking.dropoffStopId,
    paymentMethod,
    promotionCode: promotionCode || null,
  };
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function BookingPayment() {
  const navigate = useNavigate();
  const [pendingBooking] = useState(() => readPendingBooking());
  const [roundTripBooking] = useState(() => readRoundTripBooking());
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");
  const [expiresAt] = useState(() => {
    const stored = localStorage.getItem(PAYMENT_EXPIRES_KEY);
    if (stored && Number(stored) > Date.now()) return Number(stored);

    const next = Date.now() + 10 * 60 * 1000;
    localStorage.setItem(PAYMENT_EXPIRES_KEY, String(next));
    return next;
  });
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [promotionResult, setPromotionResult] = useState(null);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    promotionApi
      .listPublic()
      .then((items) =>
        setAvailablePromotions(Array.isArray(items) ? items.slice(0, 3) : []),
      )
      .catch(() => setAvailablePromotions([]));
  }, []);

  useEffect(() => {
    if (expiresAt > now) return;
    alert("Da het thoi gian thanh toan. Vui long chon lai ghe.");
    localStorage.removeItem(PAYMENT_EXPIRES_KEY);
    navigate(
      pendingBooking?.tripId
        ? `/trips/${pendingBooking.tripId}/seats`
        : "/search-results",
      { replace: true },
    );
  }, [expiresAt, navigate, now, pendingBooking?.tripId]);

  const trip = pendingBooking?.trip || {};
  const bookingsToPay = useMemo(() => {
    if (
      roundTripBooking?.stage === "complete" &&
      roundTripBooking.outbound &&
      roundTripBooking.returnTrip
    ) {
      return [roundTripBooking.outbound, roundTripBooking.returnTrip];
    }
    return pendingBooking ? [pendingBooking] : [];
  }, [pendingBooking, roundTripBooking]);

  const subtotalPrice = useMemo(
    () =>
      bookingsToPay.reduce(
        (sum, booking) => sum + Number(booking?.totalPrice || 0),
        0,
      ),
    [bookingsToPay],
  );
  const canApplyPromotion = bookingsToPay.length === 1;
  const discountAmount = Number(
    promotionResult?.discountAmount || promotionResult?.DiscountAmount || 0,
  );
  const finalPrice = Math.max(
    0,
    canApplyPromotion ? subtotalPrice - discountAmount : subtotalPrice,
  );
  const remainingMs = expiresAt - now;

  const bankId = "970422";
  const accountNo = "3901092005";
  const accountName = "PHAM THANH DAT";

  const transferContent = useMemo(() => {
    const phone = pendingBooking?.contact?.customerPhone || "";
    const seats = bookingsToPay
      .map((booking) => booking.seatLabels?.join("-"))
      .filter(Boolean)
      .join("-");

    return `VE XE ${pendingBooking?.tripId || ""} ${seats} ${phone}`.trim();
  }, [
    pendingBooking?.tripId,
    pendingBooking?.contact?.customerPhone,
    bookingsToPay,
  ]);

  const vietQrUrl = useMemo(() => {
    const amount = Math.round(Number(finalPrice || 0));

    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(
      transferContent,
    )}&accountName=${encodeURIComponent(accountName)}`;
  }, [finalPrice, transferContent]);

  const summary = useMemo(
    () => ({
      route: `${pick(trip, ["departureLocation", "DepartureLocation"], "--")} -> ${pick(trip, ["arrivalLocation", "ArrivalLocation"], "--")}`,
      departureTime: pick(trip, ["departureTime", "DepartureTime"]),
      operatorName: pick(trip, ["operatorName", "OperatorName"], "Nha xe"),
      busType: pick(trip, ["busType", "BusType"], "Xe khach"),
    }),
    [trip],
  );

  const applyPromotion = async (inputCode = promotionCode) => {
    const code = String(inputCode || "").trim().toUpperCase();

    if (!canApplyPromotion) {
      setPromotionResult(null);
      setPromotionMessage(
        "Ma giam gia hien chi ap dung cho mot luot thanh toan.",
      );
      return;
    }

    if (!code) {
      setPromotionResult(null);
      setPromotionMessage("Vui long nhap ma giam gia.");
      return;
    }

    setPromotionLoading(true);
    setPromotionMessage("");
    setPromotionCode(code);
    try {
      const result = await promotionApi.validate({
        code,
        orderValue: subtotalPrice,
      });

      if (result?.valid || result?.Valid) {
        setPromotionResult(result);
        setPromotionMessage(
          result.message || result.Message || "Ap dung ma thanh cong.",
        );
      } else {
        setPromotionResult(null);
        setPromotionMessage(
          result?.message || result?.Message || "Ma giam gia khong hop le.",
        );
      }
    } catch (err) {
      setPromotionResult(null);
      setPromotionMessage(err.message || "Khong the kiem tra ma giam gia.");
    } finally {
      setPromotionLoading(false);
    }
  };

  const submit = async () => {
    if (
      bookingsToPay.length === 0 ||
      bookingsToPay.some((booking) => !booking?.tripId || !booking?.contact)
    ) {
      alert("Thieu du lieu dat ve. Vui long thuc hien lai tu buoc chon ghe.");
      navigate("/search-results");
      return;
    }

    if (remainingMs <= 0) {
      alert("Da het thoi gian thanh toan. Vui long chon lai ghe.");
      navigate(`/trips/${pendingBooking.tripId}/seats`);
      return;
    }

    setSubmitting(true);
    try {
      const responses = [];
      for (const [index, booking] of bookingsToPay.entries()) {
        const response = await bookingApi.create(
          buildBookingRequest(
            booking,
            paymentMethod,
            canApplyPromotion && index === 0 && promotionResult
              ? promotionCode
              : null,
          ),
        );
        responses.push(response);
      }

      const bookingIds = responses
        .map((response) =>
          pick(response, ["bookingID", "bookingId", "BookingID", "id", "Id"]),
        )
        .filter(Boolean);
      const bookingId = bookingIds[0];
      localStorage.setItem(SUCCESS_BOOKINGS_KEY, JSON.stringify(bookingIds));
      localStorage.removeItem(PENDING_BOOKING_KEY);
      localStorage.removeItem(ROUND_TRIP_KEY);
      localStorage.removeItem(HOLD_STORAGE_KEY);
      localStorage.removeItem(PAYMENT_EXPIRES_KEY);
      window.dispatchEvent(new Event("holdSeatUpdated"));

      navigate(`/booking/success/${bookingId}`, { replace: true });
    } catch (err) {
      const message = err.message || "Khong the tao booking.";
      const lowerMessage = message.toLowerCase();
      if (
        lowerMessage.includes("het thoi gian giu") ||
        lowerMessage.includes("het thoi gian")
      ) {
        alert("Ghe da het thoi gian giu, vui long chon lai ghe.");
        navigate(`/trips/${pendingBooking.tripId}/seats`);
        return;
      }

      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingBooking?.tripId) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Chua co du lieu thanh toan</h1>
          <p>
            Vui long chon chuyen, giu ghe va nhap thong tin lien he truoc khi
            thanh toan.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/search-results")}
          >
            Tim chuyen
          </button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="payment-flow-hero">
        <div className="container">
          <span>Thanh toan</span>
          <h1>Hoan tat dat ve</h1>
          <p>Vui long hoan tat thanh toan trong thoi gian quy dinh.</p>
        </div>
      </section>

      <section className="container payment-flow-layout">
        <main className="payment-method-card">
          <div className="payment-countdown-panel">
            <div>
              <span>Thoi gian thanh toan con lai</span>
              <strong>{formatCountdown(remainingMs)}</strong>
            </div>
            <i className="fa-solid fa-clock" />
          </div>

          <h2>Chon phuong thuc thanh toan</h2>
          <div className="payment-method-list">
            {paymentMethods.map((method) => (
              <label
                className={`payment-method-option ${paymentMethod === method.value ? "selected" : ""}`}
                key={method.value}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === method.value}
                  onChange={() => setPaymentMethod(method.value)}
                />
                <i className={`fa-solid ${method.icon}`} />
                <span>{method.label}</span>
              </label>
            ))}
          </div>

          {paymentMethod === "BankTransfer" && (
            <div className="bank-transfer-box">
              <div className="bank-transfer-header">
                <i className="fa-solid fa-qrcode" />
                <div>
                  <h3>Thong tin chuyen khoan</h3>
                  <p>Quet QR hoac chuyen khoan theo thong tin ben duoi</p>
                </div>
              </div>

              <div className="bank-transfer-content">
                <div className="bank-qr-wrapper">
                  <img
                    src={vietQrUrl}
                    alt="QR chuyen khoan"
                    className="bank-qr-image"
                  />
                </div>

                <div className="bank-info-list">
                  <div className="bank-info-row">
                    <span>Ngan hang</span>
                    <strong>MB Bank</strong>
                  </div>

                  <div className="bank-info-row">
                    <span>So tai khoan</span>
                    <strong>3901092005</strong>
                  </div>

                  <div className="bank-info-row">
                    <span>Chu tai khoan</span>
                    <strong>PHAM THANH DAT</strong>
                  </div>

                  <div className="bank-info-row highlight">
                    <span>So tien</span>
                    <strong>{formatVND(finalPrice)}</strong>
                  </div>

                  <div className="bank-info-row">
                    <span>Noi dung</span>
                    <strong>{transferContent}</strong>
                  </div>
                </div>
              </div>

              <div className="bank-transfer-note">
                <i className="fa-solid fa-circle-info" />
                <span>
                  Vui long chuyen dung so tien va noi dung de he thong/admin
                  xac nhan thanh toan.
                </span>
              </div>
            </div>
          )}

          <div className="payment-promotion-box">
            <div className="payment-promotion-head">
              <div>
                <h3>Ma giam gia</h3>
                <p>
                  {canApplyPromotion
                    ? "Nhap hoac chon nhanh mot ma dang mo."
                    : "Thanh toan nhieu luot tam thoi khong ap ma de tranh tinh sai giam gia."}
                </p>
              </div>
            </div>

            {availablePromotions.length > 0 && (
              <div className="payment-promotion-list">
                {availablePromotions.map((item) => {
                  const code = pick(item, ["code", "Code"], "");
                  const discountType = Number(
                    pick(item, ["discountType", "DiscountType"], 1),
                  );
                  const discountValue = pick(
                    item,
                    ["discountValue", "DiscountValue"],
                    0,
                  );

                  return (
                    <button
                      key={code}
                      type="button"
                      className="payment-promo-chip"
                      disabled={!canApplyPromotion}
                      onClick={() => applyPromotion(code)}
                    >
                      <strong>{code}</strong>
                      <span>
                        {discountType === 1
                          ? `${discountValue}%`
                          : formatVND(discountValue)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="payment-promotion-form">
              <input
                type="text"
                placeholder="Nhap ma giam gia"
                value={promotionCode}
                disabled={!canApplyPromotion}
                onChange={(event) => {
                  setPromotionCode(event.target.value.toUpperCase());
                  setPromotionResult(null);
                  setPromotionMessage("");
                }}
              />
              <button
                type="button"
                className="btn btn-outline"
                disabled={promotionLoading || !canApplyPromotion}
                onClick={() => applyPromotion()}
              >
                {promotionLoading ? "Dang kiem tra..." : "Ap dung"}
              </button>
            </div>

            {promotionMessage && (
              <div
                className={`payment-promotion-message ${promotionResult ? "success" : "error"}`}
              >
                {promotionMessage}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary payment-submit-btn"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "Dang xu ly..." : "Thanh toan"}
            <i className="fa-solid fa-arrow-right" />
          </button>
        </main>

        <aside className="payment-summary-card">
          <h2>Tom tat don</h2>
          {bookingsToPay.map((booking, index) => {
            const itemTrip = booking.trip || {};
            const itemSummary = {
              route: `${pick(itemTrip, ["departureLocation", "DepartureLocation"], "--")} -> ${pick(itemTrip, ["arrivalLocation", "ArrivalLocation"], "--")}`,
              departureTime: pick(itemTrip, ["departureTime", "DepartureTime"]),
              operatorName: pick(
                itemTrip,
                ["operatorName", "OperatorName"],
                index === 0 ? summary.operatorName : "Nha xe",
              ),
              busType: pick(
                itemTrip,
                ["busType", "BusType"],
                index === 0 ? summary.busType : "Xe khach",
              ),
            };

            return (
              <div
                className="payment-trip-box"
                key={`${booking.tripId}-${index}`}
              >
                <strong>
                  {bookingsToPay.length > 1
                    ? index === 0
                      ? "Luot di"
                      : "Luot ve"
                    : itemSummary.operatorName}
                </strong>
                {bookingsToPay.length > 1 && (
                  <span>{itemSummary.operatorName}</span>
                )}
                <span>{itemSummary.busType}</span>
                <p>{itemSummary.route}</p>
                <small>
                  {formatDateTime(itemSummary.departureTime)} - Ghe{" "}
                  {booking.seatLabels?.join(", ") || "--"}
                </small>
              </div>
            );
          })}
          <div className="contact-summary-line">
            <span>Ghe</span>
            <strong>
              {bookingsToPay
                .map((booking) => booking.seatLabels?.join(", ") || "--")
                .join(" / ")}
            </strong>
          </div>
          <div className="contact-summary-line">
            <span>Nguoi di</span>
            <strong>{pendingBooking.contact?.customerName || "--"}</strong>
          </div>
          <div className="contact-summary-line">
            <span>So dien thoai</span>
            <strong>{pendingBooking.contact?.customerPhone || "--"}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Tam tinh</span>
            <strong>{formatVND(subtotalPrice)}</strong>
          </div>
          <div className="contact-summary-line">
            <span>Giam gia</span>
            <strong>-{formatVND(canApplyPromotion ? discountAmount : 0)}</strong>
          </div>
          <div className="contact-summary-total">
            <span>Tong tien</span>
            <strong>{formatVND(finalPrice)}</strong>
          </div>
        </aside>
      </section>
    </UserLayout>
  );
}
