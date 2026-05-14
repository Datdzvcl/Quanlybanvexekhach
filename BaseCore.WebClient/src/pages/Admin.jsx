// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { apiFetch, formatVND, normalizeTrip, pick } from "../api";
// const PAGE_SIZE = 20;
// const tabs = [
//   ["dashboard", "Tổng quan", "fa-chart-line"],
//   ["trips", "Chuyến xe", "fa-route"],
//   ["bookings", "Đặt vé", "fa-ticket"],
//   ["tickets", "Quản lý vé", "fa-couch"],
//   ["transactions", "Giao dịch", "fa-money-bill-wave"],
//   ["buses", "Xe", "fa-bus"],
//   ["operators", "Nhà xe", "fa-building"],
// ];
// const EMPTY_TRIP = {
//   tripID: null,
//   busID: "",
//   departureLocation: "",
//   arrivalLocation: "",
//   departureTime: "",
//   arrivalTime: "",
//   price: "",
//   availableSeats: "",
//   status: "Scheduled",
// };
// const EMPTY_BUS = {
//   busID: null,
//   operatorID: "",
//   licensePlate: "",
//   capacity: "",
//   busType: "",
// };
// const EMPTY_OPERATOR = {
//   operatorID: null,
//   name: "",
//   description: "",
//   contactPhone: "",
//   email: "",
// };
// const EMPTY_BOOKING = {
//   tripID: "",
//   customerName: "",
//   customerPhone: "",
//   customerEmail: "",
//   totalSeats: 1,
//   paymentMethod: "Online",
//   paymentStatus: "Pending",
// };
// export default function Admin() {
//   const navigate = useNavigate();
//   const [active, setActive] = useState("dashboard");
//   const [stats, setStats] = useState({});
//   const [trips, setTrips] = useState([]);
//   const [bookings, setBookings] = useState([]);
//   const [ticketSeats, setTicketSeats] = useState([]);
//   const [transactions, setTransactions] = useState([]);
//   const [buses, setBuses] = useState([]);
//   const [operators, setOperators] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const user = JSON.parse(localStorage.getItem("user") || "{}");
//   const load = async () => {
//     setLoading(true);
//     try {
//       const [
//         s,
//         rawTrips,
//         rawBookings,
//         rawBuses,
//         rawOperators,
//         rawTicketSeats,
//         rawTransactions,
//       ] = await Promise.all([
//         apiFetch("/api/admin/statistics").catch(() => ({})),
//         apiFetch("/api/admin/trips").catch(() => []),
//         apiFetch("/api/admin/bookings").catch(() => []),
//         apiFetch("/api/admin/buses").catch(() => []),
//         apiFetch("/api/admin/operators").catch(() => []),
//         apiFetch("/api/admin/ticket-seats").catch(() => []),
//         apiFetch("/api/admin/transactions").catch(() => []),
//       ]);
//       const normalizedTrips = Array.isArray(rawTrips)
//         ? rawTrips.map(normalizeTrip)
//         : [];
//       const safeBuses = Array.isArray(rawBuses) ? rawBuses : [];
//       const safeOperators = Array.isArray(rawOperators) ? rawOperators : [];
//       setStats(s || {});
//       setBuses(safeBuses);
//       setOperators(safeOperators);
//       setTrips(enrichTrips(normalizedTrips, safeBuses, safeOperators));
//       setBookings(Array.isArray(rawBookings) ? rawBookings : []);
//       setTicketSeats(Array.isArray(rawTicketSeats) ? rawTicketSeats : []);
//       setTransactions(Array.isArray(rawTransactions) ? rawTransactions : []);
//     } catch (e) {
//       alert(e.message || "Không tải được dữ liệu admin.");
//     } finally {
//       setLoading(false);
//     }
//   };
//   useEffect(() => {
//     load();
//   }, []);
//   const logout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     navigate("/login", { replace: true });
//   };
//   return (
//     <div className="admin-shell">
//       <aside className="admin-sidebar">
//         <div className="admin-logo">
//           <i className="fa-solid fa-bus" /> VéXeAZ
//         </div>
//         <p className="admin-role">
//           Xin chào, {user.fullName || user.email || "Admin"}
//         </p>
//         <nav>
//           {tabs.map(([id, label, icon]) => (
//             <button
//               key={id}
//               className={active === id ? "active" : ""}
//               onClick={() => setActive(id)}
//             >
//               <i className={`fa-solid ${icon}`} /> {label}
//             </button>
//           ))}
//         </nav>
//         <button className="admin-logout" onClick={logout}>
//           <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
//         </button>
//       </aside>
//       <main className="admin-main">
//         <header className="admin-top">
//           <div>
//             <h1>{tabs.find((t) => t[0] === active)?.[1]}</h1>
//             <p>Quản trị hệ thống đặt vé xe khách</p>
//           </div>
//           <button className="btn btn-primary" onClick={load}>
//             <i className="fa-solid fa-rotate" /> Tải lại
//           </button>
//         </header>
//         {loading ? (
//           <div className="admin-card">Đang tải dữ liệu...</div>
//         ) : (
//           <AdminContent
//             active={active}
//             stats={stats}
//             trips={trips}
//             bookings={bookings}
//             ticketSeats={ticketSeats}
//             transactions={transactions}
//             buses={buses}
//             operators={operators}
//             onRefresh={load}
//           />
//         )}
//       </main>
//     </div>
//   );
// }
// function AdminContent({
//   active,
//   stats,
//   trips,
//   bookings,
//   ticketSeats,
//   transactions,
//   buses,
//   operators,
//   onRefresh,
// }) {
//   if (active === "dashboard")
//     return (
//       <Dashboard
//         stats={stats}
//         trips={trips}
//         bookings={bookings}
//         transactions={transactions}
//       />
//     );
//   if (active === "trips")
//     return (
//       <TripsManager
//         trips={trips}
//         buses={buses}
//         operators={operators}
//         onRefresh={onRefresh}
//       />
//     );
//   if (active === "bookings")
//     return (
//       <BookingsManager
//         bookings={bookings}
//         trips={trips}
//         onRefresh={onRefresh}
//       />
//     );
//   if (active === "tickets") return <TicketsManager ticketSeats={ticketSeats} />;
//   if (active === "transactions")
//     return <TransactionsManager transactions={transactions} />;
//   if (active === "buses")
//     return (
//       <BusesManager buses={buses} operators={operators} onRefresh={onRefresh} />
//     );
//   return <OperatorsManager operators={operators} onRefresh={onRefresh} />;
// }
// function Dashboard({ stats, trips, bookings, transactions }) {
//   const cards = [
//     [
//       "Tổng chuyến",
//       pick(stats, ["totalTrips", "TotalTrips"], trips.length),
//       "fa-route",
//     ],
//     [
//       "Tổng đơn",
//       pick(stats, ["totalBookings", "TotalBookings"], bookings.length),
//       "fa-ticket",
//     ],
//     ["Người dùng", pick(stats, ["totalUsers", "TotalUsers"], 0), "fa-users"],
//     [
//       "Doanh thu",
//       formatVND(
//         pick(
//           stats,
//           ["revenue", "Revenue"],
//           transactions
//             .filter((x) => getPaymentStatus(x) === "Paid")
//             .reduce(
//               (sum, x) =>
//                 sum + Number(pick(x, ["totalPrice", "TotalPrice"], 0)),
//               0,
//             ),
//         ),
//       ),
//       "fa-money-bill-wave",
//     ],
//   ];
//   return (
//     <>
//       <section className="admin-stats">
//         {cards.map(([label, value, icon]) => (
//           <div className="stat-card" key={label}>
//             <div>
//               <p>{label}</p>
//               <h2>{value}</h2>
//             </div>
//             <i className={`fa-solid ${icon}`} />
//           </div>
//         ))}
//       </section>
//       <section className="admin-grid">
//         <div className="admin-card">
//           <h3>Chuyến sắp chạy</h3>
//           <TripsTable trips={trips.slice(0, 5)} />
//         </div>
//         {/* 
//         <div className="admin-card">
//           <h3>Đơn đặt vé mới</h3>
//           <BookingsTable bookings={bookings.slice(0, 6)} />
//         </div>
//         */}
//       </section>
//     </>
//   );
// }
// function TripsManager({ trips, buses, operators, onRefresh }) {
//   const [form, setForm] = useState(EMPTY_TRIP);
//   const [showForm, setShowForm] = useState(false);
//   // const { page, setPage, totalPages, rows } = usePagination(trips);
//   const { search, setSearch, filtered } = useSearch(trips, ['departureLocation', 'arrivalLocation', 'operator', 'busType']);
//   const { page, setPage, totalPages, rows } = usePagination(filtered);
//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         tripID: form.tripID || 0,
//         busID: Number(form.busID),
//         departureLocation: form.departureLocation.trim(),
//         arrivalLocation: form.arrivalLocation.trim(),
//         departureTime: form.departureTime,
//         arrivalTime: form.arrivalTime,
//         price: Number(form.price || 0),
//         availableSeats: Number(form.availableSeats || 0),
//         status: form.status || "Scheduled",
//       };
//       if (
//         !payload.busID ||
//         !payload.departureLocation ||
//         !payload.arrivalLocation ||
//         !payload.departureTime ||
//         !payload.arrivalTime
//       ) {
//         throw new Error("Vui lòng nhập đủ thông tin chuyến xe.");
//       }
//       if (form.tripID) {
//         await apiFetch(`/api/trips/${form.tripID}`, {
//           method: "PUT",
//           body: JSON.stringify(payload),
//         });
//       } else {
//         await apiFetch("/api/trips", {
//           method: "POST",
//           body: JSON.stringify(payload),
//         });
//       }
//       setForm(EMPTY_TRIP);
//       setShowForm(false);
//       await onRefresh();
//       setPage(1);
//     } catch (e2) {
//       alert(e2.message || "Không lưu được chuyến xe.");
//     }
//   };
//   const editItem = (item) => {
//     setForm({
//       tripID: item.id,
//       busID: item.busId || "",
//       departureLocation: item.departureLocation || "",
//       arrivalLocation: item.arrivalLocation || "",
//       departureTime: toDateTimeLocal(item.departureTime),
//       arrivalTime: toDateTimeLocal(item.arrivalTime),
//       price: item.price || "",
//       availableSeats: item.availableSeats || "",
//       status: item.status || "Scheduled",
//     });
//     setShowForm(true);
//   };
//   const removeItem = async (id) => {
//     if (!confirm(`Xóa chuyến xe #${id}?`)) return;
//     try {
//       await apiFetch(`/api/trips/${id}`, { method: "DELETE" });
//       await onRefresh();
//     } catch (e) {
//       alert(e.message || "Không xóa được chuyến xe.");
//     }
//   };
//   return (
//     <section className="admin-card table-card">
//       <SectionHeader
//         title="Quản lý chuyến xe"
//         showForm={showForm}
//         onToggle={() =>
//           toggleCreateForm(showForm, setShowForm, setForm, EMPTY_TRIP)
//         }
//       />
//       {showForm && (
//         <form className="admin-form-grid" onSubmit={submit}>
//           <select
//             value={form.busID}
//             onChange={(e) => setForm({ ...form, busID: e.target.value })}
//             required
//           >
//             <option value="">Chọn xe</option>
//             {buses.map((b) => {
//               const busId = pick(b, ["busID", "BusID"]);
//               const busType = pick(b, ["busType", "BusType"]);
//               const operatorName = pick(
//                 b,
//                 ["operatorName", "OperatorName"],
//                 findOperatorName(
//                   operators,
//                   pick(b, ["operatorID", "OperatorID"]),
//                 ),
//               );
//               return (
//                 <option key={busId} value={busId}>
//                   Xe #{busId} - {pick(b, ["licensePlate", "LicensePlate"])} (
//                   {busType}) - {operatorName}
//                 </option>
//               );
//             })}
//           </select>
//           <input
//             value={form.departureLocation}
//             onChange={(e) =>
//               setForm({ ...form, departureLocation: e.target.value })
//             }
//             placeholder="Điểm đi"
//             required
//           />
//           <input
//             value={form.arrivalLocation}
//             onChange={(e) =>
//               setForm({ ...form, arrivalLocation: e.target.value })
//             }
//             placeholder="Điểm đến"
//             required
//           />
//           <input
//             type="datetime-local"
//             value={form.departureTime}
//             onChange={(e) =>
//               setForm({ ...form, departureTime: e.target.value })
//             }
//             required
//           />
//           <input
//             type="datetime-local"
//             value={form.arrivalTime}
//             onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
//             required
//           />
//           <input
//             type="number"
//             min="0"
//             value={form.price}
//             onChange={(e) => setForm({ ...form, price: e.target.value })}
//             placeholder="Giá vé"
//             required
//           />
//           <input
//             type="number"
//             min="0"
//             value={form.availableSeats}
//             onChange={(e) =>
//               setForm({ ...form, availableSeats: e.target.value })
//             }
//             placeholder="Số ghế trống"
//             required
//           />
//           <input
//             value={form.status}
//             onChange={(e) => setForm({ ...form, status: e.target.value })}
//             placeholder="Trạng thái"
//           />
//           <div className="admin-form-actions">
//             <button className="btn btn-primary" type="submit">
//               {form.tripID ? "Cập nhật" : "Lưu chuyến xe"}
//             </button>
//             <button
//               className="btn btn-outline"
//               type="button"
//               onClick={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}
//             >
//               Hủy
//             </button>
//           </div>
//         </form>
//       )}
//       <SearchBox value={search} onChange={setSearch} placeholder="Tìm tuyến, nhà xe, loại xe..." />
//       <TripsTable trips={rows} onEdit={editItem} onDelete={removeItem} />
//       {/* <TripsTable trips={rows} onEdit={editItem} onDelete={removeItem} /> */}
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// function BookingsManager({ bookings, trips, onRefresh }) {
//   const [form, setForm] = useState(EMPTY_BOOKING);
//   const [showForm, setShowForm] = useState(false);
//   // const { page, setPage, totalPages, rows } = usePagination(bookings);
//     const { search, setSearch, filtered } = useSearch(bookings, ['customerName', 'CustomerName', 'customerPhone', 'CustomerPhone']);
// const { page, setPage, totalPages, rows } = usePagination(filtered);
//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const trip = trips.find((t) => String(t.id) === String(form.tripID));
//       const seats = Number(form.totalSeats || 0);
//       if (
//         !form.tripID ||
//         !form.customerName.trim() ||
//         !form.customerPhone.trim() ||
//         seats <= 0
//       ) {
//         throw new Error("Vui lòng nhập đủ thông tin đặt vé.");
//       }
//       const payload = {
//         tripID: Number(form.tripID),
//         customerName: form.customerName.trim(),
//         customerPhone: form.customerPhone.trim(),
//         customerEmail: form.customerEmail.trim(),
//         totalSeats: seats,
//         totalPrice: Number((trip?.price || 0) * seats),
//         paymentMethod: form.paymentMethod || "Online",
//         paymentStatus: form.paymentStatus || "Pending",
//       };
//       await apiFetch("/api/bookings", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });
//       setForm(EMPTY_BOOKING);
//       setShowForm(false);
//       await onRefresh();
//       setPage(1);
//     } catch (e2) {
//       alert(e2.message || "Không thêm được đơn đặt vé.");
//     }
//   };
//   const updateStatus = async (id, status) => {
//     try {
//       await apiFetch(`/api/bookings/${id}/payment-status`, {
//         method: "PUT",
//         body: JSON.stringify(status),
//       });
//       await onRefresh();
//     } catch (e) {
//       alert(e.message || "Không cập nhật được trạng thái thanh toán.");
//     }
//   };
//   const removeItem = async (id) => {
//     if (!confirm(`Xóa đơn #${id}?`)) return;
//     try {
//       await apiFetch(`/api/bookings/${id}`, { method: "DELETE" });
//       await onRefresh();
//     } catch (e) {
//       alert(e.message || "Không xóa được đơn đặt vé.");
//     }
//   };
//   return (
//     <section className="admin-card table-card">
//       <SectionHeader
//         title="Quản lý đặt vé"
//         showForm={showForm}
//         onToggle={() =>
//           toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BOOKING)
//         }
//       />
//       {showForm && (
//         <form className="admin-form-grid" onSubmit={submit}>
//           <select
//             value={form.tripID}
//             onChange={(e) => setForm({ ...form, tripID: e.target.value })}
//             required
//           >
//             <option value="">Chọn chuyến</option>
//             {trips.map((t) => (
//               <option key={t.id} value={t.id}>
//                 {t.id} - {t.departureLocation} → {t.arrivalLocation}
//               </option>
//             ))}
//           </select>
//           <input
//             value={form.customerName}
//             onChange={(e) => setForm({ ...form, customerName: e.target.value })}
//             placeholder="Tên khách"
//             required
//           />
//           <input
//             value={form.customerPhone}
//             onChange={(e) =>
//               setForm({ ...form, customerPhone: e.target.value })
//             }
//             placeholder="SĐT khách"
//             required
//           />
//           <input
//             value={form.customerEmail}
//             onChange={(e) =>
//               setForm({ ...form, customerEmail: e.target.value })
//             }
//             placeholder="Email"
//           />
//           <input
//             type="number"
//             min="1"
//             value={form.totalSeats}
//             onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
//             placeholder="Số ghế"
//             required
//           />
//           <select
//             value={form.paymentMethod}
//             onChange={(e) =>
//               setForm({ ...form, paymentMethod: e.target.value })
//             }
//           >
//             <option value="Online">Online</option>
//             <option value="Cash">Cash</option>
//           </select>
//           <select
//             value={form.paymentStatus}
//             onChange={(e) =>
//               setForm({ ...form, paymentStatus: e.target.value })
//             }
//           >
//             <option value="Pending">Pending</option>
//             <option value="Paid">Paid</option>
//             <option value="Cancelled">Cancelled</option>
//           </select>
//           <div className="admin-form-actions">
//             <button className="btn btn-primary" type="submit">
//               Lưu đơn đặt vé
//             </button>
//             <button
//               className="btn btn-outline"
//               type="button"
//               onClick={() => cancelForm(setShowForm, setForm, EMPTY_BOOKING)}
//             >
//               Hủy
//             </button>
//           </div>
//         </form>
//       )}
//        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, SĐT khách..." />
//       <div className="table-wrap">
     
