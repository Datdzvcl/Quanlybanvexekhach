// import { useEffect, useMemo, useState } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiFetch,
  formatVND,
  labelBookingStatus,
  labelPaymentMethod,
  labelPaymentStatus,
  labelRole,
  labelTripStatus,
  normalizeTrip,
  pick,
} from "../api";
import { busApi } from "../services/busApi";
import { bookingApi } from "../services/bookingApi";
import { operatorApi } from "../services/operatorApi";
import { tripApi } from "../services/tripApi";
import { userApi } from "../services/userApi";
import { promotionApi } from "../services/promotionApi";
import { paymentApi } from "../services/paymentApi";
import { reviewApi } from "../services/reviewApi";
import { useAuth } from "../contexts/AuthContext";
import AdminDashboard from "./admin/AdminDashboard";
const includesText = (value, query) =>
  String(value || "")
    .toLowerCase()
    .includes(String(query || "").toLowerCase());
const dateOnly = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const PAGE_SIZE = 20;
const ADMIN_CRUD_PAGE_SIZE = 10;
const normalizePagedResponse = (
  data,
  fallbackPage = 1,
  fallbackPageSize = ADMIN_CRUD_PAGE_SIZE,
) => {
  if (Array.isArray(data)) {
    return {
      items: data,
      totalCount: data.length,
      page: fallbackPage,
      pageSize: fallbackPageSize,
      totalPages: Math.max(1, Math.ceil(data.length / fallbackPageSize)),
    };
  }

  const items = data?.items || data?.Items || [];
  const totalCount = Number(
    data?.totalCount ?? data?.TotalCount ?? items.length,
  );
  const pageSize = Number(data?.pageSize ?? data?.PageSize ?? fallbackPageSize);
  return {
    items,
    totalCount,
    page: Number(data?.page ?? data?.Page ?? fallbackPage),
    pageSize,
    totalPages: Number(
      data?.totalPages ??
        data?.TotalPages ??
        Math.max(1, Math.ceil(totalCount / pageSize)),
    ),
  };
};

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    ),
  );
// const tabs = [
//   ["dashboard", "Tổng quan", "fa-chart-line"],
//   ["trips", "Chuyến xe", "fa-route"],
//   ["bookings", "Đặt vé", "fa-ticket"],
//   ["invoices", "Hóa đơn", "fa-file-invoice"],
//   ["tickets", "Quản lý vé", "fa-couch"],
//   ["transactions", "Giao dịch", "fa-money-bill-wave"],
//   ["buses", "Xe", "fa-bus"],
//   ["operators", "Nhà xe", "fa-building"],
//   ["users", "Người dùng", "fa-users"],
// ];
const tabs = [
  ["dashboard", "Tổng quan", "fa-chart-line"],
  ["trips", "Chuyến xe", "fa-route"],
  ["orders", "Đơn hàng", "fa-file-invoice"], // ← gộp 3 tab
  ["promotions", "Khuyến mãi", "fa-tags"],
  ["payments", "Thanh toán", "fa-credit-card"],
  ["reviews", "Đánh giá", "fa-star"],
  // ["tickets", "Quản lý vé", "fa-couch"],
  ["buses", "Xe", "fa-bus"],
  ["operators", "Nhà xe", "fa-building"],
  ["users", "Người dùng", "fa-users"],
];
const EMPTY_TRIP = {
  tripID: null,
  busID: "",
  departureLocation: "",
  arrivalLocation: "",
  departureTime: "",
  arrivalTime: "",
  price: "",
  availableSeats: "",
  // status: "Scheduled",
   status: 0
};
const EMPTY_BUS = {
  busID: null,
  operatorID: "",
  licensePlate: "",
  capacity: "",
  busType: "",
};
const EMPTY_OPERATOR = {
  operatorID: null,
  name: "",
  description: "",
  contactPhone: "",
  email: "",
};
const EMPTY_BOOKING = {
  tripID: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  totalSeats: 1,
  paymentMethod: "Online",
  paymentStatus: "Pending",
};
const EMPTY_PROMOTION = {
  promotionID: null,
  code: "",
  description: "",
  discountType: 1,
  discountValue: "",
  minOrderValue: "",
  maxDiscount: "",
  usageLimit: "",
  startDate: "",
  endDate: "",
  isActive: true,
  isPublic: true,
  userID: "",
};

// export default function Admin({ active = "dashboard" }) {
export default function Admin({ active = 'dashboard', isOperator = false }) {
  const [stats, setStats] = useState({});
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [ticketSeats, setTicketSeats] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [buses, setBuses] = useState([]);
  const [operators, setOperators] = useState([]);
  const [users, setUsers] = useState([]);
  const [revenueStats, setRevenueStats] = useState([]);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // const load = async () => {
  //   setLoading(true);
  // const load = async (silent = false) => {
  //   if (!silent) setLoading(true);
  //   try {
  //     // const [s, rawTrips, rawBookings, rawBuses, rawOperators, rawTicketSeats, rawTransactions, rawUsers, rawRevenue] = await Promise.all([
  //     //   apiFetch("/api/admin/statistics").catch(() => ({})),
  //     //   apiFetch("/api/admin/trips").catch(() => []),
  //     //   apiFetch("/api/admin/bookings").catch(() => []),
  //     //   apiFetch("/api/admin/buses").catch(() => []),
  //     //   apiFetch("/api/admin/operators").catch(() => []),
  //     //   apiFetch("/api/admin/ticket-seats").catch(() => []),
  //     //   apiFetch("/api/admin/transactions").catch(() => []),
  //     //   apiFetch("/api/admin/users").catch(() => []),
  //     //   apiFetch("/api/admin/revenue-stats").catch(() => []),
  //     //   apiFetch("/api/admin/upcoming-trips").catch(() => []),
  //     // ]);
  //     const [
  //       s,
  //       rawTrips,
  //       rawBookings,
  //       rawBuses,
  //       rawOperators,
  //       rawTicketSeats,
  //       rawTransactions,
  //       rawUsers,
  //       rawRevenue,
  //       rawUpcoming,
  //     ] = await Promise.all([
  //       apiFetch("/api/dashboard/stats").catch(() => ({})),
  //       apiFetch("/api/admin/trips").catch(() => []),
  //       apiFetch("/api/admin/bookings").catch(() => []),
  //       apiFetch("/api/admin/buses").catch(() => []),
  //       apiFetch("/api/admin/operators").catch(() => []),
  //       apiFetch("/api/admin/ticket-seats").catch(() => []),
  //       apiFetch("/api/admin/transactions").catch(() => []),
  //       apiFetch("/api/admin/users").catch(() => []),
  //       apiFetch("/api/admin/revenue-stats").catch(() => []),
  //       apiFetch("/api/admin/upcoming-trips").catch(() => []),
  //     ]);
  //     const normalizedTrips = Array.isArray(rawTrips)
  //       ? rawTrips.map(normalizeTrip)
  //       : [];
  //     const safeBuses = Array.isArray(rawBuses) ? rawBuses : [];
  //     const safeOperators = Array.isArray(rawOperators) ? rawOperators : [];
  //     setStats(s || {});
  //     setBuses(safeBuses);
  //     setOperators(safeOperators);
  //     setTrips(enrichTrips(normalizedTrips, safeBuses, safeOperators));
  //     setBookings(Array.isArray(rawBookings) ? rawBookings : []);
  //     setTicketSeats(Array.isArray(rawTicketSeats) ? rawTicketSeats : []);
  //     setTransactions(Array.isArray(rawTransactions) ? rawTransactions : []);
  //     setUsers(Array.isArray(rawUsers) ? rawUsers : []);
  //     setRevenueStats(Array.isArray(rawRevenue) ? rawRevenue : []);
  //     setUpcomingTrips(
  //       Array.isArray(rawUpcoming)
  //         ? enrichTrips(
  //             rawUpcoming.map(normalizeTrip),
  //             safeBuses,
  //             safeOperators,
  //           )
  //         : [],
  //     );
  //   } catch (e) {
  //     alert(e.message || "Không tải được dữ liệu admin.");
  //     // } finally {
  //     //   setLoading(false);
  //     // }
  //   } finally {
  //     if (!silent) setLoading(false);
  //   }
  // };
const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [
        s,
        rawTrips,
        rawBookings,
        rawBuses,
        rawOperators,   // operator sẽ nhận [] vì BE trả 403
        rawTicketSeats,
        rawTransactions,
        rawUsers,       // operator sẽ nhận [] vì BE trả 403
        rawRevenue,
        rawUpcoming,
      ] = await Promise.all([
        apiFetch("/api/dashboard/stats").catch(() => ({})),
        apiFetch("/api/admin/trips").catch(() => []),
        apiFetch("/api/admin/bookings").catch(() => []),
        apiFetch("/api/admin/buses").catch(() => []),
        // ↓ operator không gọi /api/admin/operators (locked Admin-only)
        isOperator
          ? Promise.resolve([])
          : apiFetch("/api/admin/operators").catch(() => []),
        apiFetch("/api/admin/ticket-seats").catch(() => []),
        apiFetch("/api/admin/transactions").catch(() => []),
        // ↓ operator không gọi /api/admin/users (locked Admin-only)
        isOperator
          ? Promise.resolve([])
          : apiFetch("/api/admin/users").catch(() => []),
        apiFetch("/api/admin/revenue-stats").catch(() => []),
        apiFetch("/api/admin/upcoming-trips").catch(() => []),
      ]);
 
      const normalizedTrips = Array.isArray(rawTrips) ? rawTrips.map(normalizeTrip) : [];
      const safeBuses       = Array.isArray(rawBuses)     ? rawBuses     : [];
      const safeOperators   = Array.isArray(rawOperators) ? rawOperators : [];
 
      setStats(s || {});
      setBuses(safeBuses);
      setOperators(safeOperators);
      setTrips(enrichTrips(normalizedTrips, safeBuses, safeOperators));
      setBookings(Array.isArray(rawBookings)     ? rawBookings     : []);
      setTicketSeats(Array.isArray(rawTicketSeats) ? rawTicketSeats : []);
      setTransactions(Array.isArray(rawTransactions) ? rawTransactions : []);
      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      setRevenueStats(Array.isArray(rawRevenue) ? rawRevenue : []);
      setUpcomingTrips(
        Array.isArray(rawUpcoming)
          ? enrichTrips(rawUpcoming.map(normalizeTrip), safeBuses, safeOperators)
          : []
      );
    } catch (e) {
      alert(e.message || "Không tải được dữ liệu admin.");
    } finally {
      if (!silent) setLoading(false);
      setRefreshKey(k => k + 1);
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="admin-content-tools">
        <button className="btn btn-primary" onClick={load}>
          <i className="fa-solid fa-rotate" /> Tải lại
        </button>
      </div>
      {loading ? (
        <div className="admin-card">Đang tải dữ liệu...</div>
      ) : (
        <AdminContent
          active={active}
          stats={stats}
          trips={trips}
          upcomingTrips={upcomingTrips}
          bookings={bookings}
          ticketSeats={ticketSeats}
          transactions={transactions}
          buses={buses}
          operators={operators}
          users={users}
          revenueStats={revenueStats}
          onRefresh={() => load(true)}
          isOperator={isOperator}
          refreshKey={refreshKey}
        />
      )}
    </>
  );
}

