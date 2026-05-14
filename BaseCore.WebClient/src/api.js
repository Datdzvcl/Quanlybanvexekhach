import { clientForPath, API_BASE, AUTH_API_BASE, AUTH_BASE } from './services/httpClient';
import { authApi } from './services/authApi';

export { API_BASE, AUTH_API_BASE, AUTH_BASE };

export function pick(obj, keys, fallback = '') {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return fallback;
}

export async function apiFetch(path, options = {}) {
  const client = clientForPath(path);
  const method = (options.method || 'GET').toLowerCase();
  const config = {
    headers: options.headers,
    params: options.params,
  };

  let data = options.body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      // Keep non-JSON payloads intact for legacy callers.
    }
  }

  const response = await client.request({
    url: path,
    method,
    data,
    ...config,
  });

  return response.data;
}

export async function loginRequest(emailOrPhone, password) {
  return authApi.login({ emailOrPhone, password });
}

export const normalizeUser = (data) => {
  const rawUser = data?.user || data?.User || data || {};
  return {
    token: data?.token || data?.Token || '',
    userId: rawUser?.userID || rawUser?.UserID || rawUser?.userId || rawUser?.id || '',
    fullName: rawUser?.fullName || rawUser?.FullName || rawUser?.name || '',
    email: rawUser?.email || rawUser?.Email || '',
    phone: rawUser?.phone || rawUser?.Phone || '',
    role: rawUser?.role || rawUser?.Role || 'Customer',
  };
};

export const isAdminRole = (role) => String(role || '').toLowerCase() === 'admin';

export const formatVND = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export function normalizeTrip(t) {
  const rawBus = t?.bus || t?.Bus || {};
  const rawOperator = rawBus?.operator || rawBus?.Operator || {};
  return {
    raw: t,
    id: pick(t, ['tripID', 'TripID', 'tripId', 'id', 'Id']),
    busId: Number(pick(t, ['busID', 'BusID', 'busId'], 0)),
    departureLocation: pick(t, ['departureLocation', 'DepartureLocation', 'fromLocation', 'FromLocation']),
    arrivalLocation: pick(t, ['arrivalLocation', 'ArrivalLocation', 'toLocation', 'ToLocation']),
    departureTime: pick(t, ['departureTime', 'DepartureTime']),
    arrivalTime: pick(t, ['arrivalTime', 'ArrivalTime']),
    operator: pick(
      t,
      ['operator', 'Operator', 'operatorName', 'OperatorName', 'busOperator', 'BusOperator', 'companyName', 'CompanyName'],
      pick(rawOperator, ['name', 'Name'])
    ),
    busType: pick(t, ['busType', 'BusType', 'type', 'Type'], pick(rawBus, ['busType', 'BusType'])),
    price: Number(pick(t, ['price', 'Price'], 0)),
    availableSeats: Number(pick(t, ['availableSeats', 'AvailableSeats'], 0)),
    status: pick(t, ['status', 'Status'], ''),
  };
}