// <div className="table-wrap"></div>
//         <table>
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Khách hàng</th>
//               <th>SĐT</th>
//               <th>Tuyến</th>
//               <th>Ngày đặt</th>
//               <th>Thanh toán</th>
//               <th>Tổng tiền</th>
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
//               const status = getPaymentStatus(item);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>{pick(item, ["customerName", "CustomerName"])}</td>
//                   <td>{pick(item, ["customerPhone", "CustomerPhone"])}</td>
//                   <td>
//                     {pick(item, ["route", "Route"]) ||
//                       findTripRoute(trips, pick(item, ["tripID", "TripID"]))}
//                   </td>
//                   <td>
//                     {formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}
//                   </td>
//                   <td>
//                     <span className="badge">{status}</span>
//                   </td>
//                   <td>
//                     {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
//                   </td>
//                   <td className="admin-actions">
//                     <button
//                       className="btn btn-outline"
//                       onClick={() =>
//                         updateStatus(id, status === "Paid" ? "Pending" : "Paid")
//                       }
//                     >
//                       {status === "Paid" ? "Đặt Pending" : "Đặt Paid"}
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
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// function TicketsManager({ ticketSeats }) {
//   // const { page, setPage, totalPages, rows } = usePagination(ticketSeats);
//   const { search, setSearch, filtered } = useSearch(ticketSeats, ['customerName', 'CustomerName', 'seatLabel', 'SeatLabel']);
// const { page, setPage, totalPages, rows } = usePagination(filtered);
//   return (
//     <section className="admin-card table-card">
//       <h3>Quản lý vé</h3>
//       {/* <h3>Quản lý vé</h3> */}
// <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên khách, ghế..." />
// {/* <div className="table-wrap"></div> */}
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>ID vé</th>
//               <th>ID đơn</th>
//               <th>Ghế</th>
//               <th>Khách hàng</th>
//               <th>SĐT</th>
//               <th>Tuyến</th>
//               <th>Thanh toán</th>
//               <th>Ngày đặt</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["ticketSeatID", "TicketSeatID"]);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>{pick(item, ["bookingID", "BookingID"])}</td>
//                   <td>{pick(item, ["seatLabel", "SeatLabel"])}</td>
//                   <td>
//                     {pick(item, ["customerName", "CustomerName"]) || "Chưa rõ"}
//                   </td>
//                   <td>
//                     {pick(item, ["customerPhone", "CustomerPhone"]) ||
//                       "Chưa rõ"}
//                   </td>
//                   <td>{pick(item, ["route", "Route"]) || "Chưa rõ tuyến"}</td>
//                   <td>
//                     <span className="badge">{getPaymentStatus(item)}</span>
//                   </td>
//                   <td>
//                     {formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}
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
// function TransactionsManager({ transactions }) {
//   // const { page, setPage, totalPages, rows } = usePagination(transactions);
//   const { search, setSearch, filtered } = useSearch(transactions, ['customerName', 'CustomerName', 'paymentMethod', 'PaymentMethod', 'paymentStatus', 'PaymentStatus']);
// const { page, setPage, totalPages, rows } = usePagination(filtered);
//   return (
//     <section className="admin-card table-card">
//       <h3>Quản lý giao dịch</h3>
//       {/* <h3>Quản lý giao dịch</h3> */}
//       <SearchBox value={search} onChange={setSearch} placeholder="Tìm khách, trạng thái..." />
//       {/* <div className="table-wrap"></div> */}
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>Mã GD</th>
//               <th>Khách hàng</th>
//               <th>Tuyến</th>
//               <th>Phương thức</th>
//               <th>Trạng thái</th>
//               <th>Số ghế</th>
//               <th>Tổng tiền</th>
//               <th>Ngày tạo</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["id", "Id", "bookingID", "BookingID"]);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>{pick(item, ["customerName", "CustomerName"])}</td>
//                   <td>{pick(item, ["route", "Route"]) || "Chưa rõ tuyến"}</td>
//                   <td>
//                     {pick(item, ["paymentMethod", "PaymentMethod"], "Chưa rõ")}
//                   </td>
//                   <td>
//                     <span className="badge">{getPaymentStatus(item)}</span>
//                   </td>
//                   <td>{pick(item, ["totalSeats", "TotalSeats"], 0)}</td>
//                   <td>
//                     {formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}
//                   </td>
//                   <td>
//                     {formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}
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
// function BusesManager({ buses, operators, onRefresh }) {
//   const [form, setForm] = useState(EMPTY_BUS);
//   const [showForm, setShowForm] = useState(false);
//   // const { page, setPage, totalPages, rows } = usePagination(buses);
//   const { search, setSearch, filtered } = useSearch(buses, ['licensePlate', 'LicensePlate', 'busType', 'BusType']);
// const { page, setPage, totalPages, rows } = usePagination(filtered);
//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         busID: form.busID || 0,
//         operatorID: Number(form.operatorID),
//         licensePlate: form.licensePlate.trim(),
//         capacity: Number(form.capacity || 0),
//         busType: form.busType.trim(),
//       };
//       if (
//         !payload.operatorID ||
//         !payload.licensePlate ||
//         !payload.capacity ||
//         !payload.busType
//       ) {
//         throw new Error("Vui lòng nhập đủ thông tin xe.");
//       }
//       if (form.busID) {
//         await apiFetch(`/api/buses/${form.busID}`, {
//           method: "PUT",
//           body: JSON.stringify(payload),
//         });
//       } else {
//         await apiFetch("/api/buses", {
//           method: "POST",
//           body: JSON.stringify(payload),
//         });
//       }
//       setForm(EMPTY_BUS);
//       setShowForm(false);
//       await onRefresh();
//       setPage(1);
//     } catch (e2) {
//       alert(e2.message || "Không lưu được xe.");
//     }
//   };
//   const editItem = (item) => {
//     setForm({
//       busID: pick(item, ["busID", "BusID"]),
//       operatorID: pick(item, ["operatorID", "OperatorID"]),
//       licensePlate: pick(item, ["licensePlate", "LicensePlate"], ""),
//       capacity: pick(item, ["capacity", "Capacity"], ""),
//       busType: pick(item, ["busType", "BusType"], ""),
//     });
//     setShowForm(true);
//   };
//   const removeItem = async (id) => {
//     if (!confirm(`Xóa xe #${id}?`)) return;
//     try {
//       await apiFetch(`/api/buses/${id}`, { method: "DELETE" });
//       await onRefresh();
//     } catch (e) {
//       alert(
//         e.message ||
//           "Không xóa được xe. Có thể xe đang được dùng trong chuyến.",
//       );
//     }
//   };
//   return (
//     <section className="admin-card table-card">
//       <SectionHeader
//         title="Quản lý xe"
//         showForm={showForm}
//         onToggle={() =>
//           toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BUS)
//         }
//       />
//       {showForm && (
//         <form className="admin-form-grid" onSubmit={submit}>
//           <select
//             value={form.operatorID}
//             onChange={(e) => setForm({ ...form, operatorID: e.target.value })}
//             required
//           >
//             <option value="">Chọn nhà xe</option>
//             {operators.map((o) => (
//               <option
//                 key={pick(o, ["operatorID", "OperatorID"])}
//                 value={pick(o, ["operatorID", "OperatorID"])}
//               >
//                 {pick(o, ["name", "Name"])}
//               </option>
//             ))}
//           </select>
//           <input
//             value={form.licensePlate}
//             onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
//             placeholder="Biển số"
//             required
//           />
//           <input
//             type="number"
//             min="1"
//             value={form.capacity}
//             onChange={(e) => setForm({ ...form, capacity: e.target.value })}
//             placeholder="Sức chứa"
//             required
//           />
//           <input
//             value={form.busType}
//             onChange={(e) => setForm({ ...form, busType: e.target.value })}
//             placeholder="Loại xe"
//             required
//           />
//           <div className="admin-form-actions">
//             <button className="btn btn-primary" type="submit">
//               {form.busID ? "Cập nhật" : "Lưu xe"}
//             </button>
//             <button
//               className="btn btn-outline"
//               type="button"
//               onClick={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}
//             >
//               Hủy
//             </button>
//           </div>
//         </form>
//       )}
//       <SearchBox value={search} onChange={setSearch} placeholder="Tìm biển số, loại xe..." />
//       {/* <div className="table-wrap"></div> */}
//       <div className="table-wrap">
//         <table>
//           <thead>
//             <tr>
//               <th>ID</th>
//               <th>Nhà xe</th>
//               <th>Biển số</th>
//               <th>Loại xe</th>
//               <th>Sức chứa</th>
//               <th>Thao tác</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((item) => {
//               const id = pick(item, ["busID", "BusID"]);
//               return (
//                 <tr key={id}>
//                   <td>{id}</td>
//                   <td>
//                     {pick(item, ["operatorName", "OperatorName"]) ||
//                       findOperatorName(
//                         operators,
//                         pick(item, ["operatorID", "OperatorID"]),
//                       )}
//                   </td>
//                   <td>{pick(item, ["licensePlate", "LicensePlate"])}</td>
//                   <td>{pick(item, ["busType", "BusType"])}</td>
//                   <td>{pick(item, ["capacity", "Capacity"])}</td>
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
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// function OperatorsManager({ operators, onRefresh }) {
//   const [form, setForm] = useState(EMPTY_OPERATOR);
//   const [showForm, setShowForm] = useState(false);
//   // const { page, setPage, totalPages, rows } = usePagination(operators);
//   const { search, setSearch, filtered } = useSearch(operators, ['name', 'Name', 'contactPhone', 'ContactPhone', 'email', 'Email']);
// const { page, setPage, totalPages, rows } = usePagination(filtered);
//   const submit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         operatorID: form.operatorID || 0,
//         name: form.name.trim(),
//         description: form.description.trim(),
//         contactPhone: form.contactPhone.trim(),
//         email: form.email.trim(),
//       };
//       if (!payload.name || !payload.contactPhone) {
//         throw new Error("Vui lòng nhập tên và số điện thoại nhà xe.");
//       }
//       if (form.operatorID) {
//         await apiFetch(`/api/operators/${form.operatorID}`, {
//           method: "PUT",
//           body: JSON.stringify(payload),
//         });
//       } else {
//         await apiFetch("/api/operators", {
//           method: "POST",
//           body: JSON.stringify(payload),
//         });
//       }
//       setForm(EMPTY_OPERATOR);
//       setShowForm(false);
//       await onRefresh();
//       setPage(1);
//     } catch (e2) {
//       alert(e2.message || "Không lưu được nhà xe.");
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
//     try {
//       await apiFetch(`/api/operators/${id}`, { method: "DELETE" });
//       await onRefresh();
//     } catch (e) {
//       alert(
//         e.message ||
//           "Không xóa được nhà xe. Có thể vẫn còn xe thuộc nhà xe này.",
//       );
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
//       {showForm && (
//         <form className="admin-form-grid" onSubmit={submit}>
//           <input
//             value={form.name}
//             onChange={(e) => setForm({ ...form, name: e.target.value })}
//             placeholder="Tên nhà xe"
//             required
//           />
//           <input
//             value={form.contactPhone}
//             onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
//             placeholder="Số điện thoại"
//             required
//           />
//           <input
//             value={form.email}
//             onChange={(e) => setForm({ ...form, email: e.target.value })}
//             placeholder="Email"
//           />
//           <input
//             value={form.description}
//             onChange={(e) => setForm({ ...form, description: e.target.value })}
//             placeholder="Mô tả"
//           />
//           <div className="admin-form-actions">
//             <button className="btn btn-primary" type="submit">
//               {form.operatorID ? "Cập nhật" : "Lưu nhà xe"}
//             </button>
//             <button
//               className="btn btn-outline"
//               type="button"
//               onClick={() => cancelForm(setShowForm, setForm, EMPTY_OPERATOR)}
//             >
//               Hủy
//             </button>
//           </div>
//         </form>
//       )}
//       <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, SĐT, email..." />
//       {/* <div className="table-wrap"></div> */}
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
//           </tbody>
//         </table>
//       </div>
//       <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
//     </section>
//   );
// }
// function TripsTable({ trips, onEdit, onDelete }) {
//   const showActions = Boolean(onEdit || onDelete);
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
//             {showActions && <th>Thao tác</th>}
//           </tr>
//         </thead>
//         <tbody>
//           {trips.map((t) => (
//             <tr key={t.id}>
//               <td>{t.id}</td>
//               <td>
//                 <b>{t.departureLocation}</b> → <b>{t.arrivalLocation}</b>
//               </td>
//               <td>{formatDateTime(t.departureTime)}</td>
//               <td>{t.operator || "Chưa rõ"}</td>
//               <td>{t.busType || "Chưa rõ"}</td>
//               <td>{t.availableSeats}</td>
//               <td>{formatVND(t.price)}</td>
//               {showActions && (
//                 <td className="admin-actions">
//                   {onEdit && (
//                     <button
//                       className="btn btn-outline"
//                       onClick={() => onEdit(t)}
//                     >
//                       Sửa
//                     </button>
//                   )}
//                   {onDelete && (
//                     <button
//                       className="btn btn-danger"
//                       onClick={() => onDelete(t.id)}
//                     >
//                       Xóa
//                     </button>
//                   )}
//                 </td>
//               )}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
// function BookingsTable({ bookings }) {
//   return (
//     <div className="table-wrap">
//       <table>
//         <thead>
//           <tr>
//             <th>ID</th>
//             <th>Khách hàng</th>
//             <th>SĐT</th>
//             <th>Ngày đặt</th>
//             <th>Thanh toán</th>
//             <th>Tổng tiền</th>
//           </tr>
//         </thead>
//         <tbody>
//           {bookings.map((b) => (
//             <tr key={pick(b, ["bookingID", "BookingID", "bookingId", "id"])}>
//               <td>{pick(b, ["bookingID", "BookingID", "bookingId", "id"])}</td>
//               <td>
//                 {pick(b, [
//                   "customerName",
//                   "CustomerName",
//                   "fullName",
//                   "FullName",
//                 ])}
//               </td>
//               <td>
//                 {pick(b, ["customerPhone", "CustomerPhone", "phone", "Phone"])}
//               </td>
//               <td>{formatDateTime(pick(b, ["bookingDate", "BookingDate"]))}</td>
//               <td>
//                 <span className="badge">{getPaymentStatus(b)}</span>
//               </td>
//               <td>{formatVND(pick(b, ["totalPrice", "TotalPrice"], 0))}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
// function SectionHeader({ title, showForm, onToggle }) {
//   return (
//     <div className="admin-section-head">
//       <h3>{title}</h3>
//       <button className="btn btn-primary" onClick={onToggle}>
//         <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} />{" "}
//         {showForm ? "Đóng form" : "Thêm mới"}
//       </button>
//     </div>
//   );
// }
// function Pagination({ page, totalPages, onPageChange }) {
//   if (totalPages <= 1) return null;
//   return (
//     <div className="admin-pagination">
//       <button
//         className="btn btn-outline"
//         disabled={page <= 1}
//         onClick={() => onPageChange(page - 1)}
//       >
//         Trước
//       </button>
//       <span>
//         Trang {page}/{totalPages}
//       </span>
//       <button
//         className="btn btn-outline"
//         disabled={page >= totalPages}
//         onClick={() => onPageChange(page + 1)}
//       >
//         Sau
//       </button>
//     </div>
//   );
// }
// function usePagination(items) {
//   const [page, setPage] = useState(1);
//   const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
//   useEffect(() => {
//     if (page > totalPages) setPage(totalPages);
//   }, [page, totalPages]);
//   const rows = useMemo(() => {
//     const start = (page - 1) * PAGE_SIZE;
//     return items.slice(start, start + PAGE_SIZE);
//   }, [items, page]);
//   return { page, setPage, totalPages, rows };
// }
// function enrichTrips(trips, buses, operators) {
//   return trips.map((trip) => {
//     if (trip.operator && trip.busType) return trip;
//     const bus = buses.find(
//       (x) => String(pick(x, ["busID", "BusID"])) === String(trip.busId),
//     );
//     const operatorId = pick(bus, ["operatorID", "OperatorID"]);
//     const operator = operators.find(
//       (x) =>
//         String(pick(x, ["operatorID", "OperatorID"])) === String(operatorId),
//     );
//     return {
//       ...trip,
//       busType: trip.busType || pick(bus, ["busType", "BusType"]),
//       operator:
//         trip.operator ||
//         pick(bus, ["operatorName", "OperatorName"]) ||
//         pick(operator, ["name", "Name"]),
//     };
//   });
// }
// function findOperatorName(operators, operatorId) {
//   const found = operators.find(
//     (o) => String(pick(o, ["operatorID", "OperatorID"])) === String(operatorId),
//   );
//   return found ? pick(found, ["name", "Name"]) : `#${operatorId}`;
// }
// function findTripRoute(trips, tripId) {
//   const found = trips.find((t) => String(t.id) === String(tripId));
//   return found
//     ? `${found.departureLocation} → ${found.arrivalLocation}`
//     : "Chưa rõ tuyến";
// }
// function getPaymentStatus(item) {
//   return pick(
//     item,
//     ["paymentStatus", "PaymentStatus", "status", "Status"],
//     "Pending",
//   );
// }
// function formatDateTime(value) {
//   return value ? new Date(value).toLocaleString("vi-VN") : "";
// }
// function toDateTimeLocal(value) {
//   if (!value) return "";
//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return "";
//   const offsetDate = new Date(
//     date.getTime() - date.getTimezoneOffset() * 60000,
//   );
//   return offsetDate.toISOString().slice(0, 16);
// }
// function toggleCreateForm(showForm, setShowForm, setForm, emptyForm) {
//   if (showForm) {
//     setForm(emptyForm);
//   }
//   setShowForm(!showForm);
// }
// function cancelForm(setShowForm, setForm, emptyForm) {
//   setShowForm(false);
//   setForm(emptyForm);
// }
// function useSearch(items, fields) {
//   const [search, setSearch] = useState('');
//   const filtered = useMemo(() =>
//     search.trim()
//       ? items.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(search.toLowerCase())))
//       : items,
//     [items, search]
//   );
//   return { search, setSearch, filtered };
// }

