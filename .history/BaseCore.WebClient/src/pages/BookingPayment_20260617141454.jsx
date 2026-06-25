// import { useEffect, useMemo, useState } from 'react';
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import UserLayout from "../layouts/UserLayout";
import { formatVND, pick } from "../api";
import { bookingApi } from "../services/bookingApi";
import { promotionApi } from "../services/promotionApi";
import { paymentApi } from "../services/paymentApi";
import BookingSteps from "../components/BookingSteps";
import { QRCodeSVG } from "qrcode.react";

const PENDING_BOOKING_KEY = "pendingBooking";
const HOLD_STORAGE_KEY = "currentSeatHold";
const PAYMENT_EXPIRES_KEY = "paymentExpiresAt";
const ROUND_TRIP_KEY = "roundTripBooking";
const SUCCESS_BOOKINGS_KEY = "lastSuccessfulBookingIds";

const paymentMethods = [
  { value: "Cash", label: "Tiền mặt", icon: "fa-money-bill-wave" },
  {
    value: "BankTransfer",
    label: "Chuyển khoản ngân hàng",
    icon: "fa-building-columns",
  },
  { value: "VNPay", label: "Ví điện tử/VNPay giả lập", icon: "fa-wallet" },
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

function buildPaymentSessionKey(pendingBooking, roundTripBooking) {
  const bookings =
    roundTripBooking?.stage === "complete" &&
    roundTripBooking.outbound &&
    roundTripBooking.returnTrip
      ? [roundTripBooking.outbound, roundTripBooking.returnTrip]
      : pendingBooking
        ? [pendingBooking]
        : [];

  return bookings
    .map((booking) =>
      [
        booking?.tripId,
        (booking?.seatLabels || []).join(","),
        booking?.pickupStopId || "",
        booking?.dropoffStopId || "",
      ].join(":"),
    )
    .join("|");
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
    promotionCode,
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

function getPromotionValue(item, keys, fallback = "") {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
  }
  return fallback;
}

function formatPromotionDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getPromotionTitle(item) {
  const type = Number(
    getPromotionValue(item, ["discountType", "DiscountType"], 1),
  );
  const value = Number(
    getPromotionValue(item, ["discountValue", "DiscountValue"], 0),
  );
  const maxDiscount = Number(
    getPromotionValue(item, ["maxDiscount", "MaxDiscount"], 0),
  );

  if (type === 1) {
    return `Giảm ${value}%${maxDiscount > 0 ? ` tối đa ${formatVND(maxDiscount)}` : ""}`;
  }

  return `Giảm ${formatVND(value)}`;
}

function getPromotionRules(item) {
  const minOrder = Number(
    getPromotionValue(item, ["minOrderValue", "MinOrderValue"], 0),
  );
  const remainingUses = getPromotionValue(
    item,
    ["remainingUses", "RemainingUses"],
    null,
  );
  const endDate = getPromotionValue(item, ["endDate", "EndDate"]);
  const rules = [];

  if (minOrder > 0) rules.push(`Đơn tối thiểu ${formatVND(minOrder)}`);
  rules.push(
    remainingUses === null
      ? "Không giới hạn lượt dùng"
      : `Còn ${remainingUses} lượt`,
  );
  rules.push(`Hạn đến ${formatPromotionDate(endDate)}`);
  return rules;
}

function getPromotionDescription(item) {
  return (
    getPromotionValue(item, ["description", "Description"], "") ||
    "Áp dụng theo điều kiện của chương trình ưu đãi."
  );
}

function getRandomItems(items, size = 3) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, size)
    .map(({ item }) => item);
}

