import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../layouts/UserLayout";
import { formatVND, pick } from "../api";
import { bookingApi } from "../services/bookingApi";
import { promotionApi } from "../services/promotionApi";
import BookingSteps from "../components/BookingSteps";

const PENDING_BOOKING_KEY = "pendingBooking";
const HOLD_STORAGE_KEY = "currentSeatHold";
const ROUND_TRIP_KEY = "roundTripBooking";
const SUCCESS_BOOKINGS_KEY = "lastSuccessfulBookingIds";
const PAY_DURATION_MS = 10 * 60 * 1000;

const paymentMethods = [
  { value: "Cash", label: "Tiền mặt", icon: "fa-money-bill-wave", desc: "Thanh toán khi lên xe hoặc tại quầy nhà xe" },
  { value: "BankTransfer", label: "Chuyển khoản ngân hàng", icon: "fa-building-columns", desc: "Quét QR hoặc chuyển khoản MB Bank" },
  { value: "VNPay", label: "Ví điện tử / VNPay", icon: "fa-wallet", desc: "Thanh toán qua ví điện tử (giả lập)" },
];

function readPendingBooking() {
  try { return JSON.parse(localStorage.getItem(PENDING_BOOKING_KEY) || "null"); }
  catch { return null; }
}
function readRoundTripBooking() {
  try { return JSON.parse(localStorage.getItem(ROUND_TRIP_KEY) || "null"); }
  catch { return null; }
}
function buildBookingRequest(booking, paymentMethod, promoCode) {
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
    promotionCode: promoCode || null,
  };
}
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function formatDateTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(value));
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" className={`copy-btn${copied ? " copied" : ""}`} onClick={handle}>
      <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} />
      {copied ? "Đã sao chép" : "Sao chép"}
    </button>
  );
}

