// import { useEffect, useMemo, useState } from "react";
// import { formatVND, labelBookingStatus, labelPaymentStatus, pick } from "../../api";
// import { dashboardApi } from "../../services/dashboardApi";
// import StatusBadge from "./components/StatusBadge";

// function toDateInput(value) {
//   return value.toISOString().slice(0, 10);
// }

// function buildRange(period) {
//   const now = new Date();
//   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

//   if (period === "today") {
//     return { fromDate: toDateInput(today), toDate: toDateInput(today) };
//   }

//   if (period === "month") {
//     return {
//       fromDate: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
//       toDate: toDateInput(today),
//     };
//   }

//   if (period === "year") {
//     return {
//       fromDate: toDateInput(new Date(now.getFullYear(), 0, 1)),
//       toDate: toDateInput(today),
//     };
//   }

//   const from = new Date(today);
//   from.setDate(from.getDate() - 6);
//   return { fromDate: toDateInput(from), toDate: toDateInput(today) };
// }

// function formatDate(value) {
//   return value ? new Date(value).toLocaleDateString("vi-VN") : "";
// }

// function formatDateTime(value) {
//   return value ? new Date(value).toLocaleString("vi-VN") : "";
// }

// function getPaymentStatus(item) {
//   return pick(item, ["paymentStatus", "PaymentStatus", "status", "Status"], "Pending");
// }

// function getMax(items, key) {
//   return Math.max(1, ...items.map((item) => Number(pick(item, [key, key[0].toUpperCase() + key.slice(1)], 0))));
// }

// function MiniBarChart({ items, valueKey = "revenue", labelFor, valueFor }) {
//   if (!items.length) {
//     return <div className="dashboard-empty">Chưa có dữ liệu trong khoảng thời gian này.</div>;
//   }

//   const max = getMax(items, valueKey);

//   return (
//     <div className="dashboard-bars">
//       {items.map((item, index) => {
//         const value = Number(pick(item, [valueKey, valueKey[0].toUpperCase() + valueKey.slice(1)], 0));
//         const height = Math.max(16, Math.round((value / max) * 150));
//         return (
//           <div className="dashboard-bar-item" key={`${labelFor(item)}-${index}`}>
//             <span>{valueFor ? valueFor(item) : formatVND(value)}</span>
//             <div className="dashboard-bar-track">
//               <div className="dashboard-bar" style={{ height }} />
//             </div>
//             <small>{labelFor(item)}</small>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function RankTable({ title, items, nameFor }) {
//   return (
//     <div className="admin-card dashboard-rank-card">
//       <h3>{title}</h3>
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>Tên</th>
//               <th>Doanh thu</th>
//               <th>Booking</th>
//               <th>Vé</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((item, index) => (
//               <tr key={`${nameFor(item)}-${index}`}>
//                 <td><b>{nameFor(item)}</b></td>
//                 <td>{formatVND(pick(item, ["revenue", "Revenue"], 0))}</td>
//                 <td>{pick(item, ["bookingCount", "BookingCount"], 0)}</td>
//                 <td>{pick(item, ["ticketCount", "TicketCount"], 0)}</td>
//               </tr>
//             ))}
//             {items.length === 0 && (
//               <tr>
//                 <td colSpan="4" className="empty-cell">Chưa có dữ liệu.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// function DashboardTripsTable({ trips }) {
//   return (
//     <div className="table-wrap">
//       <table>
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Tuyến</th>
//             <th>Giờ đi</th>
//             <th>Nhà xe</th>
//             <th>Loại xe</th>
//             <th>Chỗ</th>
//             <th>Giá</th>
//           </tr>
//         </thead>
//         <tbody>
//           {trips.map((trip) => {
//             const id = pick(trip, ["tripID", "TripID", "id"]);
//             return (
//               <tr key={id}>
//                 <td>{id}</td>
//                 <td>
//                   <b>{trip.departureLocation}</b>
//                   {" -> "}
//                   <b>{trip.arrivalLocation}</b>
//                 </td>
//                 <td>{formatDateTime(trip.departureTime)}</td>
//                 <td>{trip.operator || "Chưa rõ"}</td>
//                 <td>{trip.busType || "Chưa rõ"}</td>
//                 <td>{trip.availableSeats}</td>
//                 <td>{formatVND(trip.price)}</td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default function AdminDashboard({
//   stats,
//   trips,
//   upcomingTrips,
//   bookings,
//   buses = [],
//   operators = [],
//   users = [],
//   isOperator = false,
// }) {
//   const [period, setPeriod] = useState("7days");
//   const [dashboard, setDashboard] = useState({
//     summary: null,
//     revenueByDay: [],
//     revenueByMonth: [],
//     topRoutes: [],
//     topOperators: [],
//     statusStats: { paymentStatuses: [], bookingStatuses: [] },
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const range = useMemo(() => buildRange(period), [period]);

