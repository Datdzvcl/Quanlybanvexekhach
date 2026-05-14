import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { API_BASE, formatVND, normalizeTrip } from "../api";

const PAGE_SIZE = 10;

const includesText = (value, query) =>
  String(value || "").toLowerCase().includes(String(query || "").toLowerCase());

export default function Search() {
  const [params] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busTypes, setBusTypes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [timeRange, setTimeRange] = useState("all");

  // Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const from = params.get("from") || "";
  const to   = params.get("to")   || "";
  const date = params.get("date") || "";

  // Fetch một trang cụ thể từ backend
  const fetchPage = useCallback(async (pageNum, isLoadMore = false) => {
    isLoadMore ? setLoadingMore(true) : setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to)   qs.set("to",   to);
      if (date) qs.set("date", date);      // ← GỬI DATE LÊN BACKEND
      qs.set("page",     pageNum);
      qs.set("pageSize", PAGE_SIZE);

      // Thử /search trước, fallback về /trips nếu 404
      let res = await fetch(`${API_BASE}/api/trips/search?${qs}`);
      if (res.status === 404) {
        res = await fetch(`${API_BASE}/api/trips?${qs}`);
      }
      if (!res.ok) throw new Error("Máy chủ không phản hồi");

      const json = await res.json();

      // Hỗ trợ cả 2 dạng response:
      // - Mới (phân trang): { data, page, pageSize, total, totalPages }
      // - Cũ (mảng thẳng): [...]
      let pageData, pageTotalPages, pageTotal;
      if (Array.isArray(json)) {
        // Response cũ chưa phân trang — hiển thị tất cả 1 trang
        pageData       = json.map(normalizeTrip);
        pageTotalPages = 1;
        pageTotal      = pageData.length;
      } else {
        pageData       = (json.data || []).map(normalizeTrip);
        pageTotalPages = json.totalPages ?? 1;
        pageTotal      = json.total      ?? pageData.length;
      }

      if (isLoadMore) {
        setTrips(prev => [...prev, ...pageData]);
      } else {
        setTrips(pageData);
      }

      setTotalPages(pageTotalPages);
      setTotal(pageTotal);
      setPage(pageNum);
    } catch {
      setError("Không thể lấy dữ liệu chuyến xe.");
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false);
    }
  }, [from, to, date]);

  // Khi tham số tìm kiếm thay đổi → reset về trang 1
  useEffect(() => {
    setTrips([]);
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  // Lọc client-side (busType, operator, timeRange) — không gọi API
  const filtered = useMemo(() => trips.filter(t => {
    const hour = t.departureTime ? new Date(t.departureTime).getHours() : -1;
    const okTime =
      timeRange === "all" ||
      (timeRange === "morning"   && hour >= 5  && hour < 12) ||
      (timeRange === "afternoon" && hour >= 12 && hour < 18) ||
      (timeRange === "night"     && (hour >= 18 || hour < 5));

    return (
      (busTypes.length  === 0 || busTypes.includes(t.busType))   &&
      (operators.length === 0 || operators.includes(t.operator)) &&
      okTime
    );
  }), [trips, busTypes, operators, timeRange]);

  const typeOptions     = useMemo(() => [...new Set(trips.map(t => t.busType).filter(Boolean))],    [trips]);
  const operatorOptions = useMemo(() => [...new Set(trips.map(t => t.operator).filter(Boolean))],   [trips]);

  const toggle = (value, list, setList) =>
    setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);

  const hasMore = page < totalPages;

  return (
    <>
      <Header />
      <div className="search-header">
        <div className="container">
          <h1>
            {from || to ? `${from || "Bất kỳ"} ➔ ${to || "Bất kỳ"}` : "Tất cả chuyến xe"}
          </h1>
          <p>
            {date
              ? `Ngày đi: ${new Date(date).toLocaleDateString("vi-VN")}`
              : "Tất cả các ngày"}
          </p>
        </div>
      </div>

      <div className="container search-results-layout">
        <aside className="filters">
          <h3>Bộ lọc</h3>

          <div className="filter-group">
            <h4>Thời gian</h4>
            {[
              ["all",       "Tất cả"],
              ["morning",   "Sáng 05:00 - 11:59"],
              ["afternoon", "Chiều 12:00 - 17:59"],
              ["night",     "Tối/đêm 18:00 - 04:59"],
            ].map(([v, l]) => (
              <label key={v}>
                <input type="radio" name="time" checked={timeRange === v} onChange={() => setTimeRange(v)} />{" "}{l}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Loại xe</h4>
            {typeOptions.length ? (
              typeOptions.map(x => (
                <label key={x}>
                  <input type="checkbox" checked={busTypes.includes(x)} onChange={() => toggle(x, busTypes, setBusTypes)} />{" "}{x}
                </label>
              ))
            ) : <p className="muted">Chưa có dữ liệu</p>}
          </div>

          <div className="filter-group">
            <h4>Nhà xe</h4>
            {operatorOptions.length ? (
              operatorOptions.map(x => (
                <label key={x}>
                  <input type="checkbox" checked={operators.includes(x)} onChange={() => toggle(x, operators, setOperators)} />{" "}{x}
                </label>
              ))
            ) : <p className="muted">Chưa có dữ liệu</p>}
          </div>

          <button
            className="btn btn-outline clear-filter"
            onClick={() => { setBusTypes([]); setOperators([]); setTimeRange("all"); }}
          >
            Xóa lọc
          </button>
        </aside>

        <main className="results-container">
          {loading && <div className="error-msg">Đang tải chuyến xe...</div>}
          {error   && <div className="error-msg"><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}

          {!loading && !error && (
            <p className="result-count">
              Tìm thấy <b>{total}</b> chuyến phù hợp
              {(busTypes.length > 0 || operators.length > 0 || timeRange !== "all") &&
                <span style={{ color: "var(--text-light)", fontWeight: 400 }}>
                  {" "}· đang hiển thị <b>{filtered.length}</b> sau lọc
                </span>
              }
            </p>
          )}

          {!loading && !error && filtered.length === 0 && !loadingMore && (
            <div className="error-msg">Không tìm thấy chuyến xe phù hợp.</div>
          )}

          {filtered.map(trip => <TripCard trip={trip} key={trip.id} />)}

          {/* Nút tải thêm */}
          {!loading && hasMore && (
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                className="btn btn-outline"
                onClick={() => fetchPage(page + 1, true)}
                disabled={loadingMore}
                style={{ minWidth: "160px" }}
              >
                {loadingMore
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</>
                  : <>Xem thêm <b>{Math.min(PAGE_SIZE, total - trips.length)}</b> chuyến</>
                }
              </button>
              <p className="muted" style={{ fontSize: "0.82rem", marginTop: "8px" }}>
                Trang {page} / {totalPages}
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function TripCard({ trip }) {
  const time    = d => d ? new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const dateStr = d => d ? new Date(d).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  return (
    <div className="trip-card">
      <div className="trip-info">
        <div>
          <div className="trip-time">{time(trip.departureTime)}</div>
          <small>{trip.departureLocation || "Chưa rõ"}</small>
          <small style={{ display: "block", color: "#2563eb", fontWeight: 600 }}>{dateStr(trip.departureTime)}</small>
        </div>
        <div><i className="fa-solid fa-arrow-right" /></div>
        <div>
          <div className="trip-time dark">{time(trip.arrivalTime)}</div>
          <small>{trip.arrivalLocation || "Chưa rõ"}</small>
          <small style={{ display: "block", color: "#666" }}>{dateStr(trip.arrivalTime)}</small>
        </div>
        <div className="trip-details">
          <h4>{trip.operator || "Chưa rõ nhà xe"}</h4>
          <p>{trip.busType || "Chưa rõ loại xe"}</p>
          <p className="available"><i className="fa-solid fa-couch" /> Còn {trip.availableSeats} chỗ</p>
        </div>
      </div>
      <div className="trip-action">
        <span className="price">{trip.price ? formatVND(trip.price) : "Chưa có giá"}</span>
        <Link className="btn btn-primary" to={`/booking?tripId=${trip.id}`}>Chọn Chuyến</Link>
      </div>
    </div>
  );
}
