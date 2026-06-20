import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { API_BASE, formatVND, labelRole, labelTripStatus, pick } from '../api';
import PromotionManager from '../components/PromotionManager';
import { useAuth } from '../contexts/AuthContext';
import { operatorPortalApi } from '../services/operatorPortalApi';

const OPERATOR_MENU = [
  { id: 'promotions', label: 'Khuyến mãi', icon: 'fa-tags' },
  { id: 'dashboard', label: 'Thống kê', icon: 'fa-chart-line' },
  { id: 'buses', label: 'Quản lý đội xe', icon: 'fa-bus' },
  { id: 'trips', label: 'Quản lý chuyến xe', icon: 'fa-route' },
  { id: 'reports', label: 'Doanh thu', icon: 'fa-money-bill-wave' },
  { id: 'settings', label: 'Cài đặt', icon: 'fa-gear' },
];

const operatorPaths = {
  promotions: '/operator/promotions',
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
  imageUrl: '',
  imageFile: null,
  imagePreview: '',
  busType: 'Xe giường nằm',
  amenities: '',
  seatLayoutType: '2 tầng',
  seatLayoutRows: 5,
  seatLayoutSeatsPerRow: 4,
};

const BUS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const BUS_TYPE_SLEEPER = 'Xe giường nằm';
const BUS_TYPE_LIMOUSINE = 'Xe Limousine';
const LAYOUT_ONE_FLOOR = '1 tầng';
const LAYOUT_TWO_FLOORS = '2 tầng';

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

const EMPTY_CLONE = {
  repeatType: 'day',
  count: 1,
  drafts: [],
};

const BUS_TYPE_LABELS = {
  'xe giuong nam': BUS_TYPE_SLEEPER,
  'giuong nam': BUS_TYPE_SLEEPER,
  'giuong nam 34 cho': BUS_TYPE_SLEEPER,
  'giuong nam 40 cho': BUS_TYPE_SLEEPER,
  sleeper: BUS_TYPE_SLEEPER,
  'xe limousine': BUS_TYPE_LIMOUSINE,
  limousine: BUS_TYPE_LIMOUSINE,
  'limousine 22 phong': BUS_TYPE_LIMOUSINE,
};

const BUS_TYPE_OPTIONS = [
  { value: BUS_TYPE_SLEEPER, label: BUS_TYPE_SLEEPER },
  { value: BUS_TYPE_LIMOUSINE, label: BUS_TYPE_LIMOUSINE },
];