// function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...' }) {
//   return (
//     <input
//       value={value}
//       onChange={e => onChange(e.target.value)}
//       placeholder={placeholder}
//       style={{ padding: '8px 12px', width: 300, borderRadius: 6, border: '1px solid #ddd', marginBottom: 12 }}
//     />
//   );
// }

import { useEffect, useMemo, useState } from "react";
import { apiFetch, formatVND, normalizeTrip, pick } from "../api";
import { busApi } from "../services/busApi";
import { operatorApi } from "../services/operatorApi";
import { userApi } from "../services/userApi";
const includesText = (value, query) => String(value || '').toLowerCase().includes(String(query || '').toLowerCase());
const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const PAGE_SIZE = 20;
const ADMIN_CRUD_PAGE_SIZE = 10;
const normalizePagedResponse = (data, fallbackPage = 1, fallbackPageSize = ADMIN_CRUD_PAGE_SIZE) => {
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
  const totalCount = Number(data?.totalCount ?? data?.TotalCount ?? items.length);
  const pageSize = Number(data?.pageSize ?? data?.PageSize ?? fallbackPageSize);
  return {
    items,
    totalCount,
    page: Number(data?.page ?? data?.Page ?? fallbackPage),
    pageSize,
    totalPages: Number(data?.totalPages ?? data?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))),
  };
};