export default function BookingPayment() {
  const navigate = useNavigate();
  const [pendingBooking] = useState(() => readPendingBooking());
  const [roundTripBooking] = useState(() => readRoundTripBooking());

  const [payStep, setPayStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");
  const [selectedPromoCode, setSelectedPromoCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [promotionResult, setPromotionResult] = useState(null);
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState([]);

  const [payExpiresAt, setPayExpiresAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const [holdExpiresAt] = useState(() => {
    try {
      const raw = localStorage.getItem(HOLD_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw)?.holdExpiresAt || null;
    } catch { return null; }
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    promotionApi.listPublic()
      .then((items) => setAvailablePromotions(Array.isArray(items) ? items : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!payExpiresAt || payStep !== 2) return;
    if (payExpiresAt > now) return;
    alert("Đã hết thời gian thanh toán. Vui lòng chọn lại ghế.");
    navigate(pendingBooking?.tripId ? `/trips/${pendingBooking.tripId}/seats` : "/search-results", { replace: true });
  }, [payExpiresAt, navigate, now, payStep, pendingBooking?.tripId]);

  useEffect(() => {
    if (!holdExpiresAt) return;
    if (new Date(holdExpiresAt).getTime() <= now) {
      alert("Đã hết thời gian giữ ghế. Vui lòng chọn lại ghế.");
      localStorage.removeItem(HOLD_STORAGE_KEY);
      window.dispatchEvent(new Event("holdSeatUpdated"));
      navigate(pendingBooking?.tripId ? `/trips/${pendingBooking.tripId}/seats` : "/search-results", { replace: true });
    }
  }, [holdExpiresAt, now, navigate, pendingBooking?.tripId]);

  const bookingsToPay = useMemo(() => {
    if (roundTripBooking?.stage === "complete" && roundTripBooking.outbound && roundTripBooking.returnTrip)
      return [roundTripBooking.outbound, roundTripBooking.returnTrip];
    return pendingBooking ? [pendingBooking] : [];
  }, [pendingBooking, roundTripBooking]);

  const subtotalPrice = useMemo(
    () => bookingsToPay.reduce((sum, b) => sum + Number(b?.totalPrice || 0), 0),
    [bookingsToPay],
  );
  const canApplyPromotion = bookingsToPay.length === 1;
  const discountAmount = Number(promotionResult?.discountAmount || promotionResult?.DiscountAmount || 0);
  const finalPrice = Math.max(0, canApplyPromotion ? subtotalPrice - discountAmount : subtotalPrice);
  const appliedCode = selectedPromoCode || manualCode;

  const transferContent = useMemo(() => {
    const phone = pendingBooking?.contact?.customerPhone || "";
    return `VEXEAZ ${phone}`.trim();
  }, [pendingBooking?.contact?.customerPhone]);

  const vietQrUrl = useMemo(() => {
    const amount = Math.round(Number(finalPrice || 0));
    return `https://img.vietqr.io/image/970422-3901092005-compact.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent("PHAM THANH DAT")}`;
  }, [finalPrice, transferContent]);

  const holdRemainingMs = holdExpiresAt ? Math.max(0, new Date(holdExpiresAt).getTime() - now) : 0;
  const payRemainingMs = payExpiresAt ? Math.max(0, payExpiresAt - now) : 0;

  const applyPromotion = async (code) => {
    const trimmed = String(code || "").trim().toUpperCase();
    if (!canApplyPromotion) { setPromotionMessage("Mã giảm giá chỉ áp dụng cho 1 lượt."); return; }
    if (!trimmed) { setPromotionMessage("Vui lòng nhập mã giảm giá."); return; }
    setPromotionLoading(true);
    setPromotionMessage("");
    try {
      const result = await promotionApi.validate({ code: trimmed, orderValue: subtotalPrice });
      if (result?.valid || result?.Valid) {
        setPromotionResult(result);
        setSelectedPromoCode(trimmed);
        setPromotionMessage(result.message || result.Message || "Áp dụng mã thành công!");
      } else {
        setPromotionResult(null);
        setPromotionMessage(result?.message || result?.Message || "Mã không hợp lệ.");
      }
    } catch (err) {
      setPromotionResult(null);
      setPromotionMessage(err.message || "Không thể kiểm tra mã.");
    } finally {
      setPromotionLoading(false);
    }
  };

  const removePromo = () => {
    setPromotionResult(null);
    setSelectedPromoCode("");
    setManualCode("");
    setPromotionMessage("");
  };

  const goToStep2 = () => {
    setPayExpiresAt(Date.now() + PAY_DURATION_MS);
    setPayStep(2);
  };

  const confirmBack = () => {
    setPayExpiresAt(null);
    setShowBackConfirm(false);
    setPayStep(1);
  };

  const submit = async () => {
    if (!bookingsToPay.length) { alert("Thiếu dữ liệu đặt vé."); return; }
    if (payRemainingMs <= 0) { alert("Đã hết thời gian thanh toán."); return; }
    setSubmitting(true);
    try {
      const responses = [];
      for (const [i, booking] of bookingsToPay.entries()) {
        const res = await bookingApi.create(
          buildBookingRequest(booking, paymentMethod,
            canApplyPromotion && i === 0 && promotionResult ? appliedCode : null)
        );
        responses.push(res);
      }
      const bookingIds = responses.map((r) => pick(r, ["bookingID", "bookingId", "BookingID", "id", "Id"])).filter(Boolean);
      localStorage.setItem(SUCCESS_BOOKINGS_KEY, JSON.stringify(bookingIds));
      localStorage.removeItem(PENDING_BOOKING_KEY);
      localStorage.removeItem(ROUND_TRIP_KEY);
      localStorage.removeItem(HOLD_STORAGE_KEY);
      window.dispatchEvent(new Event("holdSeatUpdated"));
      navigate(`/booking/success/${bookingIds[0]}`, { replace: true });
    } catch (err) {
      alert(err.message || "Không thể tạo booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingBooking?.tripId) {
    return (
      <UserLayout>
        <div className="container pickup-placeholder">
          <h1>Chưa có dữ liệu thanh toán</h1>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/search-results")}>Tìm chuyến</button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <section className="payment-flow-hero">
        <div className="container">
          <span>Thanh toán</span>
          <h1>Hoàn tất đặt vé</h1>
          <p>{payStep === 1 ? "Chọn phương thức thanh toán và mã giảm giá." : "Quét mã QR hoặc chuyển khoản để hoàn tất."}</p>
          <BookingSteps currentStep={4} />
        </div>
      </section>

      <section className="container pay-layout">
        <main className="pay-main-card">

          {/* ====== STEP 1 ====== */}
          {payStep === 1 && (
            <>
              {holdExpiresAt && holdRemainingMs > 0 && (
                <div className={`pay-hold-timer${holdRemainingMs <= 120000 ? " urgent" : ""}`}>
                  <div className="pay-hold-timer-icon"><i className="fa-solid fa-clock" /></div>
                  <div>
                    <div className="pay-hold-timer-label">Thời gian giữ ghế còn lại</div>
                    <div className="pay-hold-timer-value">{formatCountdown(holdRemainingMs)}</div>
                  </div>
                </div>
              )}

              <div className="pay-section">
                <h2>Chọn phương thức thanh toán</h2>
                <div className="pay-method-list">
                  {paymentMethods.map((m) => (
                    <label key={m.value} className={`pay-method-item${paymentMethod === m.value ? " selected" : ""}`}>
                      <input type="radio" name="paymentMethod" checked={paymentMethod === m.value}
                        onChange={() => setPaymentMethod(m.value)} />
                      <div className="pay-method-icon"><i className={`fa-solid ${m.icon}`} /></div>
                      <div className="pay-method-body">
                        <strong>{m.label}</strong>
                        <span>{m.desc}</span>
                      </div>
                      {paymentMethod === m.value && (
                        <i className="fa-solid fa-circle-check pay-method-check-icon" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {canApplyPromotion && (
                <div className="pay-section">
                  <div className="pay-promo-head">
                    <span className="pay-promo-eyebrow">ƯU ĐÃI</span>
                    <h2>Chọn mã giảm giá</h2>
                  </div>

                  {promotionResult ? (
                    <div className="pay-promo-applied">
                      <i className="fa-solid fa-circle-check" />
                      <div>
                        <strong>{appliedCode}</strong>
                        <span className="success">{promotionMessage}</span>
                      </div>
                      <button type="button" className="pay-promo-remove" onClick={removePromo}>
                        <i className="fa-solid fa-xmark" /> Bỏ mã
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="pay-promo-list">
                        {availablePromotions.slice(0, 4).map((item) => {
                          const code = pick(item, ["code", "Code"], "");
                          const discountType = Number(pick(item, ["discountType", "DiscountType"], 1));
                          const discountValue = pick(item, ["discountValue", "DiscountValue"], 0);
                          const maxDiscount = Number(pick(item, ["maxDiscountAmount", "MaxDiscountAmount"], 0));
                          const minOrder = Number(pick(item, ["minOrderValue", "MinOrderValue"], 0));
                          const usageLimit = pick(item, ["usageLimit", "UsageLimit"]);
                          const usageCount = Number(pick(item, ["usageCount", "UsageCount"], 0));
                          const endDate = pick(item, ["endDate", "EndDate"]);
                          const remaining = usageLimit != null ? Number(usageLimit) - usageCount : null;
                          const discountText = discountType === 1
                            ? (maxDiscount > 0 ? `Giảm ${discountValue}% tối đa ${formatVND(maxDiscount)}` : `Giảm ${discountValue}%`)
                            : `Giảm ${formatVND(discountValue)}`;
                          return (
                            <button key={code} type="button"
                              className={`pay-promo-item${selectedPromoCode === code ? " selected" : ""}`}
                              onClick={() => { setSelectedPromoCode(code); setManualCode(code); applyPromotion(code); }}>
                              <div className="pay-promo-code-tag">{code}</div>
                              <div className="pay-promo-item-body">
                                <strong>{discountText}</strong>
                                <span>
                                  {minOrder > 0 ? `Đơn từ ${formatVND(minOrder)} · ` : ""}
                                  {remaining != null ? `Còn ${remaining} lượt · ` : "Không giới hạn lượt dùng · "}
                                  {endDate ? `Hết hạn ${new Date(endDate).toLocaleDateString("vi-VN")}` : ""}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pay-promo-input-row">
                        <input type="text" placeholder="Nhập mã giảm giá" value={manualCode}
                          onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setSelectedPromoCode(""); setPromotionMessage(""); }}
                        />
                        <button type="button" className="btn btn-outline"
                          disabled={promotionLoading || !manualCode.trim()}
                          onClick={() => applyPromotion(manualCode)}>
                          {promotionLoading ? "..." : "Áp dụng"}
                        </button>
                      </div>

                      {promotionMessage && !promotionResult && (
                        <p className="pay-promo-msg error">{promotionMessage}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <button type="button" className="btn btn-primary pay-continue-btn" onClick={goToStep2}>
                Tiếp tục thanh toán <i className="fa-solid fa-arrow-right" />
              </button>
            </>
          )}

          {/* ====== STEP 2 ====== */}
          {payStep === 2 && (
            <>
              <div className={`pay-countdown-box${payRemainingMs <= 60000 ? " urgent" : ""}`}>
                <div className="pay-countdown-icon"><i className="fa-solid fa-hourglass-half" /></div>
                <div>
                  <div className="pay-countdown-label">THỜI GIAN THANH TOÁN CÒN LẠI</div>
                  <div className="pay-countdown-value">{formatCountdown(payRemainingMs)}</div>
                </div>
              </div>

              {paymentMethod === "BankTransfer" && (
                <div className="pay-bank-box">
                  <div className="pay-bank-qr-section">
                    <div className="pay-bank-qr-title">
                      <i className="fa-solid fa-qrcode" /> <span>Quét mã QR để thanh toán</span>
                    </div>
                    <img src={vietQrUrl} alt="QR thanh toán" className="pay-bank-qr-img" />
                    <p className="pay-bank-qr-note">Hỗ trợ mọi app ngân hàng VN (VietQR)</p>
                  </div>

                  <div className="pay-bank-divider"><span>hoặc chuyển khoản thủ công</span></div>

                  <div className="pay-bank-info-table">
                    {[
                      { label: "Ngân hàng", value: "MB Bank", copy: false },
                      { label: "Số tài khoản", value: "3901092005", copy: true },
                      { label: "Chủ tài khoản", value: "PHAM THANH DAT", copy: false },
                      { label: "Số tiền", value: formatVND(finalPrice), copyRaw: String(Math.round(finalPrice)), highlight: true },
                      { label: "Nội dung CK", value: transferContent, copy: true },
                    ].map((row) => (
                      <div key={row.label} className={`pay-bank-row${row.highlight ? " highlight" : ""}`}>
                        <span>{row.label}</span>
                        <div className="pay-bank-row-right">
                          <strong>{row.value}</strong>
                          {(row.copy || row.copyRaw) && <CopyButton text={row.copyRaw || row.value} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pay-bank-warning">
                    <div className="pay-bank-warning-head">
                      <i className="fa-solid fa-triangle-exclamation" />
                      <strong>Lưu ý quan trọng</strong>
                    </div>
                    <ul>
                      <li>Kiểm tra đúng <strong>số tài khoản</strong> và <strong>số tiền</strong> trước khi chuyển.</li>
                      <li>Nhập <strong>đúng nội dung chuyển khoản</strong> để hệ thống nhận diện đơn hàng.</li>
                      <li>Sau khi chuyển khoản thành công, bấm <strong>"Tôi đã chuyển khoản"</strong> để hoàn tất.</li>
                      <li>Vé sẽ được xác nhận sau khi admin kiểm tra thanh toán.</li>
                      <li>Không đặt lại vé nếu đã chuyển khoản thành công.</li>
                    </ul>
                  </div>
                </div>
              )}

              {paymentMethod === "Cash" && (
                <div className="pay-info-box">
                  <i className="fa-solid fa-money-bill-wave" />
                  <div>
                    <strong>Thanh toán tiền mặt</strong>
                    <p>Mang đúng số tiền <strong>{formatVND(finalPrice)}</strong> khi lên xe hoặc tại quầy nhà xe.</p>
                  </div>
                </div>
              )}

              {paymentMethod === "VNPay" && (
                <div className="pay-info-box">
                  <i className="fa-solid fa-wallet" />
                  <div>
                    <strong>Ví điện tử / VNPay</strong>
                    <p>Nhấn <strong>"Tôi đã thanh toán"</strong> để xác nhận. Số tiền: <strong>{formatVND(finalPrice)}</strong>.</p>
                  </div>
                </div>
              )}

              <div className="pay-step2-actions">
                <button type="button" className="btn btn-outline pay-back-btn"
                  onClick={() => setShowBackConfirm(true)} disabled={submitting}>
                  <i className="fa-solid fa-arrow-left" /> Quay lại
                </button>
                <button type="button" className="btn btn-primary pay-confirm-btn"
                  disabled={submitting} onClick={submit}>
                  {submitting ? "Đang xử lý..." : (paymentMethod === "BankTransfer" ? "Tôi đã chuyển khoản" : "Tôi đã thanh toán")}
                  {!submitting && <i className="fa-solid fa-circle-check" />}
                </button>
              </div>
            </>
          )}
        </main>

        {/* Sidebar */}
        <aside className="pay-summary-card">
          <h2>Tóm tắt đơn</h2>
          {bookingsToPay.map((booking, index) => {
            const t = booking.trip || {};
            const from = pick(t, ["departureLocation", "DepartureLocation"], "--");
            const to = pick(t, ["arrivalLocation", "ArrivalLocation"], "--");
            const operator = pick(t, ["operatorName", "OperatorName"], "--");
            const busType = pick(t, ["busType", "BusType"], "--");
            const depTime = pick(t, ["departureTime", "DepartureTime"]);
            return (
              <div className="pay-summary-trip" key={`${booking.tripId}-${index}`}>
                <strong>{bookingsToPay.length > 1 ? (index === 0 ? "Lượt đi" : "Lượt về") : operator}</strong>
                {bookingsToPay.length > 1 && <span className="muted">{operator}</span>}
                <span className="muted">{busType}</span>
                <p>{from} → {to}</p>
                <small>{formatDateTime(depTime)} · Ghế {booking.seatLabels?.join(", ") || "--"}</small>
              </div>
            );
          })}
          <div className="pay-summary-row"><span>Người đi</span><strong>{pendingBooking.contact?.customerName || "--"}</strong></div>
          <div className="pay-summary-row"><span>Số điện thoại</span><strong>{pendingBooking.contact?.customerPhone || "--"}</strong></div>
          <div className="pay-summary-row"><span>Tổng tiền</span><strong>{formatVND(subtotalPrice)}</strong></div>
          {canApplyPromotion && promotionResult && (
            <div className="pay-summary-row discount"><span>Giảm giá</span><strong>-{formatVND(discountAmount)}</strong></div>
          )}
          <div className="pay-summary-total"><span>Tổng thanh toán</span><strong>{formatVND(finalPrice)}</strong></div>
        </aside>
      </section>

      {showBackConfirm && (
        <div className="hold-cancel-overlay">
          <div className="hold-cancel-dialog">
            <div className="hold-cancel-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <i className="fa-solid fa-rotate-left" />
            </div>
            <h3>Quay lại bước chọn thanh toán?</h3>
            <p>Đồng hồ thanh toán sẽ reset. Thời gian giữ ghế vẫn tiếp tục chạy.</p>
            <div className="hold-cancel-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowBackConfirm(false)}>Hủy</button>
              <button type="button" className="btn btn-primary" onClick={confirmBack}>Xác nhận quay lại</button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
