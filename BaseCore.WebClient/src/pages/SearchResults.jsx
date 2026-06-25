import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { API_BASE, formatVND, pick } from '../api';
import { tripApi } from '../services/tripApi';
import { reviewApi } from '../services/reviewApi';
import { promotionApi } from '../services/promotionApi';
import { busApi } from '../services/busApi';

const PAGE_SIZE = 10;
const LAST_SEARCH_KEY = 'lastTripSearchQuery';
const ROUND_TRIP_KEY = 'roundTripBooking';

const timeRanges = [
  { value: '', label: 'Tất cả' },
  { value: '00:00-05:59', label: '00:00 - 05:59' },
  { value: '06:00-11:59', label: '06:00 - 11:59' },
  { value: '12:00-17:59', label: '12:00 - 17:59' },
  { value: '18:00-23:59', label: '18:00 - 23:59' },
];

const busTypes = ['', 'Ghế ngồi', 'Giường nằm', 'Limousine'];

const AMENITY_ICONS = {
  wifi:    { icon: 'fa-wifi',         label: 'WiFi' },
  water:   { icon: 'fa-bottle-water', label: 'Nước uống' },
  charger: { icon: 'fa-plug',         label: 'Cổng sạc' },
  ac:      { icon: 'fa-snowflake',    label: 'Điều hòa' },
  usb:     { icon: 'fa-usb',          label: 'USB' },
  blanket: { icon: 'fa-bed',          label: 'Chăn mền' },
  tv:      { icon: 'fa-tv',           label: 'TV/Màn hình' },
};

const sortOptions = [
  { value: '', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'departure_asc', label: 'Giờ xuất phát sớm nhất' },
  { value: 'departure_desc', label: 'Giờ xuất phát muộn nhất' },
];

const DETAIL_TABS = [
  { key: 'pickup',   label: 'Đón/trả' },
  { key: 'discount', label: 'Giảm giá' },
  { key: 'review',   label: 'Đánh giá' },
  { key: 'policy',   label: 'Chính sách' },
  { key: 'images',   label: 'Hình ảnh' },
];

function normalizeStops(response) {
  const pickupStops  = response?.pickupStops  || response?.PickupStops  || [];
  const dropoffStops = response?.dropoffStops || response?.DropoffStops || [];
  const items        = response?.items        || response?.Items        || [];
  return {
    pickupStops: pickupStops.length
      ? pickupStops
      : items.filter((s) => { const t = Number(pick(s, ['stopType', 'StopType'])); return t === 1 || t === 3; }),
    dropoffStops: dropoffStops.length
      ? dropoffStops
      : items.filter((s) => { const t = Number(pick(s, ['stopType', 'StopType'])); return t === 2 || t === 3; }),
  };
}