//   useEffect(() => {
//     let alive = true;
//     const load = async () => {
//       setLoading(true);
//       setError("");
//       try {
//         const params = { ...range };
//   //       const [summary, revenueByDay, revenueByMonth, topRoutes, topOperators, statusStats] = await Promise.all([
//   //         dashboardApi.adminSummary(params),
//   //         dashboardApi.revenueByDay(params),
//   //         dashboardApi.revenueByMonth(params),
//   //         dashboardApi.topRoutes({ ...params, take: 5 }),
//   //         dashboardApi.topOperators({ ...params, take: 5 }),
//   //         dashboardApi.bookingStatusStatistics(params),
//   //       ]);

//   //       if (!alive) return;
//   //       setDashboard({
//   //         summary,
//   //         revenueByDay: Array.isArray(revenueByDay) ? revenueByDay : [],
//   //         revenueByMonth: Array.isArray(revenueByMonth) ? revenueByMonth : [],
//   //         topRoutes: Array.isArray(topRoutes) ? topRoutes : [],
//   //         topOperators: Array.isArray(topOperators) ? topOperators : [],
//   //         statusStats: statusStats || { paymentStatuses: [], bookingStatuses: [] },
//   //       });
//   //     } catch (err) {
//   //       if (alive) setError(err.message || "Không tải được thống kê dashboard.");
//   //     } finally {
//   //       if (alive) setLoading(false);
//   //     }
//   //   };

//   //   load();
//   //   return () => {
//   //     alive = false;
//   //   };
//   // }, [range.fromDate, range.toDate]);
//    const [summary, revenueByDay, revenueByMonth, topRoutes, topOperators, statusStats] =
//           await Promise.all([
//             dashboardApi.adminSummary(params),
//             dashboardApi.revenueByDay(params),
//             dashboardApi.revenueByMonth(params),
//             dashboardApi.topRoutes({ ...params, take: 5 }),
//             isOperator
//               ? Promise.resolve([])   // ← operator bỏ qua, không gọi
//               : dashboardApi.topOperators({ ...params, take: 5 }),
//             dashboardApi.bookingStatusStatistics(params),
//           ]);
 
//         if (!alive) return;
//         setDashboard({
//           summary,
//           revenueByDay:   Array.isArray(revenueByDay)   ? revenueByDay   : [],
//           revenueByMonth: Array.isArray(revenueByMonth) ? revenueByMonth : [],
//           topRoutes:      Array.isArray(topRoutes)      ? topRoutes      : [],
//           topOperators:   Array.isArray(topOperators)   ? topOperators   : [],
//           statusStats: statusStats || { paymentStatuses: [], bookingStatuses: [] },
//         });
//       } catch (err) {
//         if (alive) setError(err.message || 'Không tải được thống kê dashboard.');
//       } finally {
//         if (alive) setLoading(false);
//       }
//     };
 
//     load();
//     return () => { alive = false; };
//   }, [range.fromDate, range.toDate, isOperator]);
 