const SEAT_LAYOUT_OPTIONS = [
  { value: LAYOUT_TWO_FLOORS, label: 'Xe giường nằm 2 tầng' },
  { value: LAYOUT_ONE_FLOOR, label: 'Xe giường nằm 1 tầng' },
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
      {active === 'promotions' && (
        <PromotionManager mode="operator" ModalComponent={OperatorFormModal} />
      )}
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
  const [saving, setSaving] = useState(false);

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
    const busType = normalizeBusTypeValue(form.busType);
    const seatLayoutType = getValidSeatLayoutType(busType, form.seatLayoutType, capacity);

    setSaving(true);
    try {
      let imageUrl = form.imageUrl || '';
      if (form.imageFile) {
        const uploaded = await operatorPortalApi.uploadBusImage(form.imageFile);
        imageUrl = pick(uploaded, ['imageUrl', 'ImageUrl'], '');
      }

      const payload = {
        licensePlate: form.licensePlate.trim(),
        capacity,
        busType,
        imageUrl,
        amenities: form.amenities.trim(),
        seatLayoutType,
        seatLayout: buildSeatLayoutJson(seatLayoutType, capacity, form.seatLayoutRows, form.seatLayoutSeatsPerRow, busType),
      };

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
    } finally {
      setSaving(false);
    }
  };

  const edit = (bus) => {
    const layoutState = buildSeatLayoutFormState(bus);
    setForm({
      busID: pick(bus, ['busID', 'BusID']),
      licensePlate: pick(bus, ['licensePlate', 'LicensePlate']),
      capacity: pick(bus, ['capacity', 'Capacity'], 34),
      busType: normalizeBusTypeValue(pick(bus, ['busType', 'BusType'], '')),
      imageUrl: pick(bus, ['imageUrl', 'ImageUrl'], ''),
      imageFile: null,
      imagePreview: '',
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
          <p className="muted">Loại xe quy định sơ đồ ghế: Xe giường nằm hoặc Xe Limousine.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => toggleForm(showForm, setShowForm, setForm, EMPTY_BUS)}>
          <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} /> {showForm ? 'Đóng form' : 'Thêm xe'}
        </button>
      </div>

      {showForm && (
        <OperatorFormModal
          title={form.busID ? 'Sửa xe' : 'Thêm xe'}
          subtitle="Khai báo thông tin xe và sơ đồ ghế."
          size="wide"
          onClose={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}
        >
        <form className="admin-form-grid admin-form-grid-modal operator-bus-form" onSubmit={submit}>
          <label className="operator-form-field">
            <span>Biển số xe</span>
            <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} required />
          </label>
          <label className="operator-form-field">
            <span>Loại xe</span>
            <select
              value={form.busType}
              onChange={(e) => {
                const busType = normalizeBusTypeValue(e.target.value);
                const capacity = Number(form.capacity);
                const seatLayoutType = getValidSeatLayoutType(busType, form.seatLayoutType, capacity);
                const layoutDefaults = getDefaultSeatLayout(seatLayoutType, capacity);
                setForm({
                  ...form,
                  busType,
                  seatLayoutType,
                  seatLayoutRows: layoutDefaults.rows,
                  seatLayoutSeatsPerRow: layoutDefaults.seatsPerRow,
                });
              }}
            >
              {getBusTypeOptions(form.busType).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="operator-form-field">
            <span>Sức chứa</span>
            <input
              type="number"
              min="1"
              max="80"
              value={form.capacity}
              onChange={(e) => {
                const capacity = Number(e.target.value);
                const busType = normalizeBusTypeValue(form.busType);
                const seatLayoutType = getValidSeatLayoutType(busType, form.seatLayoutType, capacity);
                const layoutDefaults = getDefaultSeatLayout(seatLayoutType, capacity);
                setForm({
                  ...form,
                  capacity: e.target.value,
                  seatLayoutType,
                  seatLayoutRows: layoutDefaults.rows,
                  seatLayoutSeatsPerRow: layoutDefaults.seatsPerRow,
                });
              }}
              required
            />
          </label>
          <label className="operator-form-field">
            <span>Tiện ích</span>
            <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
          </label>
          <BusImageUploader form={form} onChange={(updates) => setForm({ ...form, ...updates })} />
          <SeatLayoutEditor
            busType={form.busType}
            layoutType={form.seatLayoutType}
            rows={form.seatLayoutRows}
            seatsPerRow={form.seatLayoutSeatsPerRow}
            capacity={Number(form.capacity)}
            onChange={(updates) => setForm({ ...form, ...updates })}
          />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu xe'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_BUS)}>Hủy</button>
          </div>
        </form>
        </OperatorFormModal>
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
                  const capacity = Number(pick(bus, ['capacity', 'Capacity'], 0));
                  const busType = normalizeBusTypeValue(pick(bus, ['busType', 'BusType'], ''));
                  const layoutType = getEntityLayoutType(bus);
                  const layoutConfig = getEntitySeatLayoutConfig(bus, layoutType, capacity);
                  const seatLabels = getEntitySeatLabels(bus);
                  const previewSeats = seatLabels.length ? seatLabels : buildSeatLabels(layoutType, capacity, busType);
                  const amenities = normalizeAmenities(pick(bus, ['amenities', 'Amenities'], []));
                  return (
                    <tr key={id}>
                      <td>
                        <div className="operator-bus-cell">
                          <BusImageThumb
                            imageUrl={pick(bus, ['imageUrl', 'ImageUrl'])}
                            alt={pick(bus, ['licensePlate', 'LicensePlate'], 'Xe')}
                          />
                          <div>
                            <b>{pick(bus, ['licensePlate', 'LicensePlate'])}</b>
                            <small>{pick(bus, ['capacity', 'Capacity'])} ghế</small>
                          </div>
                        </div>
                      </td>
                      <td>{labelBusType(busType)}</td>
                      <td>
                        <b>{labelLayoutType(layoutType)}</b>
                        <small>{layoutConfig.rows} x {layoutConfig.seatsPerRow}</small>
                        <MiniSeatMap seats={previewSeats.slice(0, 12)} seatsPerRow={layoutConfig.seatsPerRow} />
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
  const [filters, setFilters] = useState({ route: '', dateMode: 'day', departureDate: '', status: '', busId: '' });
  const [form, setForm] = useState(EMPTY_TRIP);
  const [showForm, setShowForm] = useState(false);
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [clone, setClone] = useState(EMPTY_CLONE);
  const [savingClone, setSavingClone] = useState(false);
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
    setForm({ ...form, busID });
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
      setForm(mapTripDetailToForm(detail, id));
      setShowCloneForm(false);
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

  const openTripForm = () => {
    setShowCloneForm(false);
    toggleForm(showForm, setShowForm, setForm, EMPTY_TRIP);
  };

  const openCloneForm = () => {
    setShowForm(false);
    setForm(EMPTY_TRIP);
    setClone({ ...EMPTY_CLONE, repeatType: filters.dateMode === 'week' ? 'week' : 'day' });
    setShowCloneForm(true);
  };

  const closeCloneForm = () => {
    setClone(EMPTY_CLONE);
    setSavingClone(false);
    setShowCloneForm(false);
  };

  const fetchTripsForCloneFilters = async () => {
    const baseParams = cleanParams({ ...filters, pageSize: 100 });
    const firstPage = await operatorPortalApi.listTrips({ ...baseParams, page: 1 });
    const normalized = normalizePagedResponse(firstPage, 1);
    const items = [...normalized.items];

    for (let page = 2; page <= normalized.totalPages; page += 1) {
      const nextPage = await operatorPortalApi.listTrips({ ...baseParams, page });
      items.push(...normalizePagedResponse(nextPage, page).items);
    }

    return items;
  };

  const generateCloneDrafts = async () => {
    try {
      const sourceTrips = await fetchTripsForCloneFilters();

      if (!sourceTrips.length) {
        alert('Danh sách đang lọc chưa có chuyến nào để nhân bản.');
        return;
      }

      const sourceDetails = await Promise.all(
        sourceTrips.map((trip) => operatorPortalApi.getTrip(pick(trip, ['tripID', 'TripID'])))
      );
      const baseForms = sourceDetails.map((detail) => mapTripDetailToForm(detail, null));
      const drafts = buildCloneDrafts(baseForms, clone.repeatType, clone.count);
      setClone({ ...clone, drafts });
    } catch (err) {
      alert(err.message || 'Không tạo được lịch nháp.');
    }
  };

  const addCloneDraft = () => {
    if (!clone.drafts.length) {
      generateCloneDrafts();
      return;
    }

    const intervalDays = getCloneIntervalDays(clone.repeatType);
    const source = clone.drafts[clone.drafts.length - 1];
    setClone({
      ...clone,
      count: Number(clone.count || 0) + 1,
      drafts: [
        ...clone.drafts,
        {
          ...source,
          draftId: createCloneDraftId(),
          departureTime: addDaysToDateTimeInput(source.departureTime, intervalDays),
          arrivalTime: addDaysToDateTimeInput(source.arrivalTime, intervalDays),
          stopPoints: source.stopPoints.map((stop) => ({ ...stop })),
        },
      ],
    });
  };

  const updateCloneDraft = (index, updates) => {
    setClone({
      ...clone,
      drafts: clone.drafts.map((draft, draftIndex) => (
        draftIndex === index ? { ...draft, ...updates } : draft
      )),
    });
  };

  const removeCloneDraft = (index) => {
    setClone({
      ...clone,
      drafts: clone.drafts.filter((_, draftIndex) => draftIndex !== index),
    });
  };

  const saveCloneDrafts = async (e) => {
    e.preventDefault();
    if (!clone.drafts.length) {
      alert('Tạo ít nhất một lịch nháp trước khi lưu.');
      return;
    }

    setSavingClone(true);
    try {
      for (const draft of clone.drafts) {
        await operatorPortalApi.createTrip(buildTripPayload(draft));
      }
      await load(1);
      closeCloneForm();
      alert('Đã lưu lịch nhân bản.');
    } catch (err) {
      alert(err.message || 'Không lưu được lịch nhân bản.');
    } finally {
      setSavingClone(false);
    }
  };

  return (
    <section className="admin-card table-card">
      <div className="admin-section-head">
        <div>
          <h3>Thiết lập giá vé và lịch khởi hành</h3>
          <p className="muted">Mỗi chuyến có thông tin xe, tiện ích, điểm đón/trả và thời gian dự kiến.</p>
        </div>
        <div className="operator-section-actions">
          <button className="btn btn-outline" type="button" onClick={openCloneForm}>
            <i className="fa-solid fa-copy" /> Nhân bản lịch
          </button>
          <button className="btn btn-primary" type="button" onClick={openTripForm}>
            <i className={`fa-solid ${showForm ? 'fa-xmark' : 'fa-plus'}`} /> {showForm ? 'Đóng form' : 'Thêm chuyến'}
          </button>
        </div>
      </div>

      {showForm && (
        <OperatorFormModal
          title={form.tripID ? 'Sửa chuyến xe' : 'Thêm chuyến xe'}
          subtitle="Thiết lập xe, giờ chạy, điểm đón trả và giá vé."
          size="wide"
          onClose={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}
        >
        <form className="operator-trip-form operator-trip-form-modal" onSubmit={submit}>
          <div className="admin-form-grid admin-form-grid-modal">
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
          <StopEditor stops={form.stopPoints} onChange={(stopPoints) => setForm({ ...form, stopPoints })} />
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit">Lưu chuyến</button>
            <button className="btn btn-outline" type="button" onClick={() => cancelForm(setShowForm, setForm, EMPTY_TRIP)}>Hủy</button>
          </div>
        </form>
        </OperatorFormModal>
      )}

      {showCloneForm && (
        <OperatorFormModal
          title="Nhân bản lịch nhà xe"
          subtitle="Tạo lịch nháp theo ngày hoặc theo tuần, chỉnh sửa chi tiết rồi mới lưu."
          size="wide"
          onClose={closeCloneForm}
        >
          <form className="operator-clone-form" onSubmit={saveCloneDrafts}>
            <div className="admin-form-grid admin-form-grid-modal operator-clone-builder">
              <div className="operator-clone-source">
                <span>Nguồn nhân bản</span>
                <b>Danh sách chuyến đang lọc</b>
                <small>{formatTripFilterSummary(filters)}</small>
              </div>
              <label className="operator-form-field">
                <span>Dịch lịch theo</span>
                <select value={clone.repeatType} onChange={(e) => setClone({ ...clone, repeatType: e.target.value, drafts: [] })}>
                  <option value="day">Ngày kế tiếp</option>
                  <option value="week">Tuần kế tiếp</option>
                </select>
              </label>
              <label className="operator-form-field">
                <span>{clone.repeatType === 'week' ? 'Số tuần tạo' : 'Số ngày tạo'}</span>
                <input type="number" min="1" max="60" value={clone.count} onChange={(e) => setClone({ ...clone, count: e.target.value, drafts: [] })} />
              </label>
              <button className="btn btn-outline" type="button" onClick={generateCloneDrafts}>
                <i className="fa-solid fa-wand-magic-sparkles" /> Tạo lịch nháp
              </button>
            </div>

            <div className="operator-clone-draft-head">
              <div>
                <b>Danh sách lịch nháp</b>
                <small>{clone.drafts.length} lịch chờ lưu</small>
              </div>
              <button className="btn btn-outline" type="button" onClick={addCloneDraft}>
                <i className="fa-solid fa-plus" /> Thêm lịch
              </button>
            </div>

            {!clone.drafts.length ? (
              <p className="muted">Bấm “Tạo lịch nháp” để lấy toàn bộ danh sách đang lọc, sau đó chỉnh sửa hoặc giữ nguyên trước khi lưu.</p>
            ) : (
              <div className="operator-clone-draft-list">
                {clone.drafts.map((draft, index) => (
                  <CloneDraftEditor
                    key={draft.draftId}
                    draft={draft}
                    index={index}
                    buses={buses}
                    onChange={(updates) => updateCloneDraft(index, updates)}
                    onRemove={() => removeCloneDraft(index)}
                  />
                ))}
              </div>
            )}

            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit" disabled={savingClone || !clone.drafts.length}>
                {savingClone ? 'Đang lưu...' : 'Lưu lịch nhân bản'}
              </button>
              <button className="btn btn-outline" type="button" onClick={closeCloneForm}>Hủy</button>
            </div>
          </form>
        </OperatorFormModal>
      )}

      <TripFilterBar
        filters={filters}
        buses={buses}
        setFilters={setFilters}
        onSearch={() => load(1)}
        onClear={() => {
          setFilters({ route: '', dateMode: 'day', departureDate: '', status: '', busId: '' });
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
                    <BusImageThumb
                      imageUrl={pick(trip, ['busImageUrl', 'BusImageUrl'])}
                      alt={pick(trip, ['licensePlate', 'LicensePlate'], 'Xe')}
                    />
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

function CloneDraftEditor({ draft, index, buses, onChange, onRemove }) {
  return (
    <section className="operator-clone-draft">
      <div className="operator-clone-draft-title">
        <div>
          <b>Lịch nháp #{index + 1}</b>
          <small>{draft.departureLocation || 'Chưa có điểm đi'} đến {draft.arrivalLocation || 'chưa có điểm đến'}</small>
        </div>
        <button className="btn btn-danger" type="button" onClick={onRemove}>Xóa lịch</button>
      </div>

      <div className="admin-form-grid admin-form-grid-modal">
        <label className="operator-form-field">
          <span>Xe</span>
          <select value={draft.busID} onChange={(e) => onChange({ busID: e.target.value })} required>
            <option value="">Chọn xe</option>
            {buses.map((bus) => (
              <option key={pick(bus, ['busID', 'BusID'])} value={pick(bus, ['busID', 'BusID'])}>
                {pick(bus, ['licensePlate', 'LicensePlate'])} - {labelBusType(pick(bus, ['busType', 'BusType']))}
              </option>
            ))}
          </select>
        </label>
        <label className="operator-form-field">
          <span>Điểm đi</span>
          <input value={draft.departureLocation} onChange={(e) => onChange({ departureLocation: e.target.value })} required />
        </label>
        <label className="operator-form-field">
          <span>Điểm đến</span>
          <input value={draft.arrivalLocation} onChange={(e) => onChange({ arrivalLocation: e.target.value })} required />
        </label>
        <label className="operator-form-field">
          <span>Trạng thái</span>
          <select value={draft.status} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="Scheduled">Đã lên lịch</option>
            <option value="On-going">Đang chạy</option>
            <option value="Completed">Hoàn thành</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </label>
        <label className="operator-form-field">
          <span>Giờ đi</span>
          <input type="datetime-local" value={draft.departureTime} onChange={(e) => onChange({ departureTime: e.target.value })} required />
        </label>
        <label className="operator-form-field">
          <span>Giờ đến</span>
          <input type="datetime-local" value={draft.arrivalTime} onChange={(e) => onChange({ arrivalTime: e.target.value })} required />
        </label>
        <label className="operator-form-field">
          <span>Giá vé</span>
          <input type="number" min="1" value={draft.price} onChange={(e) => onChange({ price: e.target.value })} required />
        </label>
        <label className="operator-form-field">
          <span>Ghế trống</span>
          <input type="number" min="0" value={draft.availableSeats} onChange={(e) => onChange({ availableSeats: e.target.value })} />
        </label>
      </div>

      <StopEditor stops={draft.stopPoints} onChange={(stopPoints) => onChange({ stopPoints })} />
    </section>
  );
}

function BusImageUploader({ form, onChange }) {
  const imageSrc = resolveBusImageUrl(form.imagePreview || form.imageUrl);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh.');
      event.target.value = '';
      return;
    }

    if (file.size > BUS_IMAGE_MAX_BYTES) {
      alert('Ảnh xe không được vượt quá 5MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        imageFile: file,
        imagePreview: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="operator-bus-image-field">
      <div className="operator-bus-image-preview">
        {imageSrc ? (
          <img src={imageSrc} alt="Ảnh xe đang chọn" />
        ) : (
          <span>
            <i className="fa-solid fa-image" />
            Chưa có ảnh
          </span>
        )}
      </div>
      <div className="operator-bus-image-actions">
        <b>Ảnh xe</b>
        <small>Ảnh được upload lên server, sau đó lưu URL vào cột ImageUrl của xe.</small>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {(form.imageUrl || form.imagePreview) && (
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => onChange({ imageUrl: '', imageFile: null, imagePreview: '' })}
          >
            Xóa ảnh
          </button>
        )}
      </div>
    </div>
  );
}

function BusImageThumb({ imageUrl, alt }) {
  const imageSrc = resolveBusImageUrl(imageUrl);

  if (!imageSrc) {
    return (
      <span className="operator-bus-image-placeholder" aria-label="Chưa có ảnh xe">
        <i className="fa-solid fa-bus" />
      </span>
    );
  }

  return <img src={imageSrc} alt={alt || 'Ảnh xe'} />;
}

function resolveBusImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  if (url.startsWith('uploads/')) return `${API_BASE}/${url}`;
  return url;
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
      <select value={filters.busType} onChange={(e) => setFilters({ ...filters, busType: e.target.value })}>
        <option value="">Tất cả loại xe</option>
        {BUS_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button className="btn btn-primary" type="button" onClick={onSearch}>Lọc</button>
      <button className="btn btn-outline" type="button" onClick={onClear}>Xóa lọc</button>
    </div>
  );
}

function TripFilterBar({ filters, buses, setFilters, onSearch, onClear }) {
  return (
    <div className="operator-filter-bar operator-trip-filter-bar">
      <input value={filters.route} onChange={(e) => setFilters({ ...filters, route: e.target.value })} placeholder="Tìm điểm đi/đến" />
      <select value={filters.dateMode} onChange={(e) => setFilters({ ...filters, dateMode: e.target.value })}>
        <option value="day">Theo ngày</option>
        <option value="week">Theo tuần</option>
      </select>
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

function SeatLayoutEditor({ busType, layoutType, rows, seatsPerRow, capacity, onChange }) {
  const normalizedBusType = normalizeBusTypeValue(busType);
  const seatLayoutOptions = getSeatLayoutOptions(normalizedBusType);
  const normalizedLayoutType = getValidSeatLayoutType(normalizedBusType, layoutType, capacity);
  const floorMultiplier = getFloorMultiplier(normalizedLayoutType);
  const normalizedDimensions = normalizeSeatLayoutDimensions(normalizedLayoutType, capacity, seatsPerRow, rows);
  const normalizedRows = normalizedDimensions.rows;
  const normalizedSeatsPerRow = normalizedDimensions.seatsPerRow;
  const seatsToArrange = getSeatsToArrange(normalizedLayoutType, capacity);
  const minRows = getMinRowsForSeatLayout(normalizedLayoutType, capacity);
  const maxRows = Math.max(1, seatsToArrange);
  const maxSeatsPerRow = getMaxSeatsPerRow(seatsToArrange);
  const previewSeats = buildSeatLabels(normalizedLayoutType, Number(capacity || 0), normalizedBusType);

  const regenerate = () => {
    const nextDefaults = getDefaultSeatLayout(normalizedLayoutType, capacity);
    onChange({
      seatLayoutType: normalizedLayoutType,
      seatLayoutRows: nextDefaults.rows,
      seatLayoutSeatsPerRow: nextDefaults.seatsPerRow,
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
        <label className="operator-seat-layout-type">
          <span>Kiểu xe</span>
          <select
            value={normalizedLayoutType}
            onChange={(e) => {
              const nextType = e.target.value;
              const nextLayoutType = getValidSeatLayoutType(normalizedBusType, nextType, capacity);
              const nextDefaults = getDefaultSeatLayout(nextLayoutType, capacity);
              onChange({
                seatLayoutType: nextLayoutType,
                seatLayoutRows: nextDefaults.rows,
                seatLayoutSeatsPerRow: nextDefaults.seatsPerRow,
              });
            }}
          >
            {seatLayoutOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Số hàng</span>
          <input
            type="number"
            min={minRows || 1}
            max={maxRows}
            value={normalizedRows}
            onChange={(e) => {
              const nextLayout = getSeatLayoutByRows(normalizedLayoutType, capacity, e.target.value);
              onChange({
                seatLayoutRows: nextLayout.rows,
                seatLayoutSeatsPerRow: nextLayout.seatsPerRow,
              });
            }}
          />
        </label>
        <label>
          <span>Số cột</span>
          <input
            type="number"
            min="1"
            max={maxSeatsPerRow}
            value={normalizedSeatsPerRow}
            onChange={(e) => {
              const nextLayout = getSeatLayoutByColumns(normalizedLayoutType, capacity, e.target.value);
              onChange({
                seatLayoutRows: nextLayout.rows,
                seatLayoutSeatsPerRow: nextLayout.seatsPerRow,
              });
            }}
          />
        </label>
        <span className="operator-seat-layout-summary">
          {normalizedRows} x {normalizedSeatsPerRow} x {floorMultiplier}, {previewSeats.length} ghế
        </span>
      </div>
      <SeatLayoutPreview
        layoutType={normalizedLayoutType}
        seats={previewSeats}
        rows={normalizedRows}
        seatsPerRow={normalizedSeatsPerRow}
      />
    </div>
  );
}

function SeatLayoutPreview({ layoutType, seats, rows, seatsPerRow }) {
  const floors = buildSeatLayoutFloors(layoutType, seats, rows, seatsPerRow);

  return (
    <div className={`operator-seat-map-preview ${floors.length > 1 ? 'two-floor' : ''}`}>
      {floors.map((floor) => (
        <div className="operator-seat-map-floor" key={floor.name}>
          <div className="operator-seat-map-floor-head">
            <strong>{floor.name}</strong>
            <span>{floor.seats.length} ghế</span>
          </div>
          <div className="driver-row operator-seat-map-driver">
            <i className="fa-solid fa-steering-wheel" />
            <span>Tài xế</span>
          </div>
          <div
            className="operator-seat-map-grid"
            style={{ gridTemplateColumns: `repeat(${floor.seatsPerRow}, minmax(0, 1fr))` }}
          >
            {floor.slots.map((seat, index) => (
              seat ? (
                <span className="operator-seat-map-cell" key={seat}>{seat}</span>
              ) : (
                <span className="operator-seat-map-cell empty" key={`empty-${floor.name}-${index}`} aria-label="Vị trí trống" />
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniSeatMap({ seats, seatsPerRow = 4 }) {
  const columns = Math.max(1, Math.min(10, Number(seatsPerRow || 4)));

  return (
    <div
      className="operator-mini-seat-map"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 32px))` }}
    >
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

function formatTripFilterSummary(filters) {
  const parts = [];
  if (filters.route) parts.push(`Tuyến: ${filters.route}`);
  if (filters.departureDate) {
    parts.push(`${filters.dateMode === 'week' ? 'Tuần chứa ngày' : 'Ngày'}: ${filters.departureDate}`);
  }
  if (filters.busId) parts.push(`Xe ID: ${filters.busId}`);
  if (filters.status) parts.push(`Trạng thái: ${labelTripStatus(filters.status)}`);

  return parts.length ? parts.join(' | ') : 'Chưa áp dụng bộ lọc, sẽ lấy toàn bộ danh sách chuyến.';
}

function mapTripDetailToForm(detail, tripID = pick(detail, ['tripID', 'TripID'], null)) {
  return {
    tripID,
    busID: String(pick(detail, ['busID', 'BusID'], '')),
    departureLocation: pick(detail, ['departureLocation', 'DepartureLocation'], ''),
    arrivalLocation: pick(detail, ['arrivalLocation', 'ArrivalLocation'], ''),
    departureTime: toDateTimeInput(pick(detail, ['departureTime', 'DepartureTime'])),
    arrivalTime: toDateTimeInput(pick(detail, ['arrivalTime', 'ArrivalTime'])),
    price: pick(detail, ['price', 'Price'], ''),
    availableSeats: pick(detail, ['availableSeats', 'AvailableSeats'], ''),
    status: pick(detail, ['status', 'Status'], 'Scheduled'),
    stopPoints: normalizeStops(pick(detail, ['stopPoints', 'StopPoints'], [])),
  };
}

function buildCloneDrafts(baseForms, repeatType, count) {
  const intervalDays = getCloneIntervalDays(repeatType);
  const safeCount = Math.max(1, Math.min(60, Number(count || 1)));
  const sources = Array.isArray(baseForms) ? baseForms : [baseForms];

  return Array.from({ length: safeCount }, (_, index) => {
    const dayOffset = intervalDays * (index + 1);
    return sources.map((baseForm) => ({
      ...baseForm,
      tripID: null,
      draftId: createCloneDraftId(),
      departureTime: addDaysToDateTimeInput(baseForm.departureTime, dayOffset),
      arrivalTime: addDaysToDateTimeInput(baseForm.arrivalTime, dayOffset),
      status: 'Scheduled',
      stopPoints: baseForm.stopPoints.map((stop) => ({ ...stop })),
    }));
  }).flat();
}

function createCloneDraftId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCloneIntervalDays(repeatType) {
  return repeatType === 'week' ? 7 : 1;
}

function addDaysToDateTimeInput(value, days) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + Number(days || 0));
  return toDateTimeInput(date);
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

function useModalViewportLock(isOpen) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
}

function OperatorFormModal({ title, subtitle, size = 'default', onClose, children }) {
  useModalViewportLock(true);

  const modal = (
    <div className="admin-form-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className={`admin-form-modal admin-form-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-form-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="admin-form-modal-close" type="button" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="admin-form-modal-body">{children}</div>
      </section>
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
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
  return normalizeBusTypeValue(value);
}

function getBusTypeOptions() {
  return BUS_TYPE_OPTIONS;
}

function normalizeBusTypeValue(value) {
  const text = String(value || '').trim();
  const spacedKey = normalizeText(text).replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
  const compactKey = spacedKey.replace(/\s/g, '');

  if (BUS_TYPE_LABELS[spacedKey]) return BUS_TYPE_LABELS[spacedKey];
  if (compactKey.includes('limousine')) return BUS_TYPE_LIMOUSINE;
  if (compactKey.includes('giuong') || compactKey.includes('sleeper')) return BUS_TYPE_SLEEPER;

  return BUS_TYPE_SLEEPER;
}

function isLimousineBusType(busType) {
  return normalizeBusTypeValue(busType) === BUS_TYPE_LIMOUSINE;
}

function getSeatLayoutOptions(busType) {
  if (isLimousineBusType(busType)) {
    return [{ value: LAYOUT_ONE_FLOOR, label: 'Xe Limousine' }];
  }

  return SEAT_LAYOUT_OPTIONS;
}

function getValidSeatLayoutType(busType, layoutType, capacity = 0) {
  const normalizedBusType = normalizeBusTypeValue(busType);
  if (isLimousineBusType(normalizedBusType)) return LAYOUT_ONE_FLOOR;

  const normalizedLayoutType = normalizeLayoutType(layoutType, normalizedBusType, capacity);
  return normalizedLayoutType === LAYOUT_ONE_FLOOR ? LAYOUT_ONE_FLOOR : LAYOUT_TWO_FLOORS;
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
  const layoutType = getEntityLayoutType(entity);
  const layoutConfig = getEntitySeatLayoutConfig(entity, layoutType, capacity);

  return {
    seatLayoutType: layoutType,
    seatLayoutRows: layoutConfig.rows,
    seatLayoutSeatsPerRow: layoutConfig.seatsPerRow,
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

function getEntitySeatLayoutConfig(entity, layoutType, capacity) {
  const seatMap = pick(entity, ['seatMap', 'SeatMap'], {});
  const savedRows = pick(seatMap, ['rows', 'Rows'], null);
  const savedSeatsPerRow = pick(seatMap, ['seatsPerRow', 'SeatsPerRow'], null);

  if (savedRows && !savedSeatsPerRow) {
    return getSeatLayoutByRows(layoutType, capacity, savedRows);
  }

  if (savedSeatsPerRow && !savedRows) {
    return getSeatLayoutByColumns(layoutType, capacity, savedSeatsPerRow);
  }

  return normalizeSeatLayoutDimensions(layoutType, capacity, savedSeatsPerRow, savedRows);
}

function buildSeatLayoutJson(layoutType, capacity, rows, seatsPerRow, busType = '') {
  const normalizedBusType = normalizeBusTypeValue(busType);
  const normalizedLayoutType = getValidSeatLayoutType(normalizedBusType, layoutType, capacity);
  const normalizedDimensions = normalizeSeatLayoutDimensions(normalizedLayoutType, capacity, seatsPerRow, rows);

  return JSON.stringify({
    layoutType: normalizedLayoutType,
    rows: normalizedDimensions.rows,
    seatsPerRow: normalizedDimensions.seatsPerRow,
    seats: buildSeatLabels(normalizedLayoutType, Number(capacity || 0), normalizedBusType),
  });
}

function normalizeLayoutType(value, busType = '', capacity = 0) {
  const key = normalizeText(value).replace(/[^a-z0-9]/g, '');
  const normalizedBusType = busType ? normalizeBusTypeValue(busType) : '';

  if (normalizedBusType === BUS_TYPE_LIMOUSINE) return LAYOUT_ONE_FLOOR;
  if (key === 'limousine') return LAYOUT_ONE_FLOOR;
  if (['2tang', 'haitang', 'twofloor', '2floor', 'twofloors', '2floors'].includes(key)) return LAYOUT_TWO_FLOORS;
  if (['1tang', 'mottang', 'onefloor', '1floor', 'onefloors', '1floors', 'seater', 'ghengoi'].includes(key)) return LAYOUT_ONE_FLOOR;
  if (['sleeper', 'giuongnam', 'xegiuongnam'].includes(key)) return Number(capacity) > 0 && Number(capacity) <= 24 ? LAYOUT_ONE_FLOOR : LAYOUT_TWO_FLOORS;

  return inferSeatLayoutType(busType, capacity);
}

function inferSeatLayoutType(busType, capacity = 0) {
  const key = normalizeText(busType).replace(/[^a-z0-9]/g, '');

  if (key.includes('limousine')) return LAYOUT_ONE_FLOOR;
  if (key.includes('giuong') || key.includes('sleeper') || key.includes('cabin')) {
    return Number(capacity) > 0 && Number(capacity) <= 24 ? LAYOUT_ONE_FLOOR : LAYOUT_TWO_FLOORS;
  }

  return LAYOUT_ONE_FLOOR;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDefaultSeatLayout(layoutType, capacity, seatsPerRow) {
  const seatsToArrange = getSeatsToArrange(layoutType, capacity);

  if (!seatsToArrange) {
    return {
      rows: 0,
      seatsPerRow: 0,
    };
  }

  const maxSeatsPerRow = getMaxSeatsPerRow(seatsToArrange);
  const defaultSeatsPerRow = Math.min(4, maxSeatsPerRow);
  return fitSeatLayoutByColumns(seatsToArrange, seatsPerRow, defaultSeatsPerRow);
}

function normalizeSeatLayoutDimensions(layoutType, capacity, seatsPerRow, rows) {
  const seatsToArrange = getSeatsToArrange(layoutType, capacity);

  if (!seatsToArrange) {
    return {
      rows: 0,
      seatsPerRow: 0,
    };
  }

  const maxSeatsPerRow = getMaxSeatsPerRow(seatsToArrange);
  const defaultSeatsPerRow = Math.min(4, maxSeatsPerRow);
  const defaultRows = fitSeatLayoutByColumns(seatsToArrange, seatsPerRow, defaultSeatsPerRow).rows;
  const hasRows = Number(rows) > 0;
  const hasSeatsPerRow = Number(seatsPerRow) > 0;

  if (hasRows && hasSeatsPerRow) {
    const normalizedRows = clampNumber(rows, defaultRows, getMinRowsForSeats(seatsToArrange), seatsToArrange);
    const normalizedSeatsPerRow = clampNumber(seatsPerRow, defaultSeatsPerRow, 1, maxSeatsPerRow);

    if (normalizedRows * normalizedSeatsPerRow >= seatsToArrange) {
      return {
        rows: normalizedRows,
        seatsPerRow: normalizedSeatsPerRow,
      };
    }

    return fitSeatLayoutByRows(seatsToArrange, normalizedRows, defaultRows);
  }

  if (hasRows) {
    return fitSeatLayoutByRows(seatsToArrange, rows, defaultRows);
  }

  return fitSeatLayoutByColumns(seatsToArrange, seatsPerRow, defaultSeatsPerRow);
}

function getSeatLayoutByRows(layoutType, capacity, rows) {
  const seatsToArrange = getSeatsToArrange(layoutType, capacity);
  if (!seatsToArrange) {
    return {
      rows: 0,
      seatsPerRow: 0,
    };
  }

  return fitSeatLayoutByRows(seatsToArrange, rows, getDefaultSeatLayout(layoutType, capacity).rows);
}

function getSeatLayoutByColumns(layoutType, capacity, seatsPerRow) {
  const seatsToArrange = getSeatsToArrange(layoutType, capacity);
  if (!seatsToArrange) {
    return {
      rows: 0,
      seatsPerRow: 0,
    };
  }

  return fitSeatLayoutByColumns(seatsToArrange, seatsPerRow, getDefaultSeatLayout(layoutType, capacity).seatsPerRow);
}

function getSeatsToArrange(layoutType, capacity) {
  const total = Math.max(0, Math.min(80, Number(capacity || 0)));
  return isTwoFloorLayoutType(layoutType) ? Math.ceil(total / 2) : total;
}

function getMaxSeatsPerRow(seatsToArrange) {
  return Math.max(1, Math.min(10, Number(seatsToArrange || 0)));
}

function getMinRowsForSeatLayout(layoutType, capacity) {
  const seatsToArrange = getSeatsToArrange(layoutType, capacity);
  if (!seatsToArrange) return 0;

  return getMinRowsForSeats(seatsToArrange);
}

function getMinRowsForSeats(seatsToArrange) {
  return Math.max(1, Math.ceil(seatsToArrange / getMaxSeatsPerRow(seatsToArrange)));
}

function fitSeatLayoutByRows(seatsToArrange, rows, fallbackRows) {
  const minRows = getMinRowsForSeats(seatsToArrange);
  const normalizedRows = clampNumber(rows, fallbackRows || minRows, minRows, seatsToArrange);
  const seatsPerRow = Math.ceil(seatsToArrange / normalizedRows);

  return {
    rows: normalizedRows,
    seatsPerRow: clampNumber(seatsPerRow, seatsPerRow, 1, getMaxSeatsPerRow(seatsToArrange)),
  };
}

function fitSeatLayoutByColumns(seatsToArrange, seatsPerRow, fallbackSeatsPerRow) {
  const maxSeatsPerRow = getMaxSeatsPerRow(seatsToArrange);
  const normalizedSeatsPerRow = clampNumber(seatsPerRow, fallbackSeatsPerRow || Math.min(4, maxSeatsPerRow), 1, maxSeatsPerRow);

  return {
    rows: Math.max(1, Math.ceil(seatsToArrange / normalizedSeatsPerRow)),
    seatsPerRow: normalizedSeatsPerRow,
  };
}

function getFloorMultiplier(layoutType) {
  return isTwoFloorLayoutType(layoutType) ? 2 : 1;
}

function isTwoFloorLayoutType(layoutType) {
  return normalizeLayoutType(layoutType) === LAYOUT_TWO_FLOORS;
}

function buildSeatLayoutFloors(layoutType, seats, rows, seatsPerRow) {
  const normalizedSeatsPerRow = Math.max(1, Number(seatsPerRow || 1));
  const normalizedRows = Math.max(1, Number(rows || 1));
  const normalizedSeats = (seats || []).filter(Boolean);

  if (isTwoFloorLayoutType(layoutType)) {
    const firstFloorSeats = normalizedSeats.filter((seat) => /^A/i.test(seat));
    const secondFloorSeats = normalizedSeats.filter((seat) => /^B/i.test(seat));

    if (firstFloorSeats.length + secondFloorSeats.length === normalizedSeats.length) {
      return [
        buildSeatLayoutFloor('Tầng 1', firstFloorSeats, normalizedRows, normalizedSeatsPerRow),
        buildSeatLayoutFloor('Tầng 2', secondFloorSeats, normalizedRows, normalizedSeatsPerRow),
      ];
    }

    const half = Math.ceil(normalizedSeats.length / 2);
    return [
      buildSeatLayoutFloor('Tầng 1', normalizedSeats.slice(0, half), normalizedRows, normalizedSeatsPerRow),
      buildSeatLayoutFloor('Tầng 2', normalizedSeats.slice(half), normalizedRows, normalizedSeatsPerRow),
    ];
  }

  return [
    buildSeatLayoutFloor('Sơ đồ ghế', normalizedSeats, normalizedRows, normalizedSeatsPerRow),
  ];
}

function buildSeatLayoutFloor(name, seats, rows, seatsPerRow) {
  const normalizedSeatsPerRow = Math.max(1, Number(seatsPerRow || 1));
  const minimumRows = Math.max(1, Math.ceil(seats.length / normalizedSeatsPerRow));
  const normalizedRows = Math.max(minimumRows, Math.min(Math.max(1, Number(rows || minimumRows)), Math.max(1, seats.length)));

  return {
    name,
    seats,
    seatsPerRow: normalizedSeatsPerRow,
    slots: buildSeatSlots(seats, normalizedRows, normalizedSeatsPerRow),
  };
}

function buildSeatSlots(seats, rows, seatsPerRow) {
  const slotCount = Math.max(seats.length, rows * seatsPerRow);
  const slots = Array.from({ length: slotCount }, () => null);

  if (rows <= Math.ceil(seats.length / seatsPerRow)) {
    seats.forEach((seat, index) => {
      slots[index] = seat;
    });
    return slots;
  }

  seats.forEach((seat, index) => {
    const rowIndex = index % rows;
    const columnIndex = Math.floor(index / rows);
    const slotIndex = rowIndex * seatsPerRow + columnIndex;
    slots[slotIndex] = seat;
  });

  return slots;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  const fallbackNumber = Number(fallback || 0);
  const normalizedMin = Number(min || 0);
  const normalizedMax = Math.max(normalizedMin, Number(max || normalizedMin));

  if (!Number.isFinite(number)) {
    return Number.isFinite(fallbackNumber)
      ? Math.min(normalizedMax, Math.max(normalizedMin, Math.floor(fallbackNumber)))
      : normalizedMin;
  }

  return Math.min(normalizedMax, Math.max(normalizedMin, Math.floor(number)));
}

function buildSeatLabels(layoutType, capacity, busType = '') {
  const total = Math.max(0, Math.min(80, Number(capacity || 0)));
  if (!total) return [];

  if (layoutType === LAYOUT_TWO_FLOORS) {
    const firstFloorCount = Math.ceil(total / 2);
    const secondFloorCount = total - firstFloorCount;
    return [
      ...Array.from({ length: firstFloorCount }, (_, index) => `A${String(index + 1).padStart(2, '0')}`),
      ...Array.from({ length: secondFloorCount }, (_, index) => `B${String(index + 1).padStart(2, '0')}`),
    ];
  }

  const prefix = isLimousineBusType(busType) ? 'L' : 'G';
  return Array.from({ length: total }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);
}
