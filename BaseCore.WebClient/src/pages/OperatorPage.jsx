import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { formatVND, labelRole, labelTripStatus, pick } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { operatorPortalApi } from '../services/operatorPortalApi';

const OPERATOR_MENU = [
  { id: 'dashboard', label: 'Thống kê', icon: 'fa-chart-line' },
  { id: 'buses', label: 'Quản lý đội xe', icon: 'fa-bus' },
  { id: 'trips', label: 'Quản lý chuyến xe', icon: 'fa-route' },
  { id: 'reports', label: 'Doanh thu', icon: 'fa-money-bill-wave' },
  { id: 'settings', label: 'Cài đặt', icon: 'fa-gear' },
];

const operatorPaths = {
  dashboard: '/operator/dashboard',
  buses: '/operator/buses',
  trips: '/operator/trips',
  reports: '/operator/reports',
  settings: '/operator/settings',
};

const EMPTY_BUS = {
  busID: null,
  licensePlate: '',
  capacity: 34,
  busType: 'Giường nằm 34 chỗ',
  amenities: '',
  seatLayoutType: '2 tầng',
  seatLayoutSeats: '',
};

const EMPTY_TRIP = {
  tripID: null,
  busID: '',
  departureLocation: '',
  arrivalLocation: '',
  departureTime: '',
  arrivalTime: '',
  price: '',
  availableSeats: '',
  status: 'Scheduled',
  seatLayoutType: '2 tầng',
  seatLayoutSeats: '',
  seatLayoutCapacity: 0,
  stopPoints: [
    { stopName: '', stopAddress: '', stopOrder: 1, stopType: 1, arrivalOffset: 0 },
    { stopName: '', stopAddress: '', stopOrder: 2, stopType: 3, arrivalOffset: 0 },
    { stopName: '', stopAddress: '', stopOrder: 3, stopType: 2, arrivalOffset: 0 },
  ],
};

const BUS_TYPE_LABELS = {
  'giuong nam 34 cho': 'Giường nằm 34 chỗ',
  'limousine 22 phong': 'Limousine 22 phòng',
  'ghe ngoi 45 cho': 'Ghế ngồi 45 chỗ',
  'cabin doi 22 phong': 'Cabin đôi 22 phòng',
};

const SEAT_LAYOUT_OPTIONS = [
  { value: 'Limousine', label: 'Limousine' },
  { value: '2 tầng', label: 'Xe giường nằm 2 tầng' },
  { value: '1 tầng', label: 'Xe giường nằm 1 tầng' },
];

export default function OperatorPage() {
  const [active, setActive] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/operator') {
      navigate('/operator/dashboard', { replace: true });
      return;
    }

    const tab = Object.entries(operatorPaths).find(([, path]) => location.pathname === path)?.[0];
    setActive(tab || 'dashboard');
  }, [location.pathname, navigate]);

  const handleActiveChange = (tab) => {
    setActive(tab);
    navigate(operatorPaths[tab] || '/operator/dashboard');
  };

  return (
    <AdminLayout
      active={active}
      onActiveChange={handleActiveChange}
      menu={OPERATOR_MENU}
      brandLabel="VéXeAZ"
      subtitle="Quản lý nhà xe"
      defaultTitle="Nhà xe"
    >
      {active === 'dashboard' && <OperatorDashboard />}
      {active === 'buses' && <OperatorBuses />}
      {active === 'trips' && <OperatorTrips />}
      {active === 'reports' && <OperatorReports />}
      {active === 'settings' && <OperatorSettings />}
    </AdminLayout>
  );
}

function OperatorDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [me, dashboard] = await Promise.all([
        operatorPortalApi.me(),
        operatorPortalApi.dashboard(),
      ]);
      setProfile(me);
      setStats(dashboard);
    } catch (err) {
      alert(err.message || 'Không tải được dữ liệu nhà xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="admin-card">Đang tải dữ liệu...</div>;

  const cards = [
    ['Tổng xe', stats?.totalBuses || 0, 'fa-bus', '#2563eb'],
    ['Tổng chuyến', stats?.totalTrips || 0, 'fa-route', '#7c3aed'],
    ['Chuyến sắp chạy', stats?.upcomingTrips || 0, 'fa-clock', '#0ea5e9'],
    ['Chuyến hôm nay', stats?.todayTrips || 0, 'fa-calendar-day', '#16a34a'],
    ['Đơn đặt vé', stats?.totalBookings || 0, 'fa-ticket', '#db2777'],
    ['Doanh thu', formatVND(stats?.totalRevenue || 0), 'fa-money-bill-wave', '#ea580c'],
  ];

  return (
    <>
      <section className="admin-card operator-profile-card">
        <div>
          <p>Nhà xe đang quản lý</p>
          <h3>{profile?.name || 'Chưa xác định nhà xe'}</h3>
          <span>{profile?.description || 'Tài khoản Operator được liên kết theo Email hoặc SĐT với bảng Operators.'}</span>
        </div>
        <div>
          <b>{profile?.contactPhone || 'Chưa có SĐT'}</b>
          <small>{profile?.email || 'Chưa có email'}</small>
        </div>
      </section>

      <section className="admin-stats">
        {cards.map(([label, value, icon, color]) => (
          <div className="stat-card" key={label} style={{ borderLeft: `4px solid ${color}` }}>
            <div>
              <p>{label}</p>
              <h2>{value}</h2>
            </div>
            <i className={`fa-solid ${icon}`} style={{ color }} />
          </div>
        ))}
      </section>

      <section className="admin-card">
        <div className="admin-section-head">
          <h3>Chuyến xe sắp khởi hành</h3>
          <button className="btn btn-outline" type="button" onClick={load}>
            <i className="fa-solid fa-rotate" /> Tải lại
          </button>
        </div>
        <TripsTable trips={stats?.upcoming || []} compact />
      </section>
    </>
  );
}

function OperatorBuses() {
  const [paged, setPaged] = useState(emptyPage());
  const [filters, setFilters] = useState({ licensePlate: '', busType: '' });
  const [form, setForm] = useState(EMPTY_BUS);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (page = paged.page || 1) => {
    setLoading(true);
    try {
      const data = await operatorPortalApi.listBuses(cleanParams({ ...filters, page, pageSize: 10 }));
      setPaged(normalizePagedResponse(data, page));
    } catch (err) {
      alert(err.message || 'Không tải được danh sách xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const capacity = Number(form.capacity);
    const seatLayoutType = normalizeLayoutType(form.seatLayoutType, form.busType, capacity);
    const payload = {
      licensePlate: form.licensePlate.trim(),
      capacity,
      busType: form.busType.trim(),
      amenities: form.amenities.trim(),
      seatLayoutType,
      seatLayout: buildSeatLayoutJson(seatLayoutType, form.seatLayoutSeats, capacity),
    };

    try {
      if (form.busID) {
        await operatorPortalApi.updateBus(form.busID, payload);
      } else {
        await operatorPortalApi.createBus(payload);
      }
      setShowForm(false);
      setForm(EMPTY_BUS);
      await load(1);
    } catch (err) {
      alert(err.message || 'Không lưu được xe.');
    }
  };

  const edit = (bus) => {
    const layoutState = buildSeatLayoutFormState(bus);
    setForm({
      busID: pick(bus, ['busID', 'BusID']),
      licensePlate: pick(bus, ['licensePlate', 'LicensePlate']),
      capacity: pick(bus, ['capacity', 'Capacity'], 34),
      busType: labelBusType(pick(bus, ['busType', 'BusType'], '')),
      amenities: normalizeAmenities(pick(bus, ['amenities', 'Amenities'], [])).join(', '),
      ...layoutState,
    });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Xóa xe này? Xe đã có lịch chạy sẽ không xóa được.')) return;
    try {
      await operatorPortalApi.removeBus(id);
      await load(paged.page);
    } catch (err) {
      alert(err.message || 'Không xóa được xe.');
    }
  };

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <h3>Quản lý đội xe và sơ đồ ghế</h3>
          <p className="muted">Loại xe quy định sơ đồ ghế: Giường nằm, Limousine, Ghế ngồi.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => toggleForm(showForm, setShowForm, setForm, EMPTY_BUS)}>
          <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} /> {showForm ? 'Đóng form' : 'Thêm xe'}
        </button>
      </div>

      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="Biển số xe" required />
          <select
            value={form.busType}
            onChange={(e) => {
              const busType = e.target.value;
              setForm({
                ...form,
                busType,
                seatLayoutType: inferSeatLayoutType(busType, Number(form.capacity)),
              });
            }}
          >
            <option value="Giường nằm 34 chỗ">Xe giường nằm</option>
            <option value="Limousine 22 phòng">Limousine</option>
            <option value="Ghế ngồi 45 chỗ">Ghế ngồi</option>
            <option value="Cabin đôi 22 phòng">Cabin đôi</option>
          </select>
          <input type="number" min="1" max="80" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Sức chứa" required />
          <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Tiện ích, cách nhau bằng dấu phẩy" />
          <SeatLayoutEditor
            layoutType={form.seatLayoutType}
            seatsText={form.seatLayoutSeats}
            capacity={Number(form.capacity)}
            onChange={(updates) => setForm({ ...form, ...updates })}
          />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Lưu xe</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}>Hủy</button>
          </div>
        </form>
      )}

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onSearch={() => load(1)}
        onClear={() => {
          setFilters({ licensePlate: '', busType: '' });
          setTimeout(() => load(1), 0);
        }}
      />

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Xe</th>
                  <th>Loại xe</th>
                  <th>Sơ đồ ghế</th>
                  <th>Tiện ích</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paged.items.map((bus) => {
                  const id = pick(bus, ['busID', 'BusID']);
                  const layoutType = getEntityLayoutType(bus);
                  const seatLabels = getEntitySeatLabels(bus);
                  const amenities = normalizeAmenities(pick(bus, ['amenities', 'Amenities'], []));
                  return (
                    <tr key={id}>
                      <td>
                        <div className="operator-bus-cell">
                          <img src={pick(bus, ['imageUrl', 'ImageUrl'])} alt="" />
                          <div>
                            <b>{pick(bus, ['licensePlate', 'LicensePlate'])}</b>
                            <small>{pick(bus, ['capacity', 'Capacity'])} ghế</small>
                          </div>
                        </div>
                      </td>
                      <td>{labelBusType(pick(bus, ['busType', 'BusType']))}</td>
                      <td>
                        <b>{labelLayoutType(layoutType)}</b>
                        <MiniSeatMap seats={seatLabels.slice(0, 12)} />
                      </td>
                      <td>{amenities.map((item) => <span className="badge operator-badge" key={item}>{item}</span>)}</td>
                      <td className="admin-actions">
                        <button className="btn btn-outline" type="button" onClick={() => edit(bus)}>Sửa</button>
                        <button className="btn btn-danger" type="button" onClick={() => remove(id)}>Xóa</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} onPageChange={load} />
        </>
      )}
    </section>
  );
}