//   const summary = dashboard.summary || stats || {};
//   // const cards = [
//   //   ["Tổng doanh thu", formatVND(pick(summary, ["totalRevenue", "TotalRevenue", "revenue", "Revenue"], 0)), "fa-money-bill-wave", "#ea580c"],
//   //   ["Doanh thu hôm nay", formatVND(pick(summary, ["todayRevenue", "TodayRevenue"], 0)), "fa-calendar-day", "#16a34a"],
//   //   ["Doanh thu tháng này", formatVND(pick(summary, ["monthRevenue", "MonthRevenue"], 0)), "fa-calendar-check", "#0ea5e9"],
//   //   ["Booking", pick(summary, ["totalBookings", "TotalBookings"], bookings.length), "fa-file-invoice", "#2563eb"],
//   //   ["Vé đã bán", pick(summary, ["totalTicketsSold", "TotalTicketsSold"], 0), "fa-ticket", "#7c3aed"],
//   //   ["Chuyến xe", pick(summary, ["totalTrips", "TotalTrips"], trips.length), "fa-route", "#db2777"],
//   //   ["Người dùng", pick(summary, ["totalUsers", "TotalUsers"], users.length), "fa-users", "#0891b2"],
//   //   ["Nhà xe", pick(summary, ["totalOperators", "TotalOperators"], operators.length), "fa-building", "#475569"],
//   //   ["Xe", pick(summary, ["totalBuses", "TotalBuses"], buses.length), "fa-bus", "#65a30d"],
//   //   ["Chờ thanh toán", pick(summary, ["pendingPaymentCount", "PendingPaymentCount"], 0), "fa-clock", "#f59e0b"],
//   //   ["Đã thanh toán", pick(summary, ["paidCount", "PaidCount"], 0), "fa-circle-check", "#16a34a"],
//   //   ["Chờ duyệt hủy", pick(summary, ["cancelRequestedCount", "CancelRequestedCount"], 0), "fa-rotate-left", "#dc2626"],
//   // ];
//   const commonCards = [
//     ['Tổng doanh thu',      formatVND(pick(summary, ['totalRevenue',     'TotalRevenue',     'revenue', 'Revenue'], 0)), 'fa-money-bill-wave', '#ea580c'],
//     ['Doanh thu hôm nay',   formatVND(pick(summary, ['todayRevenue',     'TodayRevenue'],     0)),                       'fa-calendar-day',   '#16a34a'],
//     ['Doanh thu tháng này', formatVND(pick(summary, ['monthRevenue',     'MonthRevenue'],     0)),                       'fa-calendar-check', '#0ea5e9'],
//     ['Booking',             pick(summary, ['totalBookings', 'TotalBookings'], bookings.length),                          'fa-file-invoice',   '#2563eb'],
//     ['Vé đã bán',           pick(summary, ['totalTicketsSold', 'TotalTicketsSold'], 0),                                  'fa-ticket',         '#7c3aed'],
//     ['Chuyến xe',           pick(summary, ['totalTrips',    'TotalTrips'],    trips.length),                             'fa-route',          '#db2777'],
//     ['Xe',                  pick(summary, ['totalBuses',    'TotalBuses'],    buses.length),                             'fa-bus',            '#65a30d'],
//     ['Chờ thanh toán',      pick(summary, ['pendingPaymentCount', 'PendingPaymentCount'], 0),                            'fa-clock',          '#f59e0b'],
//     ['Đã thanh toán',       pick(summary, ['paidCount',     'PaidCount'],     0),                                        'fa-circle-check',   '#16a34a'],
//     ['Chờ duyệt hủy',       pick(summary, ['cancelRequestedCount', 'CancelRequestedCount'], 0),                         'fa-rotate-left',    '#dc2626'],
//   ];
//   const adminOnlyCards = [
//     ['Người dùng', pick(summary, ['totalUsers',     'TotalUsers'],     users.length),     'fa-users',    '#0891b2'],
//     ['Nhà xe',     pick(summary, ['totalOperators', 'TotalOperators'], operators.length), 'fa-building', '#475569'],
//   ];
 
//   const cards = isOperator
//     ? commonCards                          // operator: không thấy "Người dùng" và "Nhà xe"
//     : [...commonCards, ...adminOnlyCards];

//   const bookingStatuses = dashboard.statusStats?.bookingStatuses || dashboard.statusStats?.BookingStatuses || [];
//   const paymentStatuses = dashboard.statusStats?.paymentStatuses || dashboard.statusStats?.PaymentStatuses || [];

//   return (
//     <>
//       <div className="dashboard-toolbar">
//         <div>
//           <h2>Dashboard vận hành</h2>
//           <p>
//             Doanh thu chỉ tính đơn <b>đã thanh toán</b> và <b>đã xác nhận</b>; đơn hủy/hoàn tiền không được tính.
//           </p>
//         </div>
//         <div className="dashboard-periods">
//           {[
//             ["today", "Hôm nay"],
//             ["7days", "7 ngày"],
//             ["month", "Tháng này"],
//             ["year", "Năm nay"],
//           ].map(([value, label]) => (
//             <button
//               type="button"
//               className={period === value ? "active" : ""}
//               onClick={() => setPeriod(value)}
//               key={value}
//             >
//               {label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {error && <div className="error-msg">{error}</div>}
//       {loading && <div className="admin-loading">Đang tải thống kê...</div>}

//       <section className="admin-stats dashboard-stats">
//         {cards.map(([label, value, icon, color]) => (
//           <div className="stat-card" key={label} style={{ borderLeft: `4px solid ${color}` }}>
//             <div>
//               <p>{label}</p>
//               <h2>{value}</h2>
//             </div>
//             <i className={`fa-solid ${icon}`} style={{ color }} />
//           </div>
//         ))}
//       </section>

//       {/* <section className="dashboard-chart-grid">
//         <div className="admin-card">
//           <h3>Doanh thu theo ngày</h3>
//           <MiniBarChart
//             items={dashboard.revenueByDay}
//             labelFor={(item) => formatDate(pick(item, ["date", "Date"]))}
//           />
//         </div>
//         <div className="admin-card">
//           <h3>Doanh thu theo tháng</h3>
//           <MiniBarChart
//             items={dashboard.revenueByMonth}
//             labelFor={(item) => `${pick(item, ["month", "Month"])}/${pick(item, ["year", "Year"])}`}
//           />
//         </div>
//       </section> */}
//       <section className="dashboard-chart-grid">
//         <RankTable
//           title="Top tuyến bán chạy"
//           items={dashboard.topRoutes}
//           nameFor={(item) => pick(item, ['route', 'Route'], 'Chưa rõ tuyến')}
//         />
//         {/* Operator không cần xem ranking nhà xe khác */}
//         {!isOperator && (
//           <RankTable
//             title="Top nhà xe doanh thu cao"
//             items={dashboard.topOperators}
//             nameFor={(item) => pick(item, ['operatorName', 'OperatorName'], 'Chưa rõ nhà xe')}
//           />
//         )}
//       </section>

