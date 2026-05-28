import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { formatVND, labelRole, labelTripStatus, pick } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { operatorPortalApi } from '../services/operatorPortalApi';

const OPERATOR_MENU = [
  { id: 'dashboard', label: 'Tong quan', icon: 'fa-chart-line' },
  { id: 'buses', label: 'Doi xe', icon: 'fa-bus' },
  { id: 'trips', label: 'Lich khoi hanh', icon: 'fa-route' },
  { id: 'reports', label: 'Doanh thu', icon: 'fa-money-bill-wave' },
  { id: 'settings', label: 'Tai khoan', icon: 'fa-gear' },
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
  busType: 'Giuong nam 34 cho',
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
  stopPoints: [
    { stopName: '', stopAddress: '', stopOrder: 1, stopType: 1, arrivalOffset: 0 },
    { stopName: '', stopAddress: '', stopOrder: 2, stopType: 3, arrivalOffset: 0 },
    { stopName: '', stopAddress: '', stopOrder: 3, stopType: 2, arrivalOffset: 0 },
  ],
};

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
      brandLabel="Nha xe"
      subtitle="Cong quan ly rieng cho tai khoan nha xe"
      defaultTitle="Nha xe"
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
      alert(err.message || 'Khong tai duoc du lieu nha xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="admin-card">Dang tai du lieu...</div>;

  const cards = [
    ['Tong xe', stats?.totalBuses || 0, 'fa-bus', '#2563eb'],
    ['Tong chuyen', stats?.totalTrips || 0, 'fa-route', '#7c3aed'],
    ['Chuyen sap chay', stats?.upcomingTrips || 0, 'fa-clock', '#0ea5e9'],
    ['Chuyen hom nay', stats?.todayTrips || 0, 'fa-calendar-day', '#16a34a'],
    ['Don dat ve', stats?.totalBookings || 0, 'fa-ticket', '#db2777'],
    ['Doanh thu', formatVND(stats?.totalRevenue || 0), 'fa-money-bill-wave', '#ea580c'],
  ];

  return (
    <>
      <section className="admin-card operator-profile-card">
        <div>
          <p>Nha xe dang quan ly</p>
          <h3>{profile?.name || 'Chua xac dinh nha xe'}</h3>
          <span>{profile?.description || 'Tai khoan Operator duoc map theo Email hoac SDT voi bang Operators.'}</span>
        </div>
        <div>
          <b>{profile?.contactPhone || 'Chua co SDT'}</b>
          <small>{profile?.email || 'Chua co email'}</small>
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
          <h3>Chuyen xe sap khoi hanh</h3>
          <button className="btn btn-outline" type="button" onClick={load}>
            <i className="fa-solid fa-rotate" /> Tai lai
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
      alert(err.message || 'Khong tai duoc danh sach xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      licensePlate: form.licensePlate.trim(),
      capacity: Number(form.capacity),
      busType: form.busType.trim(),
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
      alert(err.message || 'Khong luu duoc xe.');
    }
  };

  const edit = (bus) => {
    setForm({
      busID: pick(bus, ['busID', 'BusID']),
      licensePlate: pick(bus, ['licensePlate', 'LicensePlate']),
      capacity: pick(bus, ['capacity', 'Capacity'], 34),
      busType: pick(bus, ['busType', 'BusType'], ''),
    });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Xoa xe nay? Xe da co lich chay se khong xoa duoc.')) return;
    try {
      await operatorPortalApi.removeBus(id);
      await load(paged.page);
    } catch (err) {
      alert(err.message || 'Khong xoa duoc xe.');
    }
  };

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <h3>Quan ly doi xe va so do ghe</h3>
          <p className="muted">Loai xe quy dinh so do ghe: Giuong nam, Limousine, Ghe ngoi.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => toggleForm(showForm, setShowForm, setForm, EMPTY_BUS)}>
          <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} /> {showForm ? 'Dong form' : 'Them xe'}
        </button>
      </div>

      {showForm && (
        <form className="admin-form-grid" onSubmit={submit}>
          <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="Bien so xe" required />
          <select value={form.busType} onChange={(e) => setForm({ ...form, busType: e.target.value })}>
            <option value="Giuong nam 34 cho">Xe giuong nam</option>
            <option value="Limousine 22 phong">Limousine</option>
            <option value="Ghe ngoi 45 cho">Ghe ngoi</option>
            <option value="Cabin doi 22 phong">Cabin doi</option>
          </select>
          <input type="number" min="1" max="80" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Suc chua" required />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Luu xe</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}>Huy</button>
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
        <p>Dang tai...</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Xe</th>
                  <th>Loai xe</th>
                  <th>So do ghe</th>
                  <th>Tien ich</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {paged.items.map((bus) => {
                  const id = pick(bus, ['busID', 'BusID']);
                  const seatMap = pick(bus, ['seatMap', 'SeatMap'], {});
                  const amenities = pick(bus, ['amenities', 'Amenities'], []);
                  return (
                    <tr key={id}>
                      <td>
                        <div className="operator-bus-cell">
                          <img src={pick(bus, ['imageUrl', 'ImageUrl'])} alt="" />
                          <div>
                            <b>{pick(bus, ['licensePlate', 'LicensePlate'])}</b>
                            <small>{pick(bus, ['capacity', 'Capacity'])} ghe</small>
                          </div>
                        </div>
                      </td>
                      <td>{pick(bus, ['busType', 'BusType'])}</td>
                      <td>
                        <b>{pick(seatMap, ['layoutType', 'LayoutType'], 'Seater')}</b>
                        <MiniSeatMap seats={pick(seatMap, ['seats', 'Seats'], []).slice(0, 12)} />
                      </td>
                      <td>{amenities.map((item) => <span className="badge operator-badge" key={item}>{item}</span>)}</td>
                      <td className="admin-actions">
                        <button className="btn btn-outline" type="button" onClick={() => edit(bus)}>Sua</button>
                        <button className="btn btn-danger" type="button" onClick={() => remove(id)}>Xoa</button>
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
      alert(err.message || 'Khong tai duoc lich khoi hanh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

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
      alert(err.message || 'Khong luu duoc chuyen xe.');
    }
  };

  const edit = async (trip) => {
    try {
      const id = pick(trip, ['tripID', 'TripID']);
      const detail = await operatorPortalApi.getTrip(id);
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
      });
      setShowForm(true);
    } catch (err) {
      alert(err.message || 'Khong tai duoc chi tiet chuyen.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Xoa chuyen xe nay? Chuyen da co booking se khong xoa duoc.')) return;
    try {
      await operatorPortalApi.removeTrip(id);
      await load(paged.page);
    } catch (err) {
      alert(err.message || 'Khong xoa duoc chuyen xe.');
    }
  };

  const cloneTrip = async (e) => {
    e.preventDefault();
    if (!clone.tripId) {
      alert('Chon chuyen can nhan ban.');
      return;
    }

    try {
      await operatorPortalApi.cloneTrip(clone.tripId, {
        repeatType: clone.repeatType,
        count: Number(clone.count),
      });
      await load(1);
      alert('Da nhan ban lich trinh.');
    } catch (err) {
      alert(err.message || 'Khong nhan ban duoc lich trinh.');
    }
  };

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <h3>Thiet lap gia ve va lich khoi hanh</h3>
          <p className="muted">Moi chuyen co thong tin xe, tien ich, diem don/tra va thoi gian du kien.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => toggleForm(showForm, setShowForm, setForm, EMPTY_TRIP)}>
          <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} /> {showForm ? 'Dong form' : 'Them chuyen'}
        </button>
      </div>

      {showForm && (
        <form className="operator-trip-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <select value={form.busID} onChange={(e) => setForm({ ...form, busID: e.target.value })} required>
              <option value="">Chon xe</option>
              {buses.map((bus) => (
                <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
                  {pick(bus, ['licensePlate', 'LicensePlate'])} - {pick(bus, ['busType', 'BusType'])}
                </option>
              ))}
            </select>
            <input value={form.departureLocation} onChange={(e) => setForm({ ...form, departureLocation: e.target.value })} placeholder="Diem di" required />
            <input value={form.arrivalLocation} onChange={(e) => setForm({ ...form, arrivalLocation: e.target.value })} placeholder="Diem den" required />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Scheduled">Scheduled</option>
              <option value="On-going">On-going</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <input type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required />
            <input type="datetime-local" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} required />
            <input type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Gia ve" required />
            <input type="number" min="0" value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} placeholder="Ghe trong" />
          </div>
          <StopEditor stops={form.stopPoints} onChange={(stopPoints) => setForm({ ...form, stopPoints })} />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Luu chuyen</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}>Huy</button>
          </div>
        </form>
      )}

      <form className="operator-clone-panel" onSubmit={cloneTrip}>
        <select value={clone.tripId} onChange={(e) => setClone({ ...clone, tripId: e.target.value })}>
          <option value="">Chon chuyen de nhan ban</option>
          {paged.items.map((trip) => (
            <option key={pick(trip, ['tripID', 'TripID'])} value={pick(trip, ['tripID', 'TripID'])}>
              #{pick(trip, ['tripID', 'TripID'])} - {pick(trip, ['departureLocation', 'DepartureLocation'])} den {pick(trip, ['arrivalLocation', 'ArrivalLocation'])}
            </option>
          ))}
        </select>
        <select value={clone.repeatType} onChange={(e) => setClone({ ...clone, repeatType: e.target.value })}>
          <option value="day">Theo ngay</option>
          <option value="week">Theo tuan</option>
        </select>
        <input type="number" min="1" max="60" value={clone.count} onChange={(e) => setClone({ ...clone, count: e.target.value })} />
        <button className="btn btn-outline" type="submit">
          <i className="fa-solid fa-copy" /> Nhan ban lich
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
        <p>Dang tai...</p>
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
      alert(err.message || 'Khong tai duoc bao cao doanh thu.');
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
          <h3>Bao cao doanh thu</h3>
          <p className="muted">Thong ke theo chuyen, theo xe hoac theo khoang thoi gian.</p>
        </div>
      </div>

      <div className="operator-report-filters">
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <select value={filters.busId} onChange={(e) => setFilters({ ...filters, busId: e.target.value, tripId: '' })}>
          <option value="">Tat ca xe</option>
          {buses.map((bus) => (
            <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
              {pick(bus, ['licensePlate', 'LicensePlate'])}
            </option>
          ))}
        </select>
        <select value={filters.tripId} onChange={(e) => setFilters({ ...filters, tripId: e.target.value })}>
          <option value="">Tat ca chuyen</option>
          {trips.map((trip) => (
            <option key={pick(trip, ['tripID', 'TripID'])} value={pick(trip, ['tripID', 'TripID'])}>
              #{pick(trip, ['tripID', 'TripID'])} - {pick(trip, ['departureLocation', 'DepartureLocation'])}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="button" onClick={load}>Loc bao cao</button>
      </div>

      {loading ? (
        <p>Dang tai...</p>
      ) : (
        <>
          <section className="admin-stats">
            <div className="stat-card"><div><p>Doanh thu</p><h2>{formatVND(report?.totalRevenue || 0)}</h2></div><i className="fa-solid fa-money-bill-wave" /></div>
            <div className="stat-card"><div><p>Don da thanh toan</p><h2>{report?.totalBookings || 0}</h2></div><i className="fa-solid fa-ticket" /></div>
            <div className="stat-card"><div><p>So ghe ban</p><h2>{report?.totalSeats || 0}</h2></div><i className="fa-solid fa-couch" /></div>
          </section>

          <div className="admin-grid">
            <ReportTable title="Theo chuyen" rows={report?.byTrip || []} mode="trip" />
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
          <h3>Thong tin tai khoan nha xe</h3>
          <p className="muted">Tai khoan chi xem va thao tac tren nha xe duoc gan.</p>
        </div>
        <button className="btn btn-danger" type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
          <i className="fa-solid fa-right-from-bracket" /> Dang xuat
        </button>
      </div>
      <div className="admin-settings-grid operator-settings-grid">
        <div><b>Ho ten</b><span>{user?.fullName || 'Chua co'}</span></div>
        <div><b>Email tai khoan</b><span>{user?.email || 'Chua co'}</span></div>
        <div><b>SDT tai khoan</b><span>{user?.phone || 'Chua co'}</span></div>
        <div><b>Vai tro</b><span>{labelRole(user?.role || 'Operator')}</span></div>
        <div><b>Nha xe</b><span>{profile?.name || 'Chua map'}</span></div>
        <div><b>Email nha xe</b><span>{profile?.email || 'Chua co'}</span></div>
      </div>
    </section>
  );
}

function TripsTable({ trips, onEdit, onDelete, compact = false }) {
  if (!trips.length) return <p className="muted">Chua co du lieu.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Chuyen</th>
            <th>Xe</th>
            <th>Khoi hanh</th>
            <th>Gia ve</th>
            <th>Chi tiet</th>
            {!compact && <th>Thao tac</th>}
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => {
            const id = pick(trip, ['tripID', 'TripID']);
            const amenities = pick(trip, ['amenities', 'Amenities'], []);
            return (
              <tr key={id}>
                <td>
                  <b>{pick(trip, ['departureLocation', 'DepartureLocation'])}</b> den <b>{pick(trip, ['arrivalLocation', 'ArrivalLocation'])}</b>
                  <br />
                  <span className="badge">{labelTripStatus(pick(trip, ['status', 'Status']))}</span>
                </td>
                <td>
                  <div className="operator-bus-cell">
                    <img src={pick(trip, ['busImageUrl', 'BusImageUrl'])} alt="" />
                    <div>
                      <b>{pick(trip, ['licensePlate', 'LicensePlate'], 'Chua ro')}</b>
                      <small>{pick(trip, ['busType', 'BusType'], 'Chua ro')}</small>
                    </div>
                  </div>
                </td>
                <td>{formatDateTime(pick(trip, ['departureTime', 'DepartureTime']))}</td>
                <td>{formatVND(pick(trip, ['price', 'Price'], 0))}</td>
                <td>
                  <div>{Math.round((pick(trip, ['estimatedDurationMinutes', 'EstimatedDurationMinutes'], 0) || 0) / 60)} gio du kien</div>
                  <div>{amenities.slice(0, 3).map((item) => <span className="badge operator-badge" key={item}>{item}</span>)}</div>
                </td>
                {!compact && (
                  <td className="admin-actions">
                    <button className="btn btn-outline" type="button" onClick={() => onEdit(trip)}>Sua</button>
                    <button className="btn btn-danger" type="button" onClick={() => onDelete(id)}>Xoa</button>
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
        <b>Diem don/tra cu the</b>
        <button
          className="btn btn-outline"
          type="button"
          onClick={() => onChange([...stops, { stopName: '', stopAddress: '', stopOrder: stops.length + 1, stopType: 3, arrivalOffset: 0 }])}
        >
          <i className="fa-solid fa-plus" /> Them diem
        </button>
      </div>
      {stops.map((stop, index) => (
        <div className="operator-stop-row" key={`${index}-${stop.stopOrder}`}>
          <input value={stop.stopName} onChange={(e) => update(index, 'stopName', e.target.value)} placeholder="Ten diem" />
          <input value={stop.stopAddress || ''} onChange={(e) => update(index, 'stopAddress', e.target.value)} placeholder="Dia chi" />
          <select value={stop.stopType} onChange={(e) => update(index, 'stopType', Number(e.target.value))}>
            <option value={1}>Diem don</option>
            <option value={2}>Diem tra</option>
            <option value={3}>Don/tra</option>
          </select>
          <input type="number" min="0" value={stop.arrivalOffset || 0} onChange={(e) => update(index, 'arrivalOffset', Number(e.target.value))} placeholder="Phut tu gio di" />
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
              <th>{mode === 'trip' ? 'Chuyen' : 'Xe'}</th>
              <th>Don</th>
              <th>Ghe</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${mode}-${pick(row, ['tripID', 'TripID', 'busID', 'BusID'])}`}>
                <td>
                  {mode === 'trip'
                    ? `#${pick(row, ['tripID', 'TripID'])} - ${pick(row, ['departureLocation', 'DepartureLocation'])} den ${pick(row, ['arrivalLocation', 'ArrivalLocation'])}`
                    : `${pick(row, ['licensePlate', 'LicensePlate'])} - ${pick(row, ['busType', 'BusType'])}`}
                </td>
                <td>{pick(row, ['bookingCount', 'BookingCount'], 0)}</td>
                <td>{pick(row, ['seatCount', 'SeatCount'], 0)}</td>
                <td>{formatVND(pick(row, ['revenue', 'Revenue'], 0))}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={4}>Chua co doanh thu trong bo loc nay.</td></tr>
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
      <input value={filters.licensePlate} onChange={(e) => setFilters({ ...filters, licensePlate: e.target.value })} placeholder="Tim bien so" />
      <input value={filters.busType} onChange={(e) => setFilters({ ...filters, busType: e.target.value })} placeholder="Tim loai xe" />
      <button className="btn btn-primary" type="button" onClick={onSearch}>Loc</button>
      <button className="btn btn-outline" type="button" onClick={onClear}>Xoa loc</button>
    </div>
  );
}

function TripFilterBar({ filters, buses, setFilters, onSearch, onClear }) {
  return (
    <div className="operator-filter-bar">
      <input value={filters.route} onChange={(e) => setFilters({ ...filters, route: e.target.value })} placeholder="Tim diem di/den" />
      <input type="date" value={filters.departureDate} onChange={(e) => setFilters({ ...filters, departureDate: e.target.value })} />
      <select value={filters.busId} onChange={(e) => setFilters({ ...filters, busId: e.target.value })}>
        <option value="">Tat ca xe</option>
        {buses.map((bus) => (
          <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
            {pick(bus, ['licensePlate', 'LicensePlate'])}
          </option>
        ))}
      </select>
      <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">Tat ca trang thai</option>
        <option value="Scheduled">Scheduled</option>
        <option value="On-going">On-going</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
      </select>
      <button className="btn btn-primary" type="button" onClick={onSearch}>Loc</button>
      <button className="btn btn-outline" type="button" onClick={onClear}>Xoa loc</button>
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
      <button className="btn btn-outline" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Truoc</button>
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
  return {
    busID: Number(form.busID),
    departureLocation: form.departureLocation.trim(),
    arrivalLocation: form.arrivalLocation.trim(),
    departureTime: form.departureTime,
    arrivalTime: form.arrivalTime,
    price: Number(form.price),
    availableSeats: Number(form.availableSeats || 0),
    status: form.status,
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
  if (!value) return 'Chua co';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