const cleanParams = (params) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
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
  ["orders", "Đơn hàng", "fa-file-invoice"],  // ← gộp 3 tab
  // ["tickets", "Quản lý vé", "fa-couch"],
  ["buses", "Xe", "fa-bus"],
  ["operators", "Nhà xe", "fa-building"],
  ["users", "Người dùng", "fa-users"],
];
const EMPTY_TRIP = { tripID: null, busID: "", departureLocation: "", arrivalLocation: "", departureTime: "", arrivalTime: "", price: "", availableSeats: "", status: "Scheduled" };
const EMPTY_BUS = { busID: null, operatorID: "", licensePlate: "", capacity: "", busType: "" };
const EMPTY_OPERATOR = { operatorID: null, name: "", description: "", contactPhone: "", email: "" };
const EMPTY_BOOKING = { tripID: "", customerName: "", customerPhone: "", customerEmail: "", totalSeats: 1, paymentMethod: "Online", paymentStatus: "Pending" };

export default function Admin({ active = "dashboard" }) {
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

  // const load = async () => {
  //   setLoading(true);
  const load = async (silent = false) => {
  if (!silent) setLoading(true);
    try {
      // const [s, rawTrips, rawBookings, rawBuses, rawOperators, rawTicketSeats, rawTransactions, rawUsers, rawRevenue] = await Promise.all([
      //   apiFetch("/api/admin/statistics").catch(() => ({})),
      //   apiFetch("/api/admin/trips").catch(() => []),
      //   apiFetch("/api/admin/bookings").catch(() => []),
      //   apiFetch("/api/admin/buses").catch(() => []),
      //   apiFetch("/api/admin/operators").catch(() => []),
      //   apiFetch("/api/admin/ticket-seats").catch(() => []),
      //   apiFetch("/api/admin/transactions").catch(() => []),
      //   apiFetch("/api/admin/users").catch(() => []),
      //   apiFetch("/api/admin/revenue-stats").catch(() => []),
      //   apiFetch("/api/admin/upcoming-trips").catch(() => []),
      // ]);
      const [s, rawTrips, rawBookings, rawBuses, rawOperators, rawTicketSeats, rawTransactions, rawUsers, rawRevenue, rawUpcoming] = await Promise.all([
        apiFetch("/api/dashboard/stats").catch(() => ({})),
        apiFetch("/api/admin/trips").catch(() => []),
        apiFetch("/api/admin/bookings").catch(() => []),
        apiFetch("/api/admin/buses").catch(() => []),
        apiFetch("/api/admin/operators").catch(() => []),
        apiFetch("/api/admin/ticket-seats").catch(() => []),
        apiFetch("/api/admin/transactions").catch(() => []),
        apiFetch("/api/admin/users").catch(() => []),
        apiFetch("/api/admin/revenue-stats").catch(() => []),
        apiFetch("/api/admin/upcoming-trips").catch(() => []),
      ]);
      const normalizedTrips = Array.isArray(rawTrips) ? rawTrips.map(normalizeTrip) : [];
      const safeBuses = Array.isArray(rawBuses) ? rawBuses : [];
      const safeOperators = Array.isArray(rawOperators) ? rawOperators : [];
      setStats(s || {});
      setBuses(safeBuses);
      setOperators(safeOperators);
      setTrips(enrichTrips(normalizedTrips, safeBuses, safeOperators));
      setBookings(Array.isArray(rawBookings) ? rawBookings : []);
      setTicketSeats(Array.isArray(rawTicketSeats) ? rawTicketSeats : []);
      setTransactions(Array.isArray(rawTransactions) ? rawTransactions : []);
      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      setRevenueStats(Array.isArray(rawRevenue) ? rawRevenue : []);
      setUpcomingTrips(Array.isArray(rawUpcoming) ? enrichTrips(rawUpcoming.map(normalizeTrip), safeBuses, safeOperators) : []);
    } catch (e) {
      alert(e.message || "Không tải được dữ liệu admin.");
    // } finally {
    //   setLoading(false);
    // }
    } finally {
  if (!silent) setLoading(false);
}
  };

  useEffect(() => { load(); }, []);

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
        />
      )}
    </>
  );
}

// function AdminContent({ active, stats, trips, bookings, ticketSeats, transactions, buses, operators, users, revenueStats, onRefresh }) {
//   if (active === "dashboard") return <Dashboard stats={stats} trips={trips} bookings={bookings} transactions={transactions} revenueStats={revenueStats} />;
//   if (active === "trips") return <TripsManager trips={trips} buses={buses} operators={operators} onRefresh={onRefresh} />;
//   if (active === "bookings") return <BookingsManager bookings={bookings} trips={trips} onRefresh={onRefresh} />;
//   if (active === "invoices") return <InvoicesManager bookings={bookings} trips={trips} onRefresh={onRefresh} />;
//   if (active === "tickets") return <TicketsManager ticketSeats={ticketSeats} />;
//   if (active === "transactions") return <TransactionsManager transactions={transactions} />;
//   if (active === "buses") return <BusesManager buses={buses} operators={operators} onRefresh={onRefresh} />;
//   if (active === "users") return <UsersManager users={users} onRefresh={onRefresh} />;
//   return <OperatorsManager operators={operators} onRefresh={onRefresh} />;
// }
// function AdminContent({ active, stats, trips, bookings, ticketSeats, transactions, buses, operators, users, revenueStats, onRefresh }) {
function AdminContent({ active, stats, trips, upcomingTrips, bookings, ticketSeats, transactions, buses, operators, users, revenueStats, onRefresh }) {
  if (active === "dashboard") return <Dashboard stats={stats} trips={trips} upcomingTrips={upcomingTrips} bookings={bookings} transactions={transactions} revenueStats={revenueStats} buses={buses} operators={operators} users={users} />;
  if (active === "trips") return <TripsManager trips={trips} buses={buses} operators={operators} onRefresh={onRefresh} />;
  // if (active === "orders") return <OrdersManager bookings={bookings} trips={trips} onRefresh={onRefresh} />;  // ← tab mới
  if (active === "orders") return <OrdersManager bookings={bookings} trips={trips} operators={operators} onRefresh={onRefresh} />;
  // if (active === "tickets") return <TicketsManager ticketSeats={ticketSeats} trips={trips} operators={operators} />;  // ← thêm props
  if (active === "buses") return <BusesManager buses={buses} operators={operators} onRefresh={onRefresh} />;
  if (active === "users") return <UsersManager users={users} onRefresh={onRefresh} />;
  if (active === "settings") return <AdminSettings />;
  return <OperatorsManager operators={operators} onRefresh={onRefresh} />;
}