function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatReviewDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatDateLabel(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

// function LocationPicker({ label, value, onChange, options, icon, accentClass, placeholder }) {
//   const [open, setOpen] = useState(false);
//   const [isTyping, setIsTyping] = useState(false);
//   const filteredOptions = useMemo(() => {
//     const keyword = isTyping ? normalizeText(value) : '';
//     const source = keyword
//       ? options.filter((item) => normalizeText(item).includes(keyword))
//       : options;
//     return source.slice(0, 12);
//   }, [isTyping, options, value]);

//   const selectLocation = (location) => {
//     onChange(location);
//     setIsTyping(false);
//     setOpen(false);
//   };

//   return (
//     <div className={`home-location-picker ${open ? 'open' : ''}`}>
//       <i className={`fa-solid ${icon} ${accentClass}`} />
//       <label>
//         <span>{label}</span>
//         <input
//           value={value}
//           placeholder={placeholder}
//           onFocus={() => {
//             setIsTyping(false);
//             setOpen(true);
//           }}
//           onChange={(event) => {
//             onChange(event.target.value);
//             setIsTyping(true);
//             setOpen(true);
//           }}
//           onBlur={() => window.setTimeout(() => {
//             setIsTyping(false);
//             setOpen(false);
//           }, 120)}
//         />
//       </label>

//       {open && (
//         <div className="home-location-menu">
//           <strong>Địa điểm phổ biến</strong>
//           {filteredOptions.length > 0 ? (
//             filteredOptions.map((location) => (
//               <button
//                 type="button"
//                 key={location}
//                 onMouseDown={(event) => event.preventDefault()}
//                 onClick={() => selectLocation(location)}
//               >
//                 <i className="fa-solid fa-location-dot" />
//                 <span>{location}</span>
//               </button>
//             ))
//           ) : (
//             <p>Không có gợi ý phù hợp. Bạn có thể nhập tay.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
function LocationPicker({ label, value, onChange, options, icon, accentClass, placeholder }) {
  const [open, setOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const filteredOptions = useMemo(() => {
    const keyword = isTyping ? normalizeText(value) : '';
    const source = keyword
      ? options.filter((item) => normalizeText(item).includes(keyword))
      : options;
    return source.slice(0, 12);
  }, [isTyping, options, value]);

  const selectLocation = (location) => {
    onChange(location);
    setIsTyping(false);
    setOpen(false);
  };

  return (
    <div className={`home-location-picker ${open ? 'open' : ''}`}>
      <i className={`fa-solid ${icon} ${accentClass}`} />
      <label>
        <span>{label}</span>
        <input
          value={value}
          placeholder={placeholder}
          onFocus={() => {
            setIsTyping(false);
            setOpen(true);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsTyping(true);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => {
            setIsTyping(false);
            setOpen(false);
          }, 120)}
        />
      </label>

      {open && (
        <div className="home-location-menu">
          <strong>Địa điểm phổ biến</strong>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((location) => (
              <button
                type="button"
                key={location}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectLocation(location)}
              >
                <i className="fa-solid fa-location-dot" />
                <span>{location}</span>
              </button>
            ))
          ) : (
            <p>Không có gợi ý phù hợp. Bạn có thể nhập tay.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DatePickerField({ label, value, min, onChange, icon, emptyText }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
  };

  return (
    <button type="button" className="home-date-field" onClick={openPicker}>
      <i className={`fa-solid ${icon}`} />
      <span>{label}</span>
      <strong>{value ? formatDateLabel(value) : emptyText}</strong>
      <input
        ref={inputRef}
        type="date"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      />
    </button>
  );
}

function parseItems(response) {
  if (Array.isArray(response)) {
    return {
      items: response,
      totalCount: response.length,
      page: 1,
      pageSize: response.length || PAGE_SIZE,
      totalPages: 1,
    };
  }

  const items = response?.items || response?.data || [];
  return {
    items,
    totalCount: response?.totalCount ?? response?.total ?? items.length,
    page: response?.page ?? 1,
    pageSize: response?.pageSize ?? PAGE_SIZE,
    totalPages: response?.totalPages ?? 1,
  };
}

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewModal, setReviewModal] = useState({
    open: false,
    loading: false,
    title: '',
    subtitle: '',
    items: [],
    averageRating: 0,
    reviewCount: 0,
    error: '',
  });
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [activeTab, setActiveTab] = useState('pickup');
  const [tripDetailData, setTripDetailData] = useState({});
  const [tripDetailLoading, setTripDetailLoading] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);
  const today = useMemo(() => getToday(), []);
  // const [locations, setLocations] = useState([]);
  const [departureOptions, setDepartureOptions] = useState([]);
const [arrivalOptions, setArrivalOptions] = useState([]);

  const [filters, setFilters] = useState({
    busType: searchParams.get('busType') || '',
    departureTimeRange: searchParams.get('departureTimeRange') || '',
    arrivalTimeRange: searchParams.get('arrivalTimeRange') || '',
    operatorId: searchParams.get('operatorId') || '',
    operatorIds: searchParams.get('operatorIds') || '',
    pickupStopId: searchParams.get('pickupStopId') || '',
    dropoffStopId: searchParams.get('dropoffStopId') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || '',
  });

  const [operators, setOperators] = useState([]);
  const [operatorSearch, setOperatorSearch] = useState('');

  const baseQuery = useMemo(() => ({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    departureDate: searchParams.get('departureDate') || searchParams.get('date') || '',
    returnDate: searchParams.get('returnDate') || '',
  }), [searchParams]);
  const roundTripStage = searchParams.get('roundTripStage') || '';

  const [searchForm, setSearchForm] = useState({
    from: '',
    to: '',
    departureDate: today,
    isRoundTrip: false,
    returnDate: '',
  });

  // const locationOptions = useMemo(() => {
  //   return Array.from(new Set(
  //     locations
  //       .map((item) => String(item || '').trim())
  //       .filter(Boolean)
  //   )).sort((a, b) => a.localeCompare(b, 'vi'));
  // }, [locations]);

  const page = Number(searchParams.get('page') || 1);

  // useEffect(() => {
  //   fetch(`${API_BASE}/api/trips/locations`)
  //     .then((response) => (response.ok ? response.json() : []))
  //     .then((data) => setLocations(Array.isArray(data) ? data : []))
  //     .catch(() => setLocations([]));
  // }, []);
  useEffect(() => {
  fetch(`${API_BASE}/api/trips/locations`)
    .then((response) => response.json())
    .then((data) => {
      setDepartureOptions(data.departures || []);
      setArrivalOptions(data.arrivals || []);
    })
    .catch(() => {
      setDepartureOptions([]);
      setArrivalOptions([]);
    });
}, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/operators/public`)
      .then((r) => r.json())
      .then((data) => setOperators(Array.isArray(data) ? data : []))
      .catch(() => setOperators([]));
  }, []);

  useEffect(() => {
    setSearchForm({
      from: baseQuery.from,
      to: baseQuery.to,
      departureDate: baseQuery.departureDate || today,
      isRoundTrip: Boolean(baseQuery.returnDate),
      returnDate: baseQuery.returnDate,
    });
  }, [baseQuery, today]);

  useEffect(() => {
    if (roundTripStage === 'return') return;

    if (baseQuery.from || baseQuery.to || baseQuery.departureDate || baseQuery.returnDate) {
      const storedQuery = new URLSearchParams();
      if (baseQuery.from) storedQuery.set('from', baseQuery.from);
      if (baseQuery.to) storedQuery.set('to', baseQuery.to);
      if (baseQuery.departureDate) storedQuery.set('departureDate', baseQuery.departureDate);
      if (baseQuery.returnDate) storedQuery.set('returnDate', baseQuery.returnDate);
      localStorage.setItem(LAST_SEARCH_KEY, storedQuery.toString());
    }
  }, [baseQuery, roundTripStage]);

  // useEffect(() => {
  //   const load = async () => {
  //     setLoading(true);
  //     setError('');

  //     try {
  //       const params = {
  //         ...baseQuery,
  //         ...filters,
  //         page,
  //         pageSize: PAGE_SIZE,
  //       };

  //       Object.keys(params).forEach((key) => {
  //         if (params[key] === '' || params[key] == null) delete params[key];
  //       });

  //       const response = await tripApi.search(params);
  //       const result = parseItems(response);
  //       setItems(result.items);
  //       setPagination(result);
  //     } catch (err) {
  //       setError(err.message || 'Không thể tải danh sách chuyến xe.');
  //       setItems([]);
  //       setPagination({ totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 });
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   load();
  // }, [baseQuery, filters, page]);
useEffect(() => {
  const load = async () => {
    // ← Thêm guard này
    if (!baseQuery.from || !baseQuery.to || !baseQuery.departureDate) {
      setItems([]);
      setPagination({ totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = {
        ...baseQuery,
        ...filters,
        page,
        pageSize: PAGE_SIZE,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] == null) delete params[key];
      });

      const response = await tripApi.search(params);
      const result = parseItems(response);
      setItems(result.items);
      setPagination(result);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách chuyến xe.');
      setItems([]);
      setPagination({ totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  load();
}, [baseQuery, filters, page]);
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const toggleOperator = (id) => {
    const current = filters.operatorIds ? filters.operatorIds.split(',').map(Number).filter(Boolean) : [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updateFilter('operatorIds', next.join(','));
  };

  const selectedOpIds = filters.operatorIds ? filters.operatorIds.split(',').map(Number).filter(Boolean) : [];

  const goToPage = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };

  const chooseTrip = (trip) => {
    const id = pick(trip, ['tripID', 'tripId', 'TripID', 'id', 'Id']);
    if (!id) return;

    if (baseQuery.returnDate && roundTripStage !== 'return') {
      localStorage.setItem(ROUND_TRIP_KEY, JSON.stringify({
        from: baseQuery.from,
        to: baseQuery.to,
        departureDate: baseQuery.departureDate,
        returnDate: baseQuery.returnDate,
        stage: 'outbound',
      }));
    } else if (roundTripStage === 'return') {
      try {
        const current = JSON.parse(localStorage.getItem(ROUND_TRIP_KEY) || 'null') || {};
        localStorage.setItem(ROUND_TRIP_KEY, JSON.stringify({
          ...current,
          stage: 'return',
        }));
      } catch {
        localStorage.removeItem(ROUND_TRIP_KEY);
      }
    } else {
      localStorage.removeItem(ROUND_TRIP_KEY);
    }

    navigate(`/trips/${id}/seats`);
  };

  const openReviewModal = async ({ id, title, subtitle }) => {
    if (!id) return;
    setReviewModal({
      open: true,
      loading: true,
      title,
      subtitle,
      items: [],
      averageRating: 0,
      reviewCount: 0,
      error: '',
    });

    try {
      const data = await reviewApi.byOperator(id);
      setReviewModal({
        open: true,
        loading: false,
        title,
        subtitle,
        items: data?.items || data?.Items || [],
        averageRating: Number(data?.averageRating ?? data?.AverageRating ?? 0),
        reviewCount: Number(data?.reviewCount ?? data?.ReviewCount ?? 0),
        error: '',
      });
    } catch (err) {
      setReviewModal((current) => ({
        ...current,
        loading: false,
        error: err.message || 'Không tải được đánh giá.',
      }));
    }
  };

  const closeReviewModal = () => {
    setReviewModal((current) => ({ ...current, open: false }));
  };

  const loadTripDetail = async (tripId, tabKey, trip) => {
    if (tabKey === 'policy') return;
    const cacheKey = `${tripId}_${tabKey}`;
    if (tripDetailData[cacheKey] !== undefined) return;

    setTripDetailLoading((prev) => ({ ...prev, [cacheKey]: true }));
    try {
      let data;
      if (tabKey === 'pickup') {
        const response = await tripApi.getStops(tripId);
        data = normalizeStops(response);
      } else if (tabKey === 'review') {
        const operatorId = pick(trip, ['operatorID', 'operatorId', 'OperatorID']);
        data = await reviewApi.byOperator(operatorId);
      } else if (tabKey === 'discount') {
        const response = await promotionApi.publicList();
        data = Array.isArray(response) ? response : (response?.items || response?.Items || []);
      } else if (tabKey === 'images') {
        const busId = pick(trip, ['busID', 'busId', 'BusID']);
        if (busId) {
          const response = await busApi.getImages(busId);
          data = Array.isArray(response) ? response : (response?.items || response?.Items || []);
        } else {
          data = [];
        }
      }
      setTripDetailData((prev) => ({ ...prev, [cacheKey]: data }));
    } catch {
      setTripDetailData((prev) => ({ ...prev, [cacheKey]: null }));
    } finally {
      setTripDetailLoading((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  const toggleTripDetail = (tripId, trip) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
    } else {
      setExpandedTripId(tripId);
      setActiveTab('pickup');
      loadTripDetail(tripId, 'pickup', trip);
    }
  };

  const switchDetailTab = (tabKey, tripId, trip) => {
    setActiveTab(tabKey);
    loadTripDetail(tripId, tabKey, trip);
  };

  const updateSearchForm = (key, value) => {
    setError('');
    setSearchForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'isRoundTrip' && !value) next.returnDate = '';
      return next;
    });
  };

  const swapLocations = () => {
    setSearchForm((current) => ({
      ...current,
      from: current.to,
      to: current.from,
    }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const from = searchForm.from.trim();
    const to = searchForm.to.trim();

    if (!from) {
      setError('Vui lòng chọn điểm xuất phát.');
      return;
    }
    if (!to) {
      setError('Vui lòng chọn điểm đến.');
      return;
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      setError('Điểm xuất phát không được trùng điểm đến.');
      return;
    }
    if (!searchForm.departureDate || searchForm.departureDate < today) {
      setError('Ngày đi không được nhỏ hơn ngày hiện tại.');
      return;
    }
    if (searchForm.isRoundTrip && (!searchForm.returnDate || searchForm.returnDate < searchForm.departureDate)) {
      setError('Ngày về phải lớn hơn hoặc bằng ngày đi.');
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('from', from);
    next.set('to', to);
    next.set('departureDate', searchForm.departureDate);
    if (searchForm.isRoundTrip && searchForm.returnDate) next.set('returnDate', searchForm.returnDate);
    else next.delete('returnDate');
    next.set('page', '1');

    const storedQuery = new URLSearchParams();
    storedQuery.set('from', from);
    storedQuery.set('to', to);
    storedQuery.set('departureDate', searchForm.departureDate);
    if (searchForm.isRoundTrip && searchForm.returnDate) storedQuery.set('returnDate', searchForm.returnDate);
    if (roundTripStage !== 'return') {
      localStorage.setItem(LAST_SEARCH_KEY, storedQuery.toString());
    }

    setSearchParams(next);
  };

  return (
    <UserLayout>
      <section className="search-results-searchbar">
        <div className="container">
          <form className="featured-search modern-home-search" onSubmit={submitSearch}>
            <div className="home-search-widget">
              {/* <LocationPicker
                label="Nơi xuất phát"
                value={searchForm.from}
                onChange={(value) => updateSearchForm('from', value)}
                options={locationOptions}
                icon="fa-circle-dot"
                accentClass="from"
                placeholder="Chọn điểm đi"
              /> */}
              <LocationPicker
                label="Nơi xuất phát"
                value={searchForm.from}
                onChange={(value) => updateSearchForm('from', value)}
                options={departureOptions}   // ← đổi từ locationOptions
                icon="fa-circle-dot"
                accentClass="from"
                placeholder="Chọn điểm đi"
              />

              <button
                type="button"
                className="home-swap-button"
                onClick={swapLocations}
                aria-label="Đổi điểm đi và điểm đến"
              >
                <i className="fa-solid fa-right-left" />
              </button>

              {/* <LocationPicker
                label="Nơi đến"
                value={searchForm.to}
                onChange={(value) => updateSearchForm('to', value)}
                options={locationOptions}
                icon="fa-location-dot"
                accentClass="to"
                placeholder="Chọn điểm đến"
              /> */}
              <LocationPicker
                label="Nơi đến"
                value={searchForm.to}
                onChange={(value) => updateSearchForm('to', value)}
                options={arrivalOptions}     // ← đổi từ locationOptions
                icon="fa-location-dot"
                accentClass="to"
                placeholder="Chọn điểm đến"
              />

              <DatePickerField
                label="Ngày đi"
                value={searchForm.departureDate}
                min={today}
                onChange={(value) => updateSearchForm('departureDate', value)}
                icon="fa-calendar-days"
                emptyText="Chọn ngày đi"
              />

              {searchForm.isRoundTrip ? (
                <DatePickerField
                  label="Ngày về"
                  value={searchForm.returnDate}
                  min={searchForm.departureDate || today}
                  onChange={(value) => updateSearchForm('returnDate', value)}
                  icon="fa-calendar-plus"
                  emptyText="Chọn ngày về"
                />
              ) : (
                <button
                  type="button"
                  className="home-return-button"
                  onClick={() => updateSearchForm('isRoundTrip', true)}
                >
                  <i className="fa-solid fa-plus" />
                  Thêm ngày về
                </button>
              )}

              <button type="submit" className="home-search-button">
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </section>
      <section className="search-results-hero">
        <div className="container">
          <span>Kết quả tìm kiếm</span>
          <h1>{baseQuery.from || 'Điểm đi'} → {baseQuery.to || 'Điểm đến'}</h1>
          <p>
            Ngày đi {baseQuery.departureDate ? formatDate(baseQuery.departureDate) : '--'}
            {baseQuery.returnDate ? ` · Ngày về ${formatDate(baseQuery.returnDate)}` : ''}
          </p>
        </div>
      </section>

      <section className="container search-results-layout-v2">
        <aside className="search-filter-panel">
          <div className="filter-panel-head">
            <h2>Bộ lọc</h2>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  busType: '',
                  departureTimeRange: '',
                  arrivalTimeRange: '',
                  operatorId: '',
                  operatorIds: '',
                  pickupStopId: '',
                  dropoffStopId: '',
                  minPrice: '',
                  maxPrice: '',
                  sortBy: filters.sortBy,
                });
                setOperatorSearch('');
                const next = new URLSearchParams(searchParams);
                ['busType', 'departureTimeRange', 'arrivalTimeRange', 'operatorId', 'operatorIds', 'pickupStopId', 'dropoffStopId', 'minPrice', 'maxPrice'].forEach((key) => next.delete(key));
                next.set('page', '1');
                setSearchParams(next);
              }}
            >
              Xóa lọc
            </button>
          </div>

          <label className="filter-control">
            <span>Loại xe</span>
            <select value={filters.busType} onChange={(event) => updateFilter('busType', event.target.value)}>
              {busTypes.map((type) => (
                <option key={type || 'all'} value={type}>{type || 'Tất cả'}</option>
              ))}
            </select>
          </label>

          <label className="filter-control">
            <span>Giờ xuất phát</span>
            <select value={filters.departureTimeRange} onChange={(event) => updateFilter('departureTimeRange', event.target.value)}>
              {timeRanges.map((range) => <option key={range.value || 'all'} value={range.value}>{range.label}</option>)}
            </select>
          </label>

          <label className="filter-control">
            <span>Giờ đến</span>
            <select value={filters.arrivalTimeRange} onChange={(event) => updateFilter('arrivalTimeRange', event.target.value)}>
              {timeRanges.map((range) => <option key={range.value || 'all'} value={range.value}>{range.label}</option>)}
            </select>
          </label>

          <div className="filter-control">
            <span>Khoảng giá</span>
            <div className="price-filter-row">
              <input
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(event) => updateFilter('minPrice', event.target.value)}
                placeholder="Từ"
              />
              <input
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(event) => updateFilter('maxPrice', event.target.value)}
                placeholder="Đến"
              />
            </div>
          </div>

          {operators.length > 0 && (
            <div className="filter-control filter-operator-group">
              <span>Nhà xe</span>
              <div className="filter-operator-search">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                  type="text"
                  placeholder="Tìm trong danh sách"
                  value={operatorSearch}
                  onChange={(e) => setOperatorSearch(e.target.value)}
                />
              </div>
              <div className="filter-operator-list">
                {operators
                  .filter((op) => pick(op, ['name', 'Name'], '').toLowerCase().includes(operatorSearch.toLowerCase()))
                  .map((op) => {
                    const id = pick(op, ['operatorID', 'OperatorID', 'id']);
                    const name = pick(op, ['name', 'Name'], 'Nhà xe');
                    const rating = Number(pick(op, ['averageRating', 'AverageRating', 'rating']) || 0);
                    const reviewCount = Number(pick(op, ['reviewCount', 'ReviewCount', 'totalReviews']) || 0);
                    const checked = selectedOpIds.includes(Number(id));
                    return (
                      <label key={id} className={`filter-operator-item ${checked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOperator(Number(id))}
                        />
                        <span className="filter-op-info">
                          <span className="filter-op-name">{name}</span>
                          {rating > 0 ? (
                            <span className="filter-op-rating">
                              <span className="stars">{rating.toFixed(1)}</span>
                              <i className="fa-solid fa-star" />
                              {reviewCount > 0 && <span className="count">({reviewCount})</span>}
                            </span>
                          ) : (
                            <span className="filter-op-no-rating">Chưa có đánh giá</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </aside>

        <main className="search-results-main">
          <div className="search-results-toolbar">
            <div>
              <strong>{pagination.totalCount}</strong> chuyến phù hợp
            </div>
            <label>
              <span>Sắp xếp</span>
              <select value={filters.sortBy} onChange={(event) => updateFilter('sortBy', event.target.value)}>
                {sortOptions.map((option) => (
                  <option key={option.value || 'default'} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {loading && <div className="loading">Đang tải chuyến xe...</div>}

          {!loading && !error && items.length === 0 && (
            <div className="empty-state">
              <i className="fa-solid fa-route" />
              <h3>Không tìm thấy chuyến phù hợp</h3>
              <p>Hãy thử đổi bộ lọc hoặc chọn ngày đi khác.</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="trip-result-list">
              {items.map((trip) => {
                const tripId = pick(trip, ['tripID', 'tripId', 'TripID', 'id', 'Id']);
                const operatorName = pick(trip, ['operatorName', 'OperatorName'], 'Nhà xe');
                const operatorImageUrl = pick(trip, ['operatorImageUrl', 'OperatorImageUrl'], '');
                const departureTime = pick(trip, ['departureTime', 'DepartureTime']);
                const arrivalTime = pick(trip, ['arrivalTime', 'ArrivalTime']);
                const operatorId = pick(trip, ['operatorID', 'operatorId', 'OperatorID']);
                const averageRating = Number(pick(trip, ['averageRating', 'AverageRating'], 0));
                const reviewCount = Number(pick(trip, ['reviewCount', 'ReviewCount'], 0));

                return (
                  <article
                    className={`trip-result-card${expandedTripId === tripId ? ' trip-result-card--expanded' : ''}`}
                    key={tripId || `${operatorName}-${departureTime}`}
                  >
                    <div className="operator-avatar">
                      {operatorImageUrl ? (
                        <img src={operatorImageUrl} alt={operatorName} />
                      ) : (
                        <i className="fa-solid fa-bus" />
                      )}
                    </div>

                    <div className="trip-result-body">
                      <div className="trip-result-title">
                        <div>
                          <h2
                            style={{ cursor: operatorId ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            onClick={() => operatorId && navigate(`/nha-xe/${operatorId}`)}
                            title={operatorId ? `Xem thông tin ${operatorName}` : ''}
                          >
                            {operatorName}
                            {operatorId && <i className="fa-solid fa-circle-info" style={{ fontSize: 13, color: '#93c5fd' }} />}
                          </h2>
                          <p>{pick(trip, ['busType', 'BusType'], 'Xe khách')}</p>
                          {(() => {
                            const raw = pick(trip, ['amenities', 'Amenities'], '');
                            const list = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
                            if (!list.length) return null;
                            return (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                {list.map(key => {
                                  const a = AMENITY_ICONS[key];
                                  return a ? (
                                    <span key={key} title={a.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', borderRadius: 12, padding: '2px 8px' }}>
                                      <i className={`fa-solid ${a.icon}`} style={{ color: '#2563eb' }} />
                                      {a.label}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            className="trip-rating-line"
                            disabled={!operatorId || reviewCount <= 0}
                            // onClick={() => openReviewModal({
                            //   id: operatorId,
                            //   title: `Đánh giá nhà xe ${operatorName}`,
                            //   subtitle: `${averageRating.toFixed(1)} ★ | ${reviewCount} đánh giá`,
                            // })}
                          >
                            {reviewCount > 0 ? `Nhà xe ${averageRating.toFixed(1)} ★ | ${reviewCount} đánh giá` : 'Nhà xe chưa có đánh giá'}
                          </button>
                        </div>
                        <span>{pick(trip, ['availableSeats', 'AvailableSeats'], 0)} ghế còn</span>
                      </div>

                      <div className="trip-time-row">
                        <div>
                          <strong>{formatTime(departureTime)}</strong>
                          <span>{formatDate(departureTime)}</span>
                          <p>{pick(trip, ['departureLocation', 'DepartureLocation'])}</p>
                        </div>
                        <div className="trip-line" />
                        <div>
                          <strong>{formatTime(arrivalTime)}</strong>
                          <span>{formatDate(arrivalTime)}</span>
                          <p>{pick(trip, ['arrivalLocation', 'ArrivalLocation'])}</p>
                        </div>
                      </div>
                    </div>

                    <div className="trip-result-action">
                      <strong>{formatVND(pick(trip, ['price', 'Price'], 0))}</strong>
                      <button className="btn btn-primary" type="button" onClick={() => chooseTrip(trip)}>
                        Chọn chuyến
                      </button>
                      <button
                        type="button"
                        className={`trip-detail-toggle-btn${expandedTripId === tripId ? ' active' : ''}`}
                        onClick={() => toggleTripDetail(tripId, trip)}
                      >
                        Thông tin chi tiết
                        <i className={`fa-solid fa-chevron-${expandedTripId === tripId ? 'up' : 'down'}`} />
                      </button>
                    </div>

                    {expandedTripId === tripId && (
                      <div className="trip-detail-panel">
                        {/* ── Tab bar ── */}
                        <div className="trip-detail-tabs">
                          {DETAIL_TABS.map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              className={`trip-detail-tab-btn${activeTab === tab.key ? ' active' : ''}`}
                              onClick={() => switchDetailTab(tab.key, tripId, trip)}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* ── Tab content ── */}
                        <div className="trip-detail-content">

                          {/* Đón / Trả */}
                          {activeTab === 'pickup' && (() => {
                            const ck = `${tripId}_pickup`;
                            if (tripDetailLoading[ck]) return <div className="td-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div>;
                            const data = tripDetailData[ck];
                            if (!data) return <div className="td-empty">Không tải được điểm đón/trả.</div>;
                            const { pickupStops, dropoffStops } = data;
                            return (
                              <div className="td-pickup-grid">
                                <div className="td-stops-col">
                                  <div className="td-stops-head"><i className="fa-solid fa-circle-dot" /> Điểm đón</div>
                                  {pickupStops.length === 0
                                    ? <p className="td-no-stops">Chưa có điểm đón.</p>
                                    : pickupStops.map((stop) => {
                                        const sid = pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']);
                                        const name = pick(stop, ['stopName', 'StopName'], 'Điểm dừng');
                                        const addr = pick(stop, ['stopAddress', 'StopAddress'], '');
                                        const offset = pick(stop, ['arrivalOffset', 'ArrivalOffset']);
                                        return (
                                          <div key={sid} className="td-stop-item">
                                            <i className="fa-solid fa-circle td-dot-blue" />
                                            <div>
                                              <strong>{name}</strong>
                                              {addr && <small>{addr}</small>}
                                              {offset != null && <span>+{offset} phút so với giờ khởi hành</span>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                </div>
                                <div className="td-stops-col">
                                  <div className="td-stops-head"><i className="fa-solid fa-location-dot" /> Điểm trả</div>
                                  {dropoffStops.length === 0
                                    ? <p className="td-no-stops">Chưa có điểm trả.</p>
                                    : dropoffStops.map((stop) => {
                                        const sid = pick(stop, ['stopPointID', 'StopPointID', 'id', 'Id']);
                                        const name = pick(stop, ['stopName', 'StopName'], 'Điểm dừng');
                                        const addr = pick(stop, ['stopAddress', 'StopAddress'], '');
                                        const offset = pick(stop, ['arrivalOffset', 'ArrivalOffset']);
                                        return (
                                          <div key={sid} className="td-stop-item">
                                            <i className="fa-solid fa-circle td-dot-orange" />
                                            <div>
                                              <strong>{name}</strong>
                                              {addr && <small>{addr}</small>}
                                              {offset != null && <span>+{offset} phút so với giờ khởi hành</span>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Giảm giá */}
                          {activeTab === 'discount' && (() => {
                            const ck = `${tripId}_discount`;
                            if (tripDetailLoading[ck]) return <div className="td-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div>;
                            const data = tripDetailData[ck];
                            if (!data || data.length === 0) return <div className="td-empty">Không có mã giảm giá.</div>;
                            return (
                              <div className="td-discount-list">
                                {data.map((promo) => {
                                  const code = pick(promo, ['code', 'Code'], '');
                                  const discountType = pick(promo, ['discountType', 'DiscountType'], 'fixed');
                                  const discountValue = Number(pick(promo, ['discountValue', 'DiscountValue', 'value', 'Value'], 0));
                                  const maxDiscount = Number(pick(promo, ['maxDiscount', 'MaxDiscount'], 0));
                                  const minOrderAmount = Number(pick(promo, ['minOrderAmount', 'MinOrderAmount'], 0));
                                  const usageLimit = Number(pick(promo, ['usageLimit', 'UsageLimit'], 0));
                                  const usedCount = Number(pick(promo, ['usedCount', 'UsedCount'], 0));
                                  const expiryDate = pick(promo, ['expiryDate', 'ExpiryDate', 'endDate', 'EndDate']);
                                  const description = pick(promo, ['description', 'Description'], '');
                                  const remaining = usageLimit > 0 ? usageLimit - usedCount : null;
                                  const isPercent = String(discountType).toLowerCase().includes('percent');
                                  const discountText = isPercent
                                    ? `Giảm ${discountValue}%${maxDiscount > 0 ? ` (tối đa ${formatVND(maxDiscount)})` : ''}`
                                    : `Giảm ${formatVND(discountValue)}`;
                                  const promoId = pick(promo, ['promotionID', 'PromotionID', 'id', 'Id']);
                                  return (
                                    <div key={promoId || code} className="td-promo-card">
                                      <div className="td-promo-code">{code}</div>
                                      <div className="td-promo-discount">{discountText}</div>
                                      {description && <div className="td-promo-desc">{description}</div>}
                                      <div className="td-promo-meta">
                                        {minOrderAmount > 0 && <span>Đơn từ {formatVND(minOrderAmount)}</span>}
                                        {remaining !== null && remaining > 0 && <span>Còn {remaining} lượt</span>}
                                        {expiryDate && <span>Hết hạn {formatDate(expiryDate)}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Đánh giá */}
                          {activeTab === 'review' && (() => {
                            const ck = `${tripId}_review`;
                            if (tripDetailLoading[ck]) return <div className="td-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div>;
                            const data = tripDetailData[ck];
                            const avgRating = Number(data?.averageRating ?? data?.AverageRating ?? 0);
                            const reviewItems = data?.items || data?.Items || [];
                            if (!data || reviewItems.length === 0) return <div className="td-empty"><i className="fa-regular fa-star" /> Chưa có đánh giá.</div>;
                            return (
                              <div className="td-review-section">
                                <div className="td-review-header">
                                  <span className="td-avg-rating">{avgRating.toFixed(1)}</span>
                                  <i className="fa-solid fa-star td-star-icon" />
                                  <span className="td-review-count">{reviewItems.length} đánh giá</span>
                                </div>
                                <div className="td-review-list">
                                  {reviewItems.map((item) => {
                                    const rating = Number(pick(item, ['rating', 'Rating'], 0));
                                    const rid = pick(item, ['reviewID', 'ReviewID', 'id', 'Id']);
                                    return (
                                      <div key={rid} className="td-review-item">
                                        <div className="td-review-top">
                                          <strong>{pick(item, ['userName', 'UserName'], 'Khách hàng')}</strong>
                                          <span>{formatReviewDate(pick(item, ['createdAt', 'CreatedAt']))}</span>
                                        </div>
                                        <div className="td-review-stars">
                                          {'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                                        </div>
                                        <p>{pick(item, ['comment', 'Comment'], '') || 'Không có bình luận.'}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Chính sách */}
                          {activeTab === 'policy' && (
                            <div className="td-policy">
                              <h4>Điều kiện đặt vé</h4>
                              <ul>
                                <li>Vé đã mua không được hoàn trả sau khi xác nhận thanh toán.</li>
                                <li>Có thể đổi vé trước giờ khởi hành ít nhất 24 giờ (phí đổi vé 50.000đ).</li>
                                <li>Khách hàng phải có mặt trước giờ xuất phát ít nhất 15 phút.</li>
                              </ul>
                              <h4>Hành lý</h4>
                              <ul>
                                <li>Miễn phí 20kg hành lý ký gửi và 7kg hành lý xách tay.</li>
                                <li>Hành lý quá kích thước hoặc trọng lượng sẽ tính phụ phí.</li>
                                <li>Không vận chuyển hàng hóa nguy hiểm, dễ cháy nổ.</li>
                              </ul>
                              <h4>Hỗ trợ khách hàng</h4>
                              <p>Hotline: <strong>1900 xxxx</strong> (7:00 – 22:00 hàng ngày)</p>
                              <p>Email: <strong>support@vexeaz.vn</strong></p>
                            </div>
                          )}

                          {/* Hình ảnh */}
                          {activeTab === 'images' && (() => {
                            const ck = `${tripId}_images`;
                            if (tripDetailLoading[ck]) return <div className="td-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div>;
                            const data = tripDetailData[ck];
                            if (!data || data.length === 0) return <div className="td-empty"><i className="fa-regular fa-image" /> Chưa có hình ảnh.</div>;
                            return (
                              <div className="td-images-grid">
                                {data.map((img) => {
                                  const imgId = pick(img, ['imageID', 'ImageID', 'id', 'Id']);
                                  const rawUrl = pick(img, ['imageURL', 'imageUrl', 'ImageURL', 'ImageUrl', 'url', 'Url'], '');
                                  if (!rawUrl) return null;
                                  const url = rawUrl.startsWith('/') ? `${API_BASE}${rawUrl}` : rawUrl;
                                  return (
                                    <button key={imgId} type="button" className="td-img-thumb" onClick={() => setLightboxImage(url)}>
                                      <img src={url} alt="Ảnh xe" />
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}

                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="search-pagination">
              <button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                Trước
              </button>
              <span>Trang {page} / {pagination.totalPages}</span>
              <button type="button" disabled={page >= pagination.totalPages} onClick={() => goToPage(page + 1)}>
                Sau
              </button>
            </div>
          )}
        </main>
      </section>

      {lightboxImage && (
        <div className="td-lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button type="button" className="td-lightbox-close" onClick={() => setLightboxImage(null)} aria-label="Đóng ảnh">
            <i className="fa-solid fa-xmark" />
          </button>
          <img
            src={lightboxImage}
            alt="Ảnh xe phóng to"
            className="td-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {reviewModal.open && (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true" aria-label={reviewModal.title}>
          <div className="review-modal">
            <div className="review-modal-head">
              <div>
                <span>Đánh giá</span>
                <h2>{reviewModal.title}</h2>
                <p>{reviewModal.subtitle || `${reviewModal.averageRating.toFixed(1)} ★ | ${reviewModal.reviewCount} đánh giá`}</p>
              </div>
              <button type="button" onClick={closeReviewModal} aria-label="Đóng đánh giá">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {reviewModal.loading && <div className="loading">Đang tải đánh giá...</div>}
            {reviewModal.error && <div className="error-msg">{reviewModal.error}</div>}
            {!reviewModal.loading && !reviewModal.error && reviewModal.items.length === 0 && (
              <div className="empty-state compact">
                <i className="fa-regular fa-star" />
                <h3>Chưa có đánh giá</h3>
                <p>Các đánh giá sau chuyến đi sẽ hiển thị tại đây.</p>
              </div>
            )}
            {!reviewModal.loading && reviewModal.items.length > 0 && (
              <div className="review-modal-list">
                {reviewModal.items.map((item) => {
                  const rating = Number(pick(item, ['rating', 'Rating'], 0));
                  const reviewId = pick(item, ['reviewID', 'ReviewID']);
                  return (
                    <article className="review-modal-item" key={reviewId}>
                      <div>
                        <strong>{pick(item, ['userName', 'UserName'], 'Khách hàng')}</strong>
                        <span>{formatReviewDate(pick(item, ['createdAt', 'CreatedAt']))}</span>
                      </div>
                      <b>{'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}</b>
                      <p>{pick(item, ['comment', 'Comment'], '') || 'Khách hàng không nhập bình luận.'}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </UserLayout>
  );
}