//       {/* <section className="dashboard-chart-grid"> */}
//         {/* <RankTable */}
//           {/* title="Top tuyến bán chạy" */}
//           {/* items={dashboard.topRoutes}
//           nameFor={(item) => pick(item, ["route", "Route"], "Chưa rõ tuyến")}
//         />
//         <RankTable
//           title="Top nhà xe doanh thu cao"
//           items={dashboard.topOperators}
//           nameFor={(item) => pick(item, ["operatorName", "OperatorName"], "Chưa rõ nhà xe")}
//         />
//       </section> */}

//       {/* <section className="dashboard-chart-grid">
//         <div className="admin-card">
//           <h3>Trạng thái booking</h3>
//           <div className="dashboard-status-list">
//             {bookingStatuses.map((item) => (
//               <div key={pick(item, ["status", "Status"])}>
//                 <StatusBadge>{labelBookingStatus(pick(item, ["status", "Status"]))}</StatusBadge>
//                 <strong>{pick(item, ["count", "Count"], 0)}</strong>
//               </div>
//             ))}
//           </div>
//         </div>
//         <div className="admin-card">
//           <h3>Trạng thái thanh toán</h3>
//           <div className="dashboard-status-list">
//             {paymentStatuses.map((item) => (
//               <div key={pick(item, ["status", "Status"])}>
//                 <StatusBadge>{labelPaymentStatus(pick(item, ["status", "Status"]))}</StatusBadge>
//                 <strong>{pick(item, ["count", "Count"], 0)}</strong>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section> */}
//     <section className="dashboard-chart-grid">
//       <div className="admin-card">
//         <h3>Trạng thái booking</h3>
//         <div className="dashboard-status-list">
//           {bookingStatuses.map((item) => (
//             <div key={pick(item, ["status", "Status"])}>
//               <StatusBadge>{labelBookingStatus(pick(item, ["status", "Status"]))}</StatusBadge>
//               <strong>{pick(item, ["count", "Count"], 0)}</strong>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* ↓ Operator không cần xem trạng thái thanh toán tổng */}
//       {!isOperator && (
//         <div className="admin-card">
//           <h3>Trạng thái thanh toán</h3>
//           <div className="dashboard-status-list">
//             {paymentStatuses.map((item) => (
//               <div key={pick(item, ["status", "Status"])}>
//                 <StatusBadge>{labelPaymentStatus(pick(item, ["status", "Status"]))}</StatusBadge>
//                 <strong>{pick(item, ["count", "Count"], 0)}</strong>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </section>
//       <section className="admin-grid">
//         <div className="admin-card">
//           <h3>Chuyến sắp chạy</h3>
//           <DashboardTripsTable trips={upcomingTrips.slice(0, 5)} />
//         </div>
//         <div className="admin-card">
//           <h3>Đơn đặt vé mới nhất</h3>
//           <div className="table-wrap">
//             <table>
//               <thead>
//                 <tr>
//                   <th>ID</th>
//                   <th>Khách</th>
//                   <th>Tuyến</th>
//                   <th>Thanh toán</th>
//                   <th>Tiền</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {bookings.slice(0, 6).map((booking) => {
//                   const id = pick(booking, ["bookingID", "BookingID"]);
//                   return (
//                     <tr key={id}>
//                       <td>{id}</td>
//                       <td>{pick(booking, ["customerName", "CustomerName"])}</td>
//                       <td>{pick(booking, ["route", "Route"]) || "..."}</td>
//                       <td>
//                         <StatusBadge>{labelPaymentStatus(getPaymentStatus(booking))}</StatusBadge>
//                       </td>
//                       <td>{formatVND(pick(booking, ["totalPrice", "TotalPrice"], 0))}</td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </section>
//     </>
//   );
// }

import { useEffect, useMemo, useState } from "react";
import { formatVND, labelBookingStatus, labelPaymentStatus, pick } from "../../api";
import { dashboardApi } from "../../services/dashboardApi";
import StatusBadge from "./components/StatusBadge";

function toDateInput(value) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    return { fromDate: toDateInput(today), toDate: toDateInput(today) };
  }
  if (period === "month") {
    return {
      fromDate: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
      toDate: toDateInput(today),
    };
  }
  if (period === "year") {
    return {
      fromDate: toDateInput(new Date(now.getFullYear(), 0, 1)),
      toDate: toDateInput(today),
    };
  }

  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  return { fromDate: toDateInput(from), toDate: toDateInput(today) };
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("vi-VN") : "";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("vi-VN") : "";
}

function getPaymentStatus(item) {
  return pick(item, ["paymentStatus", "PaymentStatus", "status", "Status"], "Pending");
}