function AdminSettings() {
  return (
    <section className="admin-card admin-settings-card">
      <h3>Cài đặt</h3>
      <p>Các thiết lập hệ thống sẽ được bổ sung ở phase sau.</p>
      <div className="admin-settings-grid">
        <div>
          <b>Quyền truy cập</b>
          <span>Chỉ tài khoản Role Admin được vào khu vực quản trị.</span>
        </div>
        <div>
          <b>Phiên đăng nhập</b>
          <span>Token JWT đang được gắn tự động qua Axios interceptor.</span>
        </div>
      </div>
    </section>
  );
}
// ==================== DASHBOARD ====================
// function Dashboard({ stats, trips, bookings, transactions, revenueStats }) {
function Dashboard({ stats, trips, upcomingTrips, bookings, transactions, revenueStats, buses = [], operators = [], users = [] }) {
  const cards = [
    ["Tổng số vé", pick(stats, ["totalTickets", "TotalTickets"], bookings.reduce((sum, item) => sum + Number(pick(item, ["totalSeats", "TotalSeats"], 0)), 0)), "fa-ticket", "#16a34a"],
    ["Tổng số xe", pick(stats, ["totalBuses", "TotalBuses"], buses.length), "fa-bus", "#2563eb"],
    ["Tổng nhà xe", pick(stats, ["totalOperators", "TotalOperators"], operators.length), "fa-building", "#0ea5e9"],
    ["Tổng doanh thu", formatVND(pick(stats, ["totalRevenue", "TotalRevenue", "revenue", "Revenue"], 0)), "fa-money-bill-wave", "#ea580c"],
    ["Tổng chuyến xe", pick(stats, ["totalTrips", "TotalTrips"], trips.length), "fa-route", "#7c3aed"],
    ["Tổng người dùng", pick(stats, ["totalUsers", "TotalUsers"], users.length), "fa-users", "#db2777"],
  ];

  const last6 = revenueStats.slice(-6);

  return (
    <>
      <section className="admin-stats">
        {cards.map(([label, value, icon, color]) => (
          <div className="stat-card" key={label} style={{ borderLeft: `4px solid ${color}` }}>
            <div><p>{label}</p><h2>{value}</h2></div>
            <i className={`fa-solid ${icon}`} style={{ color }} />
          </div>
        ))}
      </section>

      {last6.length > 0 && (
        <div className="admin-card" style={{ marginBottom: 24 }}>
          <h3>Doanh thu theo tháng (Paid)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, padding: '16px 0' }}>
            {last6.map((item) => {
              const maxRevenue = Math.max(...last6.map(x => Number(x.revenue || x.Revenue)));
              const revenue = Number(item.revenue || item.Revenue);
              const height = maxRevenue > 0 ? Math.max(20, (revenue / maxRevenue) * 160) : 20;
              return (
                <div key={`${item.year || item.Year}-${item.month || item.Month}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <small style={{ fontSize: 10, color: '#666' }}>{formatVND(revenue)}</small>
                  <div style={{ width: '100%', height, background: '#2563eb', borderRadius: '4px 4px 0 0' }} />
                  <small style={{ fontSize: 11 }}>{item.month || item.Month}/{item.year || item.Year}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <section className="admin-grid">
        <div className="admin-card">
          <h3>Chuyến sắp chạy</h3>
          {/* <TripsTable trips={trips.slice(0, 5)} /> */}
          <TripsTable trips={upcomingTrips.slice(0, 5)} />
        </div>
        <div className="admin-card">
          <h3>Đơn đặt vé mới nhất</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Khách</th><th>Tuyến</th><th>Trạng thái</th><th>Tiền</th></tr></thead>
              <tbody>
                {bookings.slice(0, 6).map(b => {
                  const id = pick(b, ["bookingID", "BookingID"]);
                  return (
                    <tr key={id}>
                      <td>{id}</td>
                      <td>{pick(b, ["customerName", "CustomerName"])}</td>
                      <td>{pick(b, ["route", "Route"]) || "..."}</td>
                      <td><span className="badge">{getPaymentStatus(b)}</span></td>
                      <td>{formatVND(pick(b, ["totalPrice", "TotalPrice"], 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

// ==================== HOÁ ĐƠN ====================
function InvoicesManager({ bookings, trips, onRefresh }) {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const { search, setSearch, filtered } = useSearch(bookings, ['customerName', 'CustomerName', 'customerPhone', 'CustomerPhone', 'route', 'Route']);
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
      await apiFetch(`/api/bookings/${id}/payment-status`, { method: "PUT", body: JSON.stringify(status) });
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            {loadingInvoice ? (
              <p>Đang tải hóa đơn...</p>
            ) : invoiceDetail ? (
              <>
                <div id="invoice-print-area">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                      <h1 style={{ margin: 0, color: '#2563eb' }}>🚌 VéXeAZ</h1>
                      <p style={{ margin: 0, color: '#666' }}>Hệ thống đặt vé xe khách</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h2 style={{ margin: 0 }}>HÓA ĐƠN #{invoiceDetail.bookingID}</h2>
                      <p style={{ margin: 0, color: '#666' }}>{formatDateTime(invoiceDetail.bookingDate)}</p>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 12px 0' }}>Thông tin khách hàng</h4>
                    <div className="row"><span>Họ tên:</span><b>{invoiceDetail.customerName}</b></div>
                    <div className="row"><span>SĐT:</span><span>{invoiceDetail.customerPhone}</span></div>
                    <div className="row"><span>Email:</span><span>{invoiceDetail.customerEmail}</span></div>
                  </div>

                  {invoiceDetail.trip && (
                    <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>Thông tin chuyến xe</h4>
                      <div className="row"><span>Tuyến:</span><b>{invoiceDetail.trip.departureLocation} → {invoiceDetail.trip.arrivalLocation}</b></div>
                      <div className="row"><span>Giờ đi:</span><span>{formatDateTime(invoiceDetail.trip.departureTime)}</span></div>
                      <div className="row"><span>Giờ đến:</span><span>{formatDateTime(invoiceDetail.trip.arrivalTime)}</span></div>
                      <div className="row"><span>Nhà xe:</span><span>{invoiceDetail.trip.operatorName}</span></div>
                      <div className="row"><span>Loại xe:</span><span>{invoiceDetail.trip.busType}</span></div>
                      <div className="row"><span>Biển số:</span><span>{invoiceDetail.trip.licensePlate}</span></div>
                    </div>
                  )}

                  <div style={{ background: '#fafafa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <h4 style={{ margin: '0 0 12px 0' }}>Chi tiết vé</h4>
                    <div className="row"><span>Số ghế:</span><span>{invoiceDetail.totalSeats}</span></div>
                    {invoiceDetail.seats?.length > 0 && (
                      <div className="row"><span>Ghế:</span><span>{invoiceDetail.seats.join(", ")}</span></div>
                    )}
                    <div className="row"><span>Đơn giá:</span><span>{formatVND(invoiceDetail.trip?.price || 0)}</span></div>
                    <div className="row"><span>Phương thức:</span><span>{invoiceDetail.paymentMethod}</span></div>
                    <div className="row"><span>Trạng thái:</span><span className="badge">{invoiceDetail.paymentStatus}</span></div>
                    <div className="row total"><span>TỔNG CỘNG:</span><span>{formatVND(invoiceDetail.totalPrice)}</span></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={printInvoice}>
                    <i className="fa-solid fa-print" /> In hóa đơn
                  </button>
                  {invoiceDetail.paymentStatus !== 'Paid' && (
                    <button className="btn btn-outline" style={{ background: '#dcfce7', color: '#16a34a', border: 'none' }}
                      onClick={() => updateStatus(invoiceDetail.bookingID, 'Paid')}>
                      ✓ Xác nhận Paid
                    </button>
                  )}
                  {invoiceDetail.paymentStatus !== 'Cancelled' && (
                    <button className="btn btn-danger"
                      onClick={() => updateStatus(invoiceDetail.bookingID, 'Cancelled')}>
                      Hủy đơn
                    </button>
                  )}
                  <button className="btn btn-outline" onClick={() => { setSelectedInvoice(null); setInvoiceDetail(null); }}>
                    Đóng
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, SĐT, tuyến..." />
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Mã HĐ</th><th>Khách hàng</th><th>SĐT</th><th>Tuyến</th><th>Ngày đặt</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thao tác</th></tr>
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
                  <td>{pick(item, ["route", "Route"]) || findTripRoute(trips, pick(item, ["tripID", "TripID"]))}</td>
                  <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
                  <td><span className="badge">{status}</span></td>
                  <td>{formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}</td>
                  <td className="admin-actions">
                    <button className="btn btn-outline" onClick={() => viewInvoice(id)}>
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
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, pageSize: ADMIN_CRUD_PAGE_SIZE, totalPages: 1 });
  const [filters, setFilters] = useState({ fullName: "", email: "", phone: "", role: "" });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ userID: null, fullName: "", email: "", phone: "", role: "Customer", password: "" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userApi.list(cleanParams({ ...filters, page, pageSize: ADMIN_CRUD_PAGE_SIZE }));
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items);
      setMeta(paged);
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không tải được danh sách người dùng." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [page, filters.fullName, filters.email, filters.phone, filters.role]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const openCreate = () => {
    setForm({ userID: null, fullName: "", email: "", phone: "", role: "Customer", password: "" });
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
      if (!payload.fullName || !payload.email || !payload.phone) throw new Error("Vui lòng nhập đủ họ tên, email và số điện thoại.");
      if (!form.userID || form.password.trim()) payload.password = form.password.trim();
      if (!form.userID && !payload.password) throw new Error("Vui lòng nhập mật khẩu khi thêm user.");

      if (form.userID) await userApi.update(form.userID, payload);
      else await userApi.create(payload);

      setNotice({ type: "success", text: form.userID ? "Cập nhật user thành công." : "Thêm user thành công." });
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
      <SectionHeader title="Quản lý người dùng" showForm={showForm} onToggle={() => (showForm ? setShowForm(false) : openCreate())} />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Họ tên" required />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" required />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Số điện thoại" required />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="Customer">Customer</option>
            <option value="Operator">Operator</option>
            <option value="Admin">Admin</option>
          </select>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.userID ? "Mật khẩu mới nếu muốn đổi" : "Mật khẩu"} required={!form.userID} />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>{form.userID ? "Cập nhật" : "Lưu user"}</button>
            <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}
      <div className="admin-filter-grid">
        <input value={filters.fullName} onChange={(e) => updateFilter("fullName", e.target.value)} placeholder="Tìm họ tên" />
        <input value={filters.email} onChange={(e) => updateFilter("email", e.target.value)} placeholder="Tìm email" />
        <input value={filters.phone} onChange={(e) => updateFilter("phone", e.target.value)} placeholder="Tìm số điện thoại" />
        <select value={filters.role} onChange={(e) => updateFilter("role", e.target.value)}>
          <option value="">Tất cả role</option>
          <option value="Customer">Customer</option>
          <option value="Operator">Operator</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò</th><th>Ngày tạo</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["userID", "UserID"]);
              const role = pick(item, ["role", "Role"], "Customer");
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td><b>{pick(item, ["fullName", "FullName"])}</b></td>
                  <td>{pick(item, ["email", "Email"])}</td>
                  <td>{pick(item, ["phone", "Phone"])}</td>
                  <td>
                    <span className="badge" style={{ background: role === 'Admin' ? '#fef9c3' : '#f0f9ff', color: role === 'Admin' ? '#854d0e' : '#1d4ed8' }}>
                      {role}
                    </span>
                  </td>
                  <td>{formatDateTime(pick(item, ["createdAt", "CreatedAt"]))}</td>
                  <td className="admin-actions">
                    <button className="btn btn-outline" onClick={() => editItem(item)}>Sửa</button>
                    <button className="btn btn-danger" onClick={() => removeItem(id)}>Xóa</button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan="7" className="empty-cell">Không có người dùng phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination page={meta.page} totalPages={meta.totalPages} totalCount={meta.totalCount} onPageChange={setPage} />
    </section>
  );
}

// ==================== TRIPS MANAGER ====================
function TripsManager({ trips, buses, operators, onRefresh }) {
  const [form, setForm] = useState(EMPTY_TRIP);
  const [showForm, setShowForm] = useState(false);
  const { search, setSearch, filtered } = useSearch(trips, ['departureLocation', 'arrivalLocation', 'operator', 'busType']);
  const { page, setPage, totalPages, rows } = usePagination(filtered);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tripID: form.tripID || 0, busID: Number(form.busID),
        departureLocation: form.departureLocation.trim(), arrivalLocation: form.arrivalLocation.trim(),
        departureTime: form.departureTime, arrivalTime: form.arrivalTime,
        price: Number(form.price || 0), availableSeats: Number(form.availableSeats || 0),
        status: form.status || "Scheduled",
      };
      if (!payload.busID || !payload.departureLocation || !payload.arrivalLocation || !payload.departureTime || !payload.arrivalTime)
        throw new Error("Vui lòng nhập đủ thông tin chuyến xe.");
      if (form.tripID) await apiFetch(`/api/trips/${form.tripID}`, { method: "PUT", body: JSON.stringify(payload) });
      else await apiFetch("/api/trips", { method: "POST", body: JSON.stringify(payload) });
      setForm(EMPTY_TRIP); setShowForm(false); await onRefresh(); setPage(1);
    } catch (e2) { alert(e2.message || "Không lưu được chuyến xe."); }
  };

  const editItem = (item) => {
    setForm({ tripID: item.id, busID: item.busId || "", departureLocation: item.departureLocation || "", arrivalLocation: item.arrivalLocation || "", departureTime: toDateTimeLocal(item.departureTime), arrivalTime: toDateTimeLocal(item.arrivalTime), price: item.price || "", availableSeats: item.availableSeats || "", status: item.status || "Scheduled" });
    setShowForm(true);
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa chuyến xe #${id}?`)) return;
    try { await apiFetch(`/api/trips/${id}`, { method: "DELETE" }); await onRefresh(); }
    catch (e) { alert(e.message || "Không xóa được chuyến xe."); }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader title="Quản lý chuyến xe" showForm={showForm} onToggle={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_TRIP)} />
      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <select value={form.busID} onChange={(e) => setForm({ ...form, busID: e.target.value })} required>
            <option value="">Chọn xe</option>
            {buses.map((b) => { const busId = pick(b, ["busID", "BusID"]); return <option key={busId} value={busId}>Xe #{busId} - {pick(b, ["licensePlate", "LicensePlate"])} ({pick(b, ["busType", "BusType"])}) - {pick(b, ["operatorName", "OperatorName"], findOperatorName(operators, pick(b, ["operatorID", "OperatorID"])))}</option>; })}
          </select>
          <input value={form.departureLocation} onChange={(e) => setForm({ ...form, departureLocation: e.target.value })} placeholder="Điểm đi" required />
          <input value={form.arrivalLocation} onChange={(e) => setForm({ ...form, arrivalLocation: e.target.value })} placeholder="Điểm đến" required />
          <input type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required />
          <input type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} required />
          <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Giá vé" required />
          <input type="number" min="0" value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} placeholder="Số ghế trống" required />
          <input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="Trạng thái" />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">{form.tripID ? "Cập nhật" : "Lưu chuyến xe"}</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}>Hủy</button>
          </div>
        </form>
      )}
      <SearchBox value={search} onChange={setSearch} placeholder="Tìm tuyến, nhà xe, loại xe..." />
      <TripsTable trips={rows} onEdit={editItem} onDelete={removeItem} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

// ==================== BOOKINGS MANAGER ====================
function BookingsManager({ bookings, trips, onRefresh }) {
  const [form, setForm] = useState(EMPTY_BOOKING);
  const [showForm, setShowForm] = useState(false);
  const { search, setSearch, filtered } = useSearch(bookings, ['customerName', 'CustomerName', 'customerPhone', 'CustomerPhone']);
  const { page, setPage, totalPages, rows } = usePagination(filtered);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const trip = trips.find((t) => String(t.id) === String(form.tripID));
      const seats = Number(form.totalSeats || 0);
      if (!form.tripID || !form.customerName.trim() || !form.customerPhone.trim() || seats <= 0) throw new Error("Vui lòng nhập đủ thông tin đặt vé.");
      await apiFetch("/api/bookings", { method: "POST", body: JSON.stringify({ tripID: Number(form.tripID), customerName: form.customerName.trim(), customerPhone: form.customerPhone.trim(), customerEmail: form.customerEmail.trim(), totalSeats: seats, totalPrice: Number((trip?.price || 0) * seats), paymentMethod: form.paymentMethod || "Online", paymentStatus: form.paymentStatus || "Pending" }) });
      setForm(EMPTY_BOOKING); setShowForm(false); await onRefresh(); setPage(1);
    } catch (e2) { alert(e2.message || "Không thêm được đơn đặt vé."); }
  };

  const updateStatus = async (id, status) => {
    try { await apiFetch(`/api/bookings/${id}/payment-status`, { method: "PUT", body: JSON.stringify(status) }); await onRefresh(); }
    catch (e) { alert(e.message || "Không cập nhật được."); }
  };

  const removeItem = async (id) => {
    if (!confirm(`Xóa đơn #${id}?`)) return;
    try { await apiFetch(`/api/bookings/${id}`, { method: "DELETE" }); await onRefresh(); }
    catch (e) { alert(e.message || "Không xóa được đơn đặt vé."); }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader title="Quản lý đặt vé" showForm={showForm} onToggle={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BOOKING)} />
      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <select value={form.tripID} onChange={(e) => setForm({ ...form, tripID: e.target.value })} required>
            <option value="">Chọn chuyến</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.id} - {t.departureLocation} → {t.arrivalLocation}</option>)}
          </select>
          <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Tên khách" required />
          <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="SĐT khách" required />
          <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" />
          <input type="number" min="1" value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} placeholder="Số ghế" required />
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            <option value="Online">Online</option><option value="Cash">Cash</option>
          </select>
          <select value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option>
          </select>
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Lưu đơn đặt vé</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BOOKING)}>Hủy</button>
          </div>
        </form>
      )}
      <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, SĐT khách..." />
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Khách hàng</th><th>SĐT</th><th>Tuyến</th><th>Ngày đặt</th><th>Thanh toán</th><th>Tổng tiền</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["bookingID", "BookingID", "bookingId", "id"]);
              const status = getPaymentStatus(item);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{pick(item, ["customerName", "CustomerName"])}</td>
                  <td>{pick(item, ["customerPhone", "CustomerPhone"])}</td>
                  <td>{pick(item, ["route", "Route"]) || findTripRoute(trips, pick(item, ["tripID", "TripID"]))}</td>
                  <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
                  <td><span className="badge">{status}</span></td>
                  <td>{formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}</td>
                  <td className="admin-actions">
                    <button className="btn btn-outline" onClick={() => updateStatus(id, status === "Paid" ? "Pending" : "Paid")}>{status === "Paid" ? "Pending" : "Paid"}</button>
                    <button className="btn btn-danger" onClick={() => removeItem(id)}>Xóa</button>
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
  const { search, setSearch, filtered } = useSearch(transactions, ['customerName', 'CustomerName', 'paymentMethod', 'PaymentMethod', 'paymentStatus', 'PaymentStatus']);
  const { page, setPage, totalPages, rows } = usePagination(filtered);
  return (
    <section className="admin-card table-card">
      <h3>Quản lý giao dịch</h3>
      <SearchBox value={search} onChange={setSearch} placeholder="Tìm khách, trạng thái..." />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mã GD</th><th>Khách hàng</th><th>Tuyến</th><th>Phương thức</th><th>Trạng thái</th><th>Số ghế</th><th>Tổng tiền</th><th>Ngày tạo</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["id", "Id", "bookingID", "BookingID"]);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{pick(item, ["customerName", "CustomerName"])}</td>
                  <td>{pick(item, ["route", "Route"]) || "Chưa rõ tuyến"}</td>
                  <td>{pick(item, ["paymentMethod", "PaymentMethod"], "Chưa rõ")}</td>
                  <td><span className="badge">{getPaymentStatus(item)}</span></td>
                  <td>{pick(item, ["totalSeats", "TotalSeats"], 0)}</td>
                  <td>{formatVND(pick(item, ["totalPrice", "TotalPrice"], 0))}</td>
                  <td>{formatDateTime(pick(item, ["bookingDate", "BookingDate"]))}</td>
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
function BusesManager({ operators: initialOperators = [], onRefresh }) {
  const [rows, setRows] = useState([]);
  const [operators, setOperators] = useState(initialOperators);
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, pageSize: ADMIN_CRUD_PAGE_SIZE, totalPages: 1 });
  const [form, setForm] = useState(EMPTY_BUS);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ licensePlate: "", busType: "", operatorId: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadBuses = async () => {
    setLoading(true);
    try {
      const data = await busApi.list(cleanParams({ ...filters, page, pageSize: ADMIN_CRUD_PAGE_SIZE }));
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items);
      setMeta(paged);
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không tải được danh sách xe." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBuses(); }, [page, filters.licensePlate, filters.busType, filters.operatorId]);

  useEffect(() => {
    const loadOperators = async () => {
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
  }, [initialOperators]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const payload = { busID: form.busID || 0, operatorID: Number(form.operatorID), licensePlate: form.licensePlate.trim(), capacity: Number(form.capacity || 0), busType: form.busType.trim() };
      if (!payload.operatorID || !payload.licensePlate || !payload.capacity || !payload.busType) throw new Error("Vui lòng nhập đủ thông tin xe.");
      if (form.busID) await busApi.update(form.busID, payload);
      else await busApi.create(payload);
      setNotice({ type: "success", text: form.busID ? "Cập nhật xe thành công." : "Thêm xe thành công." });
      setForm(EMPTY_BUS); setShowForm(false); await loadBuses(); await onRefresh?.();
    } catch (e2) { setNotice({ type: "error", text: e2.message || "Không lưu được xe." }); }
  };

  const editItem = (item) => {
    setForm({ busID: pick(item, ["busID", "BusID"]), operatorID: pick(item, ["operatorID", "OperatorID"]), licensePlate: pick(item, ["licensePlate", "LicensePlate"], ""), capacity: pick(item, ["capacity", "Capacity"], ""), busType: pick(item, ["busType", "BusType"], "") });
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
    }
    catch (e) { setNotice({ type: "error", text: e.message || "Không xóa được xe. Có thể xe đang được dùng trong chuyến." }); }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader title="Quản lý xe" showForm={showForm} onToggle={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_BUS)} />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <select value={form.operatorID} onChange={(e) => setForm({ ...form, operatorID: e.target.value })} required>
            <option value="">Chọn nhà xe</option>
            {operators.map((o) => <option key={pick(o, ["operatorID", "OperatorID"])} value={pick(o, ["operatorID", "OperatorID"])}>{pick(o, ["name", "Name"])}</option>)}
          </select>
          <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="Biển số" required />
          <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Sức chứa" required />
          <input value={form.busType} onChange={(e) => setForm({ ...form, busType: e.target.value })} placeholder="Loại xe" required />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">{form.busID ? "Cập nhật" : "Lưu xe"}</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}>Hủy</button>
          </div>
        </form>
      )}
      <div className="admin-filter-grid">
        <input value={filters.licensePlate} onChange={(e) => updateFilter("licensePlate", e.target.value)} placeholder="Tìm biển số" />
        <input value={filters.busType} onChange={(e) => updateFilter("busType", e.target.value)} placeholder="Tìm loại xe" />
        <select value={filters.operatorId} onChange={(e) => updateFilter("operatorId", e.target.value)}>
          <option value="">Tất cả nhà xe</option>
          {operators.map((o) => {
            const id = pick(o, ["operatorID", "OperatorID"]);
            return <option key={id} value={id}>{pick(o, ["name", "Name"])}</option>;
          })}
        </select>
      </div>
      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Nhà xe</th><th>Biển số</th><th>Loại xe</th><th>Sức chứa</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["busID", "BusID"]);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{pick(item, ["operatorName", "OperatorName"]) || findOperatorName(operators, pick(item, ["operatorID", "OperatorID"]))}</td>
                  <td>{pick(item, ["licensePlate", "LicensePlate"])}</td>
                  <td>{pick(item, ["busType", "BusType"])}</td>
                  <td>{pick(item, ["capacity", "Capacity"])}</td>
                  <td className="admin-actions">
                    <button className="btn btn-outline" onClick={() => editItem(item)}>Sửa</button>
                    <button className="btn btn-danger" onClick={() => removeItem(id)}>Xóa</button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">Không có xe phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination page={meta.page} totalPages={meta.totalPages} totalCount={meta.totalCount} onPageChange={setPage} />
    </section>
  );
}