function OperatorTrips() {
  const [buses, setBuses] = useState([]);
  const [paged, setPaged] = useState(emptyPage());
  const [filters, setFilters] = useState({ route: '', departureDate: '', status: '', busId: '' });
  const [form, setForm] = useState(EMPTY_TRIP);
  const [showForm, setShowForm] = useState(false);
  const [clone, setClone] = useState({ tripId: '', repeatType: 'day', count: 1 });
  const [loading, setLoading] = useState(true);

  const load = async (page = paged.page || 1) => {
    setLoading(true);
    try {
      const [busData, tripData] = await Promise.all([
        operatorPortalApi.listBuses({ page: 1, pageSize: 100 }),
        operatorPortalApi.listTrips(cleanParams({ ...filters, page, pageSize: 10 })),
      ]);
      setBuses(normalizePagedResponse(busData).items);
      setPaged(normalizePagedResponse(tripData, page));
    } catch (err) {
      alert(err.message || 'Không tải được lịch khởi hành.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const selectBus = (busID) => {
    const selectedBus = buses.find((bus) => String(pick(bus, ['busID', 'BusID'])) === String(busID));
    const layoutState = selectedBus ? buildSeatLayoutFormState(selectedBus) : {};
    setForm({ ...form, busID, ...layoutState });
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = buildTripPayload(form);
    try {
      if (form.tripID) {
        await operatorPortalApi.updateTrip(form.tripID, payload);
      } else {
        await operatorPortalApi.createTrip(payload);
      }
      setShowForm(false);
      setForm(EMPTY_TRIP);
      await load(1);
    } catch (err) {
      alert(err.message || 'Không lưu được chuyến xe.');
    }
  };

  const edit = async (trip) => {
    try {
      const id = pick(trip, ['tripID', 'TripID']);
      const detail = await operatorPortalApi.getTrip(id);
      const bus = pick(detail, ['bus', 'Bus'], {});
      const layoutState = buildSeatLayoutFormState(bus);
      setForm({
        tripID: id,
        busID: String(pick(detail, ['busID', 'BusID'], '')),
        departureLocation: pick(detail, ['departureLocation', 'DepartureLocation']),
        arrivalLocation: pick(detail, ['arrivalLocation', 'ArrivalLocation']),
        departureTime: toDateTimeInput(pick(detail, ['departureTime', 'DepartureTime'])),
        arrivalTime: toDateTimeInput(pick(detail, ['arrivalTime', 'ArrivalTime'])),
        price: pick(detail, ['price', 'Price'], ''),
        availableSeats: pick(detail, ['availableSeats', 'AvailableSeats'], ''),
        status: pick(detail, ['status', 'Status'], 'Scheduled'),
        stopPoints: normalizeStops(pick(detail, ['stopPoints', 'StopPoints'], [])),
        ...layoutState,
      });
      setShowForm(true);
    } catch (err) {
      alert(err.message || 'Không tải được chi tiết chuyến.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Xóa chuyến xe này? Chuyến đã có booking sẽ không xóa được.')) return;
    try {
      await operatorPortalApi.removeTrip(id);
      await load(paged.page);
    } catch (err) {
      alert(err.message || 'Không xóa được chuyến xe.');
    }
  };

  const cloneTrip = async (e) => {
    e.preventDefault();
    if (!clone.tripId) {
      alert('Chọn chuyến cần nhân bản.');
      return;
    }

    try {
      await operatorPortalApi.cloneTrip(clone.tripId, {
        repeatType: clone.repeatType,
        count: Number(clone.count),
      });
      await load(1);
      alert('Đã nhân bản lịch trình.');
    } catch (err) {
      alert(err.message || 'Không nhân bản được lịch trình.');
    }
  };

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <h3>Thiết lập giá vé và lịch khởi hành</h3>
          <p className="muted">Mỗi chuyến có thông tin xe, tiện ích, điểm đón/trả và thời gian dự kiến.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => toggleForm(showForm, setShowForm, setForm, EMPTY_TRIP)}>
          <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} /> {showForm ? 'Đóng form' : 'Thêm chuyến'}
        </button>
      </div>

      {showForm && (
        <form className="operator-trip-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <select value={form.busID} onChange={(e) => selectBus(e.target.value)} required>
              <option value="">Chọn xe</option>
              {buses.map((bus) => (
                <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
                  {pick(bus, ['licensePlate', 'LicensePlate'])} - {labelBusType(pick(bus, ['busType', 'BusType']))}
                </option>
              ))}
            </select>
            <input value={form.departureLocation} onChange={(e) => setForm({ ...form, departureLocation: e.target.value })} placeholder="Điểm đi" required />
            <input value={form.arrivalLocation} onChange={(e) => setForm({ ...form, arrivalLocation: e.target.value })} placeholder="Điểm đến" required />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Scheduled">Đã lên lịch</option>
              <option value="On-going">Đang chạy</option>
              <option value="Completed">Hoàn thành</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
            <input type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required />
            <input type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} required />
            <input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Giá vé" required />
            <input type="number" min="0" value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} placeholder="Ghế trống" />
          </div>
          <SeatLayoutEditor
            layoutType={form.seatLayoutType}
            seatsText={form.seatLayoutSeats}
            capacity={Number(form.seatLayoutCapacity || form.availableSeats || 0)}
            onChange={(updates) => setForm({ ...form, ...updates })}
          />
          <StopEditor stops={form.stopPoints} onChange={(stopPoints) => setForm({ ...form, stopPoints })} />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Lưu chuyến</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}>Hủy</button>
          </div>
        </form>
      )}

      <form className="operator-clone-panel" onSubmit={cloneTrip}>
        <select value={clone.tripId} onChange={(e) => setClone({ ...clone, tripId: e.target.value })}>
          <option value="">Chọn chuyến để nhân bản</option>
          {paged.items.map((trip) => (
            <option key={pick(trip, ['tripID', 'TripID'])} value={pick(trip, ['tripID', 'TripID'])}>
              #{pick(trip, ['tripID', 'TripID'])} - {pick(trip, ['departureLocation', 'DepartureLocation'])} đến {pick(trip, ['arrivalLocation', 'ArrivalLocation'])}
            </option>
          ))}
        </select>
        <select value={clone.repeatType} onChange={(e) => setClone({ ...clone, repeatType: e.target.value })}>
          <option value="day">Theo ngày</option>
          <option value="week">Theo tuần</option>
        </select>
        <input type="number" min="1" max="60" value={clone.count} onChange={(e) => setClone({ ...clone, count: e.target.value })} />
        <button className="btn btn-outline" type="submit">
          <i className="fa-solid fa-copy" /> Nhân bản lịch
        </button>
      </form>

      <TripFilterBar
        filters={filters}
        buses={buses}
        setFilters={setFilters}
        onSearch={() => load(1)}
        onClear={() => {
          setFilters({ route: '', departureDate: '', status: '', busId: '' });
          setTimeout(() => load(1), 0);
        }}
      />

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <TripsTable trips={paged.items} onEdit={edit} onDelete={remove} />
          <Pagination page={paged.page} totalPages={paged.totalPages} onPageChange={load} />
        </>
      )}
    </section>
  );
}