function AdminContent({
  active,
  stats,
  trips,
  upcomingTrips,
  bookings,
  ticketSeats,
  transactions,
  buses,
  operators,
  users,
  revenueStats,
  onRefresh,
  isOperator,
  refreshKey,
}) {
  if (active === 'dashboard')
    return (
      <AdminDashboard
        stats={stats}
        trips={trips}
        upcomingTrips={upcomingTrips}
        bookings={bookings}
        transactions={transactions}
        revenueStats={revenueStats}
        buses={buses}
        operators={operators}
        users={users}
        isOperator={isOperator}   // ← truyền xuống
      />
    );
//   if (active === "trips")
//     return (
//       <TripsManager
//         trips={trips}
//         buses={buses}
//         operators={operators}
//         onRefresh={onRefresh}
//       />
//     );
//   if (active === "orders") return <BookingsManager />;
//   if (active === "promotions") return <PromotionsManager />;
//   if (active === "payments") return <PaymentsManager />;
//   if (active === "reviews") return <ReviewsManager />;
//   // if (active === "tickets") return <TicketsManager ticketSeats={ticketSeats} trips={trips} operators={operators} />;  // ← thêm props
//   if (active === "buses")
//     return (
//       <BusesManager buses={buses} operators={operators} onRefresh={onRefresh} />
//     );
//   if (active === "users")
//     return <UsersManager users={users} onRefresh={onRefresh} />;
//   if (active === "settings") return <AdminSettings />;
//   return <OperatorsManager operators={operators} onRefresh={onRefresh} />;
// }
if (isOperator && active === 'operators')
    return <div className="admin-card">Bạn không có quyền truy cập trang này.</div>;
  if (isOperator && active === 'users')
    return <div className="admin-card">Bạn không có quyền truy cập trang này.</div>;
 
  if (active === 'trips')
    return <TripsManager trips={trips} buses={buses} operators={operators} onRefresh={onRefresh} isOperator={isOperator} />;
  if (active === 'orders')   return <BookingsManager />;
  if (active === 'promotions') return <PromotionsManager />;
  if (active === 'payments') return <PaymentsManager isOperator={isOperator} />;
  // if (active === 'reviews')  return <ReviewsManager />;
  if (active === 'reviews') return <ReviewsManager isOperator={isOperator} />;
  if (active === 'buses')
    return <BusesManager buses={buses} operators={operators} onRefresh={onRefresh} isOperator={isOperator} refreshKey={refreshKey} />;
  if (active === 'users')
    return <UsersManager users={users} onRefresh={onRefresh} />;
  if (active === 'settings') return <AdminSettings />;
  return <OperatorsManager operators={operators} onRefresh={onRefresh} />;
}
function AdminSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("adminDarkMode") === "true",
  );

  useEffect(() => {
    localStorage.setItem("adminDarkMode", String(darkMode));
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <section className="admin-card admin-settings-card">
      <div className="admin-section-head">
        <div>
          <h3>Cài đặt</h3>
          <p>Thông tin tài khoản và tuỳ chọn hiển thị khu vực quản trị.</p>
        </div>
        <button className="btn btn-danger" type="button" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
        </button>
      </div>
      <div className="admin-settings-grid">
        <div>
          <b>Họ tên</b>
          <span>{user?.fullName || "Admin"}</span>
        </div>
        <div>
          <b>Email</b>
          <span>{user?.email || "Chưa cập nhật"}</span>
        </div>
        <div>
          <b>Số điện thoại</b>
          <span>{user?.phone || "Chưa cập nhật"}</span>
        </div>
        <div>
          <b>Vai trò</b>
          <span>{labelRole(user?.role || "Admin")}</span>
        </div>
      </div>

      <div className="admin-settings-panel">
        <div>
          <b>Chế độ tối</b>
          <span>
            Lưu lựa chọn vào localStorage và áp dụng lại khi tải trang.
          </span>
        </div>
        <button
          className={`admin-toggle ${darkMode ? "active" : ""}`}
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          aria-pressed={darkMode}
        >
          <span />
          {darkMode ? "Đang bật" : "Đang tắt"}
        </button>
      </div>
    </section>
  );
}
// ==================== HOÁ ĐƠN ====================
function InvoicesManager({ bookings, trips, onRefresh }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const { search, setSearch, filtered } = useSearch(bookings, [
    "customerName",
    "CustomerName",
    "customerPhone",
    "CustomerPhone",
    "route",
    "Route",
  ]);
  const { page, setPage, totalPages, rows } = usePagination(filtered);

  const viewInvoice = async (bookingId) => {
    setLoadingInvoice(true);
    setSelectedInvoice(bookingId);
    try {
      const data = await apiFetch(`/api/admin/invoice/${bookingId}`);
      setInvoiceDetail(data);
    } catch {
      alert("Không tải được hóa đơn.");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const printInvoice = () => {
    const printArea = document.getElementById("invoice-print-area");
    if (!printArea) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Hóa đơn #${invoiceDetail?.bookingID}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
        h1 { color: #2563eb; }
        .row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .total { font-size: 20px; font-weight: bold; color: #2563eb; }
        .badge { padding: 4px 12px; border-radius: 20px; background: #dcfce7; color: #16a34a; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
      </style></head>
      <body>${printArea.innerHTML}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const updateStatus = async (id, status) => {
    try {
      await apiFetch(`/api/bookings/${id}/payment-status`, {
        method: "PUT",
        body: JSON.stringify(status),
      });
      await onRefresh();
      if (invoiceDetail) viewInvoice(id);
    } catch (e) {
      alert(e.message || "Không cập nhật được.");
    }
  };

  return (
    <section className="admin-card table-card">
      <h3>Quản lý hóa đơn</h3>

      {selectedInvoice && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              width: 600,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {loadingInvoice ? (
              <p>Đang tải hóa đơn...</p>
            ) : invoiceDetail ? (
              <>
                <div id="invoice-print-area">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <h1 style={{ margin: 0, color: "#2563eb" }}>🚌 VéXeAZ</h1>
                      <p style={{ margin: 0, color: "#666" }}>
                        Hệ thống đặt vé xe khách
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <h2 style={{ margin: 0 }}>
                        HÓA ĐƠN #{invoiceDetail.bookingID}
                      </h2>
                      <p style={{ margin: 0, color: "#666" }}>
                        {formatDateTime(invoiceDetail.bookingDate)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <h4 style={{ margin: "0 0 12px 0" }}>
                      Thông tin khách hàng
                    </h4>
                    <div className="row">
                      <span>Họ tên:</span>
                      <b>{invoiceDetail.customerName}</b>
                    </div>
                    <div className="row">
                      <span>SĐT:</span>
                      <span>{invoiceDetail.customerPhone}</span>
                    </div>
                    <div className="row">
                      <span>Email:</span>
                      <span>{invoiceDetail.customerEmail}</span>
                    </div>
                  </div>

                  {invoiceDetail.trip && (
                    <div
                      style={{
                        background: "#f0f9ff",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 16,
                      }}
                    >
                      <h4 style={{ margin: "0 0 12px 0" }}>
                        Thông tin chuyến xe
                      </h4>
                      <div className="row">
                        <span>Tuyến:</span>
                        <b>
                          {invoiceDetail.trip.departureLocation} →{" "}
                          {invoiceDetail.trip.arrivalLocation}
                        </b>
                      </div>
                      <div className="row">
                        <span>Giờ đi:</span>
                        <span>
                          {formatDateTime(invoiceDetail.trip.departureTime)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Giờ đến:</span>
                        <span>
                          {formatDateTime(invoiceDetail.trip.arrivalTime)}
                        </span>
                      </div>
                      <div className="row">
                        <span>Nhà xe:</span>
                        <span>{invoiceDetail.trip.operatorName}</span>
                      </div>
                      <div className="row">
                        <span>Loại xe:</span>
                        <span>{invoiceDetail.trip.busType}</span>
                      </div>
                      <div className="row">
                        <span>Biển số:</span>
                        <span>{invoiceDetail.trip.licensePlate}</span>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      background: "#fafafa",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <h4 style={{ margin: "0 0 12px 0" }}>Chi tiết vé</h4>
                    <div className="row">
                      <span>Số ghế:</span>
                      <span>{invoiceDetail.totalSeats}</span>
                    </div>
                    {invoiceDetail.seats?.length > 0 && (
                      <div className="row">
                        <span>Ghế:</span>
                        <span>{invoiceDetail.seats.join(", ")}</span>
                      </div>
                    )}
                    <div className="row">
                      <span>Đơn giá:</span>
                      <span>{formatVND(invoiceDetail.trip?.price || 0)}</span>
                    </div>
                    <div className="row">
                      <span>Phương thức:</span>
                      <span>
                        {labelPaymentMethod(invoiceDetail.paymentMethod)}
                      </span>
                    </div>
                    <div className="row">
                      <span>Trạng thái:</span>
                      <span className="badge">
                        {invoiceDetail.paymentStatus}
                      </span>
                    </div>
                    <div className="row total">
                      <span>TỔNG CỘNG:</span>
                      <span>{formatVND(invoiceDetail.totalPrice)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={printInvoice}>
                    <i className="fa-solid fa-print" /> In hóa đơn
                  </button>
                  {invoiceDetail.paymentStatus !== "Paid" && (
                    <button
                      className="btn btn-outline"
                      style={{
                        background: "#dcfce7",
                        color: "#16a34a",
                        border: "none",
                      }}
                      onClick={() =>
                        updateStatus(invoiceDetail.bookingID, "Paid")
                      }
                    >
                      ✓ Xác nhận Paid
                    </button>
                  )}
                  {invoiceDetail.paymentStatus !== "Cancelled" && (
                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        updateStatus(invoiceDetail.bookingID, "Cancelled")
                      }
                    >
                      Hủy đơn
                    </button>
                  )}
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setInvoiceDetail(null);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Tìm tên, SĐT, tuyến..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã HĐ</th>
              <th>Khách hàng</th>
              <th>SĐT</th>
              <th>Tuyến</th>
              <th>Ngày đặt</th>
              <th>Trạng thái</th>
              <th>Tổng tiền</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["bookingID", "BookingID"]);
              const status = getPaymentStatus(item);
              return (
                <tr key={id}>
                  <td>#{id}</td>
                  <td>{pick(item, ["customerName", "CustomerName"])}</td>
                  <td>{pick(item, ["customerPhone", "CustomerPhone"])}</td>
                  <td>
                    {pick(item, ["route", "Route"]) ||
                      findTripRoute(trips, pick(item, ["tripID", "TripID"]))}
                  </td>
                  <td>
                    {formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}
                  </td>
                  <td>
                    <span className="badge">{status}</span>
                  </td>
                  <td>
                    {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
                  </td>
                  <td className="admin-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => viewInvoice(id)}
                    >
                      <i className="fa-solid fa-file-invoice" /> Xem HĐ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

// ==================== USERS ====================
function UsersManager({ onRefresh }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    totalCount: 0,
    page: 1,
    pageSize: ADMIN_CRUD_PAGE_SIZE,
    totalPages: 1,
  });
  // const [filters, setFilters] = useState({
  //   fullName: "",
  //   email: "",
  //   phone: "",
  //   role: "",
  // });
  const [filters, setFilters] = useState({
  keyword: "",
  role: "",
});
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    userID: null,
    fullName: "",
    email: "",
    phone: "",
    role: "Customer",
    password: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // const loadUsers = async () => {
  //   setLoading(true);
  //   try {
  //     const data = await userApi.list(
  //       cleanParams({ ...filters, page, pageSize: ADMIN_CRUD_PAGE_SIZE }),
  //     );
  //     const paged = normalizePagedResponse(data, page);
  //     setRows(paged.items);
  //     setMeta(paged);
  //   } catch (e) {
  //     setNotice({
  //       type: "error",
  //       text: e.message || "Không tải được danh sách người dùng.",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const loadUsers = async () => {
  setLoading(true);
  try {
    const kw = filters.keyword.trim();
    const isPhone = /^[0-9+]{6,}$/.test(kw);
    const isEmail = kw.includes("@");

    const params = cleanParams({
      fullName: !isPhone && !isEmail ? kw : "",
      phone:    isPhone ? kw : "",
      email:    isEmail ? kw : "",
      role:     filters.role,
      page,
      pageSize: ADMIN_CRUD_PAGE_SIZE,
    });

    const data = await userApi.list(params);
    const paged = normalizePagedResponse(data, page);
    setRows(paged.items);
    setMeta(paged);
  } catch (e) {
    setNotice({ type: "error", text: e.message || "Không tải được danh sách." });
  } finally {
    setLoading(false);
  }
};

  // useEffect(() => {
  //   loadUsers();
  // }, [page, filters.fullName, filters.email, filters.phone, filters.role]);
useEffect(() => {
  loadUsers();
}, [page, filters.keyword, filters.role]);
  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const openCreate = () => {
    setForm({
      userID: null,
      fullName: "",
      email: "",
      phone: "",
      role: "Customer",
      password: "",
    });
    setShowForm(true);
  };

  const editItem = (item) => {
    setForm({
      userID: pick(item, ["userID", "UserID"]),
      fullName: pick(item, ["fullName", "FullName"], ""),
      email: pick(item, ["email", "Email"], ""),
      phone: pick(item, ["phone", "Phone"], ""),
      role: pick(item, ["role", "Role"], "Customer"),
      password: "",
    });
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
      };
      if (!payload.fullName || !payload.email || !payload.phone)
        throw new Error("Vui lòng nhập đủ họ tên, email và số điện thoại.");
      if (!form.userID || form.password.trim())
        payload.password = form.password.trim();
      if (!form.userID && !payload.password)
        throw new Error("Vui lòng nhập mật khẩu khi thêm user.");

      if (form.userID) await userApi.update(form.userID, payload);
      else await userApi.create(payload);

      setNotice({
        type: "success",
        text: form.userID
          ? "Cập nhật user thành công."
          : "Thêm user thành công.",
      });
      setShowForm(false);
      await loadUsers();
      await onRefresh?.();
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không lưu được user." });
    }
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa user #${id}?`)) return;
    setNotice(null);
    try {
      await userApi.remove(id);
      setNotice({ type: "success", text: "Xóa user thành công." });
      await loadUsers();
      await onRefresh?.();
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không xóa được user." });
    }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader
        title="Quản lý người dùng"
        showForm={showForm}
        onToggle={() => (showForm ? setShowForm(false) : openCreate())}
      />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <AdminFormModal
          title={form.userID ? "Sửa người dùng" : "Thêm người dùng"}
          onClose={() => setShowForm(false)}
        >
          <form className="admin-form-grid" onSubmit={submit}>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Họ tên"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              required
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Số điện thoại"
              required
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="0">Khách hàng</option>
              <option value="2">Nhà xe</option>
              <option value="1">Quản trị viên</option>
            </select>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={
                form.userID ? "Mật khẩu mới nếu muốn đổi" : "Mật khẩu"
              }
              required={!form.userID}
            />
            <div className="admin-form-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {form.userID ? "Cập nhật" : "Lưu user"}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>
            </div>
          </form>
        </AdminFormModal>
      )}
      {/* <div className="admin-filter-grid">
        <input
          value={filters.fullName}
          onChange={(e) => updateFilter("fullName", e.target.value)}
          placeholder="Tìm họ tên"
        />
        <input
          value={filters.email}
          onChange={(e) => updateFilter("email", e.target.value)}
          placeholder="Tìm email"
        />
        <input
          value={filters.phone}
          onChange={(e) => updateFilter("phone", e.target.value)}
          placeholder="Tìm số điện thoại"
        />
        <select
          value={filters.role}
          onChange={(e) => updateFilter("role", e.target.value)}
        >
          <option value="">Tất cả role</option>
          <option value="Customer">Khách hàng</option>
          <option value="Operator">Nhà xe</option>
          <option value="Admin">Quản trị viên</option>
        </select>
      </div> */}
      <div className="admin-filter-grid">
  <input
    value={filters.keyword}
    onChange={(e) => { setFilters(f => ({ ...f, keyword: e.target.value })); setPage(1); }}
    placeholder="Tìm theo tên, email hoặc số điện thoại..."
    style={{ gridColumn: "span 2" }}
  />
  <select
    value={filters.role}
    onChange={(e) => { setFilters(f => ({ ...f, role: e.target.value })); setPage(1); }}
  >
    <option value="">Tất cả vai trò</option>
    <option value="0">Khách hàng</option>
    <option value="1">Nhà xe</option>
    <option value="2">Quản trị viên</option>
  </select>
</div>
      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["userID", "UserID"]);
              const role = pick(item, ["role", "Role"], "Customer");
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>
                    <b>{pick(item, ["fullName", "FullName"])}</b>
                  </td>
                  <td>{pick(item, ["email", "Email"])}</td>
                  <td>{pick(item, ["phone", "Phone"])}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: role === "Admin" ? "#fef9c3" : "#f0f9ff",
                        color: role === "Admin" ? "#854d0e" : "#1d4ed8",
                      }}
                    >
                      {labelRole(role)}
                    </span>
                  </td>
                  <td>
                    {formatDateTime(pick(item, ["createdAt", "CreatedAt"]))}
                  </td>
                  <td className="admin-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => editItem(item)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => removeItem(id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="7" className="empty-cell">
                  Không có người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        page={meta.page}
        totalPages={meta.totalPages}
        totalCount={meta.totalCount}
        onPageChange={setPage}
      />
    </section>
  );
}

// ==================== TRIPS MANAGER ====================
function TripsManager({ buses, operators, onRefresh, isOperator = false }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    totalCount: 0,
    page: 1,
    pageSize: ADMIN_CRUD_PAGE_SIZE,
    totalPages: 1,
  });
  const [form, setForm] = useState(EMPTY_TRIP);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    departureLocation: "",
    arrivalLocation: "",
    departureDate: "",
    operatorId: "",
    status: "",
    minPrice: "",
    maxPrice: "",
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [cloneModal, setCloneModal] = useState(null); // { sourceDate, targetDate }
  const [cloneLoading, setCloneLoading] = useState(false);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await tripApi.adminList(
        cleanParams({
          ...filters,
          operatorId: isOperator ? "" : filters.operatorId,
          page,
          pageSize: ADMIN_CRUD_PAGE_SIZE,
        }),
      );
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items.map(normalizeTrip));
      setMeta(paged);
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không tải được danh sách chuyến xe.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [
    page,
    filters.departureLocation,
    filters.arrivalLocation,
    filters.departureDate,
    filters.operatorId,
    filters.status,
    filters.minPrice,
    filters.maxPrice,
    isOperator,
  ]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const payload = {
        tripID: form.tripID || 0,
        busID: Number(form.busID),
        departureLocation: form.departureLocation.trim(),
        arrivalLocation: form.arrivalLocation.trim(),
        departureTime: form.departureTime,
        arrivalTime: form.arrivalTime,
        price: Number(form.price || 0),
        availableSeats: Number(form.availableSeats || 0),
        // status: form.status || "Scheduled",
        // status: Number(form.status ?? 0),
         status: Number(form.status || 0),
      };
      if (
        !payload.busID ||
        !payload.departureLocation ||
        !payload.arrivalLocation ||
        !payload.departureTime ||
        !payload.arrivalTime
      )
        throw new Error("Vui lòng nhập đủ thông tin chuyến xe.");
      if (form.tripID) await tripApi.update(form.tripID, payload);
      else await tripApi.create(payload);
      setNotice({
        type: "success",
        text: form.tripID
          ? "Cập nhật chuyến xe thành công."
          : "Thêm chuyến xe thành công.",
      });
      setForm(EMPTY_TRIP);
      setShowForm(false);
      await loadTrips();
      await onRefresh?.();
    } catch (e2) {
      setNotice({
        type: "error",
        text: e2.message || "Không lưu được chuyến xe.",
      });
    }
  };

  const editItem = (item) => {
    setForm({
      tripID: item.id,
      busID: item.busId || "",
      departureLocation: item.departureLocation || "",
      arrivalLocation: item.arrivalLocation || "",
      departureTime: toDateTimeLocal(item.departureTime),
      arrivalTime: toDateTimeLocal(item.arrivalTime),
      price: item.price || "",
      availableSeats: item.availableSeats || "",
      // status: item.status || "Scheduled",
      status: item.status ?? 0,
    });
    setShowForm(true);
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa chuyến xe #${id}?`)) return;
    setNotice(null);
    try {
      await tripApi.remove(id);
      setNotice({ type: "success", text: "Xóa chuyến xe thành công." });
      await loadTrips();
      await onRefresh?.();
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không xóa được chuyến xe.",
      });
    }
  };

  const cancelTrip = async (id) => {
    if (!confirm(`Hủy chuyến xe #${id}?\nTất cả vé đặt sẽ được chuyển sang trạng thái hoàn tiền.`)) return;
    setNotice(null);
    try {
      const res = await tripApi.cancelTrip(id);
      setNotice({ type: "success", text: res.message || "Đã hủy chuyến xe thành công." });
      await loadTrips();
      await onRefresh?.();
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không hủy được chuyến xe." });
    }
  };

  const handleCloneTrips = async () => {
    if (!cloneModal) return;
    setCloneLoading(true);
    try {
      const res = await tripApi.cloneTrips(cloneModal.sourceDate, cloneModal.targetDate);
      setCloneModal(null);
      setNotice({ type: "success", text: res.message || `Đã nhân bản ${res.cloned} chuyến.` });
      setFilters((f) => ({ ...f, status: "" }));
      setPage(1);
      await loadTrips();
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không nhân bản được chuyến." });
    } finally {
      setCloneLoading(false);
    }
  };

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <h3>Quản lý chuyến xe</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => setCloneModal({ sourceDate: filters.departureDate || todayStr, targetDate: tomorrowStr })}
          >
            <i className="fa-solid fa-copy" /> Nhân bản chuyến
          </button>
          <button className="btn btn-primary" onClick={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_TRIP)}>
            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />{" "}
            {showForm ? "Đóng" : "Thêm mới"}
          </button>
        </div>
      </div>
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <AdminFormModal
          title={form.tripID ? "Sửa chuyến xe" : "Thêm chuyến xe"}
          onClose={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}
        >
          <form className="admin-form-grid" onSubmit={submit}>
            <select
              value={form.busID}
              onChange={(e) => setForm({ ...form, busID: e.target.value })}
              required
            >
              <option value="">Chọn xe</option>
              {buses.map((b) => {
                const busId = pick(b, ["busID", "BusID"]);
                return (
                  <option key={busId} value={busId}>
                    Xe #{busId} - {pick(b, ["licensePlate", "LicensePlate"])} (
                    {pick(b, ["busType", "BusType"])})
                    {!isOperator &&
                      ` - ${pick(
                        b,
                        ["operatorName", "OperatorName"],
                        findOperatorName(
                          operators,
                          pick(b, ["operatorID", "OperatorID"]),
                        ),
                      )}`}
                  </option>
                );
              })}
            </select>
            <TripLocationInput
              type="departure"
              value={form.departureLocation}
              onChange={(value) => setForm({ ...form, departureLocation: value })}
              placeholder="Điểm đi"
              icon="fa-location-dot"
              required
            />
            <TripLocationInput
              type="arrival"
              value={form.arrivalLocation}
              onChange={(value) => setForm({ ...form, arrivalLocation: value })}
              placeholder="Điểm đến"
              icon="fa-map-location-dot"
              required
            />
            <label className={`admin-date-input ${form.departureTime ? "has-value" : ""}`}>
              <span>Giờ đi</span>
              <strong>{formatDateTimeLabel(form.departureTime)}</strong>
              <i className="fa-regular fa-calendar-days" />
              <input
                type="datetime-local"
                value={form.departureTime}
                onChange={(e) =>
                  setForm({ ...form, departureTime: e.target.value })
                }
                onClick={(e) => e.target.showPicker?.()}
                required
              />
            </label>
            <label className={`admin-date-input ${form.arrivalTime ? "has-value" : ""}`}>
              <span>Giờ đến</span>
              <strong>{formatDateTimeLabel(form.arrivalTime)}</strong>
              <i className="fa-regular fa-calendar-days" />
              <input
                type="datetime-local"
                value={form.arrivalTime}
                min={form.departureTime || undefined}
                onChange={(e) =>
                  setForm({ ...form, arrivalTime: e.target.value })
                }
                onClick={(e) => e.target.showPicker?.()}
                required
              />
            </label>
            {/* <input
              type="datetime-local"
              value={form.departureTime}
              onChange={(e) =>
                setForm({ ...form, departureTime: e.target.value })
              }
              required
            />
            <input
              type="datetime-local"
              value={form.arrivalTime}
              onChange={(e) =>
                setForm({ ...form, arrivalTime: e.target.value })
              }
              required
            /> */}
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Giá vé"
              required
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Scheduled">Đã lên lịch</option>
              <option value="On-going">Đang chạy</option>
              <option value="Completed">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit">
                {form.tripID ? "Cập nhật" : "Lưu chuyến xe"}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}
              >
                Hủy
              </button>
            </div>
          </form>
        </AdminFormModal>
      )}
      <div className="admin-filter-grid trips-filter-grid">
        <TripLocationInput
          type="departure"
          value={filters.departureLocation}
          onChange={(value) => updateFilter("departureLocation", value)}
          placeholder="Điểm xuất phát"
          icon="fa-location-dot"
        />
        <TripLocationInput
          type="arrival"
          value={filters.arrivalLocation}
          onChange={(value) => updateFilter("arrivalLocation", value)}
          placeholder="Điểm đến"
          icon="fa-map-location-dot"
        />
        <label className={`payment-date-field ${filters.departureDate ? "has-value" : ""}`} style={{display : "none"}}>
          <span>Ngày đi</span>
          <strong>{formatDateLabel(filters.departureDate)}</strong>
          <i className="fa-regular fa-calendar-days" />
          <input
            type="date"
            value={filters.departureDate}
            onChange={(e) => updateFilter("departureDate", e.target.value)}
            onClick={(e) => e.target.showPicker?.()}
            aria-label="Ngày đi"
          />
        </label>
        {!isOperator && (
          <select
            value={filters.operatorId}
            onChange={(e) => updateFilter("operatorId", e.target.value)}
          >
            <option value="">Tất cả nhà xe</option>
            {operators.map((o) => {
              const id = pick(o, ["operatorID", "OperatorID"]);
              return (
                <option key={id} value={id}>
                  {pick(o, ["name", "Name"])}
                </option>
              );
            })}
          </select>
        )}
        <select
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Scheduled">Đã lên lịch</option>
          <option value="On-going">Đang chạy</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
        </select>
        <input
          type="number"
          min="0"
          value={filters.minPrice}
          onChange={(e) => updateFilter("minPrice", e.target.value)}
          placeholder="Giá từ (đ)"
          style={{ display: 'none', minWidth: 110 }}
        />
        <input
          type="number"
          min="0"
          value={filters.maxPrice}
          onChange={(e) => updateFilter("maxPrice", e.target.value)}
          placeholder="Giá đến (đ)"
          style={{ display: 'none', minWidth: 110 }}
        />
        <button
          className="btn btn-outline"
          type="button"
          style={{ justifySelf: "start", alignSelf: "center", width: "fit-content", whiteSpace: "nowrap" }}
          onClick={() => {
            setFilters({
              departureLocation: "",
              arrivalLocation: "",
              departureDate: "",
              operatorId: "",
              status: "",
              minPrice: "",
              maxPrice: "",
            });
            setPage(1);
          }}
        >
          Xóa lọc
        </button>
      </div>
      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <TripsTable
        trips={rows}
        onEdit={editItem}
        onDelete={removeItem}
        onCancel={cancelTrip}
        onRowClick={(id) => navigate(`/${isOperator ? "operator" : "admin"}/trips/${id}`)}
      />
      {!loading && rows.length === 0 && (
        <div className="empty-cell">Không có chuyến xe phù hợp.</div>
      )}
      <AdminPagination
        page={meta.page}
        totalPages={meta.totalPages}
        totalCount={meta.totalCount}
        onPageChange={setPage}
      />

      {/* ── Modal nhân bản chuyến ── */}
      {cloneModal && createPortal(
        <div className="modal-overlay" onClick={() => setCloneModal(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-copy" /> Nhân bản chuyến xe</h3>
              <button className="modal-close" onClick={() => setCloneModal(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Ngày nguồn (copy từ ngày này)</span>
                <input
                  type="date"
                  value={cloneModal.sourceDate}
                  onChange={(e) => setCloneModal((m) => ({ ...m, sourceDate: e.target.value }))}
                  onClick={(e) => e.target.showPicker?.()}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.95rem" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Ngày đích (tạo chuyến sang ngày này)</span>
                <input
                  type="date"
                  value={cloneModal.targetDate}
                  min={cloneModal.sourceDate}
                  onChange={(e) => setCloneModal((m) => ({ ...m, targetDate: e.target.value }))}
                  onClick={(e) => e.target.showPicker?.()}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.95rem" }}
                />
              </label>
              {cloneModal.sourceDate && cloneModal.targetDate && cloneModal.sourceDate !== cloneModal.targetDate && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", fontSize: "0.88rem", color: "#1d4ed8" }}>
                  <i className="fa-solid fa-circle-info" /> Tất cả chuyến ngày{" "}
                  <strong>{new Date(cloneModal.sourceDate + "T00:00:00").toLocaleDateString("vi-VN")}</strong>{" "}
                  sẽ được nhân bản sang ngày{" "}
                  <strong>{new Date(cloneModal.targetDate + "T00:00:00").toLocaleDateString("vi-VN")}</strong>{" "}
                  (cùng tuyến, giờ, xe, giá — chỗ ngồi reset về tối đa).
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
              <button className="btn btn-outline" onClick={() => setCloneModal(null)} disabled={cloneLoading}>Hủy</button>
              <button
                className="btn btn-primary"
                onClick={handleCloneTrips}
                disabled={cloneLoading || !cloneModal.sourceDate || !cloneModal.targetDate || cloneModal.sourceDate === cloneModal.targetDate}
              >
                {cloneLoading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang nhân bản...</>
                  : <><i className="fa-solid fa-copy" /> Nhân bản</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

function TripLocationInput({
  type,
  value,
  onChange,
  placeholder,
  icon = "fa-location-dot",
  required = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  const loadLocations = async (query = value) => {
    setLoading(true);
    try {
      const data = await tripApi.locations({ type, q: query || "", take: 60 });
      let list = Array.isArray(data) ? data
        : type === "departure" ? (data?.departures || [])
        : type === "arrival"   ? (data?.arrivals   || [])
        : (data?.all || []);
      if (query) {
        const q = query.toLowerCase();
        list = list.filter((x) => x.toLowerCase().includes(q));
      }
      setSuggestions(list);
      setOpen(true);
    } catch {
      setSuggestions([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!open) return;

    debounceRef.current = setTimeout(() => {
      loadLocations(value);
    }, value ? 250 : 0);

    return () => clearTimeout(debounceRef.current);
  }, [value, type, open]);

  const selectLocation = (location) => {
    onChange(location);
    setOpen(false);
  };

  return (
    <div className="trip-location-wrap" ref={wrapRef}>
      <div className="payment-suggest-input-wrap">
        <i className={`fa-solid ${icon} payment-suggest-icon`} />
        <input
          type="text"
          className="payment-suggest-input"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => loadLocations(value)}
          placeholder={placeholder}
          autoComplete="off"
          required={required}
        />
        {loading && <i className="fa-solid fa-spinner fa-spin payment-suggest-spinner" />}
        {value && (
          <button
            type="button"
            className="payment-suggest-clear"
            onClick={() => {
              onChange("");
              setOpen(true);
              loadLocations("");
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {open && (
        <ul className="payment-suggest-dropdown trip-location-dropdown">
          {suggestions.map((item) => (
            <li
              key={item}
              className="payment-suggest-item trip-location-item"
              onMouseDown={() => selectLocation(item)}
            >
              <span className="suggest-id">
                <i className="fa-solid fa-location-dot" />
              </span>
              <span className="suggest-name">{item}</span>
            </li>
          ))}
          {!loading && suggestions.length === 0 && (
            <li className="payment-suggest-empty">
              Không có trong dữ liệu, có thể nhập tỉnh mới
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function AdminTripDetail({ tripId }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith("/operator") ? "/operator" : "/admin";
  const [trip, setTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState({
    bookingStatus: "",
    paymentStatus: "",
  });
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Quản lý điểm dừng/đón/trả ─────────────────────────────────
  const EMPTY_STOP = { stopName: "", stopAddress: "", stopType: 1, arrivalOffset: "" };
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopForm, setStopForm] = useState(null); // null = ẩn form, object = đang thêm/sửa
  const [stopNotice, setStopNotice] = useState(null);

  const loadStops = async () => {
    setStopsLoading(true);
    try {
      const data = await tripApi.getStops(tripId);
      setStops(data?.items || data?.Items || []);
    } catch {
      setStops([]);
    } finally {
      setStopsLoading(false);
    }
  };

  useEffect(() => {
    loadStops();
  }, [tripId]);

  const openAddStop = () => { setStopForm({ ...EMPTY_STOP }); setStopNotice(null); };
  const openEditStop = (s) => {
    setStopForm({
      stopPointID: pick(s, ["stopPointID", "StopPointID"]),
      stopName: pick(s, ["stopName", "StopName"], ""),
      stopAddress: pick(s, ["stopAddress", "StopAddress"], ""),
      stopType: Number(pick(s, ["stopType", "StopType"], 1)),
      arrivalOffset: pick(s, ["arrivalOffset", "ArrivalOffset"], "") ?? "",
    });
    setStopNotice(null);
  };
  const closeStopForm = () => setStopForm(null);

  const saveStop = async (e) => {
    e.preventDefault();
    if (!stopForm.stopName.trim()) {
      setStopNotice({ type: "error", text: "Vui lòng nhập tên điểm dừng." });
      return;
    }
    const payload = {
      stopName: stopForm.stopName.trim(),
      stopAddress: stopForm.stopAddress?.trim() || null,
      stopType: Number(stopForm.stopType),
      stopOrder: stopForm.stopOrder || 0,
      arrivalOffset: stopForm.arrivalOffset === "" ? null : Number(stopForm.arrivalOffset),
    };
    try {
      if (stopForm.stopPointID) {
        await tripApi.updateStop(tripId, stopForm.stopPointID, payload);
        setStopNotice({ type: "success", text: "Đã cập nhật điểm dừng." });
      } else {
        await tripApi.addStop(tripId, payload);
        setStopNotice({ type: "success", text: "Đã thêm điểm dừng." });
      }
      setStopForm(null);
      await loadStops();
    } catch (err) {
      setStopNotice({ type: "error", text: err.response?.data?.message || err.message || "Không lưu được điểm dừng." });
    }
  };

  const deleteStop = async (stopId) => {
    if (!confirm("Xóa điểm dừng này?")) return;
    try {
      const res = await tripApi.removeStop(tripId, stopId);
      setStopNotice({ type: "success", text: res?.message || "Đã xóa điểm dừng." });
      await loadStops();
    } catch (err) {
      setStopNotice({ type: "error", text: err.response?.data?.message || err.message || "Không xóa được điểm dừng." });
    }
  };

  const stopTypeLabel = (t) => ({ 1: "Đón", 2: "Trả", 3: "Đón & Trả" }[Number(t)] || "—");

  useEffect(() => {
    const loadTrip = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await tripApi.getById(tripId);
        setTrip(data);
      } catch (e) {
        setError(e.message || "Không tải được chi tiết chuyến xe.");
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [tripId]);

  useEffect(() => {
    const loadBookings = async () => {
      setBookingsLoading(true);
      try {
        const data = await tripApi.getBookings(
          tripId,
          cleanParams(bookingFilter),
        );
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Không tải được danh sách đơn của chuyến.");
      } finally {
        setBookingsLoading(false);
      }
    };

    loadBookings();
  }, [tripId, bookingFilter.bookingStatus, bookingFilter.paymentStatus]);

  if (loading)
    return (
      <div className="admin-card admin-loading">
        Đang tải chi tiết chuyến xe...
      </div>
    );
  if (error) return <AdminNotice type="error">{error}</AdminNotice>;
  if (!trip)
    return (
      <div className="admin-card empty-cell">Không tìm thấy chuyến xe.</div>
    );

  const bus = trip.bus || trip.Bus || {};
  const operator =
    trip.operator || trip.Operator || bus.operator || bus.Operator || {};
  const status = pick(trip, ["status", "Status"], "Scheduled");
  const filterButtons = [
    { label: "Tất cả", bookingStatus: "", paymentStatus: "" },
    {
      label: "Đợi xác nhận",
      bookingStatus: 0,
      paymentStatus: "",
    },
    { label: "Đã xác nhận", bookingStatus: 1, paymentStatus: "" },
    {
      label: "Yêu cầu hủy",
      bookingStatus: 5,
      paymentStatus: "",
    },
    { label: "Đã hủy", bookingStatus:2 , paymentStatus: "" },
    // { label: "Đã thanh toán", bookingStatus: 1, paymentStatus: "" },
    // { label: "Chưa thanh toán", bookingStatus: 0, paymentStatus: "" },
  ];

  return (
    <>
      <section className="admin-card admin-detail-card">
        <div className="admin-section-head">
          <div>
            <h3>Chi tiết chuyến #{tripId}</h3>
            <p>
              {pick(trip, ["departureLocation", "DepartureLocation"])} →{" "}
              {pick(trip, ["arrivalLocation", "ArrivalLocation"])}
            </p>
          </div>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => navigate(`${basePath}/trips`)}
          >
            <i className="fa-solid fa-arrow-left" /> Quay lại danh sách
          </button>
        </div>

        <div className="admin-detail-grid">
          <div>
            <span>Nhà xe</span>
            <b>
              {pick(
                trip,
                ["operatorName", "OperatorName"],
                pick(operator, ["name", "Name"], "Chưa rõ"),
              )}
            </b>
          </div>
          <div>
            <span>Xe</span>
            <b>
              {pick(
                trip,
                ["licensePlate", "LicensePlate"],
                pick(bus, ["licensePlate", "LicensePlate"], "Chưa rõ"),
              )}
            </b>
          </div>
          <div>
            <span>Loại xe</span>
            <b>
              {pick(
                trip,
                ["busType", "BusType"],
                pick(bus, ["busType", "BusType"], "Chưa rõ"),
              )}
            </b>
          </div>
          <div>
            <span>Sức chứa</span>
            <b>
              {pick(
                trip,
                ["capacity", "Capacity"],
                pick(bus, ["capacity", "Capacity"], 0),
              )}
            </b>
          </div>
          <div>
            <span>Điểm xuất phát</span>
            <b>{pick(trip, ["departureLocation", "DepartureLocation"])}</b>
          </div>
          <div>
            <span>Điểm đến</span>
            <b>{pick(trip, ["arrivalLocation", "ArrivalLocation"])}</b>
          </div>
          <div>
            <span>Thời gian đi</span>
            <b>
              {formatDateTime(pick(trip, ["departureTime", "DepartureTime"]))}
            </b>
          </div>
          <div>
            <span>Thời gian đến</span>
            <b>{formatDateTime(pick(trip, ["arrivalTime", "ArrivalTime"]))}</b>
          </div>
          <div>
            <span>Giá vé</span>
            <b>{formatVND(pick(trip, ["price", "Price"], 0))}</b>
          </div>
          <div>
            <span>Ghế còn</span>
            <b>{pick(trip, ["availableSeats", "AvailableSeats"], 0)}</b>
          </div>
          <div>
            <span>Trạng thái</span>
            <b>
              <span className="badge">{labelTripStatus(status)}</span>
            </b>
          </div>
        </div>
      </section>

      <section className="admin-card table-card">
        <div className="admin-section-head">
          <h3>Điểm đón / trả / dừng</h3>
          <button className="btn btn-primary" type="button" onClick={openAddStop}>
            <i className="fa-solid fa-plus" /> Thêm điểm dừng
          </button>
        </div>

        {stopNotice && <AdminNotice type={stopNotice.type}>{stopNotice.text}</AdminNotice>}

        {stopForm && (
          <AdminFormModal
            title={stopForm.stopPointID ? "Sửa điểm dừng" : "Thêm điểm dừng"}
            onClose={closeStopForm}
          >
            <form className="admin-form-grid" onSubmit={saveStop}>
              <input
                type="text"
                value={stopForm.stopName}
                onChange={(e) => setStopForm({ ...stopForm, stopName: e.target.value })}
                placeholder="Tên điểm dừng (VD: Bến xe Hà Nội)"
                required
              />
              <input
                type="text"
                value={stopForm.stopAddress || ""}
                onChange={(e) => setStopForm({ ...stopForm, stopAddress: e.target.value })}
                placeholder="Địa chỉ cụ thể"
              />
              <select
                value={stopForm.stopType}
                onChange={(e) => setStopForm({ ...stopForm, stopType: Number(e.target.value) })}
              >
                <option value={1}>Điểm đón</option>
                <option value={2}>Điểm trả</option>
                <option value={3}>Đón & Trả</option>
              </select>
              <input
                type="number"
                min="0"
                value={stopForm.arrivalOffset}
                onChange={(e) => setStopForm({ ...stopForm, arrivalOffset: e.target.value })}
                placeholder="Số phút tính từ giờ khởi hành"
              />
              <div className="admin-form-actions">
                <button className="btn btn-primary" type="submit">
                  {stopForm.stopPointID ? "Cập nhật" : "Lưu điểm dừng"}
                </button>
                <button className="btn btn-outline" type="button" onClick={closeStopForm}>
                  Hủy
                </button>
              </div>
            </form>
          </AdminFormModal>
        )}

        {stopsLoading && <div className="admin-loading">Đang tải điểm dừng...</div>}
        {!stopsLoading && stops.length === 0 && (
          <div className="empty-cell">Chưa có điểm dừng nào.</div>
        )}
        {stops.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thứ tự</th>
                  <th>Tên điểm</th>
                  <th>Địa chỉ</th>
                  <th>Loại</th>
                  <th>Phút từ giờ đi</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((s) => {
                  const sid = pick(s, ["stopPointID", "StopPointID"]);
                  return (
                    <tr key={sid}>
                      <td>{pick(s, ["stopOrder", "StopOrder"], 0)}</td>
                      <td><b>{pick(s, ["stopName", "StopName"])}</b></td>
                      <td>{pick(s, ["stopAddress", "StopAddress"], "—")}</td>
                      <td><span className="badge">{stopTypeLabel(pick(s, ["stopType", "StopType"]))}</span></td>
                      <td>{pick(s, ["arrivalOffset", "ArrivalOffset"], "—")}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn btn-outline btn-xs" onClick={() => openEditStop(s)}>Sửa</button>{" "}
                        <button className="btn btn-danger btn-xs" onClick={() => deleteStop(sid)}>Xóa</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card table-card admin-trip-bookings">
        <div className="admin-section-head">
          <h3>Đơn đặt vé của chuyến</h3>
          <span className="admin-muted">{bookings.length} đơn</span>
        </div>

        <div className="admin-filter-pills">
          {filterButtons.map((item) => {
            const active =
              bookingFilter.bookingStatus === item.bookingStatus &&
              bookingFilter.paymentStatus === item.paymentStatus;
            return (
              <button
                key={`${item.bookingStatus}-${item.paymentStatus}-${item.label}`}
                type="button"
                className={active ? "active" : ""}
                onClick={() =>
                  setBookingFilter({
                    bookingStatus: item.bookingStatus,
                    paymentStatus: item.paymentStatus,
                  })
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {bookingsLoading && (
          <div className="admin-loading">Đang tải danh sách đơn...</div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Tên khách</th>
                <th>Số điện thoại</th>
                <th>Số ghế</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái đơn</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((item) => {
                const bookingId = pick(item, [
                  "bookingID",
                  "BookingID",
                  "bookingId",
                  "id",
                ]);
                return (
                  <tr key={bookingId}>
                    <td>{bookingId}</td>
                    <td>
                      <b>
                        {pick(
                          item,
                          ["customerName", "CustomerName"],
                          "Chưa rõ",
                        )}
                      </b>
                    </td>
                    <td>
                      {pick(
                        item,
                        ["customerPhone", "CustomerPhone"],
                        "Chưa rõ",
                      )}
                    </td>
                    <td>{pick(item, ["totalSeats", "TotalSeats"], 0)}</td>
                    <td>
                      {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
                    </td>
                    {/* <td>
                      <span className="badge">
                        {labelPaymentStatus(
                          pick(
                            item,
                            ["paymentStatus", "PaymentStatus"],
                            "Pending",
                          ),
                        )}
                      </span>
                    </td> */}
                    {/* <td>
                    <span className="badge">
                      {Number(
                        pick(item, ["bookingStatus", "BookingStatus"], 0)
                      ) === 1
                        ? "Đã thanh toán"
                        : "Chưa thanh toán"}
                    </span>
                  </td> */}
                  <td>
                    {(() => {
                      const bs = Number(pick(item, ["bookingStatus", "BookingStatus"], 0));
                      const map = {
                        0: { label: 'Chưa thanh toán', bg: '#fef9c3', color: '#854d0e' },
                        1: { label: '✓ Đã xác nhận',  bg: '#dcfce7', color: '#166534' },
                        2: { label: 'Đã hủy',         bg: '#fee2e2', color: '#991b1b' },
                        3: { label: '✓ Hoàn thành',   bg: '#dbeafe', color: '#1e40af' },
                        4: { label: 'Đã hoàn tiền',   bg: '#ede9fe', color: '#6b21a8' },
                        5: { label: 'Yêu cầu hủy',   bg: '#fce7f3', color: '#9d174d' },
                        6: { label: 'Từ chối hủy',   bg: '#f3f4f6', color: '#374151' },
                      };
                      const cfg = map[bs] ?? { label: 'Chưa rõ', bg: '#f3f4f6', color: '#6b7280' };
                      return (
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </td>
                    <td>
                      <span className="badge">
                        {labelBookingStatus(
                          pick(
                            item,
                            ["bookingStatus", "BookingStatus"],
                            "PendingConfirm",
                          ),
                        )}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button
                        className="btn btn-outline"
                        type="button"
                        onClick={() => navigate(`/admin/bookings/${bookingId}`)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!bookingsLoading && bookings.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    Không có đơn phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ==================== BOOKINGS MANAGER ====================
// function BookingsManager() {
//   const navigate = useNavigate();
//   const [rows, setRows] = useState([]);
//   const [meta, setMeta] = useState({
//     totalCount: 0,
//     page: 1,
//     pageSize: ADMIN_CRUD_PAGE_SIZE,
//     totalPages: 1,
//   });
//   const [filters, setFilters] = useState({
//     bookingId: "",
//     customerName: "",
//     customerPhone: "",
//     paymentStatus: "",
//     bookingStatus: "",
//     bookingDate: "",
//   });
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [notice, setNotice] = useState(null);

//   const loadBookings = async () => {
//     setLoading(true);
//     setNotice(null);
//     try {
//       const data = await bookingApi.adminList(
//         cleanParams({
//           bookingId: filters.bookingId,
//           customerName: filters.customerName,
//           customerPhone: filters.customerPhone,
//           paymentStatus: filters.paymentStatus,
//           bookingStatus: filters.bookingStatus,
//           fromDate: filters.bookingDate,
//           toDate: filters.bookingDate,
//           page,
//           pageSize: ADMIN_CRUD_PAGE_SIZE,
//         }),
//       );
//       const paged = normalizePagedResponse(data, page);
//       setRows(paged.items);
//       setMeta(paged);
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text: e.message || "Không tải được danh sách đơn đặt vé.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadBookings();
//   }, [
//     page,
//     filters.bookingId,
//     filters.customerName,
//     filters.customerPhone,
//     filters.paymentStatus,
//     filters.bookingStatus,
//     filters.bookingDate,
//   ]);

//   const updateFilter = (field, value) => {
//     setFilters((current) => ({ ...current, [field]: value }));
//     setPage(1);
//   };

//   return (
//     <section className="admin-card table-card">
//       <div className="admin-section-head">
//         <h3>Quản lý đơn đặt vé</h3>
//         <span className="admin-muted">{meta.totalCount || 0} đơn</span>
//       </div>
//       {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
//       <div className="admin-filter-grid">
//         <input
//           type="number"
//           min="1"
//           value={filters.bookingId}
//           onChange={(e) => updateFilter("bookingId", e.target.value)}
//           placeholder="Mã đơn"
//         />
//         <input
//           value={filters.customerName}
//           onChange={(e) => updateFilter("customerName", e.target.value)}
//           placeholder="Tên khách"
//         />
//         <input
//           value={filters.customerPhone}
//           onChange={(e) => updateFilter("customerPhone", e.target.value)}
//           placeholder="Số điện thoại"
//         />
//         <select
//           value={filters.paymentStatus}
//           onChange={(e) => updateFilter("paymentStatus", e.target.value)}
//         >
//           <option value="">Tất cả thanh toán</option>
//           <option value="Paid">Đã thanh toán</option>
//           <option value="Pending">Chưa thanh toán</option>
//           <option value="Refunded">Đã hoàn tiền</option>
//           <option value="Cancelled">Đã hủy</option>
//         </select>
//         <select
//           value={filters.bookingStatus}
//           onChange={(e) => updateFilter("bookingStatus", e.target.value)}
//         >
//           <option value="">Tất cả trạng thái đơn</option>
//           <option value="PendingConfirm">Đợi xác nhận</option>
//           <option value="Confirmed">Đã xác nhận</option>
//           <option value="CancelRequested">Yêu cầu hủy</option>
//           <option value="CancelRejected">Từ chối hủy</option>
//           <option value="Cancelled">Đã hủy</option>
//         </select>
//         <input
//           type="date"
//           value={filters.bookingDate}
//           onChange={(e) => updateFilter("bookingDate", e.target.value)}
//         />
//       </div>
//       {loading && (
//         <div className="admin-loading">Đang tải danh sách đơn...</div>
//       )}
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>Mã đơn</th>
//               <th>Khách hàng</th>
//               <th>Số điện thoại</th>
//               <th>Tuyến đường</th>
//               <th>Nhà xe</th>
//               <th>Số ghế</th>
//               <th>Tổng tiền</th>
//               <th>Thanh toán</th>
//               <th>Trạng thái đơn</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, [
//                 "bookingID",
//                 "BookingID",
//                 "bookingId",
//                 "id",
//               ]);
//               const departure = pick(
//                 item,
//                 ["departureLocation", "DepartureLocation"],
//                 "",
//               );
//               const arrival = pick(
//                 item,
//                 ["arrivalLocation", "ArrivalLocation"],
//                 "",
//               );
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>
//                     <b>
//                       {pick(item, ["customerName", "CustomerName"], "Chưa rõ")}
//                     </b>
//                   </td>
//                   <td>
//                     {pick(item, ["customerPhone", "CustomerPhone"], "Chưa rõ")}
//                   </td>
//                   <td>
//                     {departure || arrival
//                       ? `${departure} → ${arrival}`
//                       : "Chưa rõ tuyến"}
//                   </td>
//                   <td>
//                     {pick(item, ["operatorName", "OperatorName"], "Chưa rõ")}
//                   </td>
//                   <td>{pick(item, ["totalSeats", "TotalSeats"], 0)}</td>
//                   <td>
//                     {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
//                   </td>
//                   {/* <td>
//                     <span className="badge">
//                       {labelPaymentStatus(
//                         pick(
//                           item,
//                           pick(item, ["bookingStatus", "BookingStatus"], 0)
//                         ),
//                       )}
//                     </span>
//                   </td> */}
//                   <td>
//                   <span className="badge">
//                     {labelPaymentStatus(
//                       pick(item, ["bookingStatus", "BookingStatus"], 0)
//                     )}
//                   </span>
//                 </td>
//                   <td>
//                     <span className="badge">
//                       {labelBookingStatus(
//                         pick(
//                           item,
//                           ["bookingStatus", "BookingStatus"],
//                           "PendingConfirm",
//                         ),
//                       )}
//                     </span>
//                   </td>
//                   <td className="admin-actions">
//                     <button
//                       className="btn btn-outline"
//                       type="button"
//                       onClick={() => navigate(`/admin/bookings/${id}`)}
//                     >
//                       Xem chi tiết
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//             {!loading && rows.length === 0 && (
//               <tr>
//                 <td colSpan="10" className="empty-cell">
//                   Không có đơn đặt vé phù hợp.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//       <AdminPagination
//         page={meta.page}
//         totalPages={meta.totalPages}
//         totalCount={meta.totalCount}
//         onPageChange={setPage}
//       />
//     </section>
//   );
// }
// function BookingsManager() {
//   const navigate = useNavigate();
//   const [rows, setRows] = useState([]);
//   const [meta, setMeta] = useState({
//     totalCount: 0, page: 1, pageSize: ADMIN_CRUD_PAGE_SIZE, totalPages: 1,
//   });
//   const [filters, setFilters] = useState({
//     bookingId: '', customerName: '', customerPhone: '',
//     paymentStatus: '', bookingStatus: '', bookingDate: '',
//   });
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [actionLoading, setActionLoading] = useState(null); // id đang xử lý
//   const [notice, setNotice] = useState(null);
 
//   // ── Load danh sách ──────────────────────────────────────────
//   const loadBookings = async () => {
//     setLoading(true);
//     setNotice(null);
//     try {
//       const data = await bookingApi.adminList(
//         cleanParams({
//           bookingId: filters.bookingId,
//           customerName: filters.customerName,
//           customerPhone: filters.customerPhone,
//           bookingStatus: filters.bookingStatus,
//           fromDate: filters.bookingDate,
//           toDate: filters.bookingDate,
//           page,
//           pageSize: ADMIN_CRUD_PAGE_SIZE,
//         }),
//       );
//       const paged = normalizePagedResponse(data, page);
//       setRows(paged.items);
//       setMeta(paged);
//     } catch (e) {
//       setNotice({ type: 'error', text: e.message || 'Không tải được danh sách đơn đặt vé.' });
//     } finally {
//       setLoading(false);
//     }
//   };
 
//   useEffect(() => {
//     loadBookings();
//   }, [
//     page,
//     filters.bookingId, filters.customerName, filters.customerPhone,
//     filters.paymentStatus, filters.bookingStatus, filters.bookingDate,
//   ]);
 
//   const updateFilter = (field, value) => {
//     setFilters((f) => ({ ...f, [field]: value }));
//     setPage(1);
//   };
 
//   // ── Actions ─────────────────────────────────────────────────
//   const runAction = async (id, action, successText) => {
//     setActionLoading(id);
//     setNotice(null);
//     try {
//       await action();
//       setNotice({ type: 'success', text: successText });
//       await loadBookings();
//     } catch (e) {
//       setNotice({ type: 'error', text: e.message || 'Thao tác thất bại.' });
//     } finally {
//       setActionLoading(null);
//     }
//   };
 
//   // Xác nhận đơn tiền mặt (Cash + Pending)
//   const handleConfirmCash = (id) => {
//     if (!confirm(`Xác nhận đã thu tiền mặt và xác nhận đơn #${id}?`)) return;
//     runAction(id, () => bookingApi.confirm(id), `Đã xác nhận đơn #${id}.`);
//   };
 
//   // Duyệt hủy
//   const handleApproveCancel = (id) => {
//     if (!confirm(`Duyệt hủy đơn #${id}?`)) return;
//     runAction(id, () => bookingApi.approveCancel(id, {}), `Đã duyệt hủy đơn #${id}.`);
//   };
 
//   // Từ chối hủy
//   const handleRejectCancel = (id) => {
//     const reason = window.prompt('Lý do từ chối hủy:', 'Không đủ điều kiện hủy theo chính sách.');
//     if (reason === null) return;
//     runAction(id, () => bookingApi.rejectCancel(id, { rejectReason: reason }), `Đã từ chối hủy đơn #${id}.`);
//   };
 
//   // ── Badge helpers ────────────────────────────────────────────
//   const bookingStatusBadge = (status) => {
//     const map = {
//       0: { label: 'Chờ xác nhận',  bg: '#fef9c3', color: '#854d0e' },
//       1: { label: 'Đã xác nhận',   bg: '#dcfce7', color: '#166534' },
//       2: { label: 'Đã hủy',        bg: '#fee2e2', color: '#991b1b' },
//       3: { label: 'Hoàn thành',    bg: '#dbeafe', color: '#1e40af' },
//       4: { label: 'Đã hoàn tiền',  bg: '#ede9fe', color: '#6b21a8' },
//       5: { label: 'Yêu cầu hủy',  bg: '#fce7f3', color: '#9d174d' },
//       6: { label: 'Từ chối hủy',  bg: '#f3f4f6', color: '#374151' },
//     };
//     const s = Number(status);
//     const cfg = map[s] ?? { label: 'Chưa rõ', bg: '#f3f4f6', color: '#6b7280' };
//     return (
//       <span
//         className="badge"
//         style={{ background: cfg.bg, color: cfg.color, fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}
//       >
//         {cfg.label}
//       </span>
//     );
//   };
 
//   const paymentBadge = (bookingStatus, paymentMethod) => {
//     const bs = Number(bookingStatus);
//     const isCash = String(paymentMethod || '').toLowerCase() === 'cash';
 
//     // Thanh toán online thì đã thanh toán ngay khi confirmed
//     if (bs === 1 || bs === 3) {
//       return (
//         <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
//           ✓ Đã thanh toán
//         </span>
//       );
//     }
//     if (bs === 4) {
//       return (
//         <span className="badge" style={{ background: '#ede9fe', color: '#6b21a8', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
//           Đã hoàn tiền
//         </span>
//       );
//     }
//     if (bs === 2) {
//       return (
//         <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
//           Đã hủy
//         </span>
//       );
//     }
//     // bs === 0 hoặc 5, 6
//     if (isCash) {
//       return (
//         <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
//           💵 Chờ thu tiền
//         </span>
//       );
//     }
//     return (
//       <span className="badge" style={{ background: '#fef9c3', color: '#854d0e', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
//         Chờ thanh toán
//       </span>
//     );
//   };
 
//   // ── Render ───────────────────────────────────────────────────
//   return (
//     <section className="admin-card table-card">
//       {/* Header */}
//       <div className="admin-section-head">
//         <h3>Quản lý đơn đặt vé</h3>
//         <span className="admin-muted">{meta.totalCount || 0} đơn</span>
//       </div>
 
//       {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
 
//       {/* Filter */}
//       <div className="admin-filter-grid">
//         <input
//           type="number" min="1"
//           value={filters.bookingId}
//           onChange={(e) => updateFilter('bookingId', e.target.value)}
//           placeholder="Mã đơn"
//         />
//         <input
//           value={filters.customerName}
//           onChange={(e) => updateFilter('customerName', e.target.value)}
//           placeholder="Tên khách"
//         />
//         <input
//           value={filters.customerPhone}
//           onChange={(e) => updateFilter('customerPhone', e.target.value)}
//           placeholder="Số điện thoại"
//         />
//         {/* Filter theo bookingStatus — dùng số */}
//         <select
//           value={filters.bookingStatus}
//           onChange={(e) => updateFilter('bookingStatus', e.target.value)}
//         >
//           <option value="">Tất cả trạng thái đơn</option>
//           <option value="0">Chờ xác nhận</option>
//           <option value="1">Đã xác nhận</option>
//           <option value="2">Đã hủy</option>
//           <option value="3">Hoàn thành</option>
//           <option value="4">Đã hoàn tiền</option>
//           <option value="5">Yêu cầu hủy</option>
//           <option value="6">Từ chối hủy</option>
//         </select>
//         <input
//           type="date"
//           value={filters.bookingDate}
//           onChange={(e) => updateFilter('bookingDate', e.target.value)}
//         />
//       </div>
 
//       {loading && <div className="admin-loading">Đang tải danh sách đơn...</div>}
 
//       {/* Table */}
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>Mã đơn</th>
//               <th>Khách hàng</th>
//               <th>Số điện thoại</th>
//               <th>Tuyến đường</th>
//               <th>Nhà xe</th>
//               <th>Số ghế</th>
//               <th>Tổng tiền</th>
//               <th>Thanh toán</th>
//               <th>Trạng thái đơn</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
//               const bs = Number(pick(item, ['bookingStatus', 'BookingStatus'], 0));
//               const pm = pick(item, ['paymentMethod', 'PaymentMethod'], '');
//               const isCash = String(pm).toLowerCase() === 'cash';
//               const departure = pick(item, ['departureLocation', 'DepartureLocation'], '');
//               const arrival   = pick(item, ['arrivalLocation',   'ArrivalLocation'],   '');
//               const isProcessing = actionLoading === id;
 
//               return (
//                 <tr key={id} style={{ opacity: isProcessing ? 0.6 : 1 }}>
//                   <td><b>#{id}</b></td>
//                   <td>
//                     <b>{pick(item, ['customerName', 'CustomerName'], 'Chưa rõ')}</b>
//                   </td>
//                   <td>{pick(item, ['customerPhone', 'CustomerPhone'], 'Chưa rõ')}</td>
//                   <td>
//                     {departure || arrival
//                       ? `${departure} → ${arrival}`
//                       : 'Chưa rõ tuyến'}
//                   </td>
//                   <td>{pick(item, ['operatorName', 'OperatorName'], 'Chưa rõ')}</td>
//                   <td>{pick(item, ['totalSeats', 'TotalSeats'], 0)}</td>
//                   <td>{formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</td>
 
//                   {/* Cột Thanh toán */}
//                   <td>{paymentBadge(bs, pm)}</td>
 
//                   {/* Cột Trạng thái đơn */}
//                   <td>{bookingStatusBadge(bs)}</td>
 
//                   {/* Cột Thao tác */}
//                   <td className="admin-actions" style={{ minWidth: 220 }}>
//                     {/* ① Cash + Pending → nút xác nhận thu tiền */}
//                     {isCash && bs === 0 && (
//                       <button
//                         className="btn btn-primary"
//                         disabled={isProcessing}
//                         onClick={() => handleConfirmCash(id)}
//                         title="Xác nhận đã thu tiền mặt và xác nhận đơn"
//                       >
//                         💵 Thu tiền & Xác nhận
//                       </button>
//                     )}
 
//                     {/* ② Yêu cầu hủy → Duyệt / Từ chối */}
//                     {bs === 5 && (
//                       <>
//                         <button
//                           className="btn btn-danger"
//                           disabled={isProcessing}
//                           onClick={() => handleApproveCancel(id)}
//                           title="Duyệt yêu cầu hủy vé"
//                         >
//                           ✓ Duyệt hủy
//                         </button>
//                         <button
//                           className="btn btn-outline"
//                           disabled={isProcessing}
//                           onClick={() => handleRejectCancel(id)}
//                           title="Từ chối yêu cầu hủy vé"
//                         >
//                           ✕ Từ chối
//                         </button>
//                       </>
//                     )}
 
//                     {/* ③ Xem chi tiết — luôn hiển thị */}
//                     <button
//                       className="btn btn-outline"
//                       disabled={isProcessing}
//                       onClick={() => navigate(`/admin/bookings/${id}`)}
//                     >
//                       Xem chi tiết
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
 
//             {!loading && rows.length === 0 && (
//               <tr>
//                 <td colSpan="10" className="empty-cell">
//                   Không có đơn đặt vé phù hợp.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
 
//       <AdminPagination
//         page={meta.page}
//         totalPages={meta.totalPages}
//         totalCount={meta.totalCount}
//         onPageChange={setPage}
//       />
//     </section>
//   );
// }
function BookingsManager() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/operator') ? '/operator' : '/admin';
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    totalCount: 0, page: 1, pageSize: ADMIN_CRUD_PAGE_SIZE, totalPages: 1,
  });
  const [filters, setFilters] = useState({
    bookingId: '', customerName: '', customerPhone: '',
    bookingStatus: '', bookingDate: '',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState(null);

  // ── Autocomplete state ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestRef = useRef(null);
  const debounceRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target))
        setShowSuggest(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce gợi ý khi gõ
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const data = await bookingApi.suggest(searchQuery.trim());
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggest(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
  }, [searchQuery]);

  // Chọn gợi ý → filter theo bookingId
  const selectSuggestion = (item) => {
    const id = pick(item, ['bookingID', 'BookingID']);
    const name = pick(item, ['customerName', 'CustomerName'], '');
    setSearchQuery(`#${id} - ${name}`);
    setFilters((f) => ({ ...f, bookingId: String(id), customerName: '', customerPhone: '' }));
    setPage(1);
    setShowSuggest(false);
    setSuggestions([]);
  };

  // Xoá search
  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggest(false);
    setFilters((f) => ({ ...f, bookingId: '', customerName: '', customerPhone: '' }));
    setPage(1);
  };

  // ── Load danh sách ──────────────────────────────────────────
  const loadBookings = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await bookingApi.adminList(
        cleanParams({
          bookingId: filters.bookingId,
          customerName: filters.customerName,
          customerPhone: filters.customerPhone,
          bookingStatus: filters.bookingStatus,
          fromDate: filters.bookingDate,
          toDate: filters.bookingDate,
          page,
          pageSize: ADMIN_CRUD_PAGE_SIZE,
        }),
      );
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items);
      setMeta(paged);
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Không tải được danh sách đơn đặt vé.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [page, filters.bookingId, filters.customerName, filters.customerPhone,
      filters.bookingStatus, filters.bookingDate]);

  const updateFilter = (field, value) => {
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1);
  };

  // ── Actions ─────────────────────────────────────────────────
  const runAction = async (id, action, successText) => {
    setActionLoading(id);
    setNotice(null);
    try {
      await action();
      setNotice({ type: 'success', text: successText });
      await loadBookings();
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Thao tác thất bại.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmCash = (id) => {
    if (!confirm(`Xác nhận đã thu tiền mặt và xác nhận đơn #${id}?`)) return;
    runAction(id, () => bookingApi.confirm(id), `Đã xác nhận đơn #${id}.`);
  };

  const handleApproveCancel = (id) => {
    if (!confirm(`Duyệt hủy đơn #${id}?`)) return;
    runAction(id, () => bookingApi.approveCancel(id, {}), `Đã duyệt hủy đơn #${id}.`);
  };

  const handleRejectCancel = (id) => {
    const reason = window.prompt('Lý do từ chối hủy:', 'Không đủ điều kiện hủy theo chính sách.');
    if (reason === null) return;
    runAction(id, () => bookingApi.rejectCancel(id, { rejectReason: reason }), `Đã từ chối hủy đơn #${id}.`);
  };

  // ── Badge helpers ────────────────────────────────────────────
  const bookingStatusBadge = (status) => {
    const map = {
      0: { label: 'Chờ xác nhận',  bg: '#fef9c3', color: '#854d0e' },
      1: { label: 'Đã xác nhận',   bg: '#dcfce7', color: '#166534' },
      2: { label: 'Đã hủy',        bg: '#fee2e2', color: '#991b1b' },
      3: { label: 'Hoàn thành',    bg: '#dbeafe', color: '#1e40af' },
      4: { label: 'Đã hoàn tiền',  bg: '#ede9fe', color: '#6b21a8' },
      5: { label: 'Yêu cầu hủy',  bg: '#fce7f3', color: '#9d174d' },
      6: { label: 'Từ chối hủy',  bg: '#f3f4f6', color: '#374151' },
    };
    const s = Number(status);
    const cfg = map[s] ?? { label: 'Chưa rõ', bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
        {cfg.label}
      </span>
    );
  };

  const paymentBadge = (bookingStatus, paymentMethod) => {
    const bs = Number(bookingStatus);
    const isCash = String(paymentMethod || '').toLowerCase() === 'cash';
    if (bs === 1 || bs === 3) return <span className="badge" style={{ background: '#dcfce7', color: '#166534', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>✓ Đã thanh toán</span>;
    if (bs === 4) return <span className="badge" style={{ background: '#ede9fe', color: '#6b21a8', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>Đã hoàn tiền</span>;
    if (bs === 2) return <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>Đã hủy</span>;
    if (isCash) return <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>💵 Chờ thu tiền</span>;
    return <span className="badge" style={{ background: '#fef9c3', color: '#854d0e', fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>Chờ thanh toán</span>;
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <h3>Quản lý đơn đặt vé</h3>
        <span className="admin-muted">{meta.totalCount || 0} đơn</span>
      </div>

      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}

      {/* ── Bộ lọc ── */}
      <div className="payment-filter-grid" style={{ marginBottom: 12 }}>

        {/* Autocomplete search */}
        <div className="payment-suggest-wrap" ref={suggestRef} style={{ gridColumn: 'span 2' }}>
          <div className="payment-suggest-input-wrap">
            <i className="fa-solid fa-magnifying-glass payment-suggest-icon" />
            <input
              type="text"
              className="payment-suggest-input"
              placeholder="Tìm mã đơn, tên khách, số điện thoại..."
              value={searchQuery}
              // onChange={(e) => {
              //   const v = e.target.value;
              //   setSearchQuery(v);
              //   // Nếu xoá hết text thì reset filter
              //   if (!v) {
              //     setFilters((f) => ({ ...f, bookingId: '', customerName: '', customerPhone: '' }));
              //     setPage(1);
              //   }
              // }}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              autoComplete="off"
            />
            {suggestLoading && <i className="fa-solid fa-spinner fa-spin payment-suggest-spinner" />}
            {searchQuery && (
              <button type="button" className="payment-suggest-clear" onClick={clearSearch}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Dropdown gợi ý */}
          {showSuggest && suggestions.length > 0 && (
            <ul className="payment-suggest-dropdown">
              {suggestions.map((item) => {
                const id     = pick(item, ['bookingID', 'BookingID']);
                const name   = pick(item, ['customerName', 'CustomerName'], '');
                const route  = pick(item, ['route', 'Route'], '');
                const amount = pick(item, ['totalPrice', 'TotalPrice'], 0);
                const bs     = Number(pick(item, ['bookingStatus', 'BookingStatus'], 0));
                const statusMap = { 0:'Chờ xác nhận', 1:'Đã xác nhận', 2:'Đã hủy', 3:'Hoàn thành', 4:'Đã hoàn tiền', 5:'Yêu cầu hủy', 6:'Từ chối hủy' };
                return (
                  <li key={id} className="payment-suggest-item" onMouseDown={() => selectSuggestion(item)}>
                    <span className="suggest-id">#{id}</span>
                    <span className="suggest-name">{name}</span>
                    {route && <span className="suggest-route">{route}</span>}
                    <span className="suggest-amount">{formatVND(amount)}</span>
                    <span className="suggest-route" style={{ fontSize: 11 }}>{statusMap[bs] ?? ''}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {/* {showSuggest && !suggestLoading && suggestions.length === 0 && searchQuery && ( */}
          {showSuggest && !suggestLoading && suggestions.length === 0 && bookingQuery && (
            <ul className="payment-suggest-dropdown">
              <li className="payment-suggest-empty">Không tìm thấy đơn nào</li>
            </ul>
          )}
        </div>

        {/* Filter trạng thái */}
        <label className="payment-filter-field payment-status-field">
          <span>Trạng thái đơn</span>
          <div className="payment-filter-select-wrap">
            <i className="fa-solid fa-circle-check" />
            <select
              value={filters.bookingStatus}
              onChange={(e) => updateFilter('bookingStatus', e.target.value)}
              className="payment-filter-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="0">Chờ xác nhận</option>
              <option value="1">Đã xác nhận</option>
              <option value="2">Đã hủy</option>
              <option value="3">Hoàn thành</option>
              <option value="4">Đã hoàn tiền</option>
              <option value="5">Yêu cầu hủy</option>
              <option value="6">Từ chối hủy</option>
            </select>
            <i className="fa-solid fa-chevron-down payment-select-chevron" />
          </div>
        </label>

        {/* Filter ngày */}
        <label className={`payment-date-field ${filters.bookingDate ? 'has-value' : ''}`}
        style={{display : "none"}}>
          <span>Ngày đặt</span>
          <strong>{formatDateLabel(filters.bookingDate)}</strong>
          <i className="fa-regular fa-calendar-days" />
          <input
            type="date"
            value={filters.bookingDate}
            onChange={(e) => updateFilter('bookingDate', e.target.value)}
            onClick={(e) => e.target.showPicker?.()}
            aria-label="Ngày đặt"
          />
        </label>

        {/* Nút xoá lọc */}
        <div className="payment-filter-actions">
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => {
              setFilters({ bookingId: '', customerName: '', customerPhone: '', bookingStatus: '', bookingDate: '' });
              setSearchQuery('');
              setSuggestions([]);
              setPage(1);
            }}
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {loading && <div className="admin-loading">Đang tải danh sách đơn...</div>}

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Tuyến đường</th>
              <th>Nhà xe</th>
              <th>Số ghế</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái đơn</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ['bookingID', 'BookingID', 'bookingId', 'id']);
              const bs = Number(pick(item, ['bookingStatus', 'BookingStatus'], 0));
              const pm = pick(item, ['paymentMethod', 'PaymentMethod'], '');
              const isCash = String(pm).toLowerCase() === 'cash';
              const departure = pick(item, ['departureLocation', 'DepartureLocation'], '');
              const arrival   = pick(item, ['arrivalLocation',   'ArrivalLocation'],   '');
              const isProcessing = actionLoading === id;

              return (
                <tr key={id} style={{ opacity: isProcessing ? 0.6 : 1 }}>
                  <td><b>#{id}</b></td>
                  <td><b>{pick(item, ['customerName', 'CustomerName'], 'Chưa rõ')}</b></td>
                  <td>{pick(item, ['customerPhone', 'CustomerPhone'], 'Chưa rõ')}</td>
                  <td>{departure || arrival ? `${departure} → ${arrival}` : 'Chưa rõ tuyến'}</td>
                  <td>{pick(item, ['operatorName', 'OperatorName'], 'Chưa rõ')}</td>
                  <td>{pick(item, ['totalSeats', 'TotalSeats'], 0)}</td>
                  <td>{formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</td>
                  <td>{paymentBadge(bs, pm)}</td>
                  <td>{bookingStatusBadge(bs)}</td>
                  <td className="admin-actions" style={{ minWidth: 220 }}>
                    {isCash && bs === 0 && (
                      <button className="btn btn-primary" disabled={isProcessing} onClick={() => handleConfirmCash(id)}>
                        💵 Thu tiền & Xác nhận
                      </button>
                    )}
                    {bs === 5 && (
                      <>
                        <button className="btn btn-danger" disabled={isProcessing} onClick={() => handleApproveCancel(id)}>
                          ✓ Duyệt hủy
                        </button>
                        <button className="btn btn-outline" disabled={isProcessing} onClick={() => handleRejectCancel(id)}>
                          ✕ Từ chối
                        </button>
                      </>
                    )}
                    <button className="btn btn-outline" disabled={isProcessing} onClick={() => navigate(`${basePath}/bookings/${id}`)}>
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="10" className="empty-cell">Không có đơn đặt vé phù hợp.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={meta.page}
        totalPages={meta.totalPages}
        totalCount={meta.totalCount}
        onPageChange={setPage}
      />
    </section>
  );
}
export function AdminBookingDetail({ bookingId }) {
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getById(bookingId);
      setBooking(data);
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không tải được chi tiết đơn.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const runAction = async (action, successText) => {
    setActionLoading(true);
    setNotice(null);
    try {
      await action();
      setNotice({ type: "success", text: successText });
      await loadBooking();
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Thao tác thất bại." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <div className="admin-card admin-loading">Đang tải chi tiết đơn...</div>
    );
  if (!booking)
    return (
      <>
        {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      </>
    );

  // const status = pick(
  //   booking,
  //   ["bookingStatus", "BookingStatus"],
  //   "PendingConfirm",
  // );
  // const paymentStatus = pick(
  //   booking,
  //   ["paymentStatus", "PaymentStatus"],
  //   "Pending",
  // );
  const status = pick(booking, ["bookingStatus", "BookingStatus"], 0);
  const bs = Number(status);
  const seatLabels = pick(booking, ["seatLabels", "SeatLabels"], []);
  const qrCodes = pick(booking, ["qrCodes", "QrCodes", "QRCodes"], []);
  const ticketSeats = pick(booking, ["ticketSeats", "TicketSeats"], []);
  const cancelReason = pick(booking, ["cancelReason", "CancelReason"], "");
  const cancelledAt = pick(booking, ["cancelledAt", "CancelledAt"], "");
  const refundAmount = pick(booking, ["refundAmount", "RefundAmount"], null);
  const pickupStop = pick(booking, ["pickupStop", "PickupStop"], {});
  const dropoffStop = pick(booking, ["dropoffStop", "DropoffStop"], {});
  const pickupText = [
    pick(pickupStop, ["stopName", "StopName"], ""),
    pick(pickupStop, ["stopAddress", "StopAddress"], ""),
  ]
    .filter(Boolean)
    .join(" - ");
  const dropoffText = [
    pick(dropoffStop, ["stopName", "StopName"], ""),
    pick(dropoffStop, ["stopAddress", "StopAddress"], ""),
  ]
    .filter(Boolean)
    .join(" - ");
  const firstQr =
    qrCodes.find(Boolean) ||
    ticketSeats.map((x) => pick(x, ["qrCode", "QRCode"], "")).find(Boolean);

  return (
    <section className="admin-card admin-booking-detail-card">
      <div className="admin-section-head no-print">
        <div>
          <h3>Chi tiết đơn #{bookingId}</h3>
          <p>
            {pick(booking, ["departureLocation", "DepartureLocation"])} →{" "}
            {pick(booking, ["arrivalLocation", "ArrivalLocation"])}
          </p>
        </div>
        <div className="admin-actions">
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => navigate("/admin/bookings")}
          >
            <i className="fa-solid fa-arrow-left" /> Quay lại
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => window.print()}
          >
            <i className="fa-solid fa-print" /> In hóa đơn
          </button>
        </div>
      </div>

      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}

      <div className="admin-invoice-print">
        <div className="admin-invoice-head">
          <div>
            <h2>Hóa đơn đặt vé #{bookingId}</h2>
            <p>VéXeAZ - Quản lý đơn đặt vé</p>
          </div>
          <div>
            {/* <span className="badge">{labelPaymentStatus(paymentStatus)}</span>
            <span className="badge">{labelBookingStatus(status)}</span> */}
            <span className="badge" style={{
              background: bs === 1 || bs === 3 ? '#dcfce7' :
                          bs === 4 ? '#ede9fe' :
                          bs === 2 ? '#fee2e2' : '#fef9c3',
              color: bs === 1 || bs === 3 ? '#166534' :
                    bs === 4 ? '#6b21a8' :
                    bs === 2 ? '#991b1b' : '#854d0e',
              fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12
            }}>
              {bs === 1 || bs === 3 ? '✓ Đã thanh toán' :
              bs === 4 ? 'Đã hoàn tiền' :
              bs === 2 ? 'Đã hủy' : 'Chưa thanh toán'}
            </span>
<span className="badge">{labelBookingStatus(bs)}</span>
          </div>
        </div>

        <div className="admin-detail-grid">
          <div>
            <span>Mã đơn</span>
            <b>{bookingId}</b>
          </div>
          <div>
            <span>Tên nhà xe</span>
            <b>{pick(booking, ["operatorName", "OperatorName"], "Chưa rõ")}</b>
          </div>
          <div>
            <span>Nơi xuất phát</span>
            <b>
              {pick(
                booking,
                ["departureLocation", "DepartureLocation"],
                "Chưa rõ",
              )}
            </b>
          </div>
          <div>
            <span>Giờ xuất phát</span>
            <b>
              {formatDateTime(
                pick(booking, ["departureTime", "DepartureTime"]),
              )}
            </b>
          </div>
          <div>
            <span>Nơi đến</span>
            <b>
              {pick(booking, ["arrivalLocation", "ArrivalLocation"], "Chưa rõ")}
            </b>
          </div>
          <div>
            <span>Giờ đến dự kiến</span>
            <b>
              {formatDateTime(pick(booking, ["arrivalTime", "ArrivalTime"]))}
            </b>
          </div>
          <div>
            <span>Số ghế đặt</span>
            <b>{pick(booking, ["totalSeats", "TotalSeats"], 0)}</b>
          </div>
          <div>
            <span>Danh sách ghế</span>
            <b>
              {Array.isArray(seatLabels) && seatLabels.length
                ? seatLabels.join(", ")
                : "Chưa rõ"}
            </b>
          </div>
          <div>
            <span>Điểm đón</span>
            <b>
              {pickupText ||
                pick(booking, ["pickupStopID", "PickupStopID"], "Chưa rõ")}
            </b>
          </div>
          <div>
            <span>Điểm trả</span>
            <b>
              {dropoffText ||
                pick(booking, ["dropoffStopID", "DropoffStopID"], "Chưa rõ")}
            </b>
          </div>
          <div>
            <span>Tên người đặt</span>
            <b>{pick(booking, ["customerName", "CustomerName"], "Chưa rõ")}</b>
          </div>
          <div>
            <span>Số điện thoại</span>
            <b>
              {pick(booking, ["customerPhone", "CustomerPhone"], "Chưa rõ")}
            </b>
          </div>
          <div>
            <span>Email</span>
            <b>
              {pick(booking, ["customerEmail", "CustomerEmail"], "Chưa rõ")}
            </b>
          </div>
          <div>
            <span>Tổng số tiền</span>
            <b>{formatVND(pick(booking, ["totalPrice", "TotalPrice"], 0))}</b>
          </div>
          <div>
            <span>Phương thức thanh toán</span>
            <b>
              {labelPaymentMethod(
                pick(booking, ["paymentMethod", "PaymentMethod"], "Chưa rõ"),
              )}
            </b>
          </div>
          <div>
            <span>Ngày đặt</span>
            <b>{formatDateTime(pick(booking, ["bookingDate", "BookingDate"])) || "Chưa rõ"}</b>
          </div>
          {/* <div>
            <span>Thanh toán</span>
            <b>
              <span className="badge">{labelPaymentStatus(paymentStatus)}</span>
            </b>
          </div> */}
          <div>
            <span>Thanh toán</span>
            <b>
              <span className="badge">
                {bs === 1 || bs === 3 ? '✓ Đã thanh toán' :
                bs === 4 ? 'Đã hoàn tiền' :
                bs === 2 ? 'Đã hủy' : 'Chưa thanh toán'}
              </span>
            </b>
          </div>
          <div>
            <span>Trạng thái đơn</span>
            <b>
              <span className="badge">{labelBookingStatus(status)}</span>
            </b>
          </div>
          {(cancelReason || cancelledAt || refundAmount !== null) && (
            <>
              <div>
                <span>Lý do hủy</span>
                <b>{cancelReason || "Chưa có"}</b>
              </div>
              <div>
                <span>Thời gian hủy</span>
                <b>{formatDateTime(cancelledAt)}</b>
              </div>
              <div>
                <span>Số tiền hoàn</span>
                <b>
                  {refundAmount !== null && refundAmount !== undefined
                    ? formatVND(refundAmount)
                    : "Chưa tính"}
                </b>
              </div>
            </>
          )}
        </div>

        {firstQr && (
          <div className="admin-qr-box">
            <span>Mã QR</span>
            <pre>{firstQr}</pre>
          </div>
        )}
      </div>

      <div className="admin-booking-actions no-print">
        {bs === 0 && (
          <button
            className="btn btn-primary"
            disabled={actionLoading}
            onClick={() =>
              runAction(
                () => bookingApi.confirm(bookingId),
                "Xác nhận đơn thành công.",
              )
            }
          >
            Xác nhận đơn
          </button>
        )}
        {bs === 5 && (
          <>
            <button
              className="btn btn-danger"
              disabled={actionLoading}
              onClick={() =>
                runAction(
                  () => bookingApi.approveCancel(bookingId, {}),
                  "Duyệt hủy đơn thành công.",
                )
              }
            >
              Duyệt hủy
            </button>
            <button
              className="btn btn-outline"
              disabled={actionLoading}
              onClick={() => {
                const rejectReason = window.prompt(
                  "Nhập lý do từ chối hủy vé:",
                  "Không đủ điều kiện hủy theo chính sách.",
                );
                if (rejectReason === null) return;
                runAction(
                  () => bookingApi.rejectCancel(bookingId, { rejectReason }),
                  "Từ chối hủy đơn thành công.",
                );
              }}
            >
              Từ chối hủy
            </button>
          </>
        )}
      </div>
    </section>
  );
}

// ==================== PAYMENTS ====================
// function PaymentsManager() {
//   const [rows, setRows] = useState([]);
//   const [filters, setFilters] = useState({
//     paymentStatus: "",
//     bookingId: "",
//     fromDate: "",
//     toDate: "",
//     page: 1,
//     pageSize: 20,
//   });
//   const [paging, setPaging] = useState({
//     totalCount: 0,
//     page: 1,
//     pageSize: 20,
//     totalPages: 1,
//   });
//   const [loading, setLoading] = useState(false);
//   const [notice, setNotice] = useState(null);

//   const loadPayments = async (nextFilters = filters) => {
//     setLoading(true);
//     setNotice(null);
//     try {
//       const data = await paymentApi.list(cleanParams(nextFilters));
//       const normalized = normalizePagedResponse(
//         data,
//         nextFilters.page,
//         nextFilters.pageSize,
//       );
//       setRows(normalized.items);
//       setPaging(normalized);
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text: e.message || "Không tải được lịch sử thanh toán.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadPayments();
//   }, []);

//   const updateFilter = (field, value) => {
//     setFilters((current) => ({ ...current, [field]: value, page: 1 }));
//   };

//   const applyFilters = (event) => {
//     event.preventDefault();
//     const nextFilters = { ...filters, page: 1 };
//     setFilters(nextFilters);
//     loadPayments(nextFilters);
//   };

//   const changePage = (page) => {
//     const nextFilters = { ...filters, page };
//     setFilters(nextFilters);
//     loadPayments(nextFilters);
//   };

//   const confirmPayment = async (id) => {
//     if (!window.confirm("Xác nhận giao dịch này đã thanh toán?")) return;
//     setLoading(true);
//     try {
//       await paymentApi.confirm(id);
//       await loadPayments(filters);
//       setNotice({ type: "success", text: "Đã xác nhận thanh toán." });
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text: e.message || "Không xác nhận được thanh toán.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section className="admin-card table-card">
//       <div className="admin-section-head">
//         <div>
//           <p className="eyebrow">Thanh toán</p>
//           <h3>Lịch sử giao dịch</h3>
//         </div>
//         <button
//           className="btn btn-outline"
//           type="button"
//           onClick={() => loadPayments(filters)}
//           disabled={loading}
//         >
//           Làm mới
//         </button>
//       </div>

//       {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}

//       <form className="admin-filter-grid" onSubmit={applyFilters}>
//         <input
//           type="number"
//           value={filters.bookingId}
//           onChange={(e) => updateFilter("bookingId", e.target.value)}
//           placeholder="Mã đơn"
//         />
//         <select
//           value={filters.paymentStatus}
//           onChange={(e) => updateFilter("paymentStatus", e.target.value)}
//         >
//           <option value="">Tất cả trạng thái</option>
//           <option value="Pending">Chờ xác nhận</option>
//           <option value="Paid">Đã thanh toán</option>
//           <option value="Cancelled">Đã hủy</option>
//           <option value="Refunded">Đã hoàn tiền</option>
//         </select>
//         <input
//           type="date"
//           value={filters.fromDate}
//           onChange={(e) => updateFilter("fromDate", e.target.value)}
//         />
//         <input
//           type="date"
//           value={filters.toDate}
//           onChange={(e) => updateFilter("toDate", e.target.value)}
//         />
//         <button className="btn btn-primary" type="submit" disabled={loading}>
//           Lọc
//         </button>
//       </form>

//       {loading && <div className="admin-loading">Đang tải giao dịch...</div>}

//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>Mã GD</th>
//               <th>Đơn</th>
//               <th>Khách hàng</th>
//               <th>Tuyến</th>
//               <th>Số tiền</th>
//               <th>Phương thức</th>
//               <th>Trạng thái</th>
//               <th>Mã giao dịch</th>
//               <th>Ngày tạo</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["paymentID", "PaymentID"]);
//               const status = pick(item, ["paymentStatus", "PaymentStatus"], "");
//               return (
//                 <tr key={id}>
//                   <td>#{id}</td>
//                   <td>#{pick(item, ["bookingID", "BookingID"])}</td>
//                   <td>
//                     <strong>
//                       {pick(item, ["customerName", "CustomerName"], "Chưa rõ")}
//                     </strong>
//                     <br />
//                     <small>
//                       {pick(item, ["customerPhone", "CustomerPhone"], "")}
//                     </small>
//                   </td>
//                   <td>
//                     {pick(item, ["route", "Route"], "Chưa rõ tuyến")}
//                     <br />
//                     <small>
//                       {formatDateTime(
//                         pick(item, ["departureTime", "DepartureTime"]),
//                       )}
//                     </small>
//                   </td>
//                   <td>{formatVND(pick(item, ["amount", "Amount"], 0))}</td>
//                   <td>
//                     {labelPaymentMethod(
//                       pick(item, ["paymentMethod", "PaymentMethod"], ""),
//                     )}
//                   </td>
//                   <td>
//                     <span className="badge">{labelPaymentStatus(status)}</span>
//                   </td>
//                   <td>
//                     {pick(item, ["transactionCode", "TransactionCode"], "--")}
//                   </td>
//                   <td>
//                     {formatDateTime(pick(item, ["createdAt", "CreatedAt"]))}
//                   </td>
//                   <td className="admin-actions">
//                     {String(status).toLowerCase() === "pending" && (
//                       <button
//                         className="btn btn-primary"
//                         type="button"
//                         onClick={() => confirmPayment(id)}
//                         disabled={loading}
//                       >
//                         Xác nhận
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               );
//             })}
//             {!loading && rows.length === 0 && (
//               <tr>
//                 <td colSpan="10" className="empty-cell">
//                   Chưa có giao dịch thanh toán.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       <Pagination
//         page={paging.page}
//         totalPages={paging.totalPages}
//         onPageChange={changePage}
//       />
//     </section>
//   );
// }
function PaymentsManager({ isOperator = false }) {
  const [rows, setRows]       = useState([]);
  const basePath = isOperator ? '/operator' : '/admin';
  const [filters, setFilters] = useState({
    bookingStatus: '',
    bookingId: '',
    fromDate: '',
    toDate: '',
    page: 1,
    pageSize: 20,
  });
  const [paging, setPaging]   = useState({ totalCount: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice]   = useState(null);
 
  // ── Autocomplete state ──────────────────────────────────────
  const [bookingQuery, setBookingQuery]     = useState('');   // text đang gõ
  const [suggestions, setSuggestions]       = useState([]);   // danh sách gợi ý
  const [showSuggest, setShowSuggest]       = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestRef = useRef(null);
  const debounceRef = useRef(null);
 const [fromDateRaw, setFromDateRaw] = useState('');
const [toDateRaw, setToDateRaw] = useState('');
  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
 
  // Debounce gọi API suggest khi gõ
  // useEffect(() => {
  //   clearTimeout(debounceRef.current);
  //   if (!bookingQuery.trim()) {
  //     setSuggestions([]);
  //     setShowSuggest(false);
  //     return;
  //   }
  //   debounceRef.current = setTimeout(async () => {
  //     setSuggestLoading(true);
  //     try {
  //       const data = await bookingApi.suggest(bookingQuery.trim());
  //       setSuggestions(Array.isArray(data) ? data : []);
  //       setShowSuggest(true);
  //     } catch {
  //       setSuggestions([]);
  //     } finally {
  //       setSuggestLoading(false);
  //     }
  //   }, 300); // debounce 300ms
  // }, [bookingQuery]);
 // Debounce gợi ý + tự apply filter ngay khi gõ
// useEffect(() => {
//   clearTimeout(debounceRef.current);

//   if (!searchQuery.trim()) {
//     setSuggestions([]);
//     setShowSuggest(false);
//     // Xóa hết filter khi user xóa text
//     setFilters((f) => ({ ...f, bookingId: '', customerName: '', customerPhone: '' }));
//     setPage(1);
//     return;
//   }

//   debounceRef.current = setTimeout(async () => {
//     const q = searchQuery.trim();

//     // Parse loại input để apply đúng filter vào adminList
//     const isIdSearch   = /^#?\d+$/.test(q);          // "47" hoặc "#47"
//     const isPhoneSearch = /^[0-9+\-\s]{7,}$/.test(q); // "0944455667"

//     if (isIdSearch) {
//       setFilters((f) => ({
//         ...f,
//         bookingId: q.replace('#', ''),
//         customerName: '',
//         customerPhone: '',
//       }));
//     } else if (isPhoneSearch) {
//       setFilters((f) => ({
//         ...f,
//         bookingId: '',
//         customerName: '',
//         customerPhone: q,
//       }));
//     } else {
//       // Tên khách hàng
//       setFilters((f) => ({
//         ...f,
//         bookingId: '',
//         customerName: q,
//         customerPhone: '',
//       }));
//     }
//     setPage(1);

//     // Vẫn gọi suggest để hiện dropdown gợi ý bên dưới
//     setSuggestLoading(true);
//     try {
//       const data = await bookingApi.suggest(q);
//       setSuggestions(Array.isArray(data) ? data : []);
//       setShowSuggest(true);
//     } catch {
//       setSuggestions([]);
//     } finally {
//       setSuggestLoading(false);
//     }
//   }, 350);
// }, [searchQuery]);
// Debounce gọi API suggest khi gõ
useEffect(() => {
  clearTimeout(debounceRef.current);
  if (!bookingQuery.trim()) {
    setSuggestions([]);
    setShowSuggest(false);
    return;
  }
  debounceRef.current = setTimeout(async () => {
    setSuggestLoading(true);
    try {
      const data = await bookingApi.suggest(bookingQuery.trim());
      setSuggestions(Array.isArray(data) ? data : []);
      setShowSuggest(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, 300);
}, [bookingQuery]);
  // Chọn 1 gợi ý → điền vào filter
  const selectSuggestion = (item) => {
    const id = pick(item, ['bookingID', 'BookingID']);
    setBookingQuery(String(id));
    setFilters((f) => ({ ...f, bookingId: String(id), page: 1 }));
    setShowSuggest(false);
    setSuggestions([]);
  };
 
  // ── Load payments ───────────────────────────────────────────
  const loadPayments = async (nextFilters = filters) => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await paymentApi.list(cleanParams(nextFilters));
      const normalized = normalizePagedResponse(data, nextFilters.page, nextFilters.pageSize);
      setRows(normalized.items);
      setPaging(normalized);
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Không tải được lịch sử thanh toán.' });
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => { loadPayments(); }, []);
 
  // const applyFilters = (e) => {
  //   e.preventDefault();
  //   const next = { ...filters, bookingId: bookingQuery || filters.bookingId, page: 1 };
  //   setFilters(next);
  //   loadPayments(next);
  // };
//   const applyFilters = (e) => {
//   e.preventDefault();
//   const q = bookingQuery.trim();
//   const isId    = /^#?\d+$/.test(q);
//   const isPhone = /^[0-9+\-\s]{7,}$/.test(q);

//   const next = {
//     ...filters,
//     bookingId:     isId    ? q.replace('#','') : '',
//     customerPhone: isPhone ? q : '',
//     customerName:  (!isId && !isPhone) ? q : '',
//     page: 1,
//   };
//   setFilters(next);
//   loadPayments(next);
// };
const applyFilters = (e) => {
  e.preventDefault();
  const q = bookingQuery.trim();
  const isId    = /^#?\d+$/.test(q);
  const isPhone = /^[0-9+\-\s]{7,}$/.test(q);

  const next = {
    ...filters,
    bookingId:     isId    ? q.replace('#', '') : '',
    customerPhone: isPhone && !isId ? q : '',
    customerName:  !isId && !isPhone ? q : '',
    fromDate: fromDateRaw ? `${fromDateRaw}T00:00:00` : '',
    toDate:   toDateRaw   ? `${toDateRaw}T23:59:59`   : '',
    page: 1,
  };
  setFilters(next);
  loadPayments(next);
};
 
  const changePage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    loadPayments(next);
  };
 
  // const confirmPayment = async (id) => {
  //   if (!window.confirm('Xác nhận giao dịch này đã thanh toán?')) return;
  //   setLoading(true);
  //   try {
  //     await paymentApi.confirm(id);
  //     await loadPayments(filters);
  //     setNotice({ type: 'success', text: 'Đã xác nhận thanh toán.' });
  //   } catch (e) {
  //     setNotice({ type: 'error', text: e.message || 'Không xác nhận được thanh toán.' });
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const confirmPayment = async (id) => {
  if (!window.confirm('Xác nhận giao dịch này?')) return;
  setLoading(true);
  try {
    await bookingApi.confirm(id);  // ← đổi từ paymentApi.confirm sang bookingApi.confirm
    await loadPayments(filters);
    setNotice({ type: 'success', text: 'Đã xác nhận.' });
  } catch (e) {
    setNotice({ type: 'error', text: e.message || 'Không xác nhận được.' });
  } finally {
    setLoading(false);
  }
};
 
  // ── Render ───────────────────────────────────────────────────
  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Thanh toán</p>
          <h3>Lịch sử giao dịch</h3>
        </div>
        <button
          className="btn btn-outline"
          type="button"
          onClick={() => loadPayments(filters)}
          disabled={loading}
        >
          Làm mới
        </button>
      </div>
 
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
 
      {/* ── Bộ lọc ── */}
      <form className="payment-filter-grid" onSubmit={applyFilters}>
 
        {/* Autocomplete mã đơn */}
        <div className="payment-suggest-wrap" ref={suggestRef}>
          <div className="payment-suggest-input-wrap">
            <i className="fa-solid fa-magnifying-glass payment-suggest-icon" />
            <input
              type="text"
              className="payment-suggest-input"
              placeholder="Tìm mã đơn hoặc tên khách..."
              value={bookingQuery}
              onChange={(e) => {
                setBookingQuery(e.target.value);
                if (!e.target.value) {
                  setFilters((f) => ({ ...f, bookingId: '', page: 1 }));
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              autoComplete="off"
            />
            {suggestLoading && (
              <i className="fa-solid fa-spinner fa-spin payment-suggest-spinner" />
            )}
            {bookingQuery && (
              <button
                type="button"
                className="payment-suggest-clear"
                onClick={() => {
                  setBookingQuery('');
                  setSuggestions([]);
                  setShowSuggest(false);
                  setFilters((f) => ({ ...f, bookingId: '', page: 1 }));
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
 
          {/* Dropdown gợi ý */}
          {showSuggest && suggestions.length > 0 && (
            <ul className="payment-suggest-dropdown">
              {suggestions.map((item) => {
                const id   = pick(item, ['bookingID', 'BookingID']);
                const name = pick(item, ['customerName', 'CustomerName'], '');
                const route = pick(item, ['route', 'Route'], '');
                const amount = pick(item, ['totalPrice', 'TotalPrice'], 0);
                return (
                  <li
                    key={id}
                    className="payment-suggest-item"
                    onMouseDown={() => selectSuggestion(item)}
                  >
                    <span className="suggest-id">#{id}</span>
                    <span className="suggest-name">{name}</span>
                    {route && <span className="suggest-route">{route}</span>}
                    <span className="suggest-amount">{formatVND(amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
 
          {showSuggest && !suggestLoading && suggestions.length === 0 && bookingQuery && (
            <ul className="payment-suggest-dropdown">
              <li className="payment-suggest-empty">Không tìm thấy đơn nào</li>
            </ul>
          )}
        </div>
 
        {/* Trạng thái */}
        <label className="payment-filter-field payment-status-field">
          <span>Trạng thái</span>
          <div className="payment-filter-select-wrap">
            <i className="fa-solid fa-circle-check" />
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
              className="payment-filter-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Chờ xác nhận</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Cancelled">Đã hủy</option>
              <option value="Refunded">Đã hoàn tiền</option>
            </select>
            <i className="fa-solid fa-chevron-down payment-select-chevron" />
          </div>
        </label>
 
        {/* Range date picker */}
        {/* <div className="payment-date-range">
          <label className={`payment-date-field ${filters.fromDate ? 'has-value' : ''}`}>
            <span>Từ ngày</span>
            <strong>{formatDateLabel(filters.fromDate)}</strong>
            <i className="fa-regular fa-calendar-days" />
            <input
              type="date"
              value={filters.fromDate}
              max={filters.toDate || undefined}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
              aria-label="Từ ngày"
            />
          </label>
          <span className="payment-date-sep">→</span>
          <label className={`payment-date-field ${filters.toDate ? 'has-value' : ''}`}>
            <span>Đến ngày</span>
            <strong>{formatDateLabel(filters.toDate)}</strong>
            <i className="fa-regular fa-calendar-days" />
            <input
              type="date"
              value={filters.toDate}
              min={filters.fromDate || undefined}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
              aria-label="Đến ngày"
            />
          </label>
        </div> */}
        {/* Từ ngày */}
<div className="payment-date-range" style={{ display: 'none', gridColumn: 'span 1', minWidth: 280 }}>
  {/* <label
    className={`payment-date-field ${filters.fromDate ? 'has-value' : ''}`}
    onClick={() => document.getElementById('fromDate').showPicker?.()}
    style={{ cursor: 'pointer', flex: 1 }}
  >
    <span>Từ ngày</span>
    <strong>{formatDateLabel(filters.fromDate)}</strong>
    <i className="fa-regular fa-calendar-days" />
    {/* <input
      id="fromDate"
      type="date"
      value={filters.fromDate}
      max={filters.toDate || undefined}
      onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
      aria-label="Từ ngày"
    /> */}
    {/* <input
      id="fromDate"
      type="date"
      value={fromDateRaw}
      max={toDateRaw || undefined}
      onChange={(e) => setFromDateRaw(e.target.value)}
    />
  </label> */} 
  <label
  className={`payment-date-field ${fromDateRaw ? 'has-value' : ''}`}
  onClick={() => document.getElementById('fromDate').showPicker?.()}
  style={{ cursor: 'pointer', flex: 1 }}
>
  <span>Từ ngày</span>
  <strong>{formatDateLabel(fromDateRaw)}</strong>  {/* ← dùng raw */}
  <i className="fa-regular fa-calendar-days" />
  <input
    id="fromDate"
    type="date"
    value={fromDateRaw}
    max={toDateRaw || undefined}
    onChange={(e) => setFromDateRaw(e.target.value)}
  />
</label>

<span className="payment-date-sep">→</span>

<label
  className={`payment-date-field ${toDateRaw ? 'has-value' : ''}`}
  onClick={() => document.getElementById('toDate').showPicker?.()}
  style={{ cursor: 'pointer', flex: 1 }}
>
  <span>Đến ngày</span>
  <strong>{formatDateLabel(toDateRaw)}</strong>  {/* ← dùng raw */}
  <i className="fa-regular fa-calendar-days" />
  <input
    id="toDate"
    type="date"
    value={toDateRaw}
    min={fromDateRaw || undefined}
    onChange={(e) => setToDateRaw(e.target.value)}
  />
</label>

  {/* <span className="payment-date-sep">→</span>

  <label
    className={`payment-date-field ${filters.toDate ? 'has-value' : ''}`}
    onClick={() => document.getElementById('toDate').showPicker?.()}
    style={{ cursor: 'pointer', flex: 1 }}
  >
    <span>Đến ngày</span>
    <strong>{formatDateLabel(filters.toDate)}</strong>
    <i className="fa-regular fa-calendar-days" />
    {/* <input
      id="toDate"
      type="date"
      value={filters.toDate}
      min={filters.fromDate || undefined}
      onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
      aria-label="Đến ngày"
    /> */}
    {/* <input
      id="fromDate"
      type="date"
      value={fromDateRaw}
      max={toDateRaw || undefined}
      onChange={(e) => setFromDateRaw(e.target.value)}
    /> */}
  {/* </label> */} 
</div>
 
        {/* Nút lọc + xóa lọc */}
        <div className="payment-filter-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <i className="fa-solid fa-filter" /> Lọc
          </button>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => {
              const reset = { bookingStatus: '', bookingId: '', fromDate: '', toDate: '', page: 1, pageSize: 20 };
              setFilters(reset);
              setFromDateRaw('');   // ← thêm
              setToDateRaw('');
              setBookingQuery('');
              setSuggestions([]);
              loadPayments(reset);
            }}
          >
            Xóa lọc
          </button>
        </div>
      </form>
 
      {loading && <div className="admin-loading">Đang tải giao dịch...</div>}
 
      {/* ── Bảng ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {/* <th>Mã GD</th> */}
              <th>Đơn</th>
              <th>Khách hàng</th>
              <th>Tuyến</th>
              <th>Số tiền</th>
              <th>Phương thức</th>
              <th>Trạng thái</th>
              {/* <th>Mã giao dịch</th> */}
              <th>Ngày tạo</th>
              {/* Chỉ hiện cột Thao tác nếu là admin, hoặc operator với đơn tiền mặt */}
              {/* <th>Thao tác</th> */}
            </tr>
          </thead>
          <tbody>
            {/* {rows.map((item) => {
              const id     = pick(item, ['paymentID', 'PaymentID']);
              const status = pick(item, ['paymentStatus', 'PaymentStatus'], '');
              const method = String(pick(item, ['paymentMethod', 'PaymentMethod'], '')).toLowerCase();
              // Operator chỉ được xác nhận đơn tiền mặt (cash)
              const canConfirm = String(status).toLowerCase() === 'pending' &&
                (!isOperator || method === 'cash');
 
              return (
                <tr key={id}>
                  <td>#{id}</td>
                  <td>#{pick(item, ['bookingID', 'BookingID'])}</td>
                  <td>
                    <strong>{pick(item, ['customerName', 'CustomerName'], 'Chưa rõ')}</strong>
                    <br />
                    <small>{pick(item, ['customerPhone', 'CustomerPhone'], '')}</small>
                  </td>
                  <td>
                    {pick(item, ['route', 'Route'], 'Chưa rõ tuyến')}
                    <br />
                    <small>{formatDateTime(pick(item, ['departureTime', 'DepartureTime']))}</small>
                  </td>
                  <td>{formatVND(pick(item, ['amount', 'Amount'], 0))}</td>
                  <td>{labelPaymentMethod(pick(item, ['paymentMethod', 'PaymentMethod'], ''))}</td>
                  <td>
                    <span className="badge">{labelPaymentStatus(status)}</span>
                  </td>
                  <td>{pick(item, ['transactionCode', 'TransactionCode'], '--')}</td>
                  <td>{formatDateTime(pick(item, ['createdAt', 'CreatedAt']))}</td>
                  <td className="admin-actions">
                    {canConfirm && (
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => confirmPayment(id)}
                        disabled={loading}
                      >
                        Xác nhận
                      </button>
                    )}
                    {!canConfirm && <span className="admin-muted">—</span>}
                  </td>
                </tr>
              );
            })} */}
            {rows.map((item) => {
        const id     = pick(item, ['bookingID', 'BookingID']);
        const bs     = Number(pick(item, ['bookingStatus', 'BookingStatus'], 0));
        const method = String(pick(item, ['paymentMethod', 'PaymentMethod'], '')).toLowerCase();

        // Xác nhận được khi bs = 0 (Pending) và là cash (hoặc admin)
        const canConfirm = bs === 0 && (!isOperator || method === 'cash');

        // Badge trạng thái dựa trên bookingStatus
        const statusBadge = () => {
          const map = {
            0: { label: 'Chờ xác nhận',  bg: '#fef9c3', color: '#854d0e' },
            1: { label: '✓ Đã xác nhận', bg: '#dcfce7', color: '#166534' },
            2: { label: 'Đã hủy',        bg: '#fee2e2', color: '#991b1b' },
            3: { label: 'Hoàn thành',    bg: '#dbeafe', color: '#1e40af' },
            4: { label: 'Đã hoàn tiền',  bg: '#ede9fe', color: '#6b21a8' },
            5: { label: 'Yêu cầu hủy',  bg: '#fce7f3', color: '#9d174d' },
            6: { label: 'Từ chối hủy',  bg: '#f3f4f6', color: '#374151' },
          };
          const cfg = map[bs] ?? { label: 'Chưa rõ', bg: '#f3f4f6', color: '#6b7280' };
          return (
            <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
              {cfg.label}
            </span>
          );
        };

        return (
          <tr key={id}>
            {/* <td>#{id}</td> */}
            <td>#{id}</td>
            <td>
              <strong>{pick(item, ['customerName', 'CustomerName'], 'Chưa rõ')}</strong>
              <br />
              <small>{pick(item, ['customerPhone', 'CustomerPhone'], '')}</small>
            </td>
            {/* <td>
              {pick(item, ['route', 'Route'], 'Chưa rõ tuyến')}
              <br />
              <small>{formatDateTime(pick(item, ['departureTime', 'DepartureTime']))}</small>
            </td> */}
            <td>
              {pick(item, ['departureLocation'], '') && pick(item, ['arrivalLocation'], '')
                ? `${pick(item, ['departureLocation'])} - ${pick(item, ['arrivalLocation'])}`
                : 'Chưa rõ tuyến'}
              <br />
              <small>{formatDateTime(pick(item, ['departureTime', 'DepartureTime']))}</small>
            </td>
            <td>{formatVND(pick(item, ['totalPrice', 'TotalPrice'], 0))}</td>
            <td>{labelPaymentMethod(pick(item, ['paymentMethod', 'PaymentMethod'], ''))}</td>
            <td>{statusBadge()}</td>
            {/* <td>--</td>
            <td>{formatDateTime(pick(item, ['bookingDate', 'BookingDate']))}</td>
            <td className="admin-actions">
              {canConfirm && (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => confirmPayment(id)}
                  disabled={loading}
                >
                  Xác nhận
                </button>
              )}
              {!canConfirm && <span className="admin-muted">—</span>}
            </td> */}
            <td>
            <a
            //   href={`/admin/bookings/${id}`}
            //   className="btn btn-outline"
            //   style={{ fontSize: 13, padding: '4px 10px' }}
            // >
            //   <i className="fa-solid fa-eye" /> Xem đơn
            // </a>
            href={`${basePath}/bookings/${id}`}
              className="btn btn-outline"
              style={{ fontSize: 13, padding: '4px 10px' }}
            >
              <i className="fa-solid fa-eye" /> Xem đơn
            </a>
          </td>
            
          </tr>
        );
      })}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan="10" className="empty-cell">Chưa có giao dịch thanh toán.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
      
            <Pagination page={paging.page} totalPages={paging.totalPages} onPageChange={changePage} />
          </section>
        );
      }
// ==================== REVIEWS ====================
// function ReviewsManager() {
//   const [rows, setRows] = useState([]);
//   const [filters, setFilters] = useState({
//     tripId: "",
//     operatorId: "",
//     page: 1,
//     pageSize: 20,
//   });
//   const [paging, setPaging] = useState({
//     totalCount: 0,
//     page: 1,
//     pageSize: 20,
//     totalPages: 1,
//   });
//   const [loading, setLoading] = useState(false);
//   const [notice, setNotice] = useState(null);
//   const [tripQuery, setTripQuery] = useState("");
//   const [operatorQuery, setOperatorQuery] = useState("");
//   const [tripSuggestions, setTripSuggestions] = useState([]);
//   const [operatorSuggestions, setOperatorSuggestions] = useState([]);
//   const [showTripSuggest, setShowTripSuggest] = useState(false);
//   const [showOperatorSuggest, setShowOperatorSuggest] = useState(false);
//   const [tripSuggestLoading, setTripSuggestLoading] = useState(false);
//   const [operatorSuggestLoading, setOperatorSuggestLoading] = useState(false);
//   const tripSuggestRef = useRef(null);
//   const operatorSuggestRef = useRef(null);
//   const tripDebounceRef = useRef(null);
//   const operatorDebounceRef = useRef(null);

//   const loadReviews = async (nextFilters = filters) => {
//     setLoading(true);
//     setNotice(null);
//     try {
//       const data = await reviewApi.list(cleanParams(nextFilters));
//       const normalized = normalizePagedResponse(
//         data,
//         nextFilters.page,
//         nextFilters.pageSize,
//       );
//       setRows(normalized.items);
//       setPaging(normalized);
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text: e.message || "Không tải được đánh giá.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadReviews();
//   }, []);

//   useEffect(() => {
//     const handler = (event) => {
//       if (tripSuggestRef.current && !tripSuggestRef.current.contains(event.target)) {
//         setShowTripSuggest(false);
//       }
//       if (operatorSuggestRef.current && !operatorSuggestRef.current.contains(event.target)) {
//         setShowOperatorSuggest(false);
//       }
//     };

//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   useEffect(() => {
//     clearTimeout(tripDebounceRef.current);
//     if (!tripQuery.trim()) {
//       setTripSuggestions([]);
//       setShowTripSuggest(false);
//       return;
//     }

//     tripDebounceRef.current = setTimeout(async () => {
//       setTripSuggestLoading(true);
//       try {
//         const data = await reviewApi.suggestTrips(tripQuery.trim());
//         setTripSuggestions(Array.isArray(data) ? data : []);
//         setShowTripSuggest(true);
//       } catch {
//         setTripSuggestions([]);
//       } finally {
//         setTripSuggestLoading(false);
//       }
//     }, 300);

//     return () => clearTimeout(tripDebounceRef.current);
//   }, [tripQuery]);

//   useEffect(() => {
//     clearTimeout(operatorDebounceRef.current);
//     if (!operatorQuery.trim()) {
//       setOperatorSuggestions([]);
//       setShowOperatorSuggest(false);
//       return;
//     }

//     operatorDebounceRef.current = setTimeout(async () => {
//       setOperatorSuggestLoading(true);
//       try {
//         const data = await reviewApi.suggestOperators(operatorQuery.trim());
//         setOperatorSuggestions(Array.isArray(data) ? data : []);
//         setShowOperatorSuggest(true);
//       } catch {
//         setOperatorSuggestions([]);
//       } finally {
//         setOperatorSuggestLoading(false);
//       }
//     }, 300);

//     return () => clearTimeout(operatorDebounceRef.current);
//   }, [operatorQuery]);

//   const updateFilter = (field, value) => {
//     setFilters((current) => ({ ...current, [field]: value, page: 1 }));
//   };

//   const applyFilters = (event) => {
//     event.preventDefault();
//     const nextFilters = {
//       ...filters,
//       tripId: filters.tripId || (Number.isInteger(Number(tripQuery)) ? tripQuery : ""),
//       operatorId:
//         filters.operatorId || (Number.isInteger(Number(operatorQuery)) ? operatorQuery : ""),
//       page: 1,
//     };
//     setFilters(nextFilters);
//     loadReviews(nextFilters);
//   };

//   const selectTripSuggestion = (item) => {
//     const tripId = pick(item, ["tripID", "TripID"]);
//     const route = pick(item, ["route", "Route"], "");
//     const operatorName = pick(item, ["operatorName", "OperatorName"], "");
//     setTripQuery(`#${tripId}${route ? ` - ${route}` : ""}${operatorName ? ` (${operatorName})` : ""}`);
//     setFilters((current) => ({ ...current, tripId: String(tripId), page: 1 }));
//     setShowTripSuggest(false);
//     setTripSuggestions([]);
//   };

//   const selectOperatorSuggestion = (item) => {
//     const operatorId = pick(item, ["operatorID", "OperatorID"]);
//     const name = pick(item, ["name", "Name"], "");
//     setOperatorQuery(`#${operatorId}${name ? ` - ${name}` : ""}`);
//     setFilters((current) => ({ ...current, operatorId: String(operatorId), page: 1 }));
//     setShowOperatorSuggest(false);
//     setOperatorSuggestions([]);
//   };

//   const clearReviewFilters = () => {
//     const reset = { tripId: "", operatorId: "", page: 1, pageSize: 20 };
//     setFilters(reset);
//     setTripQuery("");
//     setOperatorQuery("");
//     setTripSuggestions([]);
//     setOperatorSuggestions([]);
//     loadReviews(reset);
//   };

//   const changePage = (page) => {
//     const nextFilters = { ...filters, page };
//     setFilters(nextFilters);
//     loadReviews(nextFilters);
//   };

//   const deleteReview = async (id) => {
//     if (!window.confirm("Xóa đánh giá này?")) return;
//     setLoading(true);
//     try {
//       await reviewApi.remove(id);
//       await loadReviews(filters);
//       setNotice({ type: "success", text: "Đã xóa đánh giá." });
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text: e.message || "Không xóa được đánh giá.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <section className="admin-card table-card">
//       <div className="admin-section-head">
//         <div>
//           <p className="eyebrow">Đánh giá</p>
//           <h3>Quản lý đánh giá nhà xe</h3>
//         </div>
//         <button
//           className="btn btn-outline"
//           type="button"
//           onClick={() => loadReviews(filters)}
//           disabled={loading}
//         >
//           Làm mới
//         </button>
//       </div>

//       {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}

//       <form className="review-filter-grid" onSubmit={applyFilters}>
//         <div className="review-suggest-wrap" ref={tripSuggestRef}>
//           <div className="payment-suggest-input-wrap">
//             <i className="fa-solid fa-route payment-suggest-icon" />
//             <input
//               type="text"
//               className="payment-suggest-input"
//               value={tripQuery}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 setTripQuery(value);
//                 updateFilter("tripId", "");
//               }}
//               onFocus={() => tripSuggestions.length > 0 && setShowTripSuggest(true)}
//               placeholder="Tìm mã chuyến hoặc tuyến..."
//               autoComplete="off"
//             />
//             {tripSuggestLoading && (
//               <i className="fa-solid fa-spinner fa-spin payment-suggest-spinner" />
//             )}
//             {tripQuery && (
//               <button
//                 type="button"
//                 className="payment-suggest-clear"
//                 onClick={() => {
//                   setTripQuery("");
//                   setTripSuggestions([]);
//                   updateFilter("tripId", "");
//                 }}
//               >
//                 <i className="fa-solid fa-xmark" />
//               </button>
//             )}
//           </div>

//           {showTripSuggest && tripSuggestions.length > 0 && (
//             <ul className="payment-suggest-dropdown">
//               {tripSuggestions.map((item) => {
//                 const tripId = pick(item, ["tripID", "TripID"]);
//                 const route = pick(item, ["route", "Route"], "Chưa rõ tuyến");
//                 const operatorName = pick(item, ["operatorName", "OperatorName"], "");
//                 const reviewCount = pick(item, ["reviewCount", "ReviewCount"], 0);
//                 return (
//                   <li
//                     key={tripId}
//                     className="payment-suggest-item review-suggest-item"
//                     onMouseDown={() => selectTripSuggestion(item)}
//                   >
//                     <span className="suggest-id">#{tripId}</span>
//                     <span className="suggest-name">{route}</span>
//                     {operatorName && <span className="suggest-route">{operatorName}</span>}
//                     <span className="suggest-amount">{reviewCount} đánh giá</span>
//                   </li>
//                 );
//               })}
//             </ul>
//           )}

//           {showTripSuggest && !tripSuggestLoading && tripSuggestions.length === 0 && tripQuery && (
//             <ul className="payment-suggest-dropdown">
//               <li className="payment-suggest-empty">Không tìm thấy chuyến có đánh giá</li>
//             </ul>
//           )}
//         </div>

//         <div className="review-suggest-wrap" ref={operatorSuggestRef}>
//           <div className="payment-suggest-input-wrap">
//             <i className="fa-solid fa-bus payment-suggest-icon" />
//             <input
//               type="text"
//               className="payment-suggest-input"
//               value={operatorQuery}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 setOperatorQuery(value);
//                 updateFilter("operatorId", "");
//               }}
//               onFocus={() => operatorSuggestions.length > 0 && setShowOperatorSuggest(true)}
//               placeholder="Tìm mã nhà xe hoặc tên nhà xe..."
//               autoComplete="off"
//             />
//             {operatorSuggestLoading && (
//               <i className="fa-solid fa-spinner fa-spin payment-suggest-spinner" />
//             )}
//             {operatorQuery && (
//               <button
//                 type="button"
//                 className="payment-suggest-clear"
//                 onClick={() => {
//                   setOperatorQuery("");
//                   setOperatorSuggestions([]);
//                   updateFilter("operatorId", "");
//                 }}
//               >
//                 <i className="fa-solid fa-xmark" />
//               </button>
//             )}
//           </div>

//           {showOperatorSuggest && operatorSuggestions.length > 0 && (
//             <ul className="payment-suggest-dropdown">
//               {operatorSuggestions.map((item) => {
//                 const operatorId = pick(item, ["operatorID", "OperatorID"]);
//                 const name = pick(item, ["name", "Name"], "Chưa rõ nhà xe");
//                 const phone = pick(item, ["contactPhone", "ContactPhone"], "");
//                 const reviewCount = pick(item, ["reviewCount", "ReviewCount"], 0);
//                 return (
//                   <li
//                     key={operatorId}
//                     className="payment-suggest-item review-suggest-item"
//                     onMouseDown={() => selectOperatorSuggestion(item)}
//                   >
//                     <span className="suggest-id">#{operatorId}</span>
//                     <span className="suggest-name">{name}</span>
//                     {phone && <span className="suggest-route">{phone}</span>}
//                     <span className="suggest-amount">{reviewCount} đánh giá</span>
//                   </li>
//                 );
//               })}
//             </ul>
//           )}

//           {showOperatorSuggest && !operatorSuggestLoading && operatorSuggestions.length === 0 && operatorQuery && (
//             <ul className="payment-suggest-dropdown">
//               <li className="payment-suggest-empty">Không tìm thấy nhà xe có đánh giá</li>
//             </ul>
//           )}
//         </div>

//         <div className="review-filter-actions">
//           <button className="btn btn-primary" type="submit" disabled={loading}>
//             <i className="fa-solid fa-filter" /> Lọc
//           </button>
//           <button className="btn btn-outline" type="button" onClick={clearReviewFilters}>
//             Xóa lọc
//           </button>
//         </div>
//       </form>

//       {loading && <div className="admin-loading">Đang tải đánh giá...</div>}

//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Đơn</th>
//               <th>Khách hàng</th>
//               <th>Tuyến</th>
//               <th>Nhà xe</th>
//               <th>Rating</th>
//               <th>Bình luận</th>
//               <th>Ngày tạo</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["reviewID", "ReviewID"]);
//               const rating = Number(pick(item, ["rating", "Rating"], 0));
//               return (
//                 <tr key={id}>
//                   <td>#{id}</td>
//                   <td>#{pick(item, ["bookingID", "BookingID"])}</td>
//                   <td>
//                     {pick(
//                       item,
//                       ["userName", "UserName", "customerName", "CustomerName"],
//                       "Chưa rõ",
//                     )}
//                   </td>
//                   <td>{pick(item, ["route", "Route"], "Chưa rõ tuyến")}</td>
//                   <td>
//                     {pick(item, ["operatorName", "OperatorName"], "Chưa rõ")}
//                   </td>
//                   <td>
//                     {"★".repeat(rating)}
//                     {"☆".repeat(Math.max(0, 5 - rating))}
//                   </td>
//                   <td>
//                     {pick(item, ["comment", "Comment"], "") ||
//                       "Không có bình luận"}
//                   </td>
//                   <td>
//                     {formatDateTime(pick(item, ["createdAt", "CreatedAt"]))}
//                   </td>
//                   <td className="admin-actions">
//                     <button
//                       className="btn btn-danger"
//                       type="button"
//                       disabled={loading}
//                       onClick={() => deleteReview(id)}
//                     >
//                       Xóa
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//             {!loading && rows.length === 0 && (
//               <tr>
//                 <td colSpan="9" className="empty-cell">
//                   Chưa có đánh giá.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       <Pagination
//         page={paging.page}
//         totalPages={paging.totalPages}
//         onPageChange={changePage}
//       />
//     </section>
//   );
// }
function ReviewsManager({ isOperator = false }) {
  const [rows, setRows]   = useState([]);
  const [stats, setStats] = useState(null); // { total, avgRating, unread, badCount }
  const [filters, setFilters] = useState(
    isOperator
      ? { fromDate: '', toDate: '', rating: '', hasReply: '', page: 1, pageSize: 20 }
      : { keyword: '', rating: '', isHidden: '', page: 1, pageSize: 20 }
  );
  const [fromDateRaw, setFromDateRaw] = useState('');
  const [toDateRaw,   setToDateRaw]   = useState('');
  const [paging, setPaging] = useState({
    totalCount: 0, page: 1, pageSize: 20, totalPages: 1,
  });
  const [loading, setLoading]       = useState(false);
  const [notice,  setNotice]        = useState(null);
  const [replyModal, setReplyModal] = useState(null);
  const [replyText,  setReplyText]  = useState('');

  // ── Load ─────────────────────────────────────────────────────
  const loadReviews = async (nextFilters = filters) => {
    setLoading(true);
    setNotice(null);
    try {
      const apiCall = isOperator ? reviewApi.listOperator : reviewApi.list;
      const data = await apiCall(cleanParams(nextFilters));
      const normalized = normalizePagedResponse(data, nextFilters.page, nextFilters.pageSize);
      setRows(normalized.items);
      setPaging(normalized);

      // Tính stats từ toàn bộ data trả về
      if (isOperator && normalized.items.length > 0) {
        const all = normalized.items;
        const avg = (all.reduce((s, i) => s + Number(pick(i, ['rating','Rating'], 0)), 0) / all.length).toFixed(1);
        setStats({
          total:     normalized.totalCount,
          avgRating: avg,
          unread:    all.filter(i => !pick(i, ['replyContent','ReplyContent'], '')).length,
          badCount:  all.filter(i => Number(pick(i, ['rating','Rating'], 0)) <= 2).length,
        });
      }
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Không tải được đánh giá.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  // ── Filter ───────────────────────────────────────────────────
  // Dùng cho select (rating, hasReply, isHidden) — tự reload ngay khi thay đổi
  const applySelectFilter = (field, value) => {
    const next = { ...filters, [field]: value, page: 1 };
    setFilters(next);
    loadReviews(next);
  };

  // Dùng cho form submit (date range + keyword)
  const applyFilters = (e) => {
    e.preventDefault();
    const next = {
      ...filters,
      ...(isOperator ? {
        fromDate: fromDateRaw ? `${fromDateRaw}T00:00:00` : '',
        toDate:   toDateRaw   ? `${toDateRaw}T23:59:59`   : '',
      } : {}),
      page: 1,
    };
    setFilters(next);
    loadReviews(next);
  };

  const clearFilters = () => {
    const reset = isOperator
      ? { fromDate: '', toDate: '', rating: '', hasReply: '', page: 1, pageSize: 20 }
      : { keyword: '', rating: '', isHidden: '', page: 1, pageSize: 20 };
    setFilters(reset);
    setFromDateRaw('');
    setToDateRaw('');
    loadReviews(reset);
  };

  const changePage = (page) => {
    const next = { ...filters, page };
    setFilters(next);
    loadReviews(next);
  };

  // ── Ẩn/Hiện — chỉ Admin ──────────────────────────────────────
  const toggleHidden = async (id, currentHidden) => {
    const action = currentHidden ? 'hiện' : 'ẩn';
    if (!window.confirm(`Xác nhận ${action} đánh giá này?`)) return;
    setLoading(true);
    try {
      await reviewApi[currentHidden ? 'show' : 'hide'](id);
      await loadReviews(filters);
      setNotice({ type: 'success', text: `Đã ${action} đánh giá.` });
    } catch (e) {
      setNotice({ type: 'error', text: e.message || `Không ${action} được.` });
    } finally {
      setLoading(false);
    }
  };

  // ── Xóa — chỉ Admin ──────────────────────────────────────────
  const deleteReview = async (id) => {
    if (!window.confirm('Xóa hẳn đánh giá này? Hành động không thể hoàn tác.')) return;
    setLoading(true);
    try {
      await reviewApi.remove(id);
      await loadReviews(filters);
      setNotice({ type: 'success', text: 'Đã xóa đánh giá.' });
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Không xóa được.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Reply ─────────────────────────────────────────────────────
  const openReply = (item) => {
    setReplyModal({ reviewId: pick(item, ['reviewID','ReviewID']) });
    setReplyText('');
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await reviewApi.reply(replyModal.reviewId, replyText.trim());
      await loadReviews(filters);
      setNotice({ type: 'success', text: 'Đã gửi phản hồi.' });
      setReplyModal(null);
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Không gửi được phản hồi.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────
  const renderStars = (rating) => (
    <span className="review-stars-display">
      {'★'.repeat(rating)}
      <span className="review-stars-empty">{'★'.repeat(5 - rating)}</span>
    </span>
  );

  const renderReplyBadge = (reply) => reply
    ? <span className="badge badge-success">Đã phản hồi</span>
    : <span className="badge badge-neutral">Chưa phản hồi</span>;

  const renderHiddenBadge = (isHidden) => isHidden
    ? <span className="badge badge-danger">Đã ẩn</span>
    : <span className="badge badge-success">Hiển thị</span>;

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Đánh giá</p>
          <h3>Quản lý đánh giá nhà xe</h3>
        </div>
        <button className="btn btn-outline" type="button"
          onClick={() => loadReviews(filters)} disabled={loading}>
          Làm mới
        </button>
      </div>

      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}

      {/* ── Thống kê — chỉ Operator ── */}
      {isOperator && stats && (
        <div className="review-stats-row">
          <div className="review-stat-card">
            <span className="review-stat-label">Tổng đánh giá</span>
            <span className="review-stat-value">{stats.total}</span>
          </div>
          <div className="review-stat-card review-stat-card--rating">
            <span className="review-stat-label">Điểm trung bình</span>
            <span className="review-stat-value review-stat-value--rating">
              {stats.avgRating} <i className="fa-solid fa-star" />
            </span>
          </div>
          <div className="review-stat-card review-stat-card--warn">
            <span className="review-stat-label">Chưa phản hồi</span>
            <span className="review-stat-value review-stat-value--danger">{stats.unread}</span>
          </div>
          <div className="review-stat-card review-stat-card--warn">
            <span className="review-stat-label">Đánh giá 1–2 sao</span>
            <span className="review-stat-value review-stat-value--danger">{stats.badCount}</span>
          </div>
        </div>
      )}

      {/* ── Bộ lọc ── */}
      <form className="payment-filter-grid" onSubmit={applyFilters}>
        {isOperator ? (
          <>
            {/* Date range */}
            <div className="payment-date-range"
            style={{display: 'none'}}>
              <label
                className={`payment-date-field ${fromDateRaw ? 'has-value' : ''}`}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <span>Từ ngày</span>
                <strong>{fromDateRaw ? formatDateLabel(fromDateRaw) : 'Chọn ngày'}</strong>
                <i className="fa-regular fa-calendar-days" />
                <input id="rv-fromDate" type="date" value={fromDateRaw}
                  max={toDateRaw || undefined}
                  onClick={(e) => e.target.showPicker?.()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFromDateRaw(v);
                    const next = {
                      ...filters,
                      fromDate: v ? `${v}T00:00:00` : '',
                      toDate: toDateRaw ? `${toDateRaw}T23:59:59` : '',
                      page: 1,
                    };
                    setFilters(next);
                    loadReviews(next);
                  }} />
              </label>
              <span className="payment-date-sep">→</span>
              <label
                className={`payment-date-field ${toDateRaw ? 'has-value' : ''}`}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <span>Đến ngày</span>
                <strong>{toDateRaw ? formatDateLabel(toDateRaw) : 'Chọn ngày'}</strong>
                <i className="fa-regular fa-calendar-days" />
                <input id="rv-toDate" type="date" value={toDateRaw}
                  min={fromDateRaw || undefined}
                  onClick={(e) => e.target.showPicker?.()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setToDateRaw(v);
                    const next = {
                      ...filters,
                      fromDate: fromDateRaw ? `${fromDateRaw}T00:00:00` : '',
                      toDate: v ? `${v}T23:59:59` : '',
                      page: 1,
                    };
                    setFilters(next);
                    loadReviews(next);
                  }} />
              </label>
            </div>

            {/* Rating */}
            <label className="payment-filter-field">
              <span>Rating</span>
              <div className="payment-filter-select-wrap">
                <i className="fa-solid fa-star" style={{ color: '#f59e0b' }} />
                <select className="payment-filter-select" value={filters.rating}
                  onChange={(e) => applySelectFilter('rating', e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                  <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                  <option value="3">⭐⭐⭐ (3 sao)</option>
                  <option value="2">⭐⭐ (2 sao)</option>
                  <option value="1">⭐ (1 sao)</option>
                </select>
                <i className="fa-solid fa-chevron-down payment-select-chevron" />
              </div>
            </label>

            {/* Phản hồi */}
            <label className="payment-filter-field">
              <span>Phản hồi</span>
              <div className="payment-filter-select-wrap">
                <i className="fa-solid fa-reply" />
                <select className="payment-filter-select" value={filters.hasReply}
                  onChange={(e) => applySelectFilter('hasReply', e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="0">Chưa phản hồi</option>
                  <option value="1">Đã phản hồi</option>
                </select>
                <i className="fa-solid fa-chevron-down payment-select-chevron" />
              </div>
            </label>
          </>
        ) : (
          <>
            {/* Admin: tìm tên/SĐT */}
            <div className="payment-suggest-input-wrap" style={{ flex: 2 }}>
              <i className="fa-solid fa-magnifying-glass payment-suggest-icon" />
              <input type="text" className="payment-suggest-input"
                placeholder="Tìm tên hoặc SĐT khách hàng..."
                value={filters.keyword}
                onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
                autoComplete="off" />
              {filters.keyword && (
                <button type="button" className="payment-suggest-clear"
                  onClick={() => setFilters((f) => ({ ...f, keyword: '' }))}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>

            {/* Admin: Rating */}
            <label className="payment-filter-field">
              <span>Rating</span>
              <div className="payment-filter-select-wrap">
                <i className="fa-solid fa-star" style={{ color: '#f59e0b' }} />
                <select className="payment-filter-select" value={filters.rating}
                  onChange={(e) => applySelectFilter('rating', e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                  <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                  <option value="3">⭐⭐⭐ (3 sao)</option>
                  <option value="2">⭐⭐ (2 sao)</option>
                  <option value="1">⭐ (1 sao)</option>
                </select>
                <i className="fa-solid fa-chevron-down payment-select-chevron" />
              </div>
            </label>

            {/* Admin: ẩn/hiện */}
            <label className="payment-filter-field">
              <span>Trạng thái</span>
              <div className="payment-filter-select-wrap">
                <i className="fa-solid fa-eye" />
                <select className="payment-filter-select" value={filters.isHidden}
                  onChange={(e) => applySelectFilter('isHidden', e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="0">Đang hiển thị</option>
                  <option value="1">Đã ẩn</option>
                </select>
                <i className="fa-solid fa-chevron-down payment-select-chevron" />
              </div>
            </label>
          </>
        )}

        <div className="payment-filter-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <i className="fa-solid fa-filter" /> Lọc
          </button>
          <button className="btn btn-outline" type="button" onClick={clearFilters}>
            Xóa lọc
          </button>
        </div>
      </form>

      {loading && <div className="admin-loading">Đang tải đánh giá...</div>}

      {/* ── Bảng ── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Đơn</th>
              <th>Khách hàng</th>
              <th>Tuyến</th>
              {!isOperator && <th>Nhà xe</th>}
              <th>Rating</th>
              <th>Bình luận</th>
              <th>Phản hồi</th>
              {!isOperator && <th>Trạng thái</th>}
              <th>Ngày đánh giá</th>
              {!isOperator && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id       = pick(item, ['reviewID','ReviewID']);
              const rating   = Number(pick(item, ['rating','Rating'], 0));
              const isHidden = Boolean(pick(item, ['isHidden','IsHidden'], false));
              const comment  = pick(item, ['comment','Comment'], '');
              const reply    = pick(item, ['replyContent','ReplyContent'], '');

              return (
                <tr key={id} style={isHidden ? { opacity: 0.5 } : {}}>
                  <td>#{pick(item, ['bookingID','BookingID'])}</td>
                  <td>
                    <strong>{pick(item, ['customerName','CustomerName'], 'Chưa rõ')}</strong>
                    <br />
                    <small>{pick(item, ['customerPhone','CustomerPhone'], '')}</small>
                  </td>
                  <td>
                    {pick(item, ['departureLocation','DepartureLocation'], '')}
                    {' → '}
                    {pick(item, ['arrivalLocation','ArrivalLocation'], '')}
                    <br />
                    <small>{formatDateTime(pick(item, ['departureTime','DepartureTime']))}</small>
                  </td>
                  {!isOperator && (
                    <td>{pick(item, ['operatorName','OperatorName'], 'Chưa rõ')}</td>
                  )}
                  <td>{renderStars(rating)}</td>
                  <td style={{ maxWidth: 200 }}>
                    <span title={comment}>
                      {comment
                        ? (comment.length > 60 ? comment.slice(0, 60) + '…' : comment)
                        : <span className="admin-muted">Không có</span>}
                    </span>
                  </td>
                  <td>
                    {renderReplyBadge(reply)}
                    {reply && (
                      <div className="review-reply-preview" title={reply}>
                        {reply.length > 40 ? reply.slice(0, 40) + '…' : reply}
                      </div>
                    )}
                    {isOperator && !reply && (
                      <button className="btn btn-outline btn-sm" style={{ marginTop: 6 }} type="button"
                        onClick={() => openReply(item)} disabled={loading}>
                        <i className="fa-solid fa-reply" /> Phản hồi
                      </button>
                    )}
                  </td>
                  {!isOperator && <td>{renderHiddenBadge(isHidden)}</td>}
                  <td>{formatDateTime(pick(item, ['createdAt','CreatedAt']))}</td>
                  {!isOperator && (
                    <td className="admin-actions">
                      <button className="btn btn-outline btn-sm" type="button"
                        onClick={() => openReply(item)} disabled={loading || !!reply}>
                        <i className="fa-solid fa-reply" />
                      </button>
                      <button
                        className={`btn btn-sm ${isHidden ? 'btn-outline' : 'btn-warning'}`}
                        type="button"
                        onClick={() => toggleHidden(id, isHidden)} disabled={loading}>
                        <i className={`fa-solid ${isHidden ? 'fa-eye' : 'fa-eye-slash'}`} />
                        {isHidden ? ' Hiện' : ' Ẩn'}
                      </button>
                      <button className="btn btn-sm btn-danger" type="button"
                        onClick={() => deleteReview(id)} disabled={loading}>
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={isOperator ? 7 : 10} className="empty-cell">
                  Chưa có đánh giá.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={paging.page} totalPages={paging.totalPages} onPageChange={changePage} />

      {/* ── Modal phản hồi ── */}
      {replyModal && (
        <div className="modal-overlay" onClick={() => setReplyModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h4>Phản hồi đánh giá #{replyModal.reviewId}</h4>
              <button type="button" className="modal-close"
                onClick={() => setReplyModal(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="modal-body">
              <textarea className="form-control" rows={4}
                placeholder="Nhập nội dung phản hồi..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button"
                onClick={() => setReplyModal(null)}>Hủy</button>
              <button className="btn btn-primary" type="button"
                onClick={submitReply}
                disabled={loading || !replyText.trim()}>
                <i className="fa-solid fa-paper-plane" /> Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
// ==================== PROMOTIONS ====================
function PromotionsManager() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_PROMOTION);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadPromotions = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await promotionApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không tải được mã giảm giá.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const editPromotion = (item) => {
    setForm({
      promotionID: pick(item, ["promotionID", "PromotionID"]),
      code: pick(item, ["code", "Code"], ""),
      description: pick(item, ["description", "Description"], ""),
      discountType: Number(pick(item, ["discountType", "DiscountType"], 1)),
      discountValue: pick(item, ["discountValue", "DiscountValue"], ""),
      minOrderValue: pick(item, ["minOrderValue", "MinOrderValue"], ""),
      maxDiscount: pick(item, ["maxDiscount", "MaxDiscount"], ""),
      usageLimit: pick(item, ["usageLimit", "UsageLimit"], ""),
      startDate: dateOnly(pick(item, ["startDate", "StartDate"])),
      endDate: dateOnly(pick(item, ["endDate", "EndDate"])),
      isActive: Boolean(pick(item, ["isActive", "IsActive"], true)),
      isPublic: Boolean(pick(item, ["isPublic", "IsPublic"], true)),
      userID: pick(item, ["userID", "UserID"], ""),
    });
    setShowForm(true);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice(null);
    const payload = {
      code: form.code,
      description: form.description,
      discountType: Number(form.discountType),
      discountValue: Number(form.discountValue || 0),
      minOrderValue:
        form.minOrderValue === "" ? null : Number(form.minOrderValue),
      maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
      usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: Boolean(form.isActive),
      isPublic: Boolean(form.isPublic),
      userID: form.isPublic || form.userID === "" ? null : Number(form.userID),
    };

    try {
      if (form.promotionID) {
        await promotionApi.update(form.promotionID, payload);
      } else {
        await promotionApi.create(payload);
      }
      setForm(EMPTY_PROMOTION);
      setShowForm(false);
      await loadPromotions();
      setNotice({ type: "success", text: "Đã lưu mã giảm giá." });
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không lưu được mã giảm giá.",
      });
    } finally {
      setLoading(false);
    }
  };

  const disablePromotion = async (id) => {
    if (!window.confirm("Tắt mã giảm giá này?")) return;
    setLoading(true);
    try {
      await promotionApi.disable(id);
      await loadPromotions();
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không tắt được mã giảm giá.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader
        title="Quản lý khuyến mãi"
        showForm={showForm}
        onToggle={() =>
          toggleCreateForm(showForm, setShowForm, setForm, EMPTY_PROMOTION)
        }
      />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <AdminFormModal
          title={form.promotionID ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
          onClose={() => cancelForm(setShowForm, setForm, EMPTY_PROMOTION)}
        >
          <form className="promo-form-grid" onSubmit={submitForm}>
            {/* Mã giảm giá */}
            <label className="form-field form-field--full">
              <span>Mã giảm giá *</span>
              <input
                value={form.code}
                onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
                placeholder="VD: SUMMER20, GIAM50K"
                required
              />
            </label>

            {/* Mô tả */}
            <label className="form-field form-field--full">
              <span>Mô tả (hiển thị cho khách)</span>
              <textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                placeholder="VD: Giảm 20% tối đa 50.000đ cho đơn từ 200.000đ"
                rows="2"
              />
            </label>

            {/* Loại + Giá trị */}
            <label className="form-field">
              <span>Loại giảm giá</span>
              <select
                value={form.discountType}
                onChange={(e) => updateForm("discountType", e.target.value)}
              >
                <option value="1">Phần trăm (%)</option>
                <option value="2">Số tiền cố định (đ)</option>
              </select>
            </label>
            <label className="form-field">
              <span>Giá trị giảm {Number(form.discountType) === 1 ? "(%)" : "(đ)"} *</span>
              <input
                type="number"
                min="0"
                max={Number(form.discountType) === 1 ? 100 : undefined}
                value={form.discountValue}
                onChange={(e) => updateForm("discountValue", e.target.value)}
                placeholder={Number(form.discountType) === 1 ? "VD: 20" : "VD: 50000"}
                required
              />
            </label>

            {/* Đơn tối thiểu + Giảm tối đa */}
            <label className="form-field">
              <span>Đơn tối thiểu (đ)</span>
              <input
                type="number"
                min="0"
                value={form.minOrderValue}
                onChange={(e) => updateForm("minOrderValue", e.target.value)}
                placeholder="Bỏ trống = không giới hạn"
              />
            </label>
            <label className="form-field">
              <span>Giảm tối đa (đ){Number(form.discountType) === 2 ? " — không cần thiết" : ""}</span>
              <input
                type="number"
                min="0"
                value={form.maxDiscount}
                onChange={(e) => updateForm("maxDiscount", e.target.value)}
                placeholder="Bỏ trống = không giới hạn"
                disabled={Number(form.discountType) === 2}
              />
            </label>

            {/* Giới hạn lượt dùng */}
            <label className="form-field">
              <span>Giới hạn lượt dùng</span>
              <input
                type="number"
                min="1"
                value={form.usageLimit}
                onChange={(e) => updateForm("usageLimit", e.target.value)}
                placeholder="Bỏ trống = không giới hạn"
              />
            </label>
            <div className="form-field" />

            {/* Ngày bắt đầu + kết thúc */}
            <label className={`form-field admin-date-input ${form.startDate ? "has-value" : ""}`}>
              <span>Ngày bắt đầu *</span>
              <strong>
                {form.startDate
                  ? new Date(form.startDate).toLocaleDateString("vi-VN")
                  : "Chọn ngày"}
              </strong>
              <i className="fa-regular fa-calendar-days" />
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateForm("startDate", e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                required
              />
            </label>
            <label className={`form-field admin-date-input ${form.endDate ? "has-value" : ""}`}>
              <span>Ngày kết thúc *</span>
              <strong>
                {form.endDate
                  ? new Date(form.endDate).toLocaleDateString("vi-VN")
                  : "Chọn ngày"}
              </strong>
              <i className="fa-regular fa-calendar-days" />
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => updateForm("endDate", e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                required
              />
            </label>

            {/* Toggles */}
            <div className="form-toggle-row">
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateForm("isActive", e.target.checked)}
                />
                <span className="form-toggle-track" />
                <span className="form-toggle-label">Đang bật</span>
              </label>
              <label className="form-toggle">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => updateForm("isPublic", e.target.checked)}
                />
                <span className="form-toggle-track" />
                <span className="form-toggle-label">Công khai</span>
              </label>
            </div>

            {/* UserID nếu không public */}
            {!form.isPublic && (
              <label className="form-field form-field--full">
                <span>UserID áp dụng (mã dành riêng cho người dùng cụ thể)</span>
                <input
                  type="number"
                  value={form.userID}
                  onChange={(e) => updateForm("userID", e.target.value)}
                  placeholder="Nhập UserID của người dùng"
                />
              </label>
            )}

            <div className="admin-form-actions">
              <button className="btn btn-primary" disabled={loading}>
                Lưu
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => cancelForm(setShowForm, setForm, EMPTY_PROMOTION)}
              >
                Hủy
              </button>
            </div>
          </form>
        </AdminFormModal>
      )}
      {loading && <div className="admin-loading">Đang tải mã giảm giá...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Mô tả</th>
              <th>Loại</th>
              <th>Giá trị</th>
              <th>Đơn tối thiểu</th>
              <th>Giảm tối đa</th>
              <th>Lượt dùng</th>
              <th>Thời hạn</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["promotionID", "PromotionID"]);
              const active = Boolean(
                pick(item, ["isActive", "IsActive"], false),
              );
              return (
                <tr key={id}>
                  <td>
                    <b>{pick(item, ["code", "Code"])}</b>
                  </td>
                  <td>
                    {pick(item, ["description", "Description"], "") ||
                      "Chưa có"}
                  </td>
                  <td>
                    {Number(pick(item, ["discountType", "DiscountType"], 1)) ===
                    1
                      ? "Phần trăm"
                      : "Cố định"}
                  </td>
                  <td>{pick(item, ["discountValue", "DiscountValue"], 0)}</td>
                  <td>
                    {formatVND(
                      pick(item, ["minOrderValue", "MinOrderValue"], 0),
                    )}
                  </td>
                  <td>
                    {formatVND(pick(item, ["maxDiscount", "MaxDiscount"], 0))}
                  </td>
                  <td>
                    {pick(item, ["usedCount", "UsedCount"], 0)} /{" "}
                    {pick(item, ["usageLimit", "UsageLimit"], "∞")}
                  </td>
                  <td>
                    {dateOnly(pick(item, ["startDate", "StartDate"]))} -{" "}
                    {dateOnly(pick(item, ["endDate", "EndDate"]))}
                  </td>
                  <td>
                    <span className="badge">
                      {active ? "Đang bật" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="admin-actions">
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => editPromotion(item)}
                    >
                      Sửa
                    </button>
                    {active && (
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() => disablePromotion(id)}
                      >
                        Tắt
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="10" className="empty-cell">
                  Chưa có mã giảm giá.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ==================== TICKETS ====================
// function TicketsManager({ ticketSeats }) {
//   const { search, setSearch, filtered } = useSearch(ticketSeats, ['customerName', 'CustomerName', 'seatLabel', 'SeatLabel']);
//   const { page, setPage, totalPages, rows } = usePagination(filtered);
//   return (
//     <section className="admin-card table-card">
//       <h3>Quản lý vé</h3>
//       <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên khách, ghế..." />
//       <div className="table-wrap">
//         <table>
//           <thead><tr><th>ID vé</th><th>ID đơn</th><th>Ghế</th><th>Khách hàng</th><th>SĐT</th><th>Tuyến</th><th>Thanh toán</th><th>Ngày đặt</th></tr></thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["ticketSeatID", "TicketSeatID"]);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>{pick(item, ["bookingID", "BookingID"])}</td>
//                   <td>{pick(item, ["seatLabel", "SeatLabel"])}</td>
//                   <td>{pick(item, ["customerName", "CustomerName"]) || "Chưa rõ"}</td>
//                   <td>{pick(item, ["customerPhone", "CustomerPhone"]) || "Chưa rõ"}</td>
//                   <td>{pick(item, ["route", "Route"]) || "Chưa rõ tuyến"}</td>
//                   <td><span className="badge">{getPaymentStatus(item)}</span></td>
//                   <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// function TicketsManager({ ticketSeats, trips, operators }) {
//   const [filterSeat, setFilterSeat] = useState('');
//   const [filterRoute, setFilterRoute] = useState('');
//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterOperator, setFilterOperator] = useState('');
//   const [filterDate, setFilterDate] = useState('');

//   const filtered = useMemo(() => ticketSeats.filter(item => {
//     const seat = pick(item, ['seatLabel', 'SeatLabel'], '');
//     const route = pick(item, ['route', 'Route'], '');
//     const status = getPaymentStatus(item);
//     const date = pick(item, ['bookingDate', 'BookingDate'], '');
//     const customer = pick(item, ['customerName', 'CustomerName'], '');
//     const phone = pick(item, ['customerPhone', 'CustomerPhone'], '');

//     return (!filterSeat || includesText(seat, filterSeat) || includesText(customer, filterSeat) || includesText(phone, filterSeat)) &&
//       (!filterRoute || includesText(route, filterRoute)) &&
//       (!filterStatus || status === filterStatus) &&
//       (!filterDate || (date && dateOnly(date) === filterDate));
//   }), [ticketSeats, filterSeat, filterRoute, filterStatus, filterDate]);

//   const { page, setPage, totalPages, rows } = usePagination(filtered);

//   return (
//     <section className="admin-card table-card">
//       <h3>Quản lý vé</h3>

//       {/* Bộ lọc */}
//       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
//         <input value={filterSeat} onChange={e => { setFilterSeat(e.target.value); setPage(1); }}
//           placeholder="Tìm ghế, tên, SĐT..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 150 }} />
//         <input value={filterRoute} onChange={e => { setFilterRoute(e.target.value); setPage(1); }}
//           placeholder="Tìm tuyến..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 150 }} />
//         <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
//           style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
//           <option value="">Tất cả trạng thái</option>
//           <option value="Pending">Pending</option>
//           <option value="Paid">Paid</option>
//           <option value="Cancelled">Cancelled</option>
//         </select>
//         <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }}
//           style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }} />
//         <button className="btn btn-outline" onClick={() => { setFilterSeat(''); setFilterRoute(''); setFilterStatus(''); setFilterDate(''); setPage(1); }}>
//           Xóa lọc
//         </button>
//       </div>

//       <p style={{ color: '#666', marginBottom: 8 }}>Tìm thấy <b>{filtered.length}</b> vé</p>

//       <div className="table-wrap">
//         <table>
//           <thead><tr><th>ID vé</th><th>ID đơn</th><th>Ghế</th><th>Khách hàng</th><th>SĐT</th><th>Tuyến</th><th>Thanh toán</th><th>Ngày đặt</th></tr></thead>
//           <tbody>
//             {rows.map(item => {
//               const id = pick(item, ["ticketSeatID", "TicketSeatID"]);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>{pick(item, ["bookingID", "BookingID"])}</td>
//                   <td><b>{pick(item, ["seatLabel", "SeatLabel"])}</b></td>
//                   <td>{pick(item, ["customerName", "CustomerName"]) || "Chưa rõ"}</td>
//                   <td>{pick(item, ["customerPhone", "CustomerPhone"]) || "Chưa rõ"}</td>
//                   <td>{pick(item, ["route", "Route"]) || "Chưa rõ tuyến"}</td>
//                   <td><span className="badge">{getPaymentStatus(item)}</span></td>
//                   <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// ==================== TRANSACTIONS ====================
function TransactionsManager({ transactions }) {
  const { search, setSearch, filtered } = useSearch(transactions, [
    "customerName",
    "CustomerName",
    "paymentMethod",
    "PaymentMethod",
    "paymentStatus",
    "PaymentStatus",
  ]);
  const { page, setPage, totalPages, rows } = usePagination(filtered);
  return (
    <section className="admin-card table-card">
      <h3>Quản lý giao dịch</h3>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Tìm khách, trạng thái..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã GD</th>
              <th>Khách hàng</th>
              <th>Tuyến</th>
              <th>Phương thức</th>
              <th>Trạng thái</th>
              <th>Số ghế</th>
              <th>Tổng tiền</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["id", "Id", "bookingID", "BookingID"]);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{pick(item, ["customerName", "CustomerName"])}</td>
                  <td>{pick(item, ["route", "Route"]) || "Chưa rõ tuyến"}</td>
                  <td>
                    {labelPaymentMethod(
                      pick(item, ["paymentMethod", "PaymentMethod"], "Chưa rõ"),
                    )}
                  </td>
                  {/* <td>
                    <span className="badge">{getPaymentStatus(item)}</span>
                  </td> */}
                  <td>
                    {(() => {
                      const bs = Number(pick(item, ["bookingStatus", "BookingStatus"], 0));
                      const map = {
                        0: { label: 'Chờ thanh toán',  bg: '#fef9c3', color: '#854d0e' },
                        1: { label: '✓ Đã thanh toán', bg: '#dcfce7', color: '#166534' },
                        2: { label: 'Đã hủy',          bg: '#fee2e2', color: '#991b1b' },
                        3: { label: '✓ Đã thanh toán', bg: '#dcfce7', color: '#166534' },
                        4: { label: 'Đã hoàn tiền',    bg: '#ede9fe', color: '#6b21a8' },
                        5: { label: 'Chờ thanh toán',  bg: '#fef9c3', color: '#854d0e' },
                        6: { label: 'Chờ thanh toán',  bg: '#fef9c3', color: '#854d0e' },
                      };
                      const cfg = map[bs] ?? { label: 'Chưa rõ', bg: '#f3f4f6', color: '#6b7280' };
                      return (
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontWeight: 600, borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{pick(item, ["totalSeats", "TotalSeats"], 0)}</td>
                  <td>
                    {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
                  </td>
                  <td>
                    {formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

// ==================== BUSES ====================
function BusesManager({ operators: initialOperators = [], onRefresh, isOperator = false, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [operators, setOperators] = useState(initialOperators);
  const [meta, setMeta] = useState({
    totalCount: 0,
    page: 1,
    pageSize: ADMIN_CRUD_PAGE_SIZE,
    totalPages: 1,
  });
  const [form, setForm] = useState(EMPTY_BUS);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    licensePlate: "",
    operatorId: "",
    fromDate: "",
    toDate: "",
    tripFilter: "",
  });
  // ── Image modal ──────────────────────────────────────────────
  const [imgModal, setImgModal] = useState(null); // { busId, licensePlate, images: [] }
  const [imgLoading, setImgLoading] = useState(false);
  // === URL MODE ===
  const [urlInput, setUrlInput] = useState("");
  // === UPLOAD MODE — bỏ comment 3 dòng dưới + xóa dòng urlInput trên khi đổi lại upload ===
  // const [pendingFiles, setPendingFiles] = useState([]);
  // const [pendingAvatar, setPendingAvatar] = useState(null);
  // const fileInputRef = useRef(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadBuses = async () => {
    setLoading(true);
    try {
      const data = await busApi.list(
        cleanParams({
          licensePlate: filters.licensePlate,
          operatorId: isOperator ? "" : filters.operatorId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          tripFilter: filters.tripFilter,
          page,
          pageSize: ADMIN_CRUD_PAGE_SIZE,
        }),
      );
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items);
      setMeta(paged);
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không tải được danh sách xe.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuses();
  }, [page, filters.licensePlate, filters.operatorId, filters.fromDate, filters.toDate, filters.tripFilter, isOperator, refreshKey]);

  useEffect(() => {
    const loadOperators = async () => {
      if (isOperator) return;
      if (initialOperators.length > 0) {
        setOperators(initialOperators);
        return;
      }
      try {
        const data = await operatorApi.list({ page: 1, pageSize: 100 });
        setOperators(normalizePagedResponse(data, 1, 100).items);
      } catch {
        setOperators([]);
      }
    };
    loadOperators();
  }, [initialOperators, isOperator]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const payload = {
        busID: form.busID || 0,
        operatorID: Number(form.operatorID || 0),
        licensePlate: form.licensePlate.trim(),
        capacity: Number(form.capacity || 0),
        busType: form.busType.trim(),
      };
      if (
        !payload.licensePlate ||
        !payload.capacity ||
        !payload.busType
      )
        throw new Error("Vui lòng nhập đủ thông tin xe.");
      if (form.busID) await busApi.update(form.busID, payload);
      else await busApi.create(payload);
      setNotice({
        type: "success",
        text: form.busID ? "Cập nhật xe thành công." : "Thêm xe thành công.",
      });
      setForm(EMPTY_BUS);
      setShowForm(false);
      await loadBuses();
      await onRefresh?.();
    } catch (e2) {
      setNotice({ type: "error", text: e2.message || "Không lưu được xe." });
    }
  };

  const editItem = (item) => {
    setForm({
      busID: pick(item, ["busID", "BusID"]),
      operatorID: pick(item, ["operatorID", "OperatorID"]),
      licensePlate: pick(item, ["licensePlate", "LicensePlate"], ""),
      capacity: pick(item, ["capacity", "Capacity"], ""),
      busType: pick(item, ["busType", "BusType"], ""),
    });
    setShowForm(true);
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa xe #${id}?`)) return;
    setNotice(null);
    try {
      await busApi.remove(id);
      setNotice({ type: "success", text: "Xóa xe thành công." });
      await loadBuses();
      await onRefresh?.();
    } catch (e) {
      setNotice({
        type: "error",
        text:
          e.message ||
          "Không xóa được xe. Có thể xe đang được dùng trong chuyến.",
      });
    }
  };

  // ── Image handlers ───────────────────────────────────────────
  const openImgModal = async (item) => {
    const busId = pick(item, ["busID", "BusID"]);
    const licensePlate = pick(item, ["licensePlate", "LicensePlate"], `Xe #${busId}`);
    // === URL MODE ===
    // setUrlInput("");
    // === UPLOAD MODE — thay dòng trên bằng 3 dòng dưới khi đổi lại upload ===
    setPendingFiles([]);
    setPendingAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImgLoading(true);
    setImgModal({ busId, licensePlate, images: [] });
    try {
      const imgs = await busApi.getImages(busId);
      setImgModal({ busId, licensePlate, images: Array.isArray(imgs) ? imgs : [] });
    } catch {
      setImgModal({ busId, licensePlate, images: [] });
    } finally {
      setImgLoading(false);
    }
  };

  // === URL MODE ===
  // const closeImgModal = () => {
  //   setUrlInput("");
  //   setImgModal(null);
  // };

  // const saveUrl = async () => {
  //   if (!urlInput.trim() || !imgModal) return;
  //   setImgLoading(true);
  //   try {
  //     const isFirst = imgModal.images.length === 0;
  //     await busApi.addImage({
  //       BusID: imgModal.busId,
  //       ImageURL: urlInput.trim(),
  //       IsAvatar: isFirst,
  //       SortOrder: imgModal.images.length,
  //     });
  //     setUrlInput("");
  //     const imgs = await busApi.getImages(imgModal.busId);
  //     setImgModal((m) => ({ ...m, images: Array.isArray(imgs) ? imgs : [] }));
  //   } catch (e) {
  //     alert(e.message || "Không lưu được ảnh.");
  //   } finally {
  //     setImgLoading(false);
  //   }
  // };
  // === UPLOAD MODE — bỏ comment khối dưới + sửa closeImgModal + xóa saveUrl khi đổi lại upload ===
  const closeImgModal = () => {
    pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingFiles([]);
    setPendingAvatar(null);
    setImgModal(null);
  };
  const addPendingFiles = (files) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      key: `${file.name}_${file.size}_${Math.random()}`,
    }));
    setPendingFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const removePending = (key) => {
    if (pendingAvatar === key) setPendingAvatar(null);
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  };
  const saveImages = async () => {
    if (pendingFiles.length === 0 || !imgModal) return;
    setImgLoading(true);
    try {
      let avatarImageId = null;
      for (const p of pendingFiles) {
        const result = await busApi.uploadImage(imgModal.busId, p.file);
        if (p.key === pendingAvatar) {
          avatarImageId = result?.imageID ?? result?.ImageID;
        }
      }
      if (avatarImageId) await busApi.setAvatar(avatarImageId);
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingFiles([]);
      setPendingAvatar(null);
      const imgs = await busApi.getImages(imgModal.busId);
      setImgModal((m) => ({ ...m, images: Array.isArray(imgs) ? imgs : [] }));
    } catch (e) {
      alert(e.message || "Không upload được ảnh.");
    } finally {
      setImgLoading(false);
    }
  };

  const setAvatarImg = async (imageId) => {
    if (!imgModal) return;
    setImgLoading(true);
    try {
      await busApi.setAvatar(imageId);
      const imgs = await busApi.getImages(imgModal.busId);
      setImgModal((m) => ({ ...m, images: Array.isArray(imgs) ? imgs : [] }));
    } catch (e) {
      alert(e.message || "Không đặt được ảnh đại diện.");
    } finally {
      setImgLoading(false);
    }
  };

  const deleteImg = async (imageId) => {
    if (!confirm("Xóa ảnh này?") || !imgModal) return;
    setImgLoading(true);
    try {
      await busApi.removeImage(imageId);
      setImgModal((m) => ({ ...m, images: m.images.filter((i) => (i.imageID ?? i.ImageID) !== imageId) }));
    } catch (e) {
      alert(e.message || "Không xóa được ảnh.");
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader
        title="Quản lý xe"
        showForm={showForm}
        onToggle={() =>
          toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BUS)
        }
      />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <AdminFormModal
          title={form.busID ? "Sửa xe" : "Thêm xe"}
          onClose={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}
        >
          <form className="admin-form-grid" onSubmit={submit}>
            {!isOperator && (
              <select
                value={form.operatorID}
                onChange={(e) => setForm({ ...form, operatorID: e.target.value })}
                required
              >
                <option value="">Chọn nhà xe</option>
                {operators.map((o) => (
                  <option
                    key={pick(o, ["operatorID", "OperatorID"])}
                    value={pick(o, ["operatorID", "OperatorID"])}
                  >
                    {pick(o, ["name", "Name"])}
                  </option>
                ))}
              </select>
            )}
            <input
              value={form.licensePlate}
              onChange={(e) =>
                setForm({ ...form, licensePlate: e.target.value })
              }
              placeholder="Biển số"
              required
            />
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="Sức chứa"
              required
            />
            <input
              value={form.busType}
              onChange={(e) => setForm({ ...form, busType: e.target.value })}
              placeholder="Loại xe"
              required
            />
            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit">
                {form.busID ? "Cập nhật" : "Lưu xe"}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}
              >
                Hủy
              </button>
            </div>
          </form>
        </AdminFormModal>
      )}
      <div className="admin-filter-grid bus-filter-grid" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input
          value={filters.licensePlate}
          onChange={(e) => updateFilter("licensePlate", e.target.value)}
          placeholder="Tìm biển số"
          style={{ flex: "1 1 160px", minWidth: 140 }}
        />
        {!isOperator && (
          <select
            value={filters.operatorId}
            onChange={(e) => updateFilter("operatorId", e.target.value)}
            style={{ flex: "1 1 160px", minWidth: 140 }}
          >
            <option value="">Tất cả nhà xe</option>
            {operators.map((o) => {
              const id = pick(o, ["operatorID", "OperatorID"]);
              return (
                <option key={id} value={id}>
                  {pick(o, ["name", "Name"])}
                </option>
              );
            })}
          </select>
        )}
        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => updateFilter("fromDate", e.target.value)}
          style={{ colorScheme: "light", flex: "1 1 140px", minWidth: 130 }}
        />
        <input
          type="date"
          value={filters.toDate}
          min={filters.fromDate}
          onChange={(e) => updateFilter("toDate", e.target.value)}
          style={{ colorScheme: "light", flex: "1 1 140px", minWidth: 130 }}
        />
        <select
          value={filters.tripFilter}
          onChange={(e) => updateFilter("tripFilter", e.target.value)}
          style={{ flex: "1 1 180px", minWidth: 170 }}
        >
          <option value="">Tất cả trạng thái chuyến</option>
          <option value="has_trip">Có chuyến trong khoảng</option>
          <option value="no_trip">Không có chuyến</option>
        </select>
        {(filters.fromDate || filters.toDate || filters.tripFilter) && (
          <button
            className="btn btn-outline"
            onClick={() => {
              setFilters((f) => ({ ...f, fromDate: "", toDate: "", tripFilter: "" }));
              setPage(1);
            }}
            style={{ height: 36, fontSize: 13 }}
          >
            Xóa lọc ngày
          </button>
        )}
      </div>
      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              {!isOperator && <th>Nhà xe</th>}
              <th>Biển số</th>
              <th>Loại xe</th>
              <th>Sức chứa</th>
              <th>Trạng thái</th>
              <th style={{ width: "1%", whiteSpace: "nowrap" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["busID", "BusID"]);
              const busStatus = pick(item, ["busStatus", "BusStatus"], "idle");
              const hasRange = !!(filters.fromDate && filters.toDate);
              const hasTripInRange = pick(item, ["hasTripInRange", "HasTripInRange"]);
              const tripCount = pick(item, ["tripCountInRange", "TripCountInRange"]);
              const statusBadge =
                busStatus === "ongoing"
                  ? { label: "Đang chạy", cls: "bus-status-ongoing" }
                  : busStatus === "scheduled"
                  ? { label: "Sắp chạy", cls: "bus-status-scheduled" }
                  : { label: "Đang dừng", cls: "bus-status-idle" };
              return (
                <tr key={id}>
                  <td>{id}</td>
                  {!isOperator && (
                    <td>
                      {pick(item, ["operatorName", "OperatorName"]) ||
                        findOperatorName(
                          operators,
                          pick(item, ["operatorID", "OperatorID"]),
                        )}
                    </td>
                  )}
                  <td>{pick(item, ["licensePlate", "LicensePlate"])}</td>
                  <td>{pick(item, ["busType", "BusType"])}</td>
                  <td>{pick(item, ["capacity", "Capacity"])}</td>
                  <td>
                    <span className={`bus-status-badge ${statusBadge.cls}`}>
                      {statusBadge.label}
                    </span>
                    {hasRange && (
                      <span
                        className="bus-status-badge"
                        style={{
                          marginLeft: 6,
                          background: hasTripInRange ? "#dcfce7" : "#f1f5f9",
                          color: hasTripInRange ? "#15803d" : "#64748b",
                          border: `1px solid ${hasTripInRange ? "#86efac" : "#cbd5e1"}`,
                        }}
                      >
                        {hasTripInRange ? `${tripCount} chuyến` : "Không có chuyến"}
                      </span>
                    )}
                  </td>
                  <td className="admin-actions" style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => openImgModal(item)}
                      title="Quản lý ảnh xe"
                    >
                      <i className="fa-solid fa-images" /> Ảnh
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => editItem(item)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => removeItem(id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={isOperator ? 6 : 7} className="empty-cell">
                  Không có xe phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        page={meta.page}
        totalPages={meta.totalPages}
        totalCount={meta.totalCount}
        onPageChange={setPage}
      />

      {/* ── Modal quản lý ảnh xe ── */}
      {imgModal && createPortal(
        <div className="modal-overlay" onClick={closeImgModal}>
          <div className="modal-box bus-img-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-images" /> Ảnh xe — {imgModal.licensePlate}</h3>
              <button className="modal-close" onClick={closeImgModal}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* === URL MODE === */}
            {/* <div className="bus-img-add-row">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Nhập URL ảnh (https://...)"
                style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                disabled={imgLoading}
                onKeyDown={(e) => e.key === "Enter" && saveUrl()}
              />
              <button
                className="btn btn-primary"
                onClick={saveUrl}
                disabled={imgLoading || !urlInput.trim()}
              >
                <i className="fa-solid fa-plus" /> Thêm ảnh
              </button>
            </div> */}
            {/* === UPLOAD MODE — thay khối trên bằng khối dưới khi đổi lại upload === */}
            <div className="bus-img-add-row">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                multiple style={{ display: "none" }} onChange={(e) => addPendingFiles(e.target.files)} />
              <button className="btn btn-primary bus-img-upload-btn"
                onClick={() => fileInputRef.current?.click()} disabled={imgLoading}>
                <i className="fa-solid fa-plus" /> Thêm ảnh
              </button>
              <span className="bus-img-hint">JPG, PNG, WEBP, GIF · tối đa 5MB</span>
            </div>
            {/* === END UPLOAD MODE === */}

            {/* Ảnh đã lưu */}
            {imgLoading && <div className="admin-loading">Đang tải...</div>}
            {/* {!imgLoading && imgModal.images.length === 0 && ( */}
            {!imgLoading && imgModal.images.length === 0 && pendingFiles.length === 0 && (
              <div className="bus-img-empty">Chưa có ảnh nào. Nhập URL ảnh và nhấn "Thêm ảnh".</div>
            )}
            {imgModal.images.length > 0 && (
              <div className="bus-img-grid">
                {imgModal.images.map((img) => {
                  const imgId  = img.imageID  ?? img.ImageID;
                  const rawUrl = img.imageURL ?? img.ImageURL ?? "";
                  const url    = rawUrl.startsWith("/") ? `http://localhost:5001${rawUrl}` : rawUrl;
                  const isAvatar = img.isAvatar ?? img.IsAvatar ?? false;
                  return (
                    <div key={imgId} className={`bus-img-card${isAvatar ? " bus-img-card--avatar" : ""}`}>
                      <img src={url} alt="" onError={(e) => { e.target.src = ""; e.target.style.display = "none"; }} />
                      {isAvatar && <span className="bus-img-avatar-badge"><i className="fa-solid fa-star" /> Đại diện</span>}
                      <div className="bus-img-actions">
                        {isAvatar ? (
                          <button className="btn btn-outline btn-xs" disabled style={{ opacity: 0.5, cursor: "default" }} title="Ảnh này đã là đại diện">
                            <i className="fa-solid fa-check" /> Đại diện
                          </button>
                        ) : (
                          <button className="btn btn-outline btn-xs" onClick={() => setAvatarImg(imgId)} disabled={imgLoading}>
                            Đặt đại diện
                          </button>
                        )}
                        <button className="btn btn-danger btn-xs" onClick={() => deleteImg(imgId)} disabled={imgLoading}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === UPLOAD MODE — bỏ comment khối dưới khi đổi lại upload === */}
            {pendingFiles.length > 0 && (
              <>
                <div className="bus-img-pending-label">
                  <i className="fa-solid fa-clock" /> {pendingFiles.length} ảnh chờ lưu
                </div>
                <div className="bus-img-grid">
                  {pendingFiles.map((p) => {
                    const isPA = pendingAvatar === p.key;
                    return (
                      <div key={p.key} className={`bus-img-card bus-img-card--pending${isPA ? " bus-img-card--avatar" : ""}`}>
                        <img src={p.previewUrl} alt="" />
                        {isPA && <span className="bus-img-avatar-badge"><i className="fa-solid fa-star" /> Đại diện</span>}
                        <div className="bus-img-actions">
                          {isPA ? (
                            <button className="btn btn-outline btn-xs" disabled style={{ opacity: 0.5, cursor: "default" }}>
                              <i className="fa-solid fa-check" /> Đại diện
                            </button>
                          ) : (
                            <button className="btn btn-outline btn-xs" onClick={() => setPendingAvatar(p.key)}>
                              Đặt đại diện
                            </button>
                          )}
                          <button className="btn btn-danger btn-xs" onClick={() => removePending(p.key)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {/* === END UPLOAD MODE === */}

            {/* Footer */}
            <div className="bus-img-footer">
              <button className="btn btn-outline" onClick={closeImgModal} disabled={imgLoading}>
                Đóng
              </button>
              {/* === UPLOAD MODE — thay Đóng+Lưu khi đổi lại upload === */}
              <button className="btn btn-primary" onClick={saveImages}
                disabled={imgLoading || pendingFiles.length === 0}>
                {imgLoading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang lưu...</>
                  : <><i className="fa-solid fa-floppy-disk" /> Lưu {pendingFiles.length > 0 ? `(${pendingFiles.length} ảnh)` : ""}</>}
              </button>
              {/* === END UPLOAD MODE === */}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

// ==================== OPERATORS ====================
// function OperatorsManager({ onRefresh }) {
//   const [rows, setRows] = useState([]);
//   const [meta, setMeta] = useState({
//     totalCount: 0,
//     page: 1,
//     pageSize: ADMIN_CRUD_PAGE_SIZE,
//     totalPages: 1,
//   });
//   const [form, setForm] = useState(EMPTY_OPERATOR);
//   const [showForm, setShowForm] = useState(false);
//   const [filters, setFilters] = useState({ name: "", phone: "", email: "" });
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [notice, setNotice] = useState(null);

//   const loadOperators = async () => {
//     setLoading(true);
//     try {
//       const data = await operatorApi.list(
//         cleanParams({ ...filters, page, pageSize: ADMIN_CRUD_PAGE_SIZE }),
//       );
//       const paged = normalizePagedResponse(data, page);
//       setRows(paged.items);
//       setMeta(paged);
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text: e.message || "Không tải được danh sách nhà xe.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadOperators();
//   }, [page, filters.name, filters.phone, filters.email]);

//   const updateFilter = (field, value) => {
//     setFilters((current) => ({ ...current, [field]: value }));
//     setPage(1);
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     setNotice(null);
//     try {
//       const payload = {
//         operatorID: form.operatorID || 0,
//         name: form.name.trim(),
//         description: form.description.trim(),
//         contactPhone: form.contactPhone.trim(),
//         email: form.email.trim(),
//       };
//       if (!payload.name || !payload.contactPhone)
//         throw new Error("Vui lòng nhập tên và số điện thoại nhà xe.");
//       if (form.operatorID) await operatorApi.update(form.operatorID, payload);
//       else await operatorApi.create(payload);
//       setNotice({
//         type: "success",
//         text: form.operatorID
//           ? "Cập nhật nhà xe thành công."
//           : "Thêm nhà xe thành công.",
//       });
//       setForm(EMPTY_OPERATOR);
//       setShowForm(false);
//       await loadOperators();
//       await onRefresh?.();
//     } catch (e2) {
//       setNotice({
//         type: "error",
//         text: e2.message || "Không lưu được nhà xe.",
//       });
//     }
//   };

//   const editItem = (item) => {
//     setForm({
//       operatorID: pick(item, ["operatorID", "OperatorID"]),
//       name: pick(item, ["name", "Name"], ""),
//       description: pick(item, ["description", "Description"], ""),
//       contactPhone: pick(item, ["contactPhone", "ContactPhone"], ""),
//       email: pick(item, ["email", "Email"], ""),
//     });
//     setShowForm(true);
//   };

//   const removeItem = async (id) => {
//     if (!confirm(`Xóa nhà xe #${id}?`)) return;
//     setNotice(null);
//     try {
//       await operatorApi.remove(id);
//       setNotice({ type: "success", text: "Xóa nhà xe thành công." });
//       await loadOperators();
//       await onRefresh?.();
//     } catch (e) {
//       setNotice({
//         type: "error",
//         text:
//           e.message ||
//           "Không xóa được nhà xe. Có thể vẫn còn xe thuộc nhà xe này.",
//       });
//     }
//   };

//   return (
//     <section className="admin-card table-card">
//       <SectionHeader
//         title="Quản lý nhà xe"
//         showForm={showForm}
//         onToggle={() =>
//           toggleCreateForm(showForm, setShowForm, setForm, EMPTY_OPERATOR)
//         }
//       />
//       {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
//       {showForm && (
//         <AdminFormModal
//           title={form.operatorID ? "Sửa nhà xe" : "Thêm nhà xe"}
//           onClose={() => cancelForm(setShowForm, setForm, EMPTY_OPERATOR)}
//         >
//           <form className="admin-form-grid" onSubmit={submit}>
//             <input
//               value={form.name}
//               onChange={(e) => setForm({ ...form, name: e.target.value })}
//               placeholder="Tên nhà xe"
//               required
//             />
//             <input
//               value={form.contactPhone}
//               onChange={(e) =>
//                 setForm({ ...form, contactPhone: e.target.value })
//               }
//               placeholder="Số điện thoại"
//               required
//             />
//             <input
//               value={form.email}
//               onChange={(e) => setForm({ ...form, email: e.target.value })}
//               placeholder="Email"
//             />
//             <input
//               value={form.description}
//               onChange={(e) =>
//                 setForm({ ...form, description: e.target.value })
//               }
//               placeholder="Mô tả"
//             />
//             <div className="admin-form-actions">
//               <button className="btn btn-primary" type="submit">
//                 {form.operatorID ? "Cập nhật" : "Lưu nhà xe"}
//               </button>
//               <button
//                 className="btn btn-outline"
//                 type="button"
//                 onClick={() => cancelForm(setShowForm, setForm, EMPTY_OPERATOR)}
//               >
//                 Hủy
//               </button>
//             </div>
//           </form>
//         </AdminFormModal>
//       )}
//       <div className="admin-filter-grid">
//         <input
//           value={filters.name}
//           onChange={(e) => updateFilter("name", e.target.value)}
//           placeholder="Tìm tên nhà xe"
//         />
//         <input
//           value={filters.phone}
//           onChange={(e) => updateFilter("phone", e.target.value)}
//           placeholder="Tìm số điện thoại"
//         />
//         <input
//           value={filters.email}
//           onChange={(e) => updateFilter("email", e.target.value)}
//           placeholder="Tìm email"
//         />
//       </div>
//       {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Tên nhà xe</th>
//               <th>Điện thoại</th>
//               <th>Email</th>
//               <th>Mô tả</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["operatorID", "OperatorID"]);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>{pick(item, ["name", "Name"])}</td>
//                   <td>{pick(item, ["contactPhone", "ContactPhone"])}</td>
//                   <td>{pick(item, ["email", "Email"])}</td>
//                   <td>{pick(item, ["description", "Description"])}</td>
//                   <td className="admin-actions">
//                     <button
//                       className="btn btn-outline"
//                       onClick={() => editItem(item)}
//                     >
//                       Sửa
//                     </button>
//                     <button
//                       className="btn btn-danger"
//                       onClick={() => removeItem(id)}
//                     >
//                       Xóa
//                     </button>
//                   </td>
//                 </tr>
//               );
//             })}
//             {!loading && rows.length === 0 && (
//               <tr>
//                 <td colSpan="6" className="empty-cell">
//                   Không có nhà xe phù hợp.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//       <AdminPagination
//         page={meta.page}
//         totalPages={meta.totalPages}
//         totalCount={meta.totalCount}
//         onPageChange={setPage}
//       />
//     </section>
//   );
// }
function OperatorsManager({ onRefresh }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    totalCount: 0,
    page: 1,
    pageSize: ADMIN_CRUD_PAGE_SIZE,
    totalPages: 1,
  });
  const [form, setForm] = useState(EMPTY_OPERATOR);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadOperators = async () => {
    setLoading(true);
    try {
      const data = await operatorApi.list(
        cleanParams({ keyword: debouncedSearch, page, pageSize: ADMIN_CRUD_PAGE_SIZE }),
      );
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items);
      setMeta(paged);
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Không tải được danh sách nhà xe.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperators();
  }, [page, debouncedSearch]);

  const updateSearch = (v) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, 400);
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const payload = {
        operatorID: form.operatorID || 0,
        name: form.name.trim(),
        description: form.description.trim(),
        contactPhone: form.contactPhone.trim(),
        email: form.email.trim(),
      };
      if (!payload.name || !payload.contactPhone)
        throw new Error("Vui lòng nhập tên và số điện thoại nhà xe.");
      if (form.operatorID) await operatorApi.update(form.operatorID, payload);
      else await operatorApi.create(payload);
      setNotice({
        type: "success",
        text: form.operatorID
          ? "Cập nhật nhà xe thành công."
          : "Thêm nhà xe thành công.",
      });
      setForm(EMPTY_OPERATOR);
      setShowForm(false);
      await loadOperators();
      await onRefresh?.();
    } catch (e2) {
      setNotice({
        type: "error",
        text: e2.message || "Không lưu được nhà xe.",
      });
    }
  };

  const editItem = (item) => {
    setForm({
      operatorID: pick(item, ["operatorID", "OperatorID"]),
      name: pick(item, ["name", "Name"], ""),
      description: pick(item, ["description", "Description"], ""),
      contactPhone: pick(item, ["contactPhone", "ContactPhone"], ""),
      email: pick(item, ["email", "Email"], ""),
    });
    setShowForm(true);
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa nhà xe #${id}?`)) return;
    setNotice(null);
    try {
      await operatorApi.remove(id);
      setNotice({ type: "success", text: "Xóa nhà xe thành công." });
      await loadOperators();
      await onRefresh?.();
    } catch (e) {
      setNotice({
        type: "error",
        text:
          e.message ||
          "Không xóa được nhà xe. Có thể vẫn còn xe thuộc nhà xe này.",
      });
    }
  };

  // Highlight chữ khớp
  const hl = (text) => {
    if (!search.trim() || !text) return text || "";
    const str = String(text);
    const idx = str.toLowerCase().indexOf(search.trim().toLowerCase());
    if (idx === -1) return str;
    return (
      <>
        {str.slice(0, idx)}
        <mark style={{
          background: "#fef08a", color: "#713f12",
          borderRadius: 2, padding: "0 2px", fontWeight: 600,
        }}>
          {str.slice(idx, idx + search.trim().length)}
        </mark>
        {str.slice(idx + search.trim().length)}
      </>
    );
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader
        title="Quản lý nhà xe"
        showForm={showForm}
        onToggle={() =>
          toggleCreateForm(showForm, setShowForm, setForm, EMPTY_OPERATOR)
        }
      />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tên nhà xe"
            required
          />
          <input
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            placeholder="Số điện thoại"
            required
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Mô tả"
          />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">
              {form.operatorID ? "Cập nhật" : "Lưu nhà xe"}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => cancelForm(setShowForm, setForm, EMPTY_OPERATOR)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* ── Search bar gộp 1 ô + nút xóa lọc ── */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: "absolute", left: 11, top: "50%",
              transform: "translateY(-50%)", fontSize: 13,
              color: "#94a3b8", pointerEvents: "none",
            }}
          />
          <input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Tìm tên nhà xe, số điện thoại hoặc email..."
            style={{
              width: "100%", height: 38, paddingLeft: 34,
              paddingRight: search ? 32 : 12, fontSize: 13,
              border: "1.5px solid #e2e8f0", borderRadius: 8,
              outline: "none", boxSizing: "border-box",
              transition: "border-color .15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          {search && (
            <button
              onClick={() => updateSearch("")}
              style={{
                position: "absolute", right: 8, top: "50%",
                transform: "translateY(-50%)", border: "none",
                background: "none", cursor: "pointer",
                color: "#94a3b8", fontSize: 17, lineHeight: 1, padding: 2,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Nút xóa lọc — chỉ hiện khi đang lọc */}
        {search && (
          <button
            className="btn btn-outline"
            onClick={() => updateSearch("")}
            style={{ height: 38, whiteSpace: "nowrap", fontSize: 13 }}
          >
            <i className="fa-solid fa-xmark" /> Xóa lọc
          </button>
        )}
      </div>

      {search && (
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
          Tìm thấy <b>{meta.totalCount}</b> nhà xe khớp với &ldquo;{search}&rdquo;
        </p>
      )}

      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên nhà xe</th>
              <th>Điện thoại</th>
              <th>Email</th>
              <th>Mô tả</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["operatorID", "OperatorID"]);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{hl(pick(item, ["name", "Name"]))}</td>
                  <td>{hl(pick(item, ["contactPhone", "ContactPhone"]))}</td>
                  <td>{hl(pick(item, ["email", "Email"]))}</td>
                  <td>{pick(item, ["description", "Description"])}</td>
                  <td className="admin-actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => editItem(item)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => removeItem(id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-cell">
                  Không có nhà xe phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        page={meta.page}
        totalPages={meta.totalPages}
        totalCount={meta.totalCount}
        onPageChange={setPage}
      />
    </section>
  );
}

// ==================== SHARED COMPONENTS ====================
function TripsTable({ trips, onEdit, onDelete, onCancel, onRowClick }) {
  const showActions = Boolean(onEdit || onDelete || onCancel || onRowClick);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tuyến</th>
            <th>Giờ đi</th>
            <th>Nhà xe</th>
            <th>Loại xe</th>
            <th>Chỗ</th>
            <th>Giá</th>
            {showActions && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {trips.map((t) => {
            const isScheduled = Number(t.status) === 0 && new Date(t.departureTime) > new Date();
            return (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>
                  <b>{t.departureLocation}</b> → <b>{t.arrivalLocation}</b>
                </td>
                <td>{formatDateTime(t.departureTime)}</td>
                <td>{t.operator || "Chưa rõ"}</td>
                <td>{t.busType || "Chưa rõ"}</td>
                <td>{t.availableSeats}</td>
                <td>{formatVND(t.price)}</td>
                {showActions && (
                  <td className="admin-actions">
                    {onRowClick && (
                      <button
                        className="btn btn-outline"
                        onClick={() => onRowClick(t.id)}
                      >
                        <i className="fa-solid fa-eye" /> Xem
                      </button>
                    )}
                    {onEdit && (
                      <button
                        className="btn btn-outline"
                        onClick={() => onEdit(t)}
                      >
                        Sửa
                      </button>
                    )}
                    {onCancel && isScheduled && (
                      <button
                        className="btn btn-warning"
                        onClick={() => onCancel(t.id)}
                        title="Hủy chuyến và hoàn tiền tất cả vé"
                      >
                        Hủy chuyến
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="btn btn-danger"
                        onClick={() => onDelete(t.id)}
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ title, showForm, onToggle }) {
  return (
    <div className="admin-section-head">
      <h3>{title}</h3>
      <button className="btn btn-primary" onClick={onToggle}>
        <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />{" "}
        {showForm ? "Đóng" : "Thêm mới"}
      </button>
    </div>
  );
}

function AdminFormModal({ title, onClose, children }) {
  return createPortal(
    <div
      className="admin-form-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="admin-form-modal">
        <div className="admin-form-modal-head">
          <div>
            <span>Biểu mẫu</span>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng popup">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button
        className="btn btn-outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>
      <span>
        Trang {page}/{totalPages}
      </span>
      <button
        className="btn btn-outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
}

function AdminPagination({ page, totalPages, totalCount, onPageChange }) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  return (
    <div className="admin-pagination">
      <button
        className="btn btn-outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>
      <span>
        Trang {page}/{safeTotalPages} · {totalCount || 0} dòng
      </span>
      <button
        className="btn btn-outline"
        disabled={page >= safeTotalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </div>
  );
}

function AdminNotice({ type = "success", children }) {
  return <div className={`admin-notice ${type}`}>{children}</div>;
}

function SearchBox({ value, onChange, placeholder = "Tìm kiếm..." }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: "8px 12px",
        width: 300,
        borderRadius: 6,
        border: "1px solid #ddd",
        marginBottom: 12,
      }}
    />
  );
}

// ==================== HOOKS ====================
function usePagination(items) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const rows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);
  return { page, setPage, totalPages, rows };
}

function useSearch(items, fields) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      search.trim()
        ? items.filter((item) =>
            fields.some((f) =>
              String(item[f] || "")
                .toLowerCase()
                .includes(search.toLowerCase()),
            ),
          )
        : items,
    [items, search],
  );
  return { search, setSearch, filtered };
}

// ==================== UTILS ====================
function enrichTrips(trips, buses, operators) {
  return trips.map((trip) => {
    if (trip.operator && trip.busType) return trip;
    const bus = buses.find(
      (x) => String(pick(x, ["busID", "BusID"])) === String(trip.busId),
    );
    const operatorId = pick(bus, ["operatorID", "OperatorID"]);
    const operator = operators.find(
      (x) =>
        String(pick(x, ["operatorID", "OperatorID"])) === String(operatorId),
    );
    return {
      ...trip,
      busType: trip.busType || pick(bus, ["busType", "BusType"]),
      operator:
        trip.operator ||
        pick(bus, ["operatorName", "OperatorName"]) ||
        pick(operator, ["name", "Name"]),
    };
  });
}
function findOperatorName(operators, operatorId) {
  const found = operators.find(
    (o) => String(pick(o, ["operatorID", "OperatorID"])) === String(operatorId),
  );
  return found ? pick(found, ["name", "Name"]) : `#${operatorId}`;
}
function findTripRoute(trips, tripId) {
  const found = trips.find((t) => String(t.id) === String(tripId));
  return found
    ? `${found.departureLocation} → ${found.arrivalLocation}`
    : "Chưa rõ tuyến";
}
// function getPaymentStatus(item) {
//   return pick(
//     item,
//     ["paymentStatus", "PaymentStatus", "status", "Status"],
//     "Pending",
//   );
// }
function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("vi-VN") : "";
}
function formatDateLabel(value) {
  if (!value) return "Chọn ngày";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chọn ngày";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function formatDateTimeLabel(value) {
  if (!value) return "Chọn ngày giờ";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chọn ngày giờ";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function toggleCreateForm(showForm, setShowForm, setForm, emptyForm) {
  if (showForm) setForm(emptyForm);
  setShowForm(!showForm);
}
function cancelForm(setShowForm, setForm, emptyForm) {
  setShowForm(false);
  setForm(emptyForm);
}
// function OrdersManager({ bookings, trips, onRefresh }) {
//   const [subTab, setSubTab] = useState('list'); // 'list' | 'invoice'
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [invoiceDetail, setInvoiceDetail] = useState(null);
//   const [loadingInvoice, setLoadingInvoice] = useState(false);
//   const [form, setForm] = useState(EMPTY_BOOKING);
//   const [showForm, setShowForm] = useState(false);

//   // Filter state
//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterMethod, setFilterMethod] = useState('');
//   const [filterSearch, setFilterSearch] = useState('');
//   const [filterRoute, setFilterRoute] = useState('');

//   const { page, setPage, totalPages, rows } = usePagination(
//     useMemo(() => bookings.filter(b => {
//       const status = getPaymentStatus(b);
//       const route = pick(b, ['route', 'Route']) || findTripRoute(trips, pick(b, ['tripID', 'TripID']));
//       const method = pick(b, ['paymentMethod', 'PaymentMethod'], '');
//       return (!filterStatus || status === filterStatus) &&
//         (!filterMethod || method === filterMethod) &&
//         (!filterRoute || includesText(route, filterRoute)) &&
//         (!filterSearch || includesText(pick(b, ['customerName', 'CustomerName']), filterSearch) ||
//           includesText(pick(b, ['customerPhone', 'CustomerPhone']), filterSearch));
//     }), [bookings, filterStatus, filterMethod, filterRoute, filterSearch])
//   );

//   const viewInvoice = async (bookingId) => {
//     setLoadingInvoice(true);
//     setSelectedInvoice(bookingId);
//     // setSubTab('invoice');
//     try {
//       const data = await apiFetch(`/api/admin/invoice/${bookingId}`);
//       setInvoiceDetail(data);
//     } catch { alert("Không tải được hóa đơn."); }
//     finally { setLoadingInvoice(false); }
//   };

//   const printInvoice = () => {
//     const printArea = document.getElementById("invoice-print-area");
//     if (!printArea) return;
//     const w = window.open("", "_blank");
//     w.document.write(`<html><head><title>Hóa đơn #${invoiceDetail?.bookingID}</title>
//       <style>
//         body{font-family:Arial,sans-serif;padding:32px;color:#222}
//         h1{color:#2563eb}.row{display:flex;justify-content:space-between;margin:8px 0;border-bottom:1px solid #eee;padding-bottom:8px}
//         .total{font-size:20px;font-weight:bold;color:#2563eb}.badge{padding:4px 12px;border-radius:20px;background:#dcfce7;color:#16a34a;font-weight:bold}
//         table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}
//       </style></head><body>${printArea.innerHTML}</body></html>`);
//     w.document.close(); w.print();
//   };

//   const updateStatus = async (id, status) => {
//     try {
//       await apiFetch(`/api/bookings/${id}/payment-status`, { method: "PUT", body: JSON.stringify(status) });
//       await onRefresh();
//       if (invoiceDetail?.bookingID === id) viewInvoice(id);
//     } catch (e) { alert(e.message || "Không cập nhật được."); }
//   };

//   const removeItem = async (id) => {
//     if (!confirm(`Xóa đơn #${id}?`)) return;
//     try { await apiFetch(`/api/bookings/${id}`, { method: "DELETE" }); await onRefresh(); }
//     catch (e) { alert(e.message || "Không xóa được."); }
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const trip = trips.find(t => String(t.id) === String(form.tripID));
//       const seats = Number(form.totalSeats || 0);
//       if (!form.tripID || !form.customerName.trim() || !form.customerPhone.trim() || seats <= 0)
//         throw new Error("Vui lòng nhập đủ thông tin.");
//       await apiFetch("/api/bookings", { method: "POST", body: JSON.stringify({
//         tripID: Number(form.tripID), customerName: form.customerName.trim(),
//         customerPhone: form.customerPhone.trim(), customerEmail: form.customerEmail.trim(),
//         totalSeats: seats, totalPrice: Number((trip?.price || 0) * seats),
//         paymentMethod: form.paymentMethod || "Online", paymentStatus: form.paymentStatus || "Pending",
//       })});
//       setForm(EMPTY_BOOKING); setShowForm(false); await onRefresh(); setPage(1);
//     } catch (e2) { alert(e2.message || "Không thêm được đơn."); }
//   };

//   // Chi tiết hóa đơn
//   // if (subTab === 'invoice' && selectedInvoice) {
//   //   return (
//   //     <section className="admin-card table-card">
//   //       <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
//   //         <button className="btn btn-outline" onClick={() => { setSubTab('list'); setSelectedInvoice(null); setInvoiceDetail(null); }}>
//   //           ← Quay lại
//   //         </button>
//   //         <h3 style={{ margin: 0 }}>Chi tiết hóa đơn #{selectedInvoice}</h3>
//   //       </div>
//   //       {loadingInvoice ? <p>Đang tải...</p> : invoiceDetail ? (
//   //         <>
//   //           <div id="invoice-print-area" style={{ maxWidth: 700, margin: '0 auto' }}>
//   //             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
//   //               <div><h1 style={{ margin: 0, color: '#2563eb' }}>🚌 VéXeAZ</h1><p style={{ margin: 0, color: '#666' }}>Hệ thống đặt vé xe khách</p></div>
//   //               <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0 }}>HÓA ĐƠN #{invoiceDetail.bookingID}</h2><p style={{ margin: 0, color: '#666' }}>{formatDateTime(invoiceDetail.bookingDate)}</p></div>
//   //             </div>
//   //             <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
//   //               <h4 style={{ margin: '0 0 12px 0' }}>Thông tin khách hàng</h4>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Họ tên:</span><b>{invoiceDetail.customerName}</b></div>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>SĐT:</span><span>{invoiceDetail.customerPhone}</span></div>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Email:</span><span>{invoiceDetail.customerEmail}</span></div>
//   //             </div>
//   //             {invoiceDetail.trip && (
//   //               <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
//   //                 <h4 style={{ margin: '0 0 12px 0' }}>Thông tin chuyến xe</h4>
//   //                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Tuyến:</span><b>{invoiceDetail.trip.departureLocation} → {invoiceDetail.trip.arrivalLocation}</b></div>
//   //                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Giờ đi:</span><span>{formatDateTime(invoiceDetail.trip.departureTime)}</span></div>
//   //                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Giờ đến:</span><span>{formatDateTime(invoiceDetail.trip.arrivalTime)}</span></div>
//   //                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Nhà xe:</span><span>{invoiceDetail.trip.operatorName}</span></div>
//   //                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Loại xe:</span><span>{invoiceDetail.trip.busType}</span></div>
//   //                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>Biển số:</span><span>{invoiceDetail.trip.licensePlate}</span></div>
//   //               </div>
//   //             )}
//   //             <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
//   //               <h4 style={{ margin: '0 0 12px 0' }}>Chi tiết thanh toán</h4>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Số ghế:</span><span>{invoiceDetail.totalSeats}</span></div>
//   //               {invoiceDetail.seats?.length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Ghế:</span><span>{invoiceDetail.seats.join(', ')}</span></div>}
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Đơn giá:</span><span>{formatVND(invoiceDetail.trip?.price || 0)}</span></div>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Phương thức:</span><span>{invoiceDetail.paymentMethod}</span></div>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '8px 0' }}><span>Trạng thái:</span><span style={{ padding: '4px 12px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', fontWeight: 'bold' }}>{invoiceDetail.paymentStatus}</span></div>
//   //               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 20, fontWeight: 'bold', color: '#2563eb' }}><span>TỔNG CỘNG:</span><span>{formatVND(invoiceDetail.totalPrice)}</span></div>
//   //             </div>
//   //           </div>
//   //           <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
//   //             <button className="btn btn-primary" onClick={printInvoice}><i className="fa-solid fa-print" /> In hóa đơn</button>
//   //             {invoiceDetail.paymentStatus !== 'Paid' && (
//   //               <button className="btn btn-outline" style={{ background: '#dcfce7', color: '#16a34a', border: 'none' }}
//   //                 onClick={() => updateStatus(invoiceDetail.bookingID, 'Paid')}>✓ Xác nhận Paid</button>
//   //             )}
//   //             {invoiceDetail.paymentStatus !== 'Cancelled' && (
//   //               <button className="btn btn-danger" onClick={() => updateStatus(invoiceDetail.bookingID, 'Cancelled')}>Hủy đơn</button>
//   //             )}
//   //           </div>
//   //         </>
//   //       ) : <p>Không tải được hóa đơn.</p>}
//   //     </section>
//   //   );
//   // }

//   // Danh sách đơn hàng
//   return (
//     <section className="admin-card table-card">
//       <SectionHeader title="Quản lý đơn hàng" showForm={showForm} onToggle={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BOOKING)} />
//       {showForm && (
//         <form className="admin-form-grid" onSubmit={submit}>
//           <select value={form.tripID} onChange={e => setForm({ ...form, tripID: e.target.value })} required>
//             <option value="">Chọn chuyến</option>
//             {trips.map(t => <option key={t.id} value={t.id}>{t.id} - {t.departureLocation} → {t.arrivalLocation}</option>)}
//           </select>
//           <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Tên khách" required />
//           <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="SĐT" required />
//           <input value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" />
//           <input type="number" min="1" value={form.totalSeats} onChange={e => setForm({ ...form, totalSeats: e.target.value })} placeholder="Số ghế" required />
//           <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
//             <option value="Online">Online</option><option value="Cash">Cash</option>
//           </select>
//           <select value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}>
//             <option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option>
//           </select>
//           <div className="admin-form-actions">
//             <button className="btn btn-primary" type="submit">Lưu đơn</button>
//             <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BOOKING)}>Hủy</button>
//           </div>
//         </form>
//       )}

//       {/* Bộ lọc */}
//       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
//         <input value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
//           placeholder="Tìm tên, SĐT..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 150 }} />
//         <input value={filterRoute} onChange={e => { setFilterRoute(e.target.value); setPage(1); }}
//           placeholder="Tìm tuyến..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 150 }} />
//         <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
//           style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
//           <option value="">Tất cả trạng thái</option>
//           <option value="Pending">Pending</option>
//           <option value="Paid">Paid</option>
//           <option value="Cancelled">Cancelled</option>
//         </select>
//         <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1); }}
//           style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
//           <option value="">Tất cả phương thức</option>
//           <option value="Online">Online</option>
//           <option value="Cash">Cash</option>
//           <option value="VNPay">VNPay</option>
//         </select>
//         <button className="btn btn-outline" onClick={() => { setFilterSearch(''); setFilterRoute(''); setFilterStatus(''); setFilterMethod(''); setPage(1); }}>
//           Xóa lọc
//         </button>
//       </div>

//       <div className="table-wrap">
//         <table>
//           <thead><tr><th>ID</th><th>Khách hàng</th><th>SĐT</th><th>Tuyến</th><th>Ngày đặt</th><th>Phương thức</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thao tác</th></tr></thead>
//           <tbody>
//             {rows.map(item => {
//               const id = pick(item, ["bookingID", "BookingID"]);
//               const status = getPaymentStatus(item);
//               const route = pick(item, ['route', 'Route']) || findTripRoute(trips, pick(item, ['tripID', 'TripID']));
//               return (
//                 <tr key={id}>
//                   <td>#{id}</td>
//                   <td>{pick(item, ["customerName", "CustomerName"])}</td>
//                   <td>{pick(item, ["customerPhone", "CustomerPhone"])}</td>
//                   <td>{route}</td>
//                   <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
//                   <td>{pick(item, ["paymentMethod", "PaymentMethod"], "")}</td>
//                   <td><span className="badge">{status}</span></td>
//                   <td>{formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}</td>
//                   <td className="admin-actions">
//                     <button className="btn btn-outline" onClick={() => viewInvoice(id)}>
//                       <i className="fa-solid fa-file-invoice" /> HĐ
//                     </button>
//                     <button className="btn btn-outline" onClick={() => updateStatus(id, status === 'Paid' ? 'Pending' : 'Paid')}>
//                       {status === 'Paid' ? 'Pending' : 'Paid'}
//                     </button>
//                     <button className="btn btn-danger" onClick={() => removeItem(id)}>Xóa</button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// function OrdersManager({ bookings, trips, onRefresh }) {
//   const [selectedInvoice, setSelectedInvoice] = useState(null);
//   const [invoiceDetail, setInvoiceDetail] = useState(null);
//   const [loadingInvoice, setLoadingInvoice] = useState(false);
//   const [form, setForm] = useState(EMPTY_BOOKING);
//   const [showForm, setShowForm] = useState(false);

//   const [filterStatus, setFilterStatus] = useState('');
//   const [filterMethod, setFilterMethod] = useState('');
//   const [filterSearch, setFilterSearch] = useState('');
//   const [filterRoute, setFilterRoute] = useState('');

//   const filteredBookings = useMemo(() => bookings.filter(b => {
//     const status = getPaymentStatus(b);
//     const route = pick(b, ['route', 'Route']) || findTripRoute(trips, pick(b, ['tripID', 'TripID']));
//     const method = pick(b, ['paymentMethod', 'PaymentMethod'], '');
//     return (!filterStatus || status === filterStatus) &&
//       (!filterMethod || method === filterMethod) &&
//       (!filterRoute || includesText(route, filterRoute)) &&
//       (!filterSearch || includesText(pick(b, ['customerName', 'CustomerName']), filterSearch) ||
//         includesText(pick(b, ['customerPhone', 'CustomerPhone']), filterSearch));
//   }), [bookings, filterStatus, filterMethod, filterRoute, filterSearch]);

//   const { page, setPage, totalPages, rows } = usePagination(filteredBookings);

//   const viewInvoice = async (bookingId) => {
//     setLoadingInvoice(true);
//     setSelectedInvoice(bookingId);
//     try {
//       const data = await apiFetch(`/api/admin/invoice/${bookingId}`);
//       setInvoiceDetail(data);
//     } catch { alert("Không tải được hóa đơn."); }
//     finally { setLoadingInvoice(false); }
//   };

//   const closeInvoice = () => {
//     setSelectedInvoice(null);
//     setInvoiceDetail(null);
//   };

//   const printInvoice = () => {
//     const printArea = document.getElementById("invoice-print-area");
//     if (!printArea) return;
//     const w = window.open("", "_blank");
//     w.document.write(`<html><head><title>Hóa đơn #${invoiceDetail?.bookingID}</title>
//       <style>
//         body{font-family:Arial,sans-serif;padding:32px;color:#222}
//         h1{color:#2563eb}.row{display:flex;justify-content:space-between;margin:8px 0;border-bottom:1px solid #eee;padding-bottom:8px}
//         .total{font-size:18px;font-weight:bold;color:#2563eb}.badge{padding:4px 12px;border-radius:20px;background:#dcfce7;color:#16a34a;font-weight:bold}
//       </style></head><body>${printArea.innerHTML}</body></html>`);
//     w.document.close(); w.print();
//   };

//   const updateStatus = async (id, status) => {
//     try {
//       await apiFetch(`/api/bookings/${id}/payment-status`, { method: "PUT", body: JSON.stringify(status) });
//       await onRefresh();
//       if (invoiceDetail?.bookingID === id) viewInvoice(id);
//     } catch (e) { alert(e.message || "Không cập nhật được."); }
//   };

//   const removeItem = async (id) => {
//     if (!confirm(`Xóa đơn #${id}?`)) return;
//     try { await apiFetch(`/api/bookings/${id}`, { method: "DELETE" }); await onRefresh(); }
//     catch (e) { alert(e.message || "Không xóa được."); }
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const trip = trips.find(t => String(t.id) === String(form.tripID));
//       const seats = Number(form.totalSeats || 0);
//       if (!form.tripID || !form.customerName.trim() || !form.customerPhone.trim() || seats <= 0)
//         throw new Error("Vui lòng nhập đủ thông tin.");
//       await apiFetch("/api/bookings", { method: "POST", body: JSON.stringify({
//         tripID: Number(form.tripID), customerName: form.customerName.trim(),
//         customerPhone: form.customerPhone.trim(), customerEmail: form.customerEmail.trim(),
//         totalSeats: seats, totalPrice: Number((trip?.price || 0) * seats),
//         paymentMethod: form.paymentMethod || "Online", paymentStatus: form.paymentStatus || "Pending",
//       })});
//       setForm(EMPTY_BOOKING); setShowForm(false); await onRefresh(); setPage(1);
//     } catch (e2) { alert(e2.message || "Không thêm được đơn."); }
//   };

//   return (
//     <section className="admin-card table-card">

//       {/* ===== MODAL HÓA ĐƠN NHỎ ===== */}
//       {selectedInvoice && (
//         <div style={{
//           position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//           background: 'rgba(0,0,0,0.45)', zIndex: 1000,
//           display: 'flex', alignItems: 'center', justifyContent: 'center'
//         }} onClick={closeInvoice}>
//           <div style={{
//             background: 'white', borderRadius: 10, padding: 20,
//             width: 420, maxHeight: '75vh', overflowY: 'auto',
//             boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
//           }} onClick={e => e.stopPropagation()}>

//             {loadingInvoice ? (
//               <p style={{ textAlign: 'center', color: '#666' }}>Đang tải hóa đơn...</p>
//             ) : invoiceDetail ? (
//               <>
//                 <div id="invoice-print-area">
//                   {/* Header */}
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
//                     <div>
//                       <div style={{ fontWeight: 'bold', fontSize: 16, color: '#2563eb' }}>🚌 VéXeAZ</div>
//                       <div style={{ fontSize: 11, color: '#888' }}>Hệ thống đặt vé xe khách</div>
//                     </div>
//                     <div style={{ textAlign: 'right' }}>
//                       <div style={{ fontWeight: 'bold', fontSize: 15 }}>HÓA ĐƠN #{invoiceDetail.bookingID}</div>
//                       <div style={{ fontSize: 11, color: '#888' }}>{formatDateTime(invoiceDetail.bookingDate)}</div>
//                     </div>
//                   </div>

//                   {/* Khách hàng */}
//                   <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 13 }}>
//                     <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Thông tin khách hàng</div>
//                     <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}><span style={{ color: '#666' }}>Họ tên:</span><b>{invoiceDetail.customerName}</b></div>
//                     <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}><span style={{ color: '#666' }}>SĐT:</span><span>{invoiceDetail.customerPhone}</span></div>
//                     {invoiceDetail.customerEmail && (
//                       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#666' }}>Email:</span><span>{invoiceDetail.customerEmail}</span></div>
//                     )}
//                   </div>

//                   {/* Chuyến xe */}
//                   {invoiceDetail.trip && (
//                     <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 13 }}>
//                       <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Thông tin chuyến xe</div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f0ff', padding: '4px 0' }}><span style={{ color: '#666' }}>Tuyến:</span><b>{invoiceDetail.trip.departureLocation} → {invoiceDetail.trip.arrivalLocation}</b></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f0ff', padding: '4px 0' }}><span style={{ color: '#666' }}>Giờ đi:</span><span>{formatDateTime(invoiceDetail.trip.departureTime)}</span></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0f0ff', padding: '4px 0' }}><span style={{ color: '#666' }}>Nhà xe:</span><span>{invoiceDetail.trip.operatorName}</span></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#666' }}>Loại xe:</span><span>{invoiceDetail.trip.busType}</span></div>
//                     </div>
//                   )}

//                   {/* Chi tiết vé */}
//                   <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 13 }}>
//                     <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Chi tiết vé</div>
//                     <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}><span style={{ color: '#666' }}>Số ghế:</span><span>{invoiceDetail.totalSeats}</span></div>
//                     {invoiceDetail.seats?.length > 0 && (
//                       <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}><span style={{ color: '#666' }}>Ghế:</span><span>{invoiceDetail.seats.join(', ')}</span></div>
//                     )}
//                     <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}><span style={{ color: '#666' }}>Phương thức:</span><span>{invoiceDetail.paymentMethod}</span></div>
//                     <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '4px 0' }}><span style={{ color: '#666' }}>Trạng thái:</span>
//                       <span style={{ padding: '2px 10px', borderRadius: 20, background: invoiceDetail.paymentStatus === 'Paid' ? '#dcfce7' : invoiceDetail.paymentStatus === 'Cancelled' ? '#fee2e2' : '#fef9c3', color: invoiceDetail.paymentStatus === 'Paid' ? '#16a34a' : invoiceDetail.paymentStatus === 'Cancelled' ? '#dc2626' : '#854d0e', fontWeight: 'bold', fontSize: 12 }}>
//                         {invoiceDetail.paymentStatus}
//                       </span>
//                     </div>
//                     <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 15, fontWeight: 'bold', color: '#2563eb' }}>
//                       <span>TỔNG CỘNG:</span><span>{formatVND(invoiceDetail.totalPrice)}</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Actions */}
//                 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
//                   <button className="btn btn-primary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={printInvoice}>
//                     <i className="fa-solid fa-print" /> In
//                   </button>
//                   {invoiceDetail.paymentStatus !== 'Paid' && (
//                     <button style={{ fontSize: 13, padding: '6px 12px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
//                       onClick={() => updateStatus(invoiceDetail.bookingID, 'Paid')}>✓ Paid</button>
//                   )}
//                   {invoiceDetail.paymentStatus !== 'Cancelled' && (
//                     <button className="btn btn-danger" style={{ fontSize: 13, padding: '6px 12px' }}
//                       onClick={() => updateStatus(invoiceDetail.bookingID, 'Cancelled')}>Hủy đơn</button>
//                   )}
//                   <button className="btn btn-outline" style={{ fontSize: 13, padding: '6px 12px', marginLeft: 'auto' }} onClick={closeInvoice}>Đóng</button>
//                 </div>
//               </>
//             ) : <p>Không tải được hóa đơn.</p>}
//           </div>
//         </div>
//       )}

//       {/* ===== DANH SÁCH ===== */}
//       <SectionHeader title="Quản lý đơn hàng" showForm={showForm} onToggle={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BOOKING)} />
//       {showForm && (
//         <form className="admin-form-grid" onSubmit={submit}>
//           <select value={form.tripID} onChange={e => setForm({ ...form, tripID: e.target.value })} required>
//             <option value="">Chọn chuyến</option>
//             {trips.map(t => <option key={t.id} value={t.id}>{t.id} - {t.departureLocation} → {t.arrivalLocation}</option>)}
//           </select>
//           <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Tên khách" required />
//           <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} placeholder="SĐT" required />
//           <input value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" />
//           <input type="number" min="1" value={form.totalSeats} onChange={e => setForm({ ...form, totalSeats: e.target.value })} placeholder="Số ghế" required />
//           <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
//             <option value="Online">Online</option><option value="Cash">Cash</option>
//           </select>
//           <select value={form.paymentStatus} onChange={e => setForm({ ...form, paymentStatus: e.target.value })}>
//             <option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option>
//           </select>
//           <div className="admin-form-actions">
//             <button className="btn btn-primary" type="submit">Lưu đơn</button>
//             <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BOOKING)}>Hủy</button>
//           </div>
//         </form>
//       )}

//       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
//         <input value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
//           placeholder="Tìm tên, SĐT..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 150 }} />
//         <input value={filterRoute} onChange={e => { setFilterRoute(e.target.value); setPage(1); }}
//           placeholder="Tìm tuyến..." style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', flex: 1, minWidth: 150 }} />
//         <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
//           style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
//           <option value="">Tất cả trạng thái</option>
//           <option value="Pending">Pending</option>
//           <option value="Paid">Paid</option>
//           <option value="Cancelled">Cancelled</option>
//         </select>
//         <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1); }}
//           style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
//           <option value="">Tất cả phương thức</option>
//           <option value="Online">Online</option>
//           <option value="Cash">Cash</option>
//           <option value="VNPay">VNPay</option>
//         </select>
//         <button className="btn btn-outline" onClick={() => { setFilterSearch(''); setFilterRoute(''); setFilterStatus(''); setFilterMethod(''); setPage(1); }}>
//           Xóa lọc
//         </button>
//       </div>

//       <div className="table-wrap">
//         <table>
//           <thead><tr><th>ID</th><th>Khách hàng</th><th>SĐT</th><th>Tuyến</th><th>Ngày đặt</th><th>Phương thức</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thao tác</th></tr></thead>
//           <tbody>
//             {rows.map(item => {
//               const id = pick(item, ["bookingID", "BookingID"]);
//               const status = getPaymentStatus(item);
//               const route = pick(item, ['route', 'Route']) || findTripRoute(trips, pick(item, ['tripID', 'TripID']));
//               return (
//                 <tr key={id}>
//                   <td>#{id}</td>
//                   <td>{pick(item, ["customerName", "CustomerName"])}</td>
//                   <td>{pick(item, ["customerPhone", "CustomerPhone"])}</td>
//                   <td>{route}</td>
//                   <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
//                   <td>{pick(item, ["paymentMethod", "PaymentMethod"], "")}</td>
//                   <td><span className="badge">{status}</span></td>
//                   <td>{formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}</td>
//                   <td className="admin-actions">
//                     <button className="btn btn-outline" onClick={() => viewInvoice(id)}>
//                       <i className="fa-solid fa-file-invoice" /> HĐ
//                     </button>
//                     <button className="btn btn-outline" onClick={() => updateStatus(id, status === 'Paid' ? 'Pending' : 'Paid')}>
//                       {status === 'Paid' ? 'Pending' : 'Paid'}
//                     </button>
//                     <button className="btn btn-danger" onClick={() => removeItem(id)}>Xóa</button>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }

// function OrdersManager({ bookings, trips, onRefresh }) {
function OrdersManager({ bookings, trips, operators, onRefresh }) {
  const [selectedTripId, setSelectedTripId] = useState(null); // bước 1 → 2
  //   const selectedTrip = useMemo(() =>
  //   selectedTripId ? trips.find(t => t.id === selectedTripId) || null : null
  // , [trips, selectedTripId]);
  const selectedTrip = useMemo(
    () =>
      selectedTripId
        ? trips.find((t) => String(t.id) === String(selectedTripId)) || null
        : null,
    [trips, selectedTripId],
  );
  // ── Bước 1: lọc chuyến xe ──
  const [fSearch, setFSearch] = useState("");
  const [fOperator, setFOperator] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStatus, setFStatus] = useState("");

  // const operators = useMemo(() => {
  //   const seen = new Set();
  //   return trips.filter(t => { const o = t.operator || ''; if (seen.has(o)) return false; seen.add(o); return true; });
  // }, [trips]);

  const filteredTrips = useMemo(
    () =>
      trips.filter((t) => {
        const route = `${t.departureLocation} ${t.arrivalLocation}`;
        return (
          (!fSearch ||
            includesText(route, fSearch) ||
            includesText(t.operator, fSearch)) &&
          (!fOperator || t.operator === fOperator) &&
          (!fDate || dateOnly(t.departureTime) === fDate) &&
          (!fStatus || (t.status || "").toLowerCase() === fStatus.toLowerCase())
        );
      }),
    [trips, fSearch, fOperator, fDate, fStatus],
  );

  const {
    page: tripPage,
    setPage: setTripPage,
    totalPages: tripTotalPages,
    rows: tripRows,
  } = usePagination(filteredTrips);

  // ── Bước 2: đơn hàng của chuyến đã chọn ──
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_BOOKING);
  const [bSearch, setBSearch] = useState("");
  const [bStatus, setBStatus] = useState("");

  const tripBookings = useMemo(() => {
    if (!selectedTrip) return [];
    return bookings.filter(
      (b) => String(pick(b, ["tripID", "TripID"])) === String(selectedTrip.id),
    );
  }, [bookings, selectedTrip]);

  const filteredBookings = useMemo(
    () =>
      tripBookings.filter((b) => {
        const status = getPaymentStatus(b);
        return (
          (!bStatus || status === bStatus) &&
          (!bSearch ||
            includesText(pick(b, ["customerName", "CustomerName"]), bSearch) ||
            includesText(pick(b, ["customerPhone", "CustomerPhone"]), bSearch))
        );
      }),
    [tripBookings, bStatus, bSearch],
  );

  const { page, setPage, totalPages, rows } = usePagination(filteredBookings);

  const viewInvoice = async (bookingId) => {
    setLoadingInvoice(true);
    setSelectedInvoice(bookingId);
    try {
      setInvoiceDetail(await apiFetch(`/api/admin/invoice/${bookingId}`));
    } catch {
      alert("Không tải được hóa đơn.");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const closeInvoice = () => {
    setSelectedInvoice(null);
    setInvoiceDetail(null);
  };

  const printInvoice = () => {
    const area = document.getElementById("invoice-print-area");
    if (!area) return;
    const w = window.open("", "_blank");
    w.document
      .write(`<html><head><title>Hóa đơn #${invoiceDetail?.bookingID}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{color:#2563eb}
      .row{display:flex;justify-content:space-between;margin:8px 0;border-bottom:1px solid #eee;padding-bottom:8px}
      .total{font-size:18px;font-weight:bold;color:#2563eb}</style></head>
      <body>${area.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  // const updateStatus = async (id, status) => {
  //   try {
  //     await apiFetch(`/api/bookings/${id}/payment-status`, { method:"PUT", body:JSON.stringify(status) });
  //     await onRefresh();
  //     if (invoiceDetail?.bookingID === id) viewInvoice(id);
  //   } catch(e) { alert(e.message || "Không cập nhật được."); }
  // };

  // const removeItem = async (id) => {
  //   if (!confirm(`Xóa đơn #${id}?`)) return;
  //   try { await apiFetch(`/api/bookings/${id}`, {method:"DELETE"}); await onRefresh(); }
  //   catch(e) { alert(e.message || "Không xóa được."); }
  // };
  const updateStatus = async (id, status) => {
    try {
      await apiFetch(`/api/bookings/${id}/payment-status`, {
        method: "PUT",
        body: JSON.stringify(status),
      });
      await onRefresh();
      // Giữ lại selectedTrip sau refresh
      // setSelectedTrip(prev => prev ? { ...prev } : prev);
      if (invoiceDetail?.bookingID === id) viewInvoice(id);
    } catch (e) {
      alert(e.message || "Không cập nhật được.");
    }
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa đơn #${id}?`)) return;
    try {
      await apiFetch(`/api/bookings/${id}`, { method: "DELETE" });
      await onRefresh();
      // Giữ lại selectedTrip sau refresh
      // setSelectedTrip(prev => prev ? { ...prev } : prev);
    } catch (e) {
      alert(e.message || "Không xóa được.");
    }
  };
  const submitBooking = async (e) => {
    e.preventDefault();
    try {
      const seats = Number(form.totalSeats || 0);
      if (!form.customerName.trim() || !form.customerPhone.trim() || seats <= 0)
        throw new Error("Vui lòng nhập đủ thông tin.");
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          tripID: selectedTrip.id,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim(),
          totalSeats: seats,
          totalPrice: Number((selectedTrip.price || 0) * seats),
          paymentMethod: form.paymentMethod || "Online",
          paymentStatus: form.paymentStatus || "Pending",
        }),
      });
      setForm(EMPTY_BOOKING);
      setShowForm(false);
      await onRefresh();
      setPage(1);
    } catch (e2) {
      alert(e2.message || "Không thêm được đơn.");
    }
  };

  // ═══════════════ RENDER ═══════════════

  // Modal hóa đơn (dùng chung cả 2 bước)
  const invoiceModal = selectedInvoice && (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={closeInvoice}
    >
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 20,
          width: 420,
          maxHeight: "75vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loadingInvoice ? (
          <p style={{ textAlign: "center", color: "#666" }}>Đang tải...</p>
        ) : invoiceDetail ? (
          <>
            <div id="invoice-print-area">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: 16,
                      color: "#2563eb",
                    }}
                  >
                    🚌 VéXeAZ
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    Hệ thống đặt vé xe khách
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "bold", fontSize: 15 }}>
                    HÓA ĐƠN #{invoiceDetail.bookingID}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    {formatDateTime(invoiceDetail.bookingDate)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 10,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                  Khách hàng
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eee",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#666" }}>Họ tên:</span>
                  <b>{invoiceDetail.customerName}</b>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eee",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#666" }}>SĐT:</span>
                  <span>{invoiceDetail.customerPhone}</span>
                </div>
                {invoiceDetail.customerEmail && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#666" }}>Email:</span>
                    <span>{invoiceDetail.customerEmail}</span>
                  </div>
                )}
              </div>
              {invoiceDetail.trip && (
                <div
                  style={{
                    background: "#f0f9ff",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 10,
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                    Chuyến xe
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #e0f0ff",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#666" }}>Tuyến:</span>
                    <b>
                      {invoiceDetail.trip.departureLocation} →{" "}
                      {invoiceDetail.trip.arrivalLocation}
                    </b>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #e0f0ff",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#666" }}>Giờ đi:</span>
                    <span>
                      {formatDateTime(invoiceDetail.trip.departureTime)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#666" }}>Nhà xe:</span>
                    <span>{invoiceDetail.trip.operatorName}</span>
                  </div>
                </div>
              )}
              <div
                style={{
                  background: "#fafafa",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 10,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                  Chi tiết vé
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eee",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#666" }}>Số ghế:</span>
                  <span>{invoiceDetail.totalSeats}</span>
                </div>
                {invoiceDetail.seats?.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#666" }}>Ghế:</span>
                    <span>{invoiceDetail.seats.join(", ")}</span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eee",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#666" }}>Phương thức:</span>
                  <span>{labelPaymentMethod(invoiceDetail.paymentMethod)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #eee",
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: "#666" }}>Trạng thái:</span>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 20,
                      background:
                        invoiceDetail.paymentStatus === "Paid"
                          ? "#dcfce7"
                          : invoiceDetail.paymentStatus === "Cancelled"
                            ? "#fee2e2"
                            : "#fef9c3",
                      color:
                        invoiceDetail.paymentStatus === "Paid"
                          ? "#16a34a"
                          : invoiceDetail.paymentStatus === "Cancelled"
                            ? "#dc2626"
                            : "#854d0e",
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    {invoiceDetail.paymentStatus}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: 15,
                    fontWeight: "bold",
                    color: "#2563eb",
                  }}
                >
                  <span>TỔNG CỘNG:</span>
                  <span>{formatVND(invoiceDetail.totalPrice)}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ fontSize: 13, padding: "6px 12px" }}
                onClick={printInvoice}
              >
                <i className="fa-solid fa-print" /> In
              </button>
              {invoiceDetail.paymentStatus !== "Paid" && (
                <button
                  style={{
                    fontSize: 13,
                    padding: "6px 12px",
                    background: "#dcfce7",
                    color: "#16a34a",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                  onClick={() => updateStatus(invoiceDetail.bookingID, "Paid")}
                >
                  ✓ Paid
                </button>
              )}
              {invoiceDetail.paymentStatus !== "Cancelled" && (
                <button
                  className="btn btn-danger"
                  style={{ fontSize: 13, padding: "6px 12px" }}
                  onClick={() =>
                    updateStatus(invoiceDetail.bookingID, "Cancelled")
                  }
                >
                  Hủy đơn
                </button>
              )}
              <button
                className="btn btn-outline"
                style={{
                  fontSize: 13,
                  padding: "6px 12px",
                  marginLeft: "auto",
                }}
                onClick={closeInvoice}
              >
                Đóng
              </button>
            </div>
          </>
        ) : (
          <p>Không tải được hóa đơn.</p>
        )}
      </div>
    </div>
  );

  // ── BƯỚC 2: danh sách đơn hàng của chuyến ──
  if (selectedTrip)
    return (
      <section className="admin-card table-card">
        {invoiceModal}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={() => {
              setSelectedTripId(null);
              setShowForm(false);
              setForm(EMPTY_BOOKING);
            }}
          >
            ← Quay lại
          </button>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>
              Đơn hàng — {selectedTrip.departureLocation} →{" "}
              {selectedTrip.arrivalLocation}
            </h3>
            <small style={{ color: "#666" }}>
              {formatDateTime(selectedTrip.departureTime)} ·{" "}
              {selectedTrip.operator} · {selectedTrip.busType} ·{" "}
              {formatVND(selectedTrip.price)}/ghế
            </small>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              toggleCreateForm(showForm, setShowForm, setForm, {
                ...EMPTY_BOOKING,
                tripID: selectedTrip.id,
              })
            }
          >
            <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />{" "}
            {showForm ? "Đóng" : "Thêm đơn"}
          </button>
        </div>

        {/* Form thêm đơn */}
        {showForm && (
          <AdminFormModal
            title="Thêm đơn đặt vé"
            onClose={() => cancelForm(setShowForm, setForm, EMPTY_BOOKING)}
          >
            <form className="admin-form-grid" onSubmit={submitBooking}>
              <input
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                placeholder="Tên khách"
                required
              />
              <input
                value={form.customerPhone}
                onChange={(e) =>
                  setForm({ ...form, customerPhone: e.target.value })
                }
                placeholder="SĐT"
                required
              />
              <input
                value={form.customerEmail}
                onChange={(e) =>
                  setForm({ ...form, customerEmail: e.target.value })
                }
                placeholder="Email"
              />
              <input
                type="number"
                min="1"
                value={form.totalSeats}
                onChange={(e) =>
                  setForm({ ...form, totalSeats: e.target.value })
                }
                placeholder="Số ghế"
                required
              />
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
              >
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
              </select>
              <select
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm({ ...form, paymentStatus: e.target.value })
                }
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <div className="admin-form-actions">
                <button className="btn btn-primary" type="submit">
                  Lưu đơn
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() =>
                    cancelForm(setShowForm, setForm, EMPTY_BOOKING)
                  }
                >
                  Hủy
                </button>
              </div>
            </form>
          </AdminFormModal>
        )}

        {/* Lọc đơn */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <input
            value={bSearch}
            onChange={(e) => {
              setBSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên, SĐT..."
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              flex: 1,
              minWidth: 150,
            }}
          />
          <select
            value={bStatus}
            onChange={(e) => {
              setBStatus(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            className="btn btn-outline"
            onClick={() => {
              setBSearch("");
              setBStatus("");
              setPage(1);
            }}
          >
            Xóa lọc
          </button>
        </div>
        <p style={{ color: "#666", marginBottom: 8 }}>
          Tìm thấy <b>{filteredBookings.length}</b> đơn / tổng{" "}
          <b>{tripBookings.length}</b> đơn của chuyến này
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>Ngày đặt</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th>Tổng tiền</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const id = pick(item, ["bookingID", "BookingID"]);
                const status = getPaymentStatus(item);
                return (
                  <tr key={id}>
                    <td>#{id}</td>
                    <td>{pick(item, ["customerName", "CustomerName"])}</td>
                    <td>{pick(item, ["customerPhone", "CustomerPhone"])}</td>
                    <td>
                      {formatDateTime(
                        pick(item, ["bookingDate", "BookingDate"]),
                      )}
                    </td>
                    <td>
                      {labelPaymentMethod(
                        pick(item, ["paymentMethod", "PaymentMethod"], ""),
                      )}
                    </td>
                    <td>
                      <span className="badge">{status}</span>
                    </td>
                    <td>
                      {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
                    </td>
                    <td className="admin-actions">
                      <button
                        className="btn btn-outline"
                        onClick={() => viewInvoice(id)}
                      >
                        <i className="fa-solid fa-file-invoice" /> HĐ
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() =>
                          updateStatus(
                            id,
                            status === "Paid" ? "Pending" : "Paid",
                          )
                        }
                      >
                        {status === "Paid" ? "Pending" : "Paid"}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeItem(id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>
    );

  // ── BƯỚC 1: danh sách chuyến xe ──
  return (
    <section className="admin-card table-card">
      <h3 style={{ marginBottom: 16 }}>Chọn chuyến xe để xem đơn hàng</h3>

      {/* Bộ lọc chuyến */}
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <input
          value={fSearch}
          onChange={(e) => {
            setFSearch(e.target.value);
            setTripPage(1);
          }}
          placeholder="Tìm tuyến, nhà xe..."
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            flex: 1,
            minWidth: 180,
          }}
        />
        {/* <select value={fOperator} onChange={e=>{setFOperator(e.target.value);setTripPage(1);}}
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',minWidth:140}}>
          <option value="">Tất cả nhà xe</option>
          {operators.map(t=><option key={t.id} value={t.operator}>{t.operator}</option>)}
        </select> */}
        <select
          value={fOperator}
          onChange={(e) => {
            setFOperator(e.target.value);
            setTripPage(1);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            minWidth: 140,
            maxWidth: 180,
          }}
        >
          <option value="">Tất cả nhà xe</option>
          {operators.map((o) => {
            const id = pick(o, ["operatorID", "OperatorID"]);
            const name = pick(o, ["name", "Name"]);
            return (
              <option key={id} value={name}>
                {name}
              </option>
            );
          })}
        </select>
        <input
          type="date"
          value={fDate}
          onChange={(e) => {
            setFDate(e.target.value);
            setTripPage(1);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
          }}
        />
        <select
          value={fStatus}
          onChange={(e) => {
            setFStatus(e.target.value);
            setTripPage(1);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button
          className="btn btn-outline"
          onClick={() => {
            setFSearch("");
            setFOperator("");
            setFDate("");
            setFStatus("");
            setTripPage(1);
          }}
        >
          Xóa lọc
        </button>
      </div>
      <p style={{ color: "#666", marginBottom: 8 }}>
        Tìm thấy <b>{filteredTrips.length}</b> chuyến
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tuyến</th>
              <th>Giờ đi</th>
              <th>Nhà xe</th>
              <th>Loại xe</th>
              <th>Giá</th>
              <th>Chỗ trống</th>
              <th>Trạng thái</th>
              <th>Đơn hàng</th>
            </tr>
          </thead>
          <tbody>
            {tripRows.map((t) => {
              const tripBookingCount = bookings.filter(
                (b) => String(pick(b, ["tripID", "TripID"])) === String(t.id),
              ).length;
              return (
                <tr
                  key={t.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedTripId(t.id);
                    setPage(1);
                  }}
                >
                  <td>#{t.id}</td>
                  <td>
                    <b>{t.departureLocation}</b> → <b>{t.arrivalLocation}</b>
                  </td>
                  <td>{formatDateTime(t.departureTime)}</td>
                  <td>{t.operator || "Chưa rõ"}</td>
                  <td>{t.busType || "Chưa rõ"}</td>
                  <td>{formatVND(t.price)}</td>
                  <td>{t.availableSeats}</td>
                  <td>
                    <span className="badge">{t.status || "Scheduled"}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 13, padding: "4px 12px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTripId(t.id);
                        setPage(1);
                      }}
                    >
                      <i className="fa-solid fa-ticket" /> {tripBookingCount}{" "}
                      đơn
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={tripPage}
        totalPages={tripTotalPages}
        onPageChange={setTripPage}
      />
    </section>
  );
}