// ==================== OPERATORS ====================
function OperatorsManager({ onRefresh }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, pageSize: ADMIN_CRUD_PAGE_SIZE, totalPages: 1 });
  const [form, setForm] = useState(EMPTY_OPERATOR);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ name: "", phone: "", email: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadOperators = async () => {
    setLoading(true);
    try {
      const data = await operatorApi.list(cleanParams({ ...filters, page, pageSize: ADMIN_CRUD_PAGE_SIZE }));
      const paged = normalizePagedResponse(data, page);
      setRows(paged.items);
      setMeta(paged);
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Không tải được danh sách nhà xe." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOperators(); }, [page, filters.name, filters.phone, filters.email]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const payload = { operatorID: form.operatorID || 0, name: form.name.trim(), description: form.description.trim(), contactPhone: form.contactPhone.trim(), email: form.email.trim() };
      if (!payload.name || !payload.contactPhone) throw new Error("Vui lòng nhập tên và số điện thoại nhà xe.");
      if (form.operatorID) await operatorApi.update(form.operatorID, payload);
      else await operatorApi.create(payload);
      setNotice({ type: "success", text: form.operatorID ? "Cập nhật nhà xe thành công." : "Thêm nhà xe thành công." });
      setForm(EMPTY_OPERATOR); setShowForm(false); await loadOperators(); await onRefresh?.();
    } catch (e2) { setNotice({ type: "error", text: e2.message || "Không lưu được nhà xe." }); }
  };

  const editItem = (item) => {
    setForm({ operatorID: pick(item, ["operatorID", "OperatorID"]), name: pick(item, ["name", "Name"], ""), description: pick(item, ["description", "Description"], ""), contactPhone: pick(item, ["contactPhone", "ContactPhone"], ""), email: pick(item, ["email", "Email"], "") });
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
    }
    catch (e) { setNotice({ type: "error", text: e.message || "Không xóa được nhà xe. Có thể vẫn còn xe thuộc nhà xe này." }); }
  };

  return (
    <section className="admin-card table-card">
      <SectionHeader title="Quản lý nhà xe" showForm={showForm} onToggle={() => toggleCreateForm(showForm, setShowForm, setForm, EMPTY_OPERATOR)} />
      {notice && <AdminNotice type={notice.type}>{notice.text}</AdminNotice>}
      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên nhà xe" required />
          <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Số điện thoại" required />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả" />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">{form.operatorID ? "Cập nhật" : "Lưu nhà xe"}</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_OPERATOR)}>Hủy</button>
          </div>
        </form>
      )}
      <div className="admin-filter-grid">
        <input value={filters.name} onChange={(e) => updateFilter("name", e.target.value)} placeholder="Tìm tên nhà xe" />
        <input value={filters.phone} onChange={(e) => updateFilter("phone", e.target.value)} placeholder="Tìm số điện thoại" />
        <input value={filters.email} onChange={(e) => updateFilter("email", e.target.value)} placeholder="Tìm email" />
      </div>
      {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Tên nhà xe</th><th>Điện thoại</th><th>Email</th><th>Mô tả</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const id = pick(item, ["operatorID", "OperatorID"]);
              return (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{pick(item, ["name", "Name"])}</td>
                  <td>{pick(item, ["contactPhone", "ContactPhone"])}</td>
                  <td>{pick(item, ["email", "Email"])}</td>
                  <td>{pick(item, ["description", "Description"])}</td>
                  <td className="admin-actions">
                    <button className="btn btn-outline" onClick={() => editItem(item)}>Sửa</button>
                    <button className="btn btn-danger" onClick={() => removeItem(id)}>Xóa</button>
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">Không có nhà xe phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination page={meta.page} totalPages={meta.totalPages} totalCount={meta.totalCount} onPageChange={setPage} />
    </section>
  );
}