// VietQR EMV helpers — generates a real QR string scannable by Vietnamese banking apps
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id, value) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function buildVietQR(bankBin, accountNo, amount, addInfo) {
  const napas =
    tlv("00", "A000000727") + tlv("01", bankBin) + tlv("02", accountNo);
  const parts = [
    tlv("00", "01"),
    tlv("01", "12"),
    tlv("38", napas),
    tlv("52", "0000"),
    tlv("53", "704"),
  ];
  if (amount > 0) parts.push(tlv("54", String(Math.round(amount))));
  parts.push(tlv("58", "VN"));
  parts.push(tlv("59", "PHAM THANH DAT"));
  parts.push(tlv("60", "Ha Noi"));
  if (addInfo) parts.push(tlv("62", tlv("08", addInfo.slice(0, 25))));
  parts.push("6304");
  const pre = parts.join("");
  return pre + crc16(pre);
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "copied" : ""}`}
      title="Sao chép"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} />
      <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
    </button>
  );
}

export default function BookingPayment() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [pendingBooking] = useState(() => readPendingBooking());
  const [roundTripBooking] = useState(() => readRoundTripBooking());
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");
  const [submitError, setSubmitError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const paymentSessionKey = buildPaymentSessionKey(pendingBooking, roundTripBooking);
  // Thời gian giữ ghế — đọc từ localStorage, set bởi SeatSelection
  const holdExpiresAt = useMemo(() => {
    try {
      const hold = JSON.parse(localStorage.getItem(HOLD_STORAGE_KEY) || 'null');
      if (hold?.holdExpiresAt) return new Date(hold.holdExpiresAt).getTime();
    } catch {}
    return null;
  }, []);
  // Thời gian thanh toán — bắt đầu mới khi user bấm "Tiếp tục thanh toán"
  const [paymentExpiresAt, setPaymentExpiresAt] = useState(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [promotionResult, setPromotionResult] = useState(null);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [previewPromotions, setPreviewPromotions] = useState([]);
  const [showAllPromotions, setShowAllPromotions] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [viewStep, setViewStep] = useState("select");
  const submittingRef = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    promotionApi
      .publicList()
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setAvailablePromotions(items);
        setPreviewPromotions(getRandomItems(items, 3));
      })
      .catch(() => {
        setAvailablePromotions([]);
        setPreviewPromotions([]);
      });
  }, []);

  // Ghế hết thời gian giữ → redirect về chọn ghế (bất kể đang ở view nào)
  useEffect(() => {
    if (!holdExpiresAt || holdExpiresAt > now) return;
    localStorage.removeItem(HOLD_STORAGE_KEY);
    localStorage.removeItem(PAYMENT_EXPIRES_KEY);
    navigate(
      pendingBooking?.tripId ? `/trips/${pendingBooking.tripId}/seats` : '/search-results',
      { replace: true, state: { expiredMessage: 'Ghế đã hết thời gian giữ. Vui lòng chọn lại ghế.' } },
    );
  }, [holdExpiresAt, now, navigate, pendingBooking?.tripId]);

  // Hết 10 phút thanh toán (chỉ khi đang ở view 2) → redirect về chọn ghế
  useEffect(() => {
    if (viewStep !== 'confirm' || !paymentExpiresAt || paymentExpiresAt > now) return;
    setPaymentExpiresAt(null);
    navigate(
      pendingBooking?.tripId ? `/trips/${pendingBooking.tripId}/seats` : '/search-results',
      { replace: true, state: { expiredMessage: 'Hết thời gian thanh toán. Vui lòng thực hiện lại từ bước chọn ghế.' } },
    );
  }, [viewStep, paymentExpiresAt, now, navigate, pendingBooking?.tripId]);

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
  const totalPrice = useMemo(
    () =>
      bookingsToPay.reduce(
        (sum, booking) => sum + Number(booking?.totalPrice || 0),
        0,
      ),
    [bookingsToPay],
  );
  const discountAmount = Number(
    promotionResult?.discountAmount || promotionResult?.DiscountAmount || 0,
  );
  const finalPrice = Math.max(0, totalPrice - discountAmount);
  const holdRemainingMs = holdExpiresAt ? Math.max(0, holdExpiresAt - now) : 0;
  const paymentRemainingMs = paymentExpiresAt ? Math.max(0, paymentExpiresAt - now) : 0;
  const promotionsToShow = previewPromotions;

  const summary = useMemo(
    () => ({
      route: `${pick(trip, ["departureLocation", "DepartureLocation"], "--")} → ${pick(trip, ["arrivalLocation", "ArrivalLocation"], "--")}`,
      departureTime: pick(trip, ["departureTime", "DepartureTime"]),
      operatorName: pick(trip, ["operatorName", "OperatorName"], "Nhà xe"),
      busType: pick(trip, ["busType", "BusType"], "Xe khách"),
    }),
    [trip],
  );

  const transferNote =
    `VEXEAZ ${pendingBooking?.contact?.customerPhone || ""}`.trim();
  const vietQrValue = useMemo(
    () => buildVietQR("970422", "3901092005", finalPrice, transferNote),
    [finalPrice, transferNote],
  );

  const applyPromotion = async (selectedCode = promotionCode) => {
    const code = selectedCode.trim();
    if (!code) {
      setPromotionResult(null);
      setPromotionMessage("Vui lòng nhập mã giảm giá.");
      return;
    }

    setPromotionLoading(true);
    setPromotionMessage("");
    setPromotionCode(code);
    setSelectedPromotion(
      availablePromotions.find(
        (item) =>
          String(getPromotionValue(item, ["code", "Code"])).toUpperCase() ===
          code.toUpperCase(),
      ) || null,
    );
    try {
      const result = await promotionApi.validate({
        code,
        orderValue: totalPrice,
      });
      if (result?.valid || result?.Valid) {
        setPromotionResult(result);
        setPromotionMessage(
          result.message || result.Message || "Áp dụng mã thành công",
        );
      } else {
        setPromotionResult(null);
        setPromotionMessage(
          result?.message || result?.Message || "Mã giảm giá không hợp lệ.",
        );
      }
    } catch (err) {
      setPromotionResult(null);
      setPromotionMessage(err.message || "Không thể kiểm tra mã giảm giá.");
    } finally {
      setPromotionLoading(false);
    }
    // const submittingRef = useRef(false);
  };

  const handleContinueToPayment = () => {
    setPaymentExpiresAt(Date.now() + 10 * 60 * 1000);
    setViewStep('confirm');
    setSubmitError('');
    setNeedsLogin(false);
  };

  const handleBackClick = () => setShowBackConfirm(true);

  const confirmBack = () => {
    setShowBackConfirm(false);
    setPaymentExpiresAt(null);
    setViewStep('select');
    setSubmitError('');
    setNeedsLogin(false);
  };

  // const submit = async () => {
  //    if (submittingRef.current) return;  // ← thêm
  //     submittingRef.current = true;
  //   if (bookingsToPay.length === 0 || bookingsToPay.some((booking) => !booking?.tripId || !booking?.contact)) {
  //     alert('Thiếu dữ liệu đặt vé. Vui lòng thực hiện lại từ bước chọn ghế.');
  //     navigate('/search-results');
  //     return;
  //   }

  //   if (remainingMs <= 0) {
  //     alert('Đã hết thời gian thanh toán. Vui lòng chọn lại ghế.');
  //     navigate(`/trips/${pendingBooking.tripId}/seats`);
  //     return;
  //   }

  //   setSubmitting(true);
  //   try {
  //     const responses = [];
  //     for (let index = 0; index < bookingsToPay.length; index += 1) {
  //       const booking = bookingsToPay[index];
  //       const code = index === 0 && promotionResult ? promotionCode : '';
  //       const response = await bookingApi.create(buildBookingRequest(booking, paymentMethod, code));
  //       responses.push(response);
  //     }

  //     const bookingIds = responses
  //       .map((response) => pick(response, ['bookingID', 'bookingId', 'BookingID', 'id', 'Id']))
  //       .filter(Boolean);
  //     const bookingId = bookingIds[0];
  //     localStorage.setItem(SUCCESS_BOOKINGS_KEY, JSON.stringify(bookingIds));
  //     localStorage.removeItem(PENDING_BOOKING_KEY);
  //     localStorage.removeItem(ROUND_TRIP_KEY);
  //     localStorage.removeItem(HOLD_STORAGE_KEY);
  //     localStorage.removeItem(PAYMENT_EXPIRES_KEY);
  //     window.dispatchEvent(new Event('holdSeatUpdated'));

  //     navigate(`/booking/success/${bookingId}`, { replace: true });
  //   } catch (err) {
  //     const message = err.message || 'Không thể tạo booking.';
  //     const lowerMessage = message.toLowerCase();
  //     if (lowerMessage.includes('hết thời gian giữ') || lowerMessage.includes('het thoi gian')) {
  //       alert('Ghế đã hết thời gian giữ, vui lòng chọn lại ghế.');
  //       navigate(`/trips/${pendingBooking.tripId}/seats`);
  //       return;
  //     }

  //     alert(message);
  //   } finally {
  //     submittingRef.current = false;
  //     setSubmitting(false);
  //   }
  // };
  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitError("");
    setNeedsLogin(false);

    // Kiểm tra đăng nhập trước khi gọi API
    if (!isAuthenticated) {
      submittingRef.current = false;
      setSubmitError("Bạn cần đăng nhập để hoàn tất đặt vé.");
      setNeedsLogin(true);
      return;
    }

    if (
      bookingsToPay.length === 0 ||
      bookingsToPay.some((booking) => !booking?.tripId || !booking?.contact)
    ) {
      submittingRef.current = false;
      navigate("/search-results", {
        state: {
          expiredMessage:
            "Thiếu dữ liệu đặt vé. Vui lòng thực hiện lại từ bước chọn ghế.",
        },
      });
      return;
    }

    if (paymentRemainingMs <= 0) {
      submittingRef.current = false;
      navigate(`/trips/${pendingBooking.tripId}/seats`, {
        state: { expiredMessage: 'Hết thời gian thanh toán. Vui lòng thực hiện lại.' },
      });
      return;
    }

    setSubmitting(true);
    try {
      const responses = [];

      for (let index = 0; index < bookingsToPay.length; index += 1) {
        const booking = bookingsToPay[index];
        const code = index === 0 && promotionResult ? promotionCode : "";

        const response = await bookingApi.create(
          buildBookingRequest(booking, paymentMethod, code),
        );
        responses.push(response);

        // Ghi nhận thanh toán cho BankTransfer và VNPay (không phải Cash)
        if (paymentMethod === "BankTransfer" || paymentMethod === "VNPay") {
          await paymentApi.simulate({
            bookingID: response.bookingID || response.BookingID,
            paymentMethod,
          });
        }
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
      const message = err.message || "Không thể tạo booking.";
      const lowerMessage = message.toLowerCase();

      if (
        lowerMessage.includes("Hết thời gian giữ") ||
        lowerMessage.includes("Het thoi gian")
      ) {
        navigate(`/trips/${pendingBooking.tripId}/seats`, {
          state: {
            expiredMessage: "Ghế đã hết thời gian giữ, vui lòng chọn lại ghế.",
          },
        });
        return;
      }

      // Token hết hạn hoặc chưa đăng nhập
      if (message.includes("(401)") || message.includes("401")) {
        setSubmitError(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để hoàn tất đặt vé.",
        );
        setNeedsLogin(true);
        return;
      }

      setSubmitError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  if (!pendingBooking?.tripId) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Chưa có dữ liệu thanh toán</h1>
          <p>
            Vui lòng chọn chuyến, giữ ghế và nhập thông tin liên hệ trước khi
            thanh toán.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/search-results")}
          >
            Tìm chuyến
          </button>
        </div>
      </UserLayout>
    );
  }

  const summaryAside = (
    <aside className="payment-summary-card">
      <h2>Tóm tắt đơn</h2>
      {bookingsToPay.map((booking, index) => {
        const itemTrip = booking.trip || {};
        const itemSummary = {
          route: `${pick(itemTrip, ["departureLocation", "DepartureLocation"], "--")} → ${pick(itemTrip, ["arrivalLocation", "ArrivalLocation"], "--")}`,
          departureTime: pick(itemTrip, ["departureTime", "DepartureTime"]),
          operatorName: pick(
            itemTrip,
            ["operatorName", "OperatorName"],
            index === 0 ? summary.operatorName : "Nhà xe",
          ),
          busType: pick(
            itemTrip,
            ["busType", "BusType"],
            index === 0 ? summary.busType : "Xe khách",
          ),
        };
        return (
          <div className="payment-trip-box" key={`${booking.tripId}-${index}`}>
            <strong>
              {bookingsToPay.length > 1
                ? index === 0
                  ? "Lượt đi"
                  : "Lượt về"
                : itemSummary.operatorName}
            </strong>
            {bookingsToPay.length > 1 && (
              <span>{itemSummary.operatorName}</span>
            )}
            <span>{itemSummary.busType}</span>
            <p>{itemSummary.route}</p>
            <small>
              {formatDateTime(itemSummary.departureTime)} · Ghế{" "}
              {booking.seatLabels?.join(", ") || "--"}
            </small>
          </div>
        );
      })}
      <div className="contact-summary-line">
        <span>Người đi</span>
        <strong>{pendingBooking.contact?.customerName || "--"}</strong>
      </div>
      <div className="contact-summary-line">
        <span>Số điện thoại</span>
        <strong>{pendingBooking.contact?.customerPhone || "--"}</strong>
      </div>
      <div className="contact-summary-total">
        <span>Tổng tiền</span>
        <strong>{formatVND(totalPrice)}</strong>
      </div>
      {discountAmount > 0 && (
        <div className="contact-summary-line">
          <span>Giảm giá</span>
          <strong style={{ color: "#16a34a" }}>
            - {formatVND(discountAmount)}
          </strong>
        </div>
      )}
      <div className="contact-summary-total">
        <span>Tổng thanh toán</span>
        <strong>{formatVND(finalPrice)}</strong>
      </div>
    </aside>
  );

  return (
    <UserLayout>
      <section className="payment-flow-hero">
        <div className="container">
          <span>Thanh toán</span>
          <h1>
            {viewStep === "select"
              ? "Chọn phương thức thanh toán"
              : "Hoàn tất thanh toán"}
          </h1>
          <p>
            {viewStep === "select"
              ? "Chọn hình thức thanh toán và áp dụng mã giảm giá nếu có."
              : "Hoàn tất thanh toán trước khi hết thời gian để giữ vé."}
          </p>
          <BookingSteps step={4} />
        </div>
      </section>

      {/* ── VIEW 1: CHỌN PHƯƠNG THỨC + MÃ GIẢM GIÁ ─────────────── */}
      {viewStep === "select" && (
        <section className="container payment-flow-layout">
          <main className="payment-method-card">
            <div className="payment-countdown-panel">
              <div>
                <span>Thời gian giữ ghế còn lại</span>
                <strong>{formatCountdown(holdRemainingMs)}</strong>
              </div>
              <i className="fa-solid fa-clock" />
            </div>

            <h2>Chọn phương thức thanh toán</h2>
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

            <div className="payment-promo-box">
              <div className="payment-promo-head">
                <div>
                  <span>Ưu đãi</span>
                  <h2>Chọn mã giảm giá</h2>
                </div>
                <button
                  type="button"
                  className="payment-promo-view-all"
                  onClick={() => setShowAllPromotions(true)}
                >
                  Xem tất cả
                </button>
              </div>

              {promotionsToShow.length > 0 && (
                <div className="payment-promo-list">
                  {promotionsToShow.map((item) => {
                    const code = getPromotionValue(item, ["code", "Code"]);
                    const selected =
                      promotionCode.toUpperCase() ===
                        String(code).toUpperCase() && promotionResult;
                    return (
                      <button
                        type="button"
                        className={`payment-promo-option ${selected ? "selected" : ""}`}
                        key={code}
                        disabled={promotionLoading}
                        onClick={() => applyPromotion(String(code))}
                      >
                        <span className="payment-promo-code">{code}</span>
                        <strong>{getPromotionTitle(item)}</strong>
                        <small>{getPromotionRules(item).join(" · ")}</small>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedPromotion && (
                <div className="payment-promo-detail">
                  <span>Chi tiết mã</span>
                  <strong>
                    {getPromotionValue(selectedPromotion, ["code", "Code"])}
                  </strong>
                  <p>{getPromotionDescription(selectedPromotion)}</p>
                  <ul>
                    {getPromotionRules(selectedPromotion).map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="payment-promo-manual">
                <input
                  value={promotionCode}
                  onChange={(event) => {
                    setPromotionCode(event.target.value);
                    setPromotionResult(null);
                    setPromotionMessage("");
                    setSelectedPromotion(null);
                  }}
                  placeholder="Nhập mã giảm giá"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={promotionLoading}
                  onClick={() => applyPromotion()}
                >
                  {promotionLoading ? "Đang kiểm tra..." : "Áp dụng"}
                </button>
              </div>
              {promotionMessage && (
                <p
                  className={`profile-status ${promotionResult ? "success" : ""}`}
                >
                  {promotionMessage}
                </p>
              )}
            </div>

            {showAllPromotions && (
              <div
                className="payment-promo-modal-backdrop"
                role="dialog"
                aria-modal="true"
                aria-label="Danh sách mã giảm giá"
              >
                <div className="payment-promo-modal">
                  <div className="payment-promo-modal-head">
                    <div>
                      <span>Ưu đãi</span>
                      <h2>Tất cả mã giảm giá</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllPromotions(false)}
                      aria-label="Đóng"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                  <div className="payment-promo-modal-list">
                    {availablePromotions.length === 0 && (
                      <p className="payment-promo-empty">
                        Chưa có mã giảm giá khả dụng.
                      </p>
                    )}
                    {availablePromotions.map((item) => {
                      const code = getPromotionValue(item, ["code", "Code"]);
                      const selected =
                        promotionCode.toUpperCase() ===
                          String(code).toUpperCase() && promotionResult;
                      return (
                        <button
                          type="button"
                          className={`payment-promo-option ${selected ? "selected" : ""}`}
                          key={code}
                          disabled={promotionLoading}
                          onClick={() => {
                            applyPromotion(String(code));
                            setShowAllPromotions(false);
                          }}
                        >
                          <span className="payment-promo-code">{code}</span>
                          <strong>{getPromotionTitle(item)}</strong>
                          <small>{getPromotionRules(item).join(" · ")}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary payment-submit-btn"
              onClick={handleContinueToPayment}
            >
              Tiếp tục thanh toán <i className="fa-solid fa-arrow-right" />
            </button>
          </main>
          {summaryAside}
        </section>
      )}

      {/* ── VIEW 2: XÁC NHẬN THANH TOÁN ──────────────────────────── */}
      {viewStep === "confirm" && (
        <section className="container payment-flow-layout">
          <main className="payment-confirm-card">
            {/* Countdown nổi bật */}
            <div
              className={`payment-confirm-countdown ${paymentRemainingMs < 120000 ? "urgent" : ""}`}
            >
              <i className="fa-solid fa-hourglass-half" />
              <div>
                <span>Thời gian thanh toán còn lại</span>
                <strong>{formatCountdown(paymentRemainingMs)}</strong>
              </div>
              {paymentRemainingMs < 120000 && (
                <span className="countdown-warn-badge">Sắp hết giờ!</span>
              )}
            </div>

            {/* ── CHUYỂN KHOẢN NGÂN HÀNG ── */}
            {paymentMethod === "BankTransfer" && (
              <>
                <div className="payment-qr-section">
                  <p className="payment-qr-label">
                    <i className="fa-solid fa-qrcode" /> Quét mã QR để thanh
                    toán
                  </p>
                  <div className="payment-qr-wrap">
                    <QRCodeSVG
                      value={vietQrValue}
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                    />
                  </div>
                  <small className="payment-qr-hint">
                    Hỗ trợ mọi app ngân hàng VN (VietQR)
                  </small>
                </div>

                <div className="payment-divider">
                  <span>hoặc chuyển khoản thủ công</span>
                </div>

                <div className="payment-bank-detail-table">
                  <div className="payment-bank-detail-row">
                    <span>Ngân hàng</span>
                    <strong>MB Bank</strong>
                  </div>
                  <div className="payment-bank-detail-row">
                    <span>Số tài khoản</span>
                    <div className="payment-bank-detail-value">
                      <strong>3901092005</strong>
                      <CopyButton text="3901092005" />
                    </div>
                  </div>
                  <div className="payment-bank-detail-row">
                    <span>Chủ tài khoản</span>
                    <strong>PHAM THANH DAT</strong>
                  </div>
                  <div className="payment-bank-detail-row">
                    <span>Số tiền</span>
                    <div className="payment-bank-detail-value">
                      <strong className="payment-amount-highlight">
                        {formatVND(finalPrice)}
                      </strong>
                      <CopyButton text={String(Math.round(finalPrice))} />
                    </div>
                  </div>
                  <div className="payment-bank-detail-row">
                    <span>Nội dung CK</span>
                    <div className="payment-bank-detail-value">
                      <strong>{transferNote}</strong>
                      <CopyButton text={transferNote} />
                    </div>
                  </div>
                </div>

                <div className="payment-transfer-notes">
                  <h4>
                    <i className="fa-solid fa-triangle-exclamation" /> Lưu ý
                    quan trọng
                  </h4>
                  <ul>
                    <li>
                      Kiểm tra đúng <b>số tài khoản</b> và <b>số tiền</b> trước
                      khi chuyển.
                    </li>
                    <li>
                      Nhập <b>đúng nội dung</b> chuyển khoản để hệ thống nhận
                      diện đơn hàng.
                    </li>
                    <li>
                      Sau khi chuyển khoản thành công, bấm{" "}
                      <b>"Tôi đã chuyển khoản"</b> để hoàn tất.
                    </li>
                    <li>
                      Vé sẽ được xác nhận sau khi admin kiểm tra thanh toán.
                    </li>
                    <li>Không đặt lại vé nếu đã chuyển khoản thành công.</li>
                  </ul>
                </div>
              </>
            )}

            {/* ── VÍ ĐIỆN TỬ / VNPAY ── */}
            {paymentMethod === "VNPay" && (
              <div className="payment-ewallet-section">
                <div className="payment-ewallet-icon">
                  <i className="fa-solid fa-wallet" />
                </div>
                <h3>Thanh toán qua VNPay</h3>
                <p>
                  Bấm <b>Xác nhận thanh toán</b> bên dưới để hệ thống ghi nhận
                  giao dịch.
                </p>
                <div
                  className="payment-bank-detail-table"
                  style={{ marginTop: 16 }}
                >
                  <div className="payment-bank-detail-row">
                    <span>Số tiền</span>
                    <strong className="payment-amount-highlight">
                      {formatVND(finalPrice)}
                    </strong>
                  </div>
                  <div className="payment-bank-detail-row">
                    <span>Phương thức</span>
                    <strong>Ví VNPay (giả lập)</strong>
                  </div>
                </div>
                <small>
                  Vé sẽ chờ admin xác nhận sau khi nhận được thông báo thanh
                  toán.
                </small>
              </div>
            )}

            {/* ── TIỀN MẶT ── */}
            {paymentMethod === "Cash" && (
              <div className="payment-ewallet-section">
                <div className="payment-ewallet-icon payment-ewallet-icon--cash">
                  <i className="fa-solid fa-money-bill-wave" />
                </div>
                <h3>Thanh toán tiền mặt</h3>
                <p>
                  Vui lòng thanh toán tại quầy hoặc trực tiếp cho tài xế khi lên
                  xe.
                </p>
                <div
                  className="payment-bank-detail-table"
                  style={{ marginTop: 16 }}
                >
                  <div className="payment-bank-detail-row">
                    <span>Số tiền cần trả</span>
                    <strong className="payment-amount-highlight">
                      {formatVND(finalPrice)}
                    </strong>
                  </div>
                </div>
                <small>
                  Đơn sẽ được xác nhận sau khi nhân viên nhà xe thu tiền.
                </small>
              </div>
            )}

            {submitError && (
              <div className="payment-submit-error" role="alert">
                <p>
                  <i className="fa-solid fa-circle-exclamation" /> {submitError}
                </p>
                {needsLogin && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: 10, width: "100%" }}
                    onClick={() =>
                      navigate("/login", {
                        state: { from: "/booking/payment" },
                      })
                    }
                  >
                    <i className="fa-solid fa-right-to-bracket" /> Đăng nhập lại
                  </button>
                )}
              </div>
            )}

            <div className="payment-confirm-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleBackClick}
              >
                <i className="fa-solid fa-arrow-left" /> Quay lại
              </button>
              <button
                type="button"
                className="btn btn-primary payment-submit-btn"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Đang xử lý...
                  </>
                ) : paymentMethod === "BankTransfer" ? (
                  <>
                    Tôi đã chuyển khoản <i className="fa-solid fa-check" />
                  </>
                ) : paymentMethod === "Cash" ? (
                  <>
                    Xác nhận đặt vé <i className="fa-solid fa-check" />
                  </>
                ) : (
                  <>
                    Xác nhận thanh toán <i className="fa-solid fa-check" />
                  </>
                )}
              </button>
            </div>
          </main>
          {summaryAside}
        </section>
      )}

      {/* ── Dialog xác nhận quay lại ─────────────────────────── */}
      {showBackConfirm && (
        <div className="modal-overlay" onClick={() => setShowBackConfirm(false)}>
          <div className="modal-box payment-back-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <h3>Hủy thanh toán?</h3>
            </div>
            <p style={{ color: '#475569', lineHeight: 1.6, margin: '10px 0 18px' }}>
              Quay lại đồng nghĩa với việc <b>hủy thanh toán hiện tại</b>.
              Nếu bạn tiếp tục thanh toán sau, đồng hồ 10 phút sẽ đếm lại từ đầu.
              Ghế vẫn được giữ cho đến khi hết thời gian giữ ghế.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowBackConfirm(false)}>
                Ở lại thanh toán
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmBack}>
                Xác nhận quay lại
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