function OperatorReports() {
  const [buses, setBuses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [filters, setFilters] = useState({ from: '', to: '', tripId: '', busId: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [busData, tripData, reportData] = await Promise.all([
        operatorPortalApi.listBuses({ page: 1, pageSize: 100 }),
        operatorPortalApi.listTrips({ page: 1, pageSize: 100 }),
        operatorPortalApi.revenueReport(cleanParams(filters)),
      ]);
      setBuses(normalizePagedResponse(busData).items);
      setTrips(normalizePagedResponse(tripData).items);
      setReport(reportData);
    } catch (err) {
      alert(err.message || 'Không tải được báo cáo doanh thu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <h3>Báo cáo doanh thu</h3>
          <p className="muted">Thống kê theo chuyến, theo xe hoặc theo khoảng thời gian.</p>
        </div>
      </div>

      <div className="operator-report-filters">
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <select value={filters.busId} onChange={(e) => setFilters({ ...filters, busId: e.target.value, tripId: '' })}>
          <option value="">Tất cả xe</option>
          {buses.map((bus) => (
            <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
              {pick(bus, ['licensePlate', 'LicensePlate'])}
            </option>
          ))}
        </select>
        <select value={filters.tripId} onChange={(e) => setFilters({ ...filters, tripId: e.target.value })}>
          <option value="">Tất cả chuyến</option>
          {trips.map((trip) => (
            <option key={pick(trip, ['tripID', 'TripID'])} value={pick(trip, ['tripID', 'TripID'])}>
              #{pick(trip, ['tripID', 'TripID'])} - {pick(trip, ['departureLocation', 'DepartureLocation'])}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="button" onClick={load}>Lọc báo cáo</button>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <section className="admin-stats">
            <div className="stat-card"><div><p>Doanh thu</p><h2>{formatVND(report?.totalRevenue || 0)}</h2></div><i className="fa-solid fa-money-bill-wave" /></div>
            <div className="stat-card"><div><p>Đơn đã thanh toán</p><h2>{report?.totalBookings || 0}</h2></div><i className="fa-solid fa-ticket" /></div>
            <div className="stat-card"><div><p>Số ghế bán</p><h2>{report?.totalSeats || 0}</h2></div><i className="fa-solid fa-couch" /></div>
          </section>

          <div className="admin-grid">
            <ReportTable title="Theo chuyến" rows={report?.byTrip || []} mode="trip" />
            <ReportTable title="Theo xe" rows={report?.byBus || []} mode="bus" />
          </div>
        </>
      )}
    </section>
  );
}

function OperatorSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    operatorPortalApi.me().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <section className="admin-card admin-settings-card">
      <div className="admin-section-head">
        <div>
          <h3>Thông tin tài khoản nhà xe</h3>
          <p className="muted">Tài khoản chỉ xem và thao tác trên nhà xe được gán.</p>
        </div>
        <button className="btn btn-danger" type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
          <i className="fa-solid fa-right-from-bracket" /> Đăng xuất
        </button>
      </div>
      <div className="admin-settings-grid operator-settings-grid">
        <div><b>Họ tên</b><span>{user?.fullName || 'Chưa có'}</span></div>
        <div><b>Email tài khoản</b><span>{user?.email || 'Chưa có'}</span></div>
        <div><b>SĐT tài khoản</b><span>{user?.phone || 'Chưa có'}</span></div>
        <div><b>Vai trò</b><span>{labelRole(user?.role || 'Operator')}</span></div>
        <div><b>Nhà xe</b><span>{profile?.name || 'Chưa liên kết'}</span></div>
        <div><b>Email nhà xe</b><span>{profile?.email || 'Chưa có'}</span></div>
      </div>
    </section>
  );
}

function TripsTable({ trips, onEdit, onDelete, compact = false }) {
  if (!trips.length) return <p className="muted">Chưa có dữ liệu.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Chuyến</th>
            <th>Xe</th>
            <th>Khởi hành</th>
            <th>Giá vé</th>
            <th>Chi tiết</th>
            {!compact && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => {
            const id = pick(trip, ['tripID', 'TripID']);
            const amenities = normalizeAmenities(pick(trip, ['amenities', 'Amenities'], []));
            return (
              <tr key={id}>
                <td>
                  <b>{pick(trip, ['departureLocation', 'DepartureLocation'])}</b> đến <b>{pick(trip, ['arrivalLocation', 'ArrivalLocation'])}</b>
                  <br />
                  <span className="badge">{labelTripStatus(pick(trip, ['status', 'Status']))}</span>
                </td>
                <td>
                  <div className="operator-bus-cell">
                    <img src={pick(trip, ['busImageUrl', 'BusImageUrl'])} alt="" />
                    <div>
                      <b>{pick(trip, ['licensePlate', 'LicensePlate'], 'Chưa rõ')}</b>
                      <small>{labelBusType(pick(trip, ['busType', 'BusType'], 'Chưa rõ'))}</small>
                    </div>
                  </div>
                </td>
                <td>{formatDateTime(pick(trip, ['departureTime', 'DepartureTime']))}</td>
                <td>{formatVND(pick(trip, ['price', 'Price'], 0))}</td>
                <td>
                  <div>{Math.round((pick(trip, ['estimatedDurationMinutes', 'EstimatedDurationMinutes'], 0) || 0) / 60)} giờ dự kiến</div>
                  <div>{amenities.slice(0, 3).map((item) => <span className="badge operator-badge" key={item}>{item}</span>)}</div>
                </td>
                {!compact && (
                  <td className="admin-actions">
                    <button className="btn btn-outline" type="button" onClick={() => onEdit(trip)}>Sửa</button>
                    <button className="btn btn-danger" type="button" onClick={() => onDelete(id)}>Xóa</button>
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

function StopEditor({ stops, onChange }) {
  const update = (index, key, value) => {
    onChange(stops.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  return (
    <div className="operator-stop-editor">
      <div className="operator-stop-head">
        <b>Điểm đón/trả cụ thể</b>
        <button
          className="btn btn-outline"
          type="button"
          onClick={() => onChange([...stops, { stopName: '', stopAddress: '', stopOrder: stops.length + 1, stopType: 3, arrivalOffset: 0 }])}
        >
          <i className="fa-solid fa-plus" /> Thêm điểm
        </button>
      </div>
      {stops.map((stop, index) => (
        <div className="operator-stop-row" key={`${index}-${stop.stopOrder}`}>
          <input value={stop.stopName} onChange={(e) => update(index, 'stopName', e.target.value)} placeholder="Tên điểm" />
          <input value={stop.stopAddress || ''} onChange={(e) => update(index, 'stopAddress', e.target.value)} placeholder="Địa chỉ" />
          <select value={stop.stopType} onChange={(e) => update(index, 'stopType', Number(e.target.value))}>
            <option value={1}>Điểm đón</option>
            <option value={2}>Điểm trả</option>
            <option value={3}>Đón/trả</option>
          </select>
          <input type="number" min="0" value={stop.arrivalOffset || 0} onChange={(e) => update(index, 'arrivalOffset', Number(e.target.value))} placeholder="Phút từ giờ đi" />
        </div>
      ))}
    </div>
  );
}

function ReportTable({ title, rows, mode }) {
  return (
    <section className="admin-card">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{mode === 'trip' ? 'Chuyến' : 'Xe'}</th>
              <th>Đơn</th>
              <th>Ghế</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${mode}-${pick(row, ['tripID', 'TripID', 'busID', 'BusID'])}`}>
                <td>
                  {mode === 'trip'
                    ? `#${pick(row, ['tripID', 'TripID'])} - ${pick(row, ['departureLocation', 'DepartureLocation'])} đến ${pick(row, ['arrivalLocation', 'ArrivalLocation'])}`
                    : `${pick(row, ['licensePlate', 'LicensePlate'])} - ${labelBusType(pick(row, ['busType', 'BusType']))}`}
                </td>
                <td>{pick(row, ['bookingCount', 'BookingCount'], 0)}</td>
                <td>{pick(row, ['seatCount', 'SeatCount'], 0)}</td>
                <td>{formatVND(pick(row, ['revenue', 'Revenue'], 0))}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={4}>Chưa có doanh thu trong bộ lọc này.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterBar({ filters, setFilters, onSearch, onClear }) {
  return (
    <div className="operator-filter-bar">
      <input value={filters.licensePlate} onChange={(e) => setFilters({ ...filters, licensePlate: e.target.value })} placeholder="Tìm biển số" />
      <input value={filters.busType} onChange={(e) => setFilters({ ...filters, busType: e.target.value })} placeholder="Tìm loại xe" />
      <button className="btn btn-primary" type="button" onClick={onSearch}>Lọc</button>
      <button className="btn btn-outline" type="button" onClick={onClear}>Xóa lọc</button>
    </div>
  );
}

function TripFilterBar({ filters, buses, setFilters, onSearch, onClear }) {
  return (
    <div className="operator-filter-bar">
      <input value={filters.route} onChange={(e) => setFilters({ ...filters, route: e.target.value })} placeholder="Tìm điểm đi/đến" />
      <input type="date" value={filters.departureDate} onChange={(e) => setFilters({ ...filters, departureDate: e.target.value })} />
      <select value={filters.busId} onChange={(e) => setFilters({ ...filters, busId: e.target.value })}>
        <option value="">Tất cả xe</option>
        {buses.map((bus) => (
          <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
            {pick(bus, ['licensePlate', 'LicensePlate'])}
          </option>
        ))}
      </select>
      <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">Tất cả trạng thái</option>
        <option value="Scheduled">Đã lên lịch</option>
        <option value="On-going">Đang chạy</option>
        <option value="Completed">Hoàn thành</option>
        <option value="Cancelled">Đã hủy</option>
      </select>
      <button className="btn btn-primary" type="button" onClick={onSearch}>Lọc</button>
      <button className="btn btn-outline" type="button" onClick={onClear}>Xóa lọc</button>
    </div>
  );
}

function SeatLayoutEditor({ layoutType, seatsText, capacity, onChange }) {
  const normalizedLayoutType = normalizeLayoutType(layoutType, '', capacity);
  const previewSeats = parseSeatLabels(seatsText);

  const regenerate = () => {
    onChange({
      seatLayoutType: normalizedLayoutType,
      seatLayoutSeats: seatLabelsToText(buildSeatLabels(normalizedLayoutType, Number(capacity || 0))),
    });
  };

  return (
    <div className="operator-seat-layout-editor">
      <div className="operator-seat-layout-head">
        <div>
          <b>Sơ đồ ghế</b>
          <small>{Number(capacity || 0)} ghế</small>
        </div>
        <button className="btn btn-outline" type="button" onClick={regenerate}>
          <i className="fa-solid fa-rotate-right" /> Tạo lại ghế
        </button>
      </div>
      <div className="operator-seat-layout-controls">
        <select value={normalizedLayoutType} onChange={(e) => onChange({ seatLayoutType: e.target.value })}>
          {SEAT_LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <textarea
          value={seatsText}
          onChange={(e) => onChange({ seatLayoutSeats: e.target.value })}
          placeholder="A01, A02, B01, B02..."
          rows={3}
        />
      </div>
      <MiniSeatMap seats={(previewSeats.length ? previewSeats : buildSeatLabels(normalizedLayoutType, Number(capacity || 0))).slice(0, 16)} />
    </div>
  );
}

function MiniSeatMap({ seats }) {
  return (
    <div className="operator-mini-seat-map">
      {seats.map((seat) => <span key={seat}>{seat}</span>)}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="admin-pagination">
      <button className="btn btn-outline" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Trước</button>
      <span>Trang {page}/{totalPages}</span>
      <button className="btn btn-outline" type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Sau</button>
    </div>
  );
}

function normalizePagedResponse(data, fallbackPage = 1) {
  const items = Array.isArray(data) ? data : data?.items || data?.Items || [];
  const pageSize = Number(data?.pageSize || data?.PageSize || 10);
  const totalCount = Number(data?.totalCount || data?.TotalCount || items.length);
  return {
    items,
    page: Number(data?.page || data?.Page || fallbackPage),
    pageSize,
    totalCount,
    totalPages: Number(data?.totalPages || data?.TotalPages || Math.max(1, Math.ceil(totalCount / pageSize))),
  };
}

function emptyPage() {
  return { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 1 };
}

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ''));
}

function buildTripPayload(form) {
  const capacity = Number(form.seatLayoutCapacity || form.availableSeats || 0);
  const seatLayoutType = normalizeLayoutType(form.seatLayoutType, '', capacity);

  return {
    busID: Number(form.busID),
    departureLocation: form.departureLocation.trim(),
    arrivalLocation: form.arrivalLocation.trim(),
    departureTime: form.departureTime,
    arrivalTime: form.arrivalTime,
    price: Number(form.price),
    availableSeats: Number(form.availableSeats || 0),
    status: form.status,
    seatLayoutType,
    seatLayout: buildSeatLayoutJson(seatLayoutType, form.seatLayoutSeats, capacity),
    stopPoints: form.stopPoints
      .filter((stop) => stop.stopName.trim())
      .map((stop, index) => ({
        stopName: stop.stopName.trim(),
        stopAddress: stop.stopAddress?.trim() || '',
        stopOrder: index + 1,
        stopType: Number(stop.stopType),
        arrivalOffset: Number(stop.arrivalOffset || 0),
      })),
  };
}

function normalizeStops(stops) {
  const normalized = stops.map((stop, index) => ({
    stopName: pick(stop, ['stopName', 'StopName'], ''),
    stopAddress: pick(stop, ['stopAddress', 'StopAddress'], ''),
    stopOrder: pick(stop, ['stopOrder', 'StopOrder'], index + 1),
    stopType: pick(stop, ['stopType', 'StopType'], 3),
    arrivalOffset: pick(stop, ['arrivalOffset', 'ArrivalOffset'], 0),
  }));

  return normalized.length ? normalized : EMPTY_TRIP.stopPoints;
}

function toggleForm(showForm, setShowForm, setForm, empty) {
  if (showForm) {
    setForm(empty);
    setShowForm(false);
    return;
  }
  setForm(empty);
  setShowForm(true);
}

function cancelForm(setShowForm, setForm, empty) {
  setForm(empty);
  setShowForm(false);
}

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function labelBusType(value) {
  const text = String(value || '').trim();
  const key = text.toLowerCase();
  return BUS_TYPE_LABELS[key] || text;
}

function normalizeAmenities(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return text
    .split(/[,;|\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function labelLayoutType(value) {
  return normalizeLayoutType(value);
}

function buildSeatLayoutFormState(entity) {
  const capacity = Number(pick(entity, ['capacity', 'Capacity'], 0));
  const busType = pick(entity, ['busType', 'BusType'], '');
  const layoutType = getEntityLayoutType(entity);
  const seats = getEntitySeatLabels(entity);

  return {
    seatLayoutType: layoutType,
    seatLayoutSeats: seatLabelsToText(seats.length ? seats : buildSeatLabels(layoutType, capacity)),
    seatLayoutCapacity: capacity,
  };
}

function getEntityLayoutType(entity) {
  const seatMap = pick(entity, ['seatMap', 'SeatMap'], {});
  const capacity = Number(pick(entity, ['capacity', 'Capacity'], 0));
  const busType = pick(entity, ['busType', 'BusType'], '');
  const layoutType = pick(entity, ['layoutType', 'LayoutType'], pick(seatMap, ['layoutType', 'LayoutType'], ''));
  return normalizeLayoutType(layoutType, busType, capacity);
}

function getEntitySeatLabels(entity) {
  const seatMap = pick(entity, ['seatMap', 'SeatMap'], {});
  const seats = pick(seatMap, ['seats', 'Seats'], []);

  if (!Array.isArray(seats)) return [];

  return seats
    .map((seat) => {
      if (typeof seat === 'string') return seat;
      return pick(seat, ['seatLabel', 'SeatLabel', 'label', 'Label'], '');
    })
    .map((seat) => String(seat || '').trim())
    .filter(Boolean);
}

function buildSeatLayoutJson(layoutType, seatsText, capacity) {
  const normalizedLayoutType = normalizeLayoutType(layoutType, '', capacity);
  const seats = parseSeatLabels(seatsText);

  return JSON.stringify({
    layoutType: normalizedLayoutType,
    seats: seats.length ? seats : buildSeatLabels(normalizedLayoutType, Number(capacity || 0)),
  });
}

function normalizeLayoutType(value, busType = '', capacity = 0) {
  const key = normalizeText(value).replace(/[^a-z0-9]/g, '');

  if (key === 'limousine') return 'Limousine';
  if (['2tang', 'haitang', 'twofloor', '2floor', 'twofloors', '2floors'].includes(key)) return '2 tầng';
  if (['1tang', 'mottang', 'onefloor', '1floor', 'onefloors', '1floors', 'seater', 'ghengoi'].includes(key)) return '1 tầng';
  if (['sleeper', 'giuongnam'].includes(key)) return Number(capacity) > 0 && Number(capacity) <= 24 ? '1 tầng' : '2 tầng';

  return inferSeatLayoutType(busType, capacity);
}

function inferSeatLayoutType(busType, capacity = 0) {
  const key = normalizeText(busType).replace(/[^a-z0-9]/g, '');

  if (key.includes('limousine')) return 'Limousine';
  if (key.includes('giuong') || key.includes('sleeper') || key.includes('cabin')) {
    return Number(capacity) > 0 && Number(capacity) <= 24 ? '1 tầng' : '2 tầng';
  }

  return '1 tầng';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseSeatLabels(value) {
  return String(value || '')
    .split(/[\s,;|]+/)
    .map((seat) => seat.trim().toUpperCase())
    .filter(Boolean)
    .filter((seat, index, seats) => seats.indexOf(seat) === index);
}

function seatLabelsToText(seats) {
  return (seats || []).join(', ');
}

function buildSeatLabels(layoutType, capacity) {
  const total = Math.max(0, Math.min(80, Number(capacity || 0)));
  if (!total) return [];

  if (layoutType === '2 tầng') {
    const firstFloorCount = Math.ceil(total / 2);
    const secondFloorCount = total - firstFloorCount;
    return [
      ...Array.from({ length: firstFloorCount }, (_, index) => `A${String(index + 1).padStart(2, '0')}`),
      ...Array.from({ length: secondFloorCount }, (_, index) => `B${String(index + 1).padStart(2, '0')}`),
    ];
  }

  const prefix = layoutType === 'Limousine' ? 'L' : 'G';
  return Array.from({ length: total }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);
}