// ==================== SHARED COMPONENTS ====================
function TripsTable({ trips, onEdit, onDelete }) {
  const showActions = Boolean(onEdit || onDelete);
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Tuyến</th><th>Giờ đi</th><th>Nhà xe</th><th>Loại xe</th><th>Chỗ</th><th>Giá</th>{showActions && <th>Thao tác</th>}</tr></thead>
        <tbody>
          {trips.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td><b>{t.departureLocation}</b> → <b>{t.arrivalLocation}</b></td>
              <td>{formatDateTime(t.departureTime)}</td>
              <td>{t.operator || "Chưa rõ"}</td>
              <td>{t.busType || "Chưa rõ"}</td>
              <td>{t.availableSeats}</td>
              <td>{formatVND(t.price)}</td>
              {showActions && (
                <td className="admin-actions">
                  {onEdit && <button className="btn btn-outline" onClick={() => onEdit(t)}>Sửa</button>}
                  {onDelete && <button className="btn btn-danger" onClick={() => onDelete(t.id)}>Xóa</button>}
                </td>
              )}
            </tr>
          ))}
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
        <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-plus"}`} /> {showForm ? "Đóng form" : "Thêm mới"}
      </button>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</button>
      <span>Trang {page}/{totalPages}</span>
      <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Sau</button>
    </div>
  );
}

function AdminPagination({ page, totalPages, totalCount, onPageChange }) {
  const safeTotalPages = Math.max(1, Number(totalPages || 1));
  return (
    <div className="admin-pagination">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</button>
      <span>Trang {page}/{safeTotalPages} · {totalCount || 0} dòng</span>
      <button className="btn btn-outline" disabled={page >= safeTotalPages} onClick={() => onPageChange(page + 1)}>Sau</button>
    </div>
  );
}

function AdminNotice({ type = "success", children }) {
  return <div className={`admin-notice ${type}`}>{children}</div>;
}

function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...' }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: '8px 12px', width: 300, borderRadius: 6, border: '1px solid #ddd', marginBottom: 12 }} />
  );
}

// ==================== HOOKS ====================
function usePagination(items) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const rows = useMemo(() => { const start = (page - 1) * PAGE_SIZE; return items.slice(start, start + PAGE_SIZE); }, [items, page]);
  return { page, setPage, totalPages, rows };
}

function useSearch(items, fields) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    search.trim() ? items.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(search.toLowerCase()))) : items,
    [items, search]);
  return { search, setSearch, filtered };
}

// ==================== UTILS ====================
function enrichTrips(trips, buses, operators) {
  return trips.map((trip) => {
    if (trip.operator && trip.busType) return trip;
    const bus = buses.find((x) => String(pick(x, ["busID", "BusID"])) === String(trip.busId));
    const operatorId = pick(bus, ["operatorID", "OperatorID"]);
    const operator = operators.find((x) => String(pick(x, ["operatorID", "OperatorID"])) === String(operatorId));
    return { ...trip, busType: trip.busType || pick(bus, ["busType", "BusType"]), operator: trip.operator || pick(bus, ["operatorName", "OperatorName"]) || pick(operator, ["name", "Name"]) };
  });
}
function findOperatorName(operators, operatorId) {
  const found = operators.find((o) => String(pick(o, ["operatorID", "OperatorID"])) === String(operatorId));
  return found ? pick(found, ["name", "Name"]) : `#${operatorId}`;
}
function findTripRoute(trips, tripId) {
  const found = trips.find((t) => String(t.id) === String(tripId));
  return found ? `${found.departureLocation} → ${found.arrivalLocation}` : "Chưa rõ tuyến";
}
function getPaymentStatus(item) { return pick(item, ["paymentStatus", "PaymentStatus", "status", "Status"], "Pending"); }
function formatDateTime(value) { return value ? new Date(value).toLocaleString("vi-VN") : ""; }
function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function toggleCreateForm(showForm, setShowForm, setForm, emptyForm) { if (showForm) setForm(emptyForm); setShowForm(!showForm); }
function cancelForm(setShowForm, setForm, emptyForm) { setShowForm(false); setForm(emptyForm); }
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
const selectedTrip = useMemo(() =>
  selectedTripId ? trips.find(t => String(t.id) === String(selectedTripId)) || null : null
, [trips, selectedTripId]);
  // ── Bước 1: lọc chuyến xe ──
  const [fSearch, setFSearch]     = useState('');
  const [fOperator, setFOperator] = useState('');
  const [fDate, setFDate]         = useState('');
  const [fStatus, setFStatus]     = useState('');

  // const operators = useMemo(() => {
  //   const seen = new Set();
  //   return trips.filter(t => { const o = t.operator || ''; if (seen.has(o)) return false; seen.add(o); return true; });
  // }, [trips]);

  const filteredTrips = useMemo(() => trips.filter(t => {
    const route = `${t.departureLocation} ${t.arrivalLocation}`;
    return (!fSearch   || includesText(route, fSearch) || includesText(t.operator, fSearch)) &&
           (!fOperator || t.operator === fOperator) &&
           (!fDate     || dateOnly(t.departureTime) === fDate) &&
           (!fStatus   || (t.status || '').toLowerCase() === fStatus.toLowerCase());
  }), [trips, fSearch, fOperator, fDate, fStatus]);

  const { page: tripPage, setPage: setTripPage, totalPages: tripTotalPages, rows: tripRows } = usePagination(filteredTrips);

  // ── Bước 2: đơn hàng của chuyến đã chọn ──
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail,   setInvoiceDetail]   = useState(null);
  const [loadingInvoice,  setLoadingInvoice]  = useState(false);
  const [showForm,        setShowForm]        = useState(false);
  const [form,            setForm]            = useState(EMPTY_BOOKING);
  const [bSearch,         setBSearch]         = useState('');
  const [bStatus,         setBStatus]         = useState('');

  const tripBookings = useMemo(() => {
    if (!selectedTrip) return [];
    return bookings.filter(b => String(pick(b, ['tripID','TripID'])) === String(selectedTrip.id));
  }, [bookings, selectedTrip]);

  const filteredBookings = useMemo(() => tripBookings.filter(b => {
    const status = getPaymentStatus(b);
    return (!bStatus || status === bStatus) &&
           (!bSearch || includesText(pick(b,['customerName','CustomerName']), bSearch) ||
                        includesText(pick(b,['customerPhone','CustomerPhone']), bSearch));
  }), [tripBookings, bStatus, bSearch]);

  const { page, setPage, totalPages, rows } = usePagination(filteredBookings);

  const viewInvoice = async (bookingId) => {
    setLoadingInvoice(true); setSelectedInvoice(bookingId);
    try { setInvoiceDetail(await apiFetch(`/api/admin/invoice/${bookingId}`)); }
    catch { alert("Không tải được hóa đơn."); }
    finally { setLoadingInvoice(false); }
  };

  const closeInvoice = () => { setSelectedInvoice(null); setInvoiceDetail(null); };

  const printInvoice = () => {
    const area = document.getElementById("invoice-print-area");
    if (!area) return;
    const w = window.open("","_blank");
    w.document.write(`<html><head><title>Hóa đơn #${invoiceDetail?.bookingID}</title>
      <style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{color:#2563eb}
      .row{display:flex;justify-content:space-between;margin:8px 0;border-bottom:1px solid #eee;padding-bottom:8px}
      .total{font-size:18px;font-weight:bold;color:#2563eb}</style></head>
      <body>${area.innerHTML}</body></html>`);
    w.document.close(); w.print();
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
    await apiFetch(`/api/bookings/${id}/payment-status`, { method:"PUT", body:JSON.stringify(status) });
    await onRefresh();
    // Giữ lại selectedTrip sau refresh
    // setSelectedTrip(prev => prev ? { ...prev } : prev);
    if (invoiceDetail?.bookingID === id) viewInvoice(id);
  } catch(e) { alert(e.message || "Không cập nhật được."); }
};

