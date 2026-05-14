import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserLayout from '../layouts/UserLayout';
import { formatVND, pick } from '../api';
import { tripApi } from '../services/tripApi';

const PAGE_SIZE = 10;

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

  const [filters, setFilters] = useState({
    busType: searchParams.get('busType') || '',
    departureTimeRange: searchParams.get('departureTimeRange') || '',
    arrivalTimeRange: searchParams.get('arrivalTimeRange') || '',
    operatorId: searchParams.get('operatorId') || '',
    pickupStopId: searchParams.get('pickupStopId') || '',
    dropoffStopId: searchParams.get('dropoffStopId') || '',
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

  const page = Number(searchParams.get('page') || 1);

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
    if (id) navigate(`/trips/${id}/seats`);
  };

  return (
    <UserLayout>
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
                  pickupStopId: '',
                  dropoffStopId: '',
                  minPrice: '',
                  maxPrice: '',
                  sortBy: filters.sortBy,
                });
                const next = new URLSearchParams(searchParams);
                ['busType', 'departureTimeRange', 'arrivalTimeRange', 'operatorId', 'pickupStopId', 'dropoffStopId', 'minPrice', 'maxPrice'].forEach((key) => next.delete(key));
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
            <input
              type="number"
              min="1"
              value={filters.operatorId}
              onChange={(event) => updateFilter('operatorId', event.target.value)}
              placeholder="Mã nhà xe"
            />
          </label>

          <label className="filter-control">
            <span>Điểm đón</span>
            <input
              type="number"
              min="1"
              value={filters.pickupStopId}
              onChange={(event) => updateFilter('pickupStopId', event.target.value)}
              placeholder="Mã điểm đón"
            />
          </label>

          <label className="filter-control">
            <span>Điểm trả</span>
            <input
              type="number"
              min="1"
              value={filters.dropoffStopId}
              onChange={(event) => updateFilter('dropoffStopId', event.target.value)}
              placeholder="Mã điểm trả"
            />
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

                return (
                  <article className="trip-result-card" key={tripId || `${operatorName}-${departureTime}`}>
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