function getMax(items, key) {
  return Math.max(
    1,
    ...items.map((item) =>
      Number(pick(item, [key, key[0].toUpperCase() + key.slice(1)], 0))
    )
  );
}

function MiniBarChart({ items, valueKey = "revenue", labelFor, valueFor }) {
  if (!items.length) {
    return (
      <div className="dashboard-empty">
        Chưa có dữ liệu trong khoảng thời gian này.
      </div>
    );
  }

  const max = getMax(items, valueKey);

  return (
    <div className="dashboard-bars">
      {items.map((item, index) => {
        const value = Number(
          pick(item, [valueKey, valueKey[0].toUpperCase() + valueKey.slice(1)], 0)
        );
        const height = Math.max(16, Math.round((value / max) * 150));
        return (
          <div className="dashboard-bar-item" key={`${labelFor(item)}-${index}`}>
            <span>{valueFor ? valueFor(item) : formatVND(value)}</span>
            <div className="dashboard-bar-track">
              <div className="dashboard-bar" style={{ height }} />
            </div>
            <small>{labelFor(item)}</small>
          </div>
        );
      })}
    </div>
  );
}

function RankTable({ title, items, nameFor }) {
  return (
    <div className="admin-card dashboard-rank-card">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Doanh thu</th>
              <th>Booking</th>
              <th>Vé</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${nameFor(item)}-${index}`}>
                <td>
                  <b>{nameFor(item)}</b>
                </td>
                <td>{formatVND(pick(item, ["revenue", "Revenue"], 0))}</td>
                <td>{pick(item, ["bookingCount", "BookingCount"], 0)}</td>
                <td>{pick(item, ["ticketCount", "TicketCount"], 0)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="4" className="empty-cell">
                  Chưa có dữ liệu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BAR_COLORS = [
  "linear-gradient(180deg,#fcd34d,#f59e0b)",
  "linear-gradient(180deg,#86efac,#16a34a)",
  "linear-gradient(180deg,#38bdf8,#2563eb)",
];

function ComparisonChart({ period, revenueByDay, revenueByMonth }) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let items = [];

  if (period === "today") {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const dStr = toDateInput(d);
      const found = revenueByDay.find(x => {
        const raw = pick(x, ["date", "Date"]);
        return raw ? toDateInput(new Date(raw)) === dStr : false;
      });
      items.push({
        label: i === 0 ? "Hôm nay" : i === 1 ? "Hôm qua" : formatDate(d),
        revenue: found ? Number(pick(found, ["revenue", "Revenue"], 0)) : 0,
      });
    }
  } else if (period === "7days") {
    for (let w = 2; w >= 0; w--) {
      const wEnd   = new Date(today); wEnd.setDate(today.getDate() - w * 7);
      const wStart = new Date(wEnd);  wStart.setDate(wEnd.getDate() - 6);
      const revenue = revenueByDay
        .filter(x => { const d = new Date(pick(x, ["date", "Date"])); return d >= wStart && d <= wEnd; })
        .reduce((s, x) => s + Number(pick(x, ["revenue", "Revenue"], 0)), 0);
      items.push({ label: w === 0 ? "Tuần này" : w === 1 ? "Tuần trước" : "2 tuần trước", revenue });
    }
  } else if (period === "month") {
    for (let m = 2; m >= 0; m--) {
      const d  = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const mm = d.getMonth() + 1, yy = d.getFullYear();
      const found = revenueByMonth.find(x =>
        Number(pick(x, ["month", "Month"])) === mm && Number(pick(x, ["year", "Year"])) === yy
      );
      items.push({
        label: m === 0 ? "Tháng này" : `T${mm}/${yy}`,
        revenue: found ? Number(pick(found, ["revenue", "Revenue"], 0)) : 0,
      });
    }
  } else {
    for (let y = 2; y >= 0; y--) {
      const yr = today.getFullYear() - y;
      const revenue = revenueByMonth
        .filter(x => Number(pick(x, ["year", "Year"])) === yr)
        .reduce((s, x) => s + Number(pick(x, ["revenue", "Revenue"], 0)), 0);
      items.push({ label: y === 0 ? "Năm nay" : String(yr), revenue });
    }
  }

  const max    = Math.max(1, ...items.map(x => x.revenue));
  const allZero = items.every(x => x.revenue === 0);

  if (allZero) return <div className="dashboard-empty">Chưa có dữ liệu để so sánh.</div>;

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-end", padding: "16px 32px 0", minHeight: 220 }}>
      {items.map((item, i) => {
        const height = Math.max(20, Math.round((item.revenue / max) * 160));
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1f3b63" }}>{formatVND(item.revenue)}</span>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", height: 160, background: "#f1f5f9", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ width: "100%", height, background: BAR_COLORS[i], borderRadius: "10px 10px 0 0", transition: "height 0.4s ease" }} />
            </div>
            <small style={{ fontWeight: 700, color: i === 2 ? "#1e40af" : "#64748b", fontSize: "0.88rem" }}>{item.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function DashboardTripsTable({ trips }) {
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
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => {
            const id = pick(trip, ["tripID", "TripID", "id"]);
            return (
              <tr key={id}>
                <td>{id}</td>
                <td>
                  <b>{trip.departureLocation}</b>
                  {" → "}
                  <b>{trip.arrivalLocation}</b>
                </td>
                <td>{formatDateTime(trip.departureTime)}</td>
                <td>{trip.operator || "Chưa rõ"}</td>
                <td>{trip.busType || "Chưa rõ"}</td>
                <td>{trip.availableSeats}</td>
                <td>{formatVND(trip.price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard({
  stats,
  trips,
  upcomingTrips,
  bookings,
  buses = [],
  operators = [],
  users = [],
  isOperator = false,
}) {
  const [period, setPeriod] = useState("7days");
  const periodLabels = { today: "hôm nay", "7days": "7 ngày qua", month: "tháng này", year: "năm nay" };
  const [dashboard, setDashboard] = useState({
    summary: null,
    revenueByDay: [],
    revenueByMonth: [],
    topRoutes: [],
    topOperators: [],
    statusStats: { paymentStatuses: [], bookingStatuses: [] },
    recentBookings: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => buildRange(period), [period]);

  // Chart ranges cố định: đủ dữ liệu cho mọi period (3 tuần ngày, 3 năm tháng)
  const chartRanges = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day21Start   = new Date(today); day21Start.setDate(today.getDate() - 20);   // 21 ngày = 3 tuần
    const month36Start = new Date(today); month36Start.setMonth(today.getMonth() - 35); // 36 tháng = 3 năm
    return {
      day:   { fromDate: toDateInput(day21Start),   toDate: toDateInput(today) },
      month: { fromDate: toDateInput(month36Start), toDate: toDateInput(today) },
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { ...range };
        const [
          summary,
          revenueByDay,
          revenueByMonth,
          topRoutes,
          topOperators,
          statusStats,
          recentBookings,
        ] = await Promise.all([
          dashboardApi.adminSummary(params),
          dashboardApi.revenueByDay(chartRanges.day),     // luôn 7 ngày
          dashboardApi.revenueByMonth(chartRanges.month), // luôn 3 tháng
          dashboardApi.topRoutes({ ...params, take: 5 }),
          isOperator
            ? Promise.resolve([])
            : dashboardApi.topOperators({ ...params, take: 5 }),
          dashboardApi.bookingStatusStatistics(params),
          dashboardApi.recentBookings().catch(() => []),
        ]);

        if (!alive) return;
        setDashboard({
          summary,
          revenueByDay: Array.isArray(revenueByDay) ? revenueByDay : [],
          revenueByMonth: Array.isArray(revenueByMonth) ? revenueByMonth : [],
          topRoutes: Array.isArray(topRoutes) ? topRoutes : [],
          topOperators: Array.isArray(topOperators) ? topOperators : [],
          statusStats: statusStats || { paymentStatuses: [], bookingStatuses: [] },
          recentBookings: Array.isArray(recentBookings) ? recentBookings : [],
        });
      } catch (err) {
        if (alive) setError(err.message || "Không tải được thống kê dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [range.fromDate, range.toDate, isOperator]);

  const COMMISSION_RATE = 5; // % hoa hồng admin

  const summary = dashboard.summary || stats || {};

  // helpers
  const pv  = (keys, fallback = 0) => pick(summary, keys, fallback);
  const pvf = (keys)               => formatVND(pv(keys));

  const pendingCount    = pv(["pendingPaymentCount",  "PendingPaymentCount"]);
  const cancelReqCount  = pv(["cancelRequestedCount", "CancelRequestedCount"]);
  const ongoingCount    = pv(["ongoingTripsCount",    "OngoingTripsCount"]);
  const scheduledCount  = pv(["scheduledTripsCount",  "ScheduledTripsCount"]);

  // ── Nhóm 1: Cần xử lý ngay (actionable)
  const urgentCards = [
    { label: "Đơn chờ xác nhận",  value: pendingCount,   icon: "fa-hourglass-half", color: "#f59e0b", urgent: pendingCount > 0   },
    { label: "Yêu cầu hủy vé",    value: cancelReqCount, icon: "fa-rotate-left",    color: "#dc2626", urgent: cancelReqCount > 0 },
    { label: "Chuyến đang chạy",   value: ongoingCount,   icon: "fa-bus-simple",     color: "#2563eb", urgent: false              },
    { label: "Chuyến đã lên lịch", value: scheduledCount, icon: "fa-calendar-check", color: "#0ea5e9", urgent: false              },
  ];

  // ── Nhóm 2: Doanh thu & vé theo kỳ đã chọn
  const revenueCards = [
    { label: `Doanh thu ${periodLabels[period] ?? period}`, value: pvf(["revenueInRange",     "RevenueInRange"]),                       icon: "fa-money-bill-wave", color: "#16a34a" },
    { label: "Tổng doanh thu (all-time)",                   value: pvf(["totalRevenue",        "TotalRevenue", "revenue", "Revenue"]),   icon: "fa-chart-pie",       color: "#ea580c" },
    { label: "Booking trong kỳ",                            value: pv( ["filteredBookings",    "FilteredBookings"]),                     icon: "fa-file-invoice",    color: "#2563eb" },
    { label: "Vé bán trong kỳ",                             value: pv( ["ticketsSoldInRange",  "TicketsSoldInRange"]),                   icon: "fa-ticket",          color: "#7c3aed" },
  ];

  // ── Nhóm 3: Tổng quan đội xe / hệ thống
  const fleetCards = [
    { label: "Số xe",           value: pv(["totalBuses",     "TotalBuses"],     buses.length),     icon: "fa-bus",      color: "#65a30d" },
    { label: "Đã hoàn thành",   value: pv(["paidCount",      "PaidCount"]),                        icon: "fa-circle-check", color: "#16a34a" },
  ];
  const adminFleetCards = [
    { label: "Người dùng", value: pv(["totalUsers",     "TotalUsers"],     users.length),     icon: "fa-users",    color: "#0891b2" },
    { label: "Nhà xe",     value: pv(["totalOperators", "TotalOperators"], operators.length), icon: "fa-building", color: "#475569" },
  ];

  const bookingStatuses =
    dashboard.statusStats?.bookingStatuses ||
    dashboard.statusStats?.BookingStatuses ||
    [];
  const paymentStatuses =
    dashboard.statusStats?.paymentStatuses ||
    dashboard.statusStats?.PaymentStatuses ||
    [];

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="dashboard-toolbar">
        <div>
          <h2>Dashboard vận hành</h2>
          <p>
            Doanh thu chỉ tính đơn <b>đã thanh toán</b> và <b>đã xác nhận</b>;
            đơn hủy/hoàn tiền không được tính.
          </p>
        </div>
        <div className="dashboard-periods">
          {[
            ["today", "Hôm nay"],
            ["7days", "7 ngày"],
            ["month", "Tháng này"],
            ["year",  "Năm nay"],
          ].map(([value, label]) => (
            <button
              type="button"
              className={period === value ? "active" : ""}
              onClick={() => setPeriod(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error   && <div className="error-msg">{error}</div>}
      {loading && <div className="admin-loading">Đang tải thống kê...</div>}

      {/* ── Nhóm 1: Cần xử lý ngay ── */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: (pendingCount > 0 || cancelReqCount > 0) ? "#dc2626" : "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          {(pendingCount > 0 || cancelReqCount > 0) ? "⚠ Cần xử lý ngay" : "Hoạt động vận hành"}
        </p>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
          {urgentCards.map(({ label, value, icon, color, urgent }) => (
            <div key={label} className="stat-card" style={{
              borderLeft: `4px solid ${urgent && value > 0 ? "#dc2626" : color}`,
              background: urgent && value > 0 ? "#fff8f0" : "#fff",
            }}>
              <div>
                <p style={{ color: urgent && value > 0 ? "#b45309" : undefined }}>{label}</p>
                <h2 style={{ color: urgent && value > 0 ? "#dc2626" : undefined, fontSize: "2rem" }}>{value}</h2>
              </div>
              <i className={`fa-solid ${icon}`} style={{ color: urgent && value > 0 ? "#dc2626" : color }} />
            </div>
          ))}
        </section>
      </div>

      {/* ── Nhóm 2: Doanh thu & vé (theo kỳ đã chọn) ── */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Doanh thu & vé — {periodLabels[period] ?? period}
        </p>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
          {revenueCards.map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
              <div>
                <p>{label}</p>
                <h2>{value}</h2>
              </div>
              <i className={`fa-solid ${icon}`} style={{ color }} />
            </div>
          ))}
        </section>
      </div>

      {/* ── Hoa hồng Admin (chỉ hiện với Admin, không hiện Operator) ── */}
      {!isOperator && (() => {
        const revenueInRange = pv(["revenueInRange", "RevenueInRange"]);
        const totalRevenue   = pv(["totalRevenue", "TotalRevenue", "revenue", "Revenue"]);
        const commissionInRange = revenueInRange * COMMISSION_RATE / 100;
        const commissionTotal   = totalRevenue   * COMMISSION_RATE / 100;
        return (
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Hoa hồng nền tảng ({COMMISSION_RATE}% / vé)
            </p>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
              {[
                { label: `Hoa hồng ${periodLabels[period] ?? period}`, value: formatVND(commissionInRange), icon: "fa-hand-holding-dollar", color: "#7c3aed" },
                { label: "Hoa hồng all-time",                          value: formatVND(commissionTotal),   icon: "fa-sack-dollar",         color: "#a855f7" },
                { label: "Tỉ lệ hoa hồng",                            value: `${COMMISSION_RATE}%`,        icon: "fa-percent",             color: "#6d28d9" },
                { label: "Doanh thu nhà xe giữ lại",                   value: formatVND(revenueInRange - commissionInRange), icon: "fa-building", color: "#475569" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
                  <div><p>{label}</p><h2 style={{ fontSize: "1.35rem" }}>{value}</h2></div>
                  <i className={`fa-solid ${icon}`} style={{ color }} />
                </div>
              ))}
            </section>
          </div>
        );
      })()}

      {/* ── Nhóm 3: Tổng quan đội xe ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Đội xe & hệ thống
        </p>
        <section style={{ display: "grid", gridTemplateColumns: `repeat(${isOperator ? 2 : 4}, minmax(0,1fr))`, gap: 16 }}>
          {fleetCards.map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
              <div><p>{label}</p><h2>{value}</h2></div>
              <i className={`fa-solid ${icon}`} style={{ color }} />
            </div>
          ))}
          {!isOperator && adminFleetCards.map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
              <div><p>{label}</p><h2>{value}</h2></div>
              <i className={`fa-solid ${icon}`} style={{ color }} />
            </div>
          ))}
        </section>
      </div>

      {/* ── Zone 3: Biểu đồ so sánh (3 mốc cùng trục, đổi theo period) ── */}
      <section style={{ marginBottom: 20 }}>
        <div className="admin-card">
          <h3>
            {{
              today:  "So sánh 3 ngày gần nhất",
              "7days": "So sánh 3 tuần gần nhất",
              month:  "So sánh 3 tháng gần nhất",
              year:   "So sánh 3 năm gần nhất",
            }[period] ?? "So sánh doanh thu"}
          </h3>
          <ComparisonChart
            period={period}
            revenueByDay={dashboard.revenueByDay}
            revenueByMonth={dashboard.revenueByMonth}
          />
        </div>
      </section>

      {/* ── Zone 4+5: Top tuyến | Trạng thái booking  (và admin thêm Top nhà xe | Trạng thái thanh toán) ── */}
      <section className="dashboard-chart-grid">
        <RankTable
          title="Top tuyến bán chạy"
          items={dashboard.topRoutes}
          nameFor={(item) => pick(item, ["route", "Route"], "Chưa rõ tuyến")}
        />
        <div className="admin-card">
          <h3>Trạng thái booking</h3>
          <div className="dashboard-status-list">
            {bookingStatuses.length === 0
              ? <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>Chưa có dữ liệu.</p>
              : bookingStatuses.map((item) => (
                  <div key={pick(item, ["status", "Status"])}>
                    <StatusBadge>{labelBookingStatus(pick(item, ["status", "Status"]))}</StatusBadge>
                    <strong>{pick(item, ["count", "Count"], 0)}</strong>
                  </div>
                ))
            }
          </div>
        </div>
        {!isOperator && (
          <RankTable
            title="Top nhà xe doanh thu cao"
            items={dashboard.topOperators}
            nameFor={(item) => pick(item, ["operatorName", "OperatorName"], "Chưa rõ nhà xe")}
          />
        )}
        {!isOperator && (
          <div className="admin-card">
            <h3>Trạng thái thanh toán</h3>
            <div className="dashboard-status-list">
              {paymentStatuses.map((item) => (
                <div key={pick(item, ["status", "Status"])}>
                  <StatusBadge>{labelPaymentStatus(pick(item, ["status", "Status"]))}</StatusBadge>
                  <strong>{pick(item, ["count", "Count"], 0)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Zone 6: Chuyến sắp chạy + Đơn mới nhất (scroll) ── */}
      <section className="admin-grid">
        <div className="admin-card">
          <h3>Chuyến sắp chạy</h3>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            <DashboardTripsTable trips={upcomingTrips} />
          </div>
        </div>
        <div className="admin-card">
          <h3>Đơn đặt vé mới nhất</h3>
          <div className="table-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Khách</th>
                  <th>Tuyến</th>
                  <th>Trạng thái</th>
                  <th>Tiền</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentBookings.slice(0, 10).map((booking) => {
                  const id = pick(booking, ["bookingID", "BookingID"]);
                  return (
                    <tr key={id}>
                      <td>{id}</td>
                      <td>{pick(booking, ["customerName", "CustomerName"])}</td>
                      <td>{pick(booking, ["route", "Route"]) || "..."}</td>
                      <td>
                        <StatusBadge>
                          {labelBookingStatus(pick(booking, ["bookingStatus", "BookingStatus"]))}
                        </StatusBadge>
                      </td>
                      <td>{formatVND(pick(booking, ["totalPrice", "TotalPrice"], 0))}</td>
                    </tr>
                  );
                })}
                {dashboard.recentBookings.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}>Chưa có đơn nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

