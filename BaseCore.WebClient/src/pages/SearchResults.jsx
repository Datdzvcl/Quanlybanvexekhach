import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { API_BASE, formatVND, pick } from '../api';
import { tripApi } from '../services/tripApi';
import { apiClient } from '../services/httpClient';
import { reviewApi } from '../services/reviewApi';
import { promotionApi } from '../services/promotionApi';

function formatDuration(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} tiếng` : `${h} tiếng ${m} phút`;
}

function extractImageUrl(image) {
  if (typeof image === 'string') return image;
  return image?.imageUrl || image?.ImageUrl || image?.url || image?.Url || '';
}

function extractImageUrls(image) {
  if (!image) return [];
  if (Array.isArray(image)) return image.flatMap(extractImageUrls);

  if (typeof image === 'string') {
    const value = image.trim();
    if (!value) return [];
    if (value.startsWith('[')) {
      try {
        return extractImageUrls(JSON.parse(value));
      } catch {
        return [value];
      }
    }
    return [value];
  }

  return extractImageUrls(
    image.imageUrls || image.ImageUrls || image.images || image.Images || extractImageUrl(image)
  );
}

function resolvePublicImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  if (url.startsWith('uploads/')) return `${API_BASE}/${url}`;
  return url;
}

function getTripImageFallback(tripData) {
  const bus = pick(tripData, ['bus', 'Bus']);
  const urls = extractImageUrls(
    pick(tripData, ['busImageUrls', 'BusImageUrls']) ||
    pick(tripData, ['busImageUrl', 'BusImageUrl']) ||
    pick(bus, ['imageUrls', 'ImageUrls']) ||
    pick(bus, ['imageUrl', 'ImageUrl'])
  ).map(resolvePublicImageUrl).filter(Boolean);

  return urls.map((url) => ({ imageUrl: url, url }));
}

const DETAIL_TABS = [
  { key: 'stops', label: 'Đón/trả' },
  { key: 'promo', label: 'Giảm giá' },
  { key: 'reviews', label: 'Đánh giá' },
  { key: 'policy', label: 'Chính sách' },
  { key: 'images', label: 'Hình ảnh' },
];

function StopDot({ type }) {
  return <span className={`stop-dot ${type === 'pickup' ? 'pickup' : 'dropoff'}`} />;
}

function TripDetailTabs({ tripId, tripData }) {
  const [activeTab, setActiveTab] = useState('stops');
  const [stops, setStops] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [promotions, setPromotions] = useState(null);
  const [images, setImages] = useState(null);
  const [loading, setLoading] = useState({});

  const load = (tab) => {
    if (tab === 'stops' && !stops) {
      setLoading((p) => ({ ...p, stops: true }));
      apiClient.get(`/api/trips/${tripId}/stops`).then((r) => {
        const d = r.data;
        const pickup = d?.pickupStops || d?.PickupStops ||
          (Array.isArray(d?.items) ? d.items.filter((s) => Number(s.stopType ?? s.StopType) === 1) : []);
        const dropoff = d?.dropoffStops || d?.DropoffStops ||
          (Array.isArray(d?.items) ? d.items.filter((s) => Number(s.stopType ?? s.StopType) === 2) : []);
        setStops({ pickup, dropoff });
      }).catch(() => setStops({ pickup: [], dropoff: [] }))
        .finally(() => setLoading((p) => ({ ...p, stops: false })));
    }
    if (tab === 'reviews' && !reviews) {
      setLoading((p) => ({ ...p, reviews: true }));
      reviewApi.getByTrip(tripId, 1, 10).then((r) => setReviews(r))
        .catch(() => setReviews({ items: [], averageRating: 0, totalCount: 0 }))
        .finally(() => setLoading((p) => ({ ...p, reviews: false })));
    }
    if (tab === 'promo' && !promotions) {
      setLoading((p) => ({ ...p, promo: true }));
      promotionApi.listPublic().then((items) => setPromotions(Array.isArray(items) ? items : []))
        .catch(() => setPromotions([]))
        .finally(() => setLoading((p) => ({ ...p, promo: false })));
    }
    if (tab === 'images' && !images) {
      setLoading((p) => ({ ...p, images: true }));
      const bus = pick(tripData, ['bus', 'Bus']);
      const busId = bus?.busID ?? bus?.BusID ?? pick(tripData, ['busId', 'BusID', 'busID']);
      const fallbackImages = getTripImageFallback(tripData);

      if (!busId) {
        setImages(fallbackImages);
        setLoading((p) => ({ ...p, images: false }));
        return;
      }

      apiClient.get(`/api/buses/${busId}/images`).then((r) => {
        const d = r.data;
        const list = Array.isArray(d) ? d : (d?.items || d?.Images || []);
        setImages(list.length > 0 ? list : fallbackImages);
      }).catch(() => setImages(fallbackImages))
        .finally(() => setLoading((p) => ({ ...p, images: false })));
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    load(tab);
  };

  // auto-load stops
  useEffect(() => { load('stops'); }, [tripId]);

  const [lightbox, setLightbox] = useState(null);
  const imageUrls = useMemo(() => (
    (images || [])
      .flatMap(extractImageUrls)
      .map(resolvePublicImageUrl)
      .filter(Boolean)
  ), [images]);

  return (
    <div className="trip-tabs-panel">
      <div className="trip-tabs-nav">
        {DETAIL_TABS.map((tab) => (
          <button key={tab.key} type="button"
            className={`trip-tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => switchTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="trip-tabs-content">
        {/* ── Đón/trả ── */}
        {activeTab === 'stops' && (
          loading.stops ? <div className="trip-tabs-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div> : (
            <div className="trip-stops-grid">
              <div className="trip-stops-col">
                <h4><i className="fa-solid fa-location-dot" /> Điểm đón</h4>
                {(stops?.pickup || []).length === 0
                  ? <p className="trip-tabs-empty">Chưa có điểm đón.</p>
                  : (stops.pickup.map((s) => {
                    const name = pick(s, ['stopName', 'StopName'], 'Điểm dừng');
                    const addr = pick(s, ['stopAddress', 'StopAddress'], '');
                    const offset = pick(s, ['offsetMinutes', 'OffsetMinutes', 'stopOffset', 'StopOffset']);
                    return (
                      <div key={pick(s, ['stopPointID', 'StopPointID'])} className="trip-stop-item">
                        <StopDot type="pickup" />
                        <div>
                          <strong>{name}</strong>
                          {addr && <span>{addr}</span>}
                          {offset != null && <em>+{offset} phút so với giờ khởi hành</em>}
                        </div>
                      </div>
                    );
                  }))}
              </div>
              <div className="trip-stops-col">
                <h4><i className="fa-solid fa-flag-checkered" /> Điểm trả</h4>
                {(stops?.dropoff || []).length === 0
                  ? <p className="trip-tabs-empty">Chưa có điểm trả.</p>
                  : (stops.dropoff.map((s) => {
                    const name = pick(s, ['stopName', 'StopName'], 'Điểm dừng');
                    const addr = pick(s, ['stopAddress', 'StopAddress'], '');
                    const offset = pick(s, ['offsetMinutes', 'OffsetMinutes', 'stopOffset', 'StopOffset']);
                    return (
                      <div key={pick(s, ['stopPointID', 'StopPointID'])} className="trip-stop-item">
                        <StopDot type="dropoff" />
                        <div>
                          <strong>{name}</strong>
                          {addr && <span>{addr}</span>}
                          {offset != null && <em>+{offset} phút so với giờ khởi hành</em>}
                        </div>
                      </div>
                    );
                  }))}
              </div>
            </div>
          )
        )}

        {/* ── Giảm giá ── */}
        {activeTab === 'promo' && (
          loading.promo ? <div className="trip-tabs-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div> : (
            promotions?.length === 0 ? <p className="trip-tabs-empty">Hiện chưa có mã giảm giá nào.</p> : (
              <div className="trip-promo-list">
                {(promotions || []).map((item) => {
                  const code = pick(item, ['code', 'Code'], '');
                  const discountType = Number(pick(item, ['discountType', 'DiscountType'], 1));
                  const discountValue = pick(item, ['discountValue', 'DiscountValue'], 0);
                  const maxDiscount = Number(pick(item, ['maxDiscountAmount', 'MaxDiscountAmount'], 0));
                  const minOrder = Number(pick(item, ['minOrderValue', 'MinOrderValue'], 0));
                  const endDate = pick(item, ['endDate', 'EndDate']);
                  const usageLimit = pick(item, ['usageLimit', 'UsageLimit']);
                  const usageCount = Number(pick(item, ['usageCount', 'UsageCount'], 0));
                  const remaining = usageLimit != null ? Number(usageLimit) - usageCount : null;
                  const discountText = discountType === 1
                    ? (maxDiscount > 0 ? `Giảm ${discountValue}% tối đa ${formatVND(maxDiscount)}` : `Giảm ${discountValue}%`)
                    : `Giảm ${formatVND(discountValue)}`;
                  return (
                    <div key={code} className="trip-promo-item">
                      <div className="trip-promo-code">{code}</div>
                      <div className="trip-promo-body">
                        <strong>{discountText}</strong>
                        <span>
                          {pick(item, ['description', 'Description']) || ''}
                        </span>
                        <small>
                          {minOrder > 0 ? `Đơn từ ${formatVND(minOrder)} · ` : ''}
                          {remaining != null ? `Còn ${remaining} lượt · ` : 'Không giới hạn lượt dùng · '}
                          {endDate ? `Hết hạn ${new Date(endDate).toLocaleDateString('vi-VN')}` : ''}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )
        )}

        {/* ── Đánh giá ── */}
        {activeTab === 'reviews' && (
          loading.reviews ? <div className="trip-tabs-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div> : (
            reviews?.totalCount === 0 || !reviews ? (
              <p className="trip-tabs-empty">Chưa có đánh giá nào cho chuyến xe này.</p>
            ) : (
              <div className="trip-reviews-panel">
                <div className="trip-reviews-summary">
                  <span className="trip-reviews-avg">{Number(reviews.averageRating || 0).toFixed(1)}</span>
                  <i className="fa-solid fa-star" />
                  <span className="trip-reviews-count">{reviews.totalCount} đánh giá</span>
                </div>
                <div className="trip-review-list">
                  {(reviews.items || []).map((rv) => {
                    const name = pick(rv, ['customerName', 'CustomerName', 'userName', 'UserName', 'user', 'User'])
                      || (typeof pick(rv, ['user', 'User']) === 'object' ? pick(rv.user ?? rv.User, ['fullName', 'FullName', 'name', 'Name']) : null)
                      || 'Khách hàng';
                    const rating = Number(pick(rv, ['rating', 'Rating'], 0));
                    const comment = pick(rv, ['comment', 'Comment'], '');
                    const createdAt = pick(rv, ['createdAt', 'CreatedAt']);
                    return (
                      <div key={pick(rv, ['reviewID', 'ReviewID'])} className="trip-review-item">
                        <div className="trip-review-header">
                          <strong>{name}</strong>
                          <span>{createdAt ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(createdAt)) : ''}</span>
                        </div>
                        <div className="trip-review-stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i key={i} className={`fa-solid fa-star${i < rating ? ' active' : ''}`} />
                          ))}
                        </div>
                        {comment && <p>{comment}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )
        )}

        {/* ── Chính sách ── */}
        {activeTab === 'policy' && (
          <div className="trip-policy-panel">
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

        {/* ── Hình ảnh ── */}
        {activeTab === 'images' && (
          loading.images ? <div className="trip-tabs-loading"><i className="fa-solid fa-spinner fa-spin" /> Đang tải...</div> : (
            imageUrls.length === 0 ? (
              <p className="trip-tabs-empty">Nhà xe chưa cập nhật ảnh xe.</p>
            ) : (
              <>
                <div className="trip-images-grid">
                  {imageUrls.map((url, idx) => (
                    <button key={`${url}-${idx}`} type="button" className="trip-image-thumb" onClick={() => setLightbox(url)}>
                      <img src={url} alt={`Ảnh xe ${idx + 1}`} loading="lazy" />
                    </button>
                  ))}
                </div>
                {lightbox && (
                  <div className="trip-lightbox" onClick={() => setLightbox(null)}>
                    <button type="button" className="trip-lightbox-close" onClick={() => setLightbox(null)}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                    <img src={lightbox} alt="Ảnh xe phóng to" onClick={(e) => e.stopPropagation()} />
                  </div>
                )}
              </>
            )
          )
        )}
      </div>
    </div>
  );
}

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

const sortOptions = [
  { value: '', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'departure_asc', label: 'Giờ xuất phát sớm nhất' },
  { value: 'departure_desc', label: 'Giờ xuất phát muộn nhất' },
];

function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
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
  const today = useMemo(() => getToday(), []);
  const [locations, setLocations] = useState([]);
  const [expandedTripId, setExpandedTripId] = useState(null);

  const toggleDetail = (tripId) => {
    setExpandedTripId((prev) => (prev === tripId ? null : tripId));
  };

  const [operators, setOperators] = useState([]);

  const [filters, setFilters] = useState({
    busType: searchParams.get('busType') || '',
    departureTimeRange: searchParams.get('departureTimeRange') || '',
    arrivalTimeRange: searchParams.get('arrivalTimeRange') || '',
    operatorId: searchParams.get('operatorId') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || '',
  });

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

  const locationOptions = useMemo(() => {
    return Array.from(new Set(
      locations
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [locations]);

  const page = Number(searchParams.get('page') || 1);

  useEffect(() => {
    fetch(`${API_BASE}/api/trips/locations`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/operators/public`)
      .then((res) => (res.ok ? res.json() : []))
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

  useEffect(() => {
    const load = async () => {
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
              <LocationPicker
                label="Nơi xuất phát"
                value={searchForm.from}
                onChange={(value) => updateSearchForm('from', value)}
                options={locationOptions}
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

              <LocationPicker
                label="Nơi đến"
                value={searchForm.to}
                onChange={(value) => updateSearchForm('to', value)}
                options={locationOptions}
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
                  minPrice: '',
                  maxPrice: '',
                  sortBy: filters.sortBy,
                });
                const next = new URLSearchParams(searchParams);
                ['busType', 'departureTimeRange', 'arrivalTimeRange', 'operatorId', 'minPrice', 'maxPrice'].forEach((key) => next.delete(key));
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

          <label className="filter-control">
            <span>Nhà xe</span>
            <select value={filters.operatorId} onChange={(event) => updateFilter('operatorId', event.target.value)}>
              <option value="">Tất cả nhà xe</option>
              {operators.map((op) => (
                <option key={op.operatorID ?? op.OperatorID} value={op.operatorID ?? op.OperatorID}>
                  {op.name ?? op.Name}
                </option>
              ))}
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

                const avgRating = Number(pick(trip, ['averageRating', 'AverageRating']) || 0);
                const reviewCount = Number(pick(trip, ['reviewCount', 'ReviewCount']) || 0);

                return (
                  <article className={`trip-result-card ${expandedTripId === tripId ? 'expanded' : ''}`} key={tripId || `${operatorName}-${departureTime}`}>
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
                          <h2>{operatorName}</h2>
                          <p>{pick(trip, ['busType', 'BusType'], 'Xe khách')}</p>
                        </div>
                        <span className="trip-seats-badge">{pick(trip, ['availableSeats', 'AvailableSeats'], 0)} ghế còn</span>
                      </div>

                      {(avgRating > 0 || reviewCount > 0) && (
                        <div className="trip-rating-badge">
                          <i className="fa-solid fa-star" />
                          {avgRating > 0 ? Number(avgRating).toFixed(1) : '--'} | {reviewCount} đánh giá
                        </div>
                      )}

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

                      <button
                        type="button"
                        className="trip-detail-toggle"
                        onClick={() => toggleDetail(tripId)}
                      >
                        Thông tin chi tiết
                        <i className={`fa-solid fa-chevron-${expandedTripId === tripId ? 'up' : 'down'}`} />
                      </button>

                      {expandedTripId === tripId && (
                        <TripDetailTabs tripId={tripId} tripData={trip} />
                      )}
                    </div>

                    <div className="trip-result-action">
                      <strong>{formatVND(pick(trip, ['price', 'Price'], 0))}</strong>
                      <button className="btn btn-primary" type="button" onClick={() => chooseTrip(trip)}>
                        Chọn chuyến
                      </button>
                      <button type="button" className="trip-detail-toggle-mobile"
                        onClick={() => toggleDetail(tripId)}>
                        Thông tin chi tiết <i className={`fa-solid fa-chevron-${expandedTripId === tripId ? 'up' : 'down'}`} />
                      </button>
                    </div>
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
    </UserLayout>
  );
}
