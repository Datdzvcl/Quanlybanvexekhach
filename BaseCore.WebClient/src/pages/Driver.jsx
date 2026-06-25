import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/httpClient';
import { ProfileContent } from './Profile';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const TRIP_STATUS = {
  0: { label: 'Chờ khởi hành', cls: 'badge-warning' },
  1: { label: 'Đang chạy',     cls: 'badge-success' },
  2: { label: 'Hoàn thành',    cls: 'badge-neutral' },
  3: { label: 'Đã hủy',        cls: 'badge-danger'  },
  4: { label: 'Trễ giờ',       cls: 'badge-danger'  },
};
const INCIDENT_TYPES = [
  { value: 'accident',  label: 'Tai nạn' },
  { value: 'breakdown', label: 'Hỏng xe' },
  { value: 'delay',     label: 'Trễ giờ' },
  { value: 'other',     label: 'Khác' },
];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDT   = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';

function TripBadge({ status }) {
  const s = TRIP_STATUS[status] ?? { label: status, cls: 'badge-neutral' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 22px', borderRadius: 10, color: '#fff', fontWeight: 600,
      fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.18)',
      background: type === 'error' ? '#ef4444' : '#16a34a',
    }}>{msg}</div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function DriverTrips({ active }) {
  const [filter, setFilter]        = useState('today');
  const [trips, setTrips]          = useState([]);
  const [selected, setSelected]    = useState(null);
  const [passengers, setPax]       = useState(null);
  const [byStop, setByStop]        = useState(null);
  const [loadingT, setLoadingT]    = useState(false);
  const [loadingP, setLoadingP]    = useState(false);
  const [loadingS, setLoadingS]    = useState(false);
  const [submitting, setSub]       = useState(false);
  const [detailTab, setDetTab]     = useState('passengers'); // passengers | stops | qr | absent | incident
  const [expandedStop, setExpStop] = useState(null);
  const [qrInput, setQr]           = useState('');
  const [incType, setIncType]      = useState('other');
  const [incDesc, setIncDesc]      = useState('');
  const [showDelayModal, setDelayModal] = useState(false);
  const [newDepTime, setNewDepTime]     = useState('');
  const [toast, setToast]          = useState(null);
  const [now, setNow]              = useState(Date.now());
  const qrRef = useRef(null);

  // Cập nhật giờ hiện tại mỗi 30 giây để nút tự enable đúng giờ
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* trips */
  const loadTrips = useCallback(async () => {
    setLoadingT(true);
    try {
      const { data } = await apiClient.get(`/api/driver/trips?filter=${filter}`);
      setTrips(data);
    } catch (e) { notify(e?.message || 'Lỗi tải chuyến', 'error'); }
    finally { setLoadingT(false); }
  }, [filter, notify]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  /* when active tab changes to incident from menu */
  useEffect(() => {
    if (active === 'incident') setDetTab('incident');
  }, [active]);

  /* passengers */
  const loadPassengers = useCallback(async (tripId) => {
    setLoadingP(true);
    try {
      const { data } = await apiClient.get(`/api/driver/trips/${tripId}/passengers`);
      setPax(data);
    } catch { notify('Lỗi tải hành khách', 'error'); }
    finally { setLoadingP(false); }
  }, [notify]);

  const loadByStop = useCallback(async (tripId) => {
    setLoadingS(true);
    try {
      const { data } = await apiClient.get(`/api/driver/trips/${tripId}/passengers-by-stop`);
      setByStop(data);
    } catch { notify('Lỗi tải theo điểm đón', 'error'); }
    finally { setLoadingS(false); }
  }, [notify]);

  const selectTrip = useCallback((t) => {
    setSelected(t);
    setPax(null);
    setByStop(null);
    setQr('');
    setExpStop(null);
    setDetTab('passengers');
    loadPassengers(t.tripID);
    loadByStop(t.tripID);
  }, [loadPassengers, loadByStop]);

  /* actions */
  const handleStart = async () => {
    if (!window.confirm('Xác nhận bắt đầu chuyến xe?')) return;
    setSub(true);
    try {
      await apiClient.post(`/api/driver/trips/${selected.tripID}/start`);
      notify('Đã bắt đầu chuyến xe');
      setSelected(p => ({ ...p, status: 1 }));
      loadTrips();
    } catch (e) { notify(e?.message || 'Lỗi', 'error'); }
    finally { setSub(false); }
  };

  const handleEnd = async () => {
    if (!window.confirm('Xác nhận kết thúc chuyến xe?')) return;
    setSub(true);
    try {
      await apiClient.post(`/api/driver/trips/${selected.tripID}/end`);
      notify('Đã kết thúc chuyến xe');
      setSelected(p => ({ ...p, status: 2 }));
      loadTrips();
    } catch (e) { notify(e?.message || 'Lỗi', 'error'); }
    finally { setSub(false); }
  };

  const doCheckIn = async (payload) => {
    setSub(true);
    try {
      const { data } = await apiClient.post(`/api/driver/trips/${selected.tripID}/checkin`, payload);
      notify(data.alreadyCheckedIn
        ? `Ghế ${data.seatLabel} đã xác nhận trước đó`
        : `✓ Ghế ${data.seatLabel} — ${data.customerName}`
      );
      setQr('');
      loadPassengers(selected.tripID);
      setTimeout(() => qrRef.current?.focus(), 100);
    } catch (e) {
      notify(e?.message || 'Không tìm thấy vé', 'error');
      setQr('');
      setTimeout(() => qrRef.current?.focus(), 100);
    }
    finally { setSub(false); }
  };

  const handleDelay = async () => {
    if (!newDepTime) { notify('Vui lòng chọn giờ khởi hành mới', 'error'); return; }
    setSub(true);
    try {
      await apiClient.post(`/api/driver/trips/${selected.tripID}/delay`, { newDepartureTime: newDepTime });
      notify('Đã cập nhật trạng thái trễ, khách sẽ nhận thông báo');
      setSelected(p => ({ ...p, status: 4, delayedDepartureTime: newDepTime }));
      setDelayModal(false);
      setNewDepTime('');
      loadTrips();
    } catch (e) { notify(e?.message || 'Lỗi', 'error'); }
    finally { setSub(false); }
  };

  const doConfirmPayment = async (bookingId) => {
    if (!window.confirm('Xác nhận đã thu tiền mặt từ khách?')) return;
    setSub(true);
    try {
      await apiClient.post(`/api/driver/trips/${selected.tripID}/bookings/${bookingId}/confirm-payment`);
      notify('✓ Đã xác nhận thu tiền');
      loadPassengers(selected.tripID);
    } catch (e) { notify(e?.message || 'Lỗi xác nhận thu tiền', 'error'); }
    finally { setSub(false); }
  };

  const handleIncident = async (e) => {
    e.preventDefault();
    setSub(true);
    try {
      await apiClient.post(`/api/driver/trips/${selected.tripID}/incident`, { incidentType: incType, description: incDesc.trim() });
      notify('Đã gửi báo cáo sự cố');
      setIncDesc('');
    } catch (e) { notify(e?.message || 'Lỗi', 'error'); }
    finally { setSub(false); }
  };

  const absentSeats = passengers
    ? passengers.passengers.flatMap(p =>
        (p.seats || []).filter(s => !s.isCheckedIn).map(s => ({ ...s, customerName: p.customerName, customerPhone: p.customerPhone }))
      )
    : [];

  /* ── render ────────────────────────────────────────────────────────────── */
  if (active === 'profile') return <ProfileContent />;

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 90px)', overflow: 'hidden' }}>
      <Toast msg={toast?.msg} type={toast?.type} />

      {/* Modal nhập giờ khởi hành mới */}
      {showDelayModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>Báo trễ chuyến</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>Chọn giờ khởi hành mới. Tất cả hành khách sẽ nhận thông báo ngay.</p>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Giờ khởi hành mới</label>
            <input
              type="datetime-local"
              value={newDepTime}
              onChange={e => setNewDepTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, marginBottom: 18, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDelayModal(false)} disabled={submitting}>Hủy</button>
              <button className="btn btn-primary" onClick={handleDelay} disabled={submitting || !newDepTime}>
                {submitting ? 'Đang gửi...' : 'Xác nhận & Thông báo khách'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT: danh sách chuyến ─────────────────────────────────────── */}
      <div className="admin-card" style={{ width: 320, minWidth: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #e8eef7' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            <i className="fa-solid fa-route" style={{ marginRight: 8, color: '#2563eb' }} />
            Chuyến của tôi
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['today','Hôm nay'],['upcoming','Sắp tới'],['ongoing','Đang chạy']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`btn ${filter === k ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: 12, padding: '5px 4px' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingT ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              <i className="fa-solid fa-circle-notch fa-spin" /> Đang tải...
            </div>
          ) : trips.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              Không có chuyến nào
            </div>
          ) : trips.map(t => (
            <div key={t.tripID}
              onClick={() => selectTrip(t)}
              style={{
                padding: '14px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                background: selected?.tripID === t.tripID ? '#eff6ff' : '#fff',
                borderLeft: `3px solid ${selected?.tripID === t.tripID ? '#2563eb' : 'transparent'}`,
                transition: 'all .15s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 5 }}>
                {t.departureLocation} → {t.arrivalLocation}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>
                  <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                  {fmtTime(t.departureTime)} — {fmtDate(t.departureTime)}
                </span>
                <TripBadge status={t.status} />
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                <i className="fa-solid fa-bus-simple" /> {t.busLicensePlate} · {t.busType}
                <span style={{ marginLeft: 10 }}>
                  <i className="fa-solid fa-users" /> {t.totalPassengers} khách
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: chi tiết ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {!selected ? (
          <div className="admin-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 14 }}>
            <i className="fa-solid fa-hand-pointer" style={{ fontSize: 48, opacity: .4 }} />
            <p style={{ margin: 0, fontSize: 15 }}>Chọn một chuyến xe để xem chi tiết</p>
          </div>
        ) : <>

          {/* Trip header */}
          <div className="admin-card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#2563eb', marginRight: 6 }} />
                  {selected.departureLocation}
                  <i className="fa-solid fa-arrow-right" style={{ margin: '0 10px', color: '#94a3b8', fontSize: 14 }} />
                  <i className="fa-solid fa-flag-checkered" style={{ color: '#ef4444', marginRight: 6 }} />
                  {selected.arrivalLocation}
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
                  <span><i className="fa-regular fa-clock" style={{ marginRight: 4 }} />Dự kiến: {fmtDT(selected.departureTime)}</span>
                  {selected.actualDepartureTime && (
                    <span><i className="fa-solid fa-play" style={{ marginRight: 4, color: '#16a34a' }} />Xuất phát thực tế: {fmtDT(selected.actualDepartureTime)}</span>
                  )}
                  {selected.actualArrivalTime && (
                    <span><i className="fa-solid fa-flag-checkered" style={{ marginRight: 4, color: '#2563eb' }} />Đến nơi: {fmtDT(selected.actualArrivalTime)}</span>
                  )}
                  <TripBadge status={selected.status} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                {selected.status === 0 && (() => {
                  const depMs   = new Date(selected.departureTime).getTime();
                  const canStart = now >= depMs;
                  const diffMs  = depMs - now;
                  const totalMin = Math.ceil(diffMs / 60_000);
                  const days    = Math.floor(totalMin / 1440);
                  const remHr   = Math.floor((totalMin % 1440) / 60);
                  const remMin  = totalMin % 60;
                  const overMs  = now - depMs; // > 0 nếu quá giờ
                  const overMin = Math.floor(overMs / 60_000);
                  const overHr  = Math.floor(overMin / 60);

                  let countdownText;
                  if (days > 0)       countdownText = `Còn ${days} ngày ${remHr} giờ ${remMin} phút`;
                  else if (remHr > 0) countdownText = `Còn ${remHr} giờ ${remMin} phút`;
                  else                countdownText = `Còn ${totalMin} phút`;

                  const depLabel = new Date(selected.departureTime).toLocaleString('vi-VN', {
                    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                  });

                  return (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={handleStart}
                        disabled={submitting || !canStart}
                        style={!canStart ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                      >
                        <i className="fa-solid fa-play" style={{ marginRight: 6 }} />Bắt đầu chuyến
                      </button>
                      {!canStart && (
                        <div style={{ fontSize: 12, color: '#f59e0b', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span><i className="fa-regular fa-clock" style={{ marginRight: 4 }} />{countdownText}</span>
                          <span style={{ color: '#94a3b8' }}>Có thể bắt đầu lúc {depLabel}</span>
                        </div>
                      )}
                      {canStart && overMin > 0 && (
                        <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fa-solid fa-triangle-exclamation" />
                          Đã trễ {overHr > 0 ? `${overHr} giờ ${overMin % 60} phút` : `${overMin} phút`} — bắt đầu ngay!
                        </span>
                      )}
                      {/* Nút báo trễ — hiện khi đã qua giờ hoặc đang trễ */}
                      {(canStart || overMin > 0) && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: 12 }}
                          disabled={submitting}
                          onClick={() => { setNewDepTime(''); setDelayModal(true); }}
                        >
                          <i className="fa-solid fa-hourglass-half" style={{ marginRight: 5 }} />Đang chờ khách
                        </button>
                      )}
                    </>
                  );
                })()}
                {selected.status === 1 && (
                  <button className="btn btn-outline" onClick={handleEnd} disabled={submitting}
                    style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
                    <i className="fa-solid fa-flag-checkered" style={{ marginRight: 6 }} />Kết thúc chuyến
                  </button>
                )}
                {selected.status === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleStart} disabled={submitting}>
                      <i className="fa-solid fa-play" style={{ marginRight: 6 }} />Bắt đầu chuyến
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={submitting}
                      onClick={() => { setNewDepTime(''); setDelayModal(true); }}>
                      <i className="fa-solid fa-hourglass-half" style={{ marginRight: 5 }} />Cập nhật giờ mới
                    </button>
                    {selected.delayedDepartureTime && (
                      <span style={{ fontSize: 12, color: '#f59e0b' }}>
                        Giờ mới: {new Date(selected.delayedDepartureTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detail tabs */}
          <div className="admin-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e8eef7', marginBottom: 0, overflowX: 'auto' }}>
              {[
                ['passengers', 'fa-users',                 'Hành khách'],
                ['stops',      'fa-map-marker-alt',        'Điểm đón'],
                ['qr',         'fa-qrcode',                'Quét QR'],
                ['absent',     'fa-person-circle-question','Vắng mặt'],
                ['incident',   'fa-triangle-exclamation',  'Sự cố'],
              ].map(([k, icon, label]) => (
                <button key={k} onClick={() => { setDetTab(k); if (k === 'qr') setTimeout(() => qrRef.current?.focus(), 100); }}
                  style={{
                    padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer',
                    fontWeight: detailTab === k ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap',
                    color: detailTab === k ? '#2563eb' : '#64748b',
                    borderBottom: detailTab === k ? '2px solid #2563eb' : '2px solid transparent',
                    marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                  <i className={`fa-solid ${icon}`} />
                  {label}
                  {k === 'absent' && absentSeats.length > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 6px' }}>
                      {absentSeats.length}
                    </span>
                  )}
                  {k === 'passengers' && passengers && (
                    <span style={{ background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 6px' }}>
                      {passengers.checkedInSeats}/{passengers.totalSeats}
                    </span>
                  )}
                  {k === 'stops' && byStop && (
                    <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 6px' }}>
                      {byStop.stops?.length ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

              {/* ── Tab: Hành khách ─────────────────────────────────── */}
              {detailTab === 'passengers' && (
                loadingP ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}><i className="fa-solid fa-circle-notch fa-spin" /> Đang tải...</div>
                : !passengers ? null
                : <>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                    {[
                      ['Tổng ghế', passengers.totalSeats, '#2563eb'],
                      ['Đã lên xe', passengers.checkedInSeats, '#16a34a'],
                      ['Chưa lên',  passengers.totalSeats - passengers.checkedInSeats, '#ef4444'],
                      ['Booking',   passengers.totalPassengers, '#7c3aed'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 18px', minWidth: 100, textAlign: 'center', border: '1px solid #e8eef7' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {passengers.passengers.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>Chưa có hành khách</div>
                  ) : (
                    <div className="table-wrap">
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 0 }}>
                        <thead>
                          <tr>
                            {['Hành khách', 'SĐT', 'Ghế', 'Trạng thái', 'Giờ lên xe', ''].map(h => (
                              <th key={h} style={{ background: '#f8fafc', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'left', borderBottom: '1px solid #e8eef7' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {passengers.passengers.flatMap(p =>
                            (p.seats || []).map((s, i) => (
                              <tr key={s.ticketSeatID} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 14 }}>{i === 0 ? p.customerName : ''}</td>
                                <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748b' }}>{i === 0 ? p.customerPhone : ''}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  <span className="badge badge-neutral">{s.seatLabel}</span>
                                </td>
                                <td style={{ padding: '11px 14px' }}>
                                  {s.isCheckedIn
                                    ? <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginRight: 4 }} />Đã lên xe</span>
                                    : <span className="badge badge-warning"><i className="fa-solid fa-circle" style={{ marginRight: 4 }} />Chưa lên</span>
                                  }
                                </td>
                                <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748b' }}>{fmtDT(s.checkedInAt)}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {!s.isCheckedIn && (selected.status === 0 || selected.status === 1) && (
                                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
                                        disabled={submitting || selected.status !== 1}
                                        title={selected.status !== 1 ? 'Cần bắt đầu chuyến trước' : ''}
                                        onClick={() => doCheckIn({ ticketSeatId: s.ticketSeatID })}>
                                        Xác nhận lên xe
                                      </button>
                                    )}
                                    {i === 0 && p.bookingStatus === 0 && (selected.status === 0 || selected.status === 1) && (
                                      <button style={{ fontSize: 12, padding: '4px 12px', background: selected.status === 1 ? '#f59e0b' : '#d1d5db', color: selected.status === 1 ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, cursor: selected.status === 1 ? 'pointer' : 'not-allowed', fontWeight: 600 }}
                                        disabled={submitting || selected.status !== 1}
                                        title={selected.status !== 1 ? 'Cần bắt đầu chuyến trước' : ''}
                                        onClick={() => doConfirmPayment(p.bookingID)}>
                                        <i className="fa-solid fa-money-bill-wave" style={{ marginRight: 4 }} />Thu tiền
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── Tab: Điểm đón ─────────────────────────────────── */}
              {detailTab === 'stops' && (
                loadingS ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" /> Đang tải...
                  </div>
                ) : !byStop ? null : (
                  <>
                    <div className="admin-section-head" style={{ marginBottom: 16 }}>
                      <div>
                        <h3>Hành khách theo điểm đón</h3>
                        <p>Bấm vào điểm đón để xem danh sách hành khách và xác nhận lên xe</p>
                      </div>
                    </div>

                    {/* Các điểm đón */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {byStop.stops?.map(stop => {
                        const isOpen = expandedStop === stop.stopPointID;
                        const total = stop.passengers?.length ?? 0;
                        const checkedIn = stop.passengers?.reduce((acc, p) =>
                          acc + (p.seats?.filter(s => s.isCheckedIn).length ?? 0), 0) ?? 0;
                        const totalSeats = stop.passengers?.reduce((acc, p) => acc + (p.seats?.length ?? 0), 0) ?? 0;

                        return (
                          <div key={stop.stopPointID} style={{
                            border: `2px solid ${isOpen ? '#2563eb' : '#e8eef7'}`,
                            borderRadius: 12, overflow: 'hidden',
                            transition: 'border-color .15s',
                          }}>
                            {/* Header điểm đón */}
                            <button
                              onClick={() => setExpStop(isOpen ? null : stop.stopPointID)}
                              style={{
                                width: '100%', padding: '14px 18px', border: 'none', cursor: 'pointer',
                                background: isOpen ? '#eff6ff' : '#f8fafc',
                                display: 'flex', alignItems: 'center', gap: 12,
                                textAlign: 'left', transition: 'background .15s',
                              }}
                            >
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                background: isOpen ? '#2563eb' : '#e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isOpen ? '#fff' : '#64748b', fontWeight: 800, fontSize: 14,
                              }}>
                                {stop.stopOrder}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                                  {stop.stopName}
                                </div>
                                {stop.stopAddress && (
                                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }} />
                                    {stop.stopAddress}
                                  </div>
                                )}
                                {stop.estimatedTime && (
                                  <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>
                                    <i className="fa-regular fa-clock" style={{ marginRight: 4 }} />
                                    Dự kiến: {fmtTime(stop.estimatedTime)}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{
                                  background: '#dcfce7', color: '#16a34a', borderRadius: 8,
                                  padding: '4px 10px', fontSize: 12, fontWeight: 700,
                                }}>
                                  <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }} />
                                  {checkedIn}/{totalSeats}
                                </span>
                                <span style={{
                                  background: '#ede9fe', color: '#7c3aed', borderRadius: 8,
                                  padding: '4px 10px', fontSize: 12, fontWeight: 700,
                                }}>
                                  {total} booking
                                </span>
                                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                                  style={{ color: '#94a3b8', fontSize: 12 }} />
                              </div>
                            </button>

                            {/* Danh sách hành khách tại điểm này */}
                            {isOpen && (
                              <div style={{ borderTop: '1px solid #e8eef7' }}>
                                {total === 0 ? (
                                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                                    Không có hành khách đón tại điểm này
                                  </div>
                                ) : (
                                  stop.passengers.map(p => (
                                    <div key={p.bookingID} style={{
                                      padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
                                      background: '#fff',
                                    }}>
                                      {/* Thông tin khách */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                                            <i className="fa-solid fa-user" style={{ marginRight: 6, color: '#2563eb' }} />
                                            {p.customerName || '—'}
                                          </div>
                                          <div style={{ fontSize: 13, color: '#475569', marginTop: 3, display: 'flex', gap: 16 }}>
                                            <span><i className="fa-solid fa-phone" style={{ marginRight: 4 }} />{p.customerPhone || '—'}</span>
                                            {p.customerEmail && <span><i className="fa-solid fa-envelope" style={{ marginRight: 4 }} />{p.customerEmail}</span>}
                                          </div>
                                        </div>
                                        <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', borderRadius: 6, padding: '3px 8px' }}>
                                          #{p.bookingID}
                                        </span>
                                      </div>

                                      {/* Ghế ngồi */}
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {(p.seats || []).map(s => (
                                          <div key={s.ticketSeatID} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            background: s.isCheckedIn ? '#f0fdf4' : '#fef9f9',
                                            border: `1px solid ${s.isCheckedIn ? '#bbf7d0' : '#fecaca'}`,
                                            borderRadius: 8, padding: '6px 12px',
                                          }}>
                                            <span className="badge badge-neutral" style={{ fontSize: 12 }}>{s.seatLabel}</span>
                                            {s.isCheckedIn ? (
                                              <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                                                <i className="fa-solid fa-circle-check" style={{ marginRight: 3 }} />
                                                Đã lên xe {s.checkedInAt ? `(${fmtTime(s.checkedInAt)})` : ''}
                                              </span>
                                            ) : (
                                              <>
                                                <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                                                  <i className="fa-solid fa-circle" style={{ marginRight: 3 }} />
                                                  Chưa lên
                                                </span>
                                                {(selected.status === 0 || selected.status === 1) && (
                                                  <button
                                                    className="btn btn-primary"
                                                    style={{ fontSize: 11, padding: '2px 10px', marginLeft: 4 }}
                                                    disabled={submitting || selected.status !== 1}
                                                    title={selected.status !== 1 ? 'Cần bắt đầu chuyến trước' : ''}
                                                    onClick={() => doCheckIn({ ticketSeatId: s.ticketSeatID }).then(() => loadByStop(selected.tripID))}
                                                  >
                                                    Xác nhận
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Hành khách không chọn điểm đón */}
                      {byStop.noPickupStop?.length > 0 && (
                        <div style={{ border: '2px dashed #e8eef7', borderRadius: 12, overflow: 'hidden' }}>
                          <button
                            onClick={() => setExpStop(expandedStop === 'no-stop' ? null : 'no-stop')}
                            style={{
                              width: '100%', padding: '14px 18px', border: 'none', cursor: 'pointer',
                              background: expandedStop === 'no-stop' ? '#fffbeb' : '#fafaf9',
                              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: '#fef3c7', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#d97706', fontSize: 14,
                            }}>
                              <i className="fa-solid fa-question" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e' }}>
                                Chưa chọn điểm đón
                              </div>
                              <div style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>
                                Hành khách không chỉ định điểm đón cụ thể
                              </div>
                            </div>
                            <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                              {byStop.noPickupStop.length} booking
                            </span>
                            <i className={`fa-solid fa-chevron-${expandedStop === 'no-stop' ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: 12 }} />
                          </button>
                          {expandedStop === 'no-stop' && (
                            <div style={{ borderTop: '1px solid #e8eef7' }}>
                              {byStop.noPickupStop.map(p => (
                                <div key={p.bookingID} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 }}>
                                    <i className="fa-solid fa-user" style={{ marginRight: 6, color: '#d97706' }} />
                                    {p.customerName || '—'}
                                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>{p.customerPhone}</span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {(p.seats || []).map(s => (
                                      <span key={s.ticketSeatID} className="badge badge-neutral">{s.seatLabel}</span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {(byStop.stops?.length === 0 && byStop.noPickupStop?.length === 0) && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                          Chưa có hành khách nào trong chuyến này
                        </div>
                      )}
                    </div>
                  </>
                )
              )}

              {/* ── Tab: Quét QR ──────────────────────────────────── */}
              {detailTab === 'qr' && (
                <div style={{ maxWidth: 520 }}>
                  <div className="admin-section-head" style={{ marginBottom: 20 }}>
                    <div>
                      <h3>Quét QR xác nhận lên xe</h3>
                      <p>Quét mã QR trên vé hoặc nhập thủ công mã vé rồi nhấn Enter</p>
                    </div>
                  </div>
                  <form onSubmit={e => { e.preventDefault(); if (qrInput.trim()) doCheckIn({ qrCode: qrInput.trim() }); }}
                    style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    <input ref={qrRef}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '2px solid #2563eb', fontSize: 15, outline: 'none' }}
                      type="text" placeholder="Quét QR hoặc nhập mã vé..." autoFocus
                      value={qrInput} onChange={e => setQr(e.target.value)} />
                    <button type="submit" className="btn btn-primary" disabled={!qrInput.trim() || submitting}>
                      <i className="fa-solid fa-qrcode" style={{ marginRight: 6 }} />Xác nhận
                    </button>
                  </form>
                  {passengers && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', fontSize: 14 }}>
                      <i className="fa-solid fa-circle-check" style={{ color: '#16a34a', marginRight: 8 }} />
                      <strong>{passengers.checkedInSeats}</strong> / {passengers.totalSeats} hành khách đã được xác nhận lên xe
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Vắng mặt ─────────────────────────────────── */}
              {detailTab === 'absent' && (
                <>
                  <div className="admin-section-head">
                    <div>
                      <h3>Hành khách vắng mặt</h3>
                      <p>Danh sách hành khách chưa được xác nhận lên xe</p>
                    </div>
                  </div>
                  {loadingP ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}><i className="fa-solid fa-circle-notch fa-spin" /></div>
                  ) : absentSeats.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#16a34a' }}>
                      <i className="fa-solid fa-circle-check" style={{ fontSize: 40, marginBottom: 10, display: 'block' }} />
                      Tất cả hành khách đã lên xe
                    </div>
                  ) : (
                    <div className="table-wrap">
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Hành khách', 'SĐT', 'Ghế', ''].map(h => (
                              <th key={h} style={{ background: '#fef9f9', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'left', borderBottom: '1px solid #fecaca' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {absentSeats.map(s => (
                            <tr key={s.ticketSeatID}>
                              <td style={{ padding: '11px 14px', fontWeight: 600 }}>{s.customerName}</td>
                              <td style={{ padding: '11px 14px', color: '#64748b' }}>{s.customerPhone}</td>
                              <td style={{ padding: '11px 14px' }}><span className="badge badge-danger">{s.seatLabel}</span></td>
                              <td style={{ padding: '11px 14px' }}>
                                {(selected.status === 0 || selected.status === 1) && (
                                  <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}
                                    disabled={submitting || selected.status !== 1}
                                    title={selected.status !== 1 ? 'Cần bắt đầu chuyến trước' : ''}
                                    onClick={() => doCheckIn({ ticketSeatId: s.ticketSeatID })}>
                                    Xác nhận lên xe
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── Tab: Sự cố ───────────────────────────────────── */}
              {detailTab === 'incident' && (
                <div style={{ maxWidth: 560 }}>
                  <div className="admin-section-head">
                    <div>
                      <h3>Báo cáo sự cố</h3>
                      <p>Gửi báo cáo khi xảy ra tai nạn, hỏng xe, trễ giờ hoặc sự cố khác</p>
                    </div>
                  </div>
                  {!selected ? (
                    <p style={{ color: '#64748b' }}>Vui lòng chọn một chuyến xe trước.</p>
                  ) : (
                    <form onSubmit={handleIncident}>
                      <div className="admin-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Loại sự cố</label>
                          <select value={incType} onChange={e => setIncType(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
                            {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Mô tả chi tiết <span style={{ color: '#ef4444' }}>*</span></label>
                          <textarea
                            rows={6} required
                            placeholder="Mô tả chi tiết sự cố xảy ra..."
                            value={incDesc} onChange={e => setIncDesc(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" className="btn btn-primary"
                          style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none' }}
                          disabled={!incDesc.trim() || submitting}>
                          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />
                          {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setIncDesc('')}>
                          Xóa
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