const removeItem = async (id) => {
  if (!confirm(`Xóa đơn #${id}?`)) return;
  try {
    await apiFetch(`/api/bookings/${id}`, {method:"DELETE"});
    await onRefresh();
    // Giữ lại selectedTrip sau refresh
    // setSelectedTrip(prev => prev ? { ...prev } : prev);
  }
  catch(e) { alert(e.message || "Không xóa được."); }
};
  const submitBooking = async (e) => {
    e.preventDefault();
    try {
      const seats = Number(form.totalSeats || 0);
      if (!form.customerName.trim() || !form.customerPhone.trim() || seats <= 0)
        throw new Error("Vui lòng nhập đủ thông tin.");
      await apiFetch("/api/bookings", { method:"POST", body:JSON.stringify({
        tripID: selectedTrip.id, customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(), customerEmail: form.customerEmail.trim(),
        totalSeats: seats, totalPrice: Number((selectedTrip.price||0)*seats),
        paymentMethod: form.paymentMethod||"Online", paymentStatus: form.paymentStatus||"Pending",
      })});
      setForm(EMPTY_BOOKING); setShowForm(false); await onRefresh(); setPage(1);
    } catch(e2) { alert(e2.message || "Không thêm được đơn."); }
  };

  // ═══════════════ RENDER ═══════════════

  // Modal hóa đơn (dùng chung cả 2 bước)
  const invoiceModal = selectedInvoice && (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={closeInvoice}>
      <div style={{background:'white',borderRadius:10,padding:20,width:420,maxHeight:'75vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}
        onClick={e=>e.stopPropagation()}>
        {loadingInvoice ? <p style={{textAlign:'center',color:'#666'}}>Đang tải...</p> : invoiceDetail ? (
          <>
            <div id="invoice-print-area">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div><div style={{fontWeight:'bold',fontSize:16,color:'#2563eb'}}>🚌 VéXeAZ</div><div style={{fontSize:11,color:'#888'}}>Hệ thống đặt vé xe khách</div></div>
                <div style={{textAlign:'right'}}><div style={{fontWeight:'bold',fontSize:15}}>HÓA ĐƠN #{invoiceDetail.bookingID}</div><div style={{fontSize:11,color:'#888'}}>{formatDateTime(invoiceDetail.bookingDate)}</div></div>
              </div>
              <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:13}}>
                <div style={{fontWeight:'bold',marginBottom:6}}>Khách hàng</div>
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'4px 0'}}><span style={{color:'#666'}}>Họ tên:</span><b>{invoiceDetail.customerName}</b></div>
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'4px 0'}}><span style={{color:'#666'}}>SĐT:</span><span>{invoiceDetail.customerPhone}</span></div>
                {invoiceDetail.customerEmail && <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{color:'#666'}}>Email:</span><span>{invoiceDetail.customerEmail}</span></div>}
              </div>
              {invoiceDetail.trip && (
                <div style={{background:'#f0f9ff',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:13}}>
                  <div style={{fontWeight:'bold',marginBottom:6}}>Chuyến xe</div>
                  <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #e0f0ff',padding:'4px 0'}}><span style={{color:'#666'}}>Tuyến:</span><b>{invoiceDetail.trip.departureLocation} → {invoiceDetail.trip.arrivalLocation}</b></div>
                  <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #e0f0ff',padding:'4px 0'}}><span style={{color:'#666'}}>Giờ đi:</span><span>{formatDateTime(invoiceDetail.trip.departureTime)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{color:'#666'}}>Nhà xe:</span><span>{invoiceDetail.trip.operatorName}</span></div>
                </div>
              )}
              <div style={{background:'#fafafa',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:13}}>
                <div style={{fontWeight:'bold',marginBottom:6}}>Chi tiết vé</div>
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'4px 0'}}><span style={{color:'#666'}}>Số ghế:</span><span>{invoiceDetail.totalSeats}</span></div>
                {invoiceDetail.seats?.length>0 && <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'4px 0'}}><span style={{color:'#666'}}>Ghế:</span><span>{invoiceDetail.seats.join(', ')}</span></div>}
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'4px 0'}}><span style={{color:'#666'}}>Phương thức:</span><span>{invoiceDetail.paymentMethod}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #eee',padding:'4px 0'}}><span style={{color:'#666'}}>Trạng thái:</span>
                  <span style={{padding:'2px 10px',borderRadius:20,background:invoiceDetail.paymentStatus==='Paid'?'#dcfce7':invoiceDetail.paymentStatus==='Cancelled'?'#fee2e2':'#fef9c3',color:invoiceDetail.paymentStatus==='Paid'?'#16a34a':invoiceDetail.paymentStatus==='Cancelled'?'#dc2626':'#854d0e',fontWeight:'bold',fontSize:12}}>{invoiceDetail.paymentStatus}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:15,fontWeight:'bold',color:'#2563eb'}}><span>TỔNG CỘNG:</span><span>{formatVND(invoiceDetail.totalPrice)}</span></div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <button className="btn btn-primary" style={{fontSize:13,padding:'6px 12px'}} onClick={printInvoice}><i className="fa-solid fa-print"/> In</button>
              {invoiceDetail.paymentStatus!=='Paid' && <button style={{fontSize:13,padding:'6px 12px',background:'#dcfce7',color:'#16a34a',border:'none',borderRadius:6,cursor:'pointer',fontWeight:'bold'}} onClick={()=>updateStatus(invoiceDetail.bookingID,'Paid')}>✓ Paid</button>}
              {invoiceDetail.paymentStatus!=='Cancelled' && <button className="btn btn-danger" style={{fontSize:13,padding:'6px 12px'}} onClick={()=>updateStatus(invoiceDetail.bookingID,'Cancelled')}>Hủy đơn</button>}
              <button className="btn btn-outline" style={{fontSize:13,padding:'6px 12px',marginLeft:'auto'}} onClick={closeInvoice}>Đóng</button>
            </div>
          </>
        ) : <p>Không tải được hóa đơn.</p>}
      </div>
    </div>
  );

  // ── BƯỚC 2: danh sách đơn hàng của chuyến ──
  if (selectedTrip) return (
    <section className="admin-card table-card">
      {invoiceModal}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
        <button className="btn btn-outline" onClick={()=>{setSelectedTripId(null);setShowForm(false);setForm(EMPTY_BOOKING);}}>
          ← Quay lại
        </button>
        <div style={{flex:1}}>
          <h3 style={{margin:0}}>Đơn hàng — {selectedTrip.departureLocation} → {selectedTrip.arrivalLocation}</h3>
          <small style={{color:'#666'}}>{formatDateTime(selectedTrip.departureTime)} · {selectedTrip.operator} · {selectedTrip.busType} · {formatVND(selectedTrip.price)}/ghế</small>
        </div>
        <button className="btn btn-primary" onClick={()=>toggleCreateForm(showForm,setShowForm,setForm,{...EMPTY_BOOKING,tripID:selectedTrip.id})}>
          <i className={`fa-solid ${showForm?'fa-xmark':'fa-plus'}`}/> {showForm?'Đóng form':'Thêm đơn'}
        </button>
      </div>

      {/* Form thêm đơn */}
      {showForm && (
        <form className="admin-form-grid" onSubmit={submitBooking}>
          <input value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="Tên khách" required/>
          <input value={form.customerPhone} onChange={e=>setForm({...form,customerPhone:e.target.value})} placeholder="SĐT" required/>
          <input value={form.customerEmail} onChange={e=>setForm({...form,customerEmail:e.target.value})} placeholder="Email"/>
          <input type="number" min="1" value={form.totalSeats} onChange={e=>setForm({...form,totalSeats:e.target.value})} placeholder="Số ghế" required/>
          <select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}>
            <option value="Online">Online</option><option value="Cash">Cash</option>
          </select>
          <select value={form.paymentStatus} onChange={e=>setForm({...form,paymentStatus:e.target.value})}>
            <option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option>
          </select>
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Lưu đơn</button>
            <button className="btn btn-outline" type="button" onClick={()=>cancelForm(setShowForm,setForm,EMPTY_BOOKING)}>Hủy</button>
          </div>
        </form>
      )}

      {/* Lọc đơn */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        <input value={bSearch} onChange={e=>{setBSearch(e.target.value);setPage(1);}} placeholder="Tìm tên, SĐT..."
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',flex:1,minWidth:150}}/>
        <select value={bStatus} onChange={e=>{setBStatus(e.target.value);setPage(1);}}
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd'}}>
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Pending</option><option value="Paid">Paid</option><option value="Cancelled">Cancelled</option>
        </select>
        <button className="btn btn-outline" onClick={()=>{setBSearch('');setBStatus('');setPage(1);}}>Xóa lọc</button>
      </div>
      <p style={{color:'#666',marginBottom:8}}>Tìm thấy <b>{filteredBookings.length}</b> đơn / tổng <b>{tripBookings.length}</b> đơn của chuyến này</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Khách hàng</th><th>SĐT</th><th>Ngày đặt</th><th>Phương thức</th><th>Trạng thái</th><th>Tổng tiền</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map(item => {
              const id = pick(item,["bookingID","BookingID"]);
              const status = getPaymentStatus(item);
              return (
                <tr key={id}>
                  <td>#{id}</td>
                  <td>{pick(item,["customerName","CustomerName"])}</td>
                  <td>{pick(item,["customerPhone","CustomerPhone"])}</td>
                  <td>{formatDateTime(pick(item,["bookingDate","BookingDate"]))}</td>
                  <td>{pick(item,["paymentMethod","PaymentMethod"],"")}</td>
                  <td><span className="badge">{status}</span></td>
                  <td>{formatVND(pick(item,["totalPrice","TotalPrice"],0))}</td>
                  <td className="admin-actions">
                    <button className="btn btn-outline" onClick={()=>viewInvoice(id)}><i className="fa-solid fa-file-invoice"/> HĐ</button>
                    <button className="btn btn-outline" onClick={()=>updateStatus(id,status==='Paid'?'Pending':'Paid')}>{status==='Paid'?'Pending':'Paid'}</button>
                    <button className="btn btn-danger" onClick={()=>removeItem(id)}>Xóa</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage}/>
    </section>
  );

  // ── BƯỚC 1: danh sách chuyến xe ──
  return (
    <section className="admin-card table-card">
      <h3 style={{marginBottom:16}}>Chọn chuyến xe để xem đơn hàng</h3>

      {/* Bộ lọc chuyến */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        <input value={fSearch} onChange={e=>{setFSearch(e.target.value);setTripPage(1);}} placeholder="Tìm tuyến, nhà xe..."
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',flex:1,minWidth:180}}/>
        {/* <select value={fOperator} onChange={e=>{setFOperator(e.target.value);setTripPage(1);}}
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',minWidth:140}}>
          <option value="">Tất cả nhà xe</option>
          {operators.map(t=><option key={t.id} value={t.operator}>{t.operator}</option>)}
        </select> */}
        <select value={fOperator} onChange={e=>{setFOperator(e.target.value);setTripPage(1);}}
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd',minWidth:140,maxWidth:180}}>
          <option value="">Tất cả nhà xe</option>
          {operators.map(o => {
            const id   = pick(o, ["operatorID","OperatorID"]);
            const name = pick(o, ["name","Name"]);
            return <option key={id} value={name}>{name}</option>;
          })}
        </select>
        <input type="date" value={fDate} onChange={e=>{setFDate(e.target.value);setTripPage(1);}}
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd'}}/>
        <select value={fStatus} onChange={e=>{setFStatus(e.target.value);setTripPage(1);}}
          style={{padding:'8px 12px',borderRadius:6,border:'1px solid #ddd'}}>
          <option value="">Tất cả trạng thái</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button className="btn btn-outline" onClick={()=>{setFSearch('');setFOperator('');setFDate('');setFStatus('');setTripPage(1);}}>Xóa lọc</button>
      </div>
      <p style={{color:'#666',marginBottom:8}}>Tìm thấy <b>{filteredTrips.length}</b> chuyến</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Tuyến</th><th>Giờ đi</th><th>Nhà xe</th><th>Loại xe</th><th>Giá</th><th>Chỗ trống</th><th>Trạng thái</th><th>Đơn hàng</th></tr></thead>
          <tbody>
            {tripRows.map(t => {
              const tripBookingCount = bookings.filter(b=>String(pick(b,['tripID','TripID']))===String(t.id)).length;
              return (
                <tr key={t.id} style={{cursor:'pointer'}} onClick={()=>{setSelectedTripId(t.id);setPage(1);}}>
                  <td>#{t.id}</td>
                  <td><b>{t.departureLocation}</b> → <b>{t.arrivalLocation}</b></td>
                  <td>{formatDateTime(t.departureTime)}</td>
                  <td>{t.operator||'Chưa rõ'}</td>
                  <td>{t.busType||'Chưa rõ'}</td>
                  <td>{formatVND(t.price)}</td>
                  <td>{t.availableSeats}</td>
                  <td><span className="badge">{t.status||'Scheduled'}</span></td>
                  <td>
                    <button className="btn btn-primary" style={{fontSize:13,padding:'4px 12px'}}
                      onClick={e=>{e.stopPropagation();setSelectedTripId(t.id);setPage(1);}}>
                      <i className="fa-solid fa-ticket"/> {tripBookingCount} đơn
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={tripPage} totalPages={tripTotalPages} onPageChange={setTripPage}/>
    </section>
  );
}
