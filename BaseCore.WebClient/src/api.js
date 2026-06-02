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

export const roleName = (role) => {
  const value = String(role ?? '').toLowerCase();
  if (value === '1' || value === 'admin') return 'Admin';
  if (value === '2' || value === 'operator') return 'Operator';
  return 'Customer';
};

export const tripStatusName = (status) => {
  const value = String(status ?? '').toLowerCase();
  if (value === '1' || value === 'on-going' || value === 'ongoing') return 'On-going';
  if (value === '2' || value === 'completed') return 'Completed';
  if (value === '3' || value === 'cancelled' || value === 'canceled') return 'Cancelled';
  return 'Scheduled';
};

export const tripStatusCode = (status) => {
  const name = tripStatusName(status);
  if (name === 'On-going') return 1;
  if (name === 'Completed') return 2;
  if (name === 'Cancelled') return 3;
  return 0;
};

export const bookingStatusName = (status) => {
  const value = String(status ?? '').toLowerCase();
  if (value === '1' || value === 'confirmed') return 'Confirmed';
  if (value === '2' || value === 'cancelrequested') return 'CancelRequested';
  if (value === '3' || value === 'cancelled' || value === 'canceled') return 'Cancelled';
  if (value === '4' || value === 'completed') return 'Completed';
  return 'PendingConfirm';
};

export const normalizeUser = (data) => {
  const rawUser = data?.user || data?.User || data || {};
  return {
    token: data?.token || data?.Token || '',
    userId: rawUser?.userID || rawUser?.UserID || rawUser?.userId || rawUser?.id || '',
    fullName: rawUser?.fullName || rawUser?.FullName || rawUser?.name || '',
    email: rawUser?.email || rawUser?.Email || '',
    phone: rawUser?.phone || rawUser?.Phone || '',
    role: roleName(rawUser?.role || rawUser?.Role || 'Customer'),
  };
};

export const isAdminRole = (role) => roleName(role) === 'Admin';
export const isOperatorRole = (role) => roleName(role) === 'Operator';
export const isManagementRole = (role) => isAdminRole(role) || isOperatorRole(role);

export const formatVND = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

export const labelPaymentStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'paid') return 'Đã thanh toán';
  if (value === 'pending') return 'Chưa thanh toán';
  if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
  if (value === 'refunded') return 'Đã hoàn tiền';
  return status || 'Chưa rõ';
};

const normalizeVietnameseKeyword = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase();

export const labelPaymentMethod = (method) => {
  const value = String(method || '').trim().toLowerCase();
  const normalized = normalizeVietnameseKeyword(value);
  if (
    value === 'cash' ||
    normalized === 'tienmat' ||
    normalized.includes('tien mat')
  ) return 'Tiền mặt';
  if (
    value === 'banktransfer' ||
    normalized === 'chuyenkhoan' ||
    normalized.includes('chuyen khoan')
  ) return 'Chuyển khoản ngân hàng';
  if (
    value === 'vnpay' ||
    normalized.includes('vi dien tu')
  ) return 'Ví điện tử/VNPay giả lập';
  return method || 'Chưa rõ';
};

export const labelBookingStatus = (status) => {
  const normalized = bookingStatusName(status);
  const value = normalized.toLowerCase();
  if (value === 'pendingconfirm') return 'Đợi xác nhận';
  if (value === 'confirmed') return 'Đã xác nhận';
  if (value === 'cancelrequested') return 'Yêu cầu hủy';
  if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
  if (value === 'completed') return 'Hoàn thành';
  return normalized || 'Chưa rõ';
};

export const labelTripStatus = (status) => {
  const normalized = tripStatusName(status);
  const value = normalized.toLowerCase();
  if (value === 'scheduled' || value === 'active') return 'Đã lên lịch';
  if (value === 'on-going' || value === 'ongoing') return 'Đang chạy';
  if (value === 'completed') return 'Hoàn thành';
  if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
  return normalized || 'Chưa rõ';
};

export const labelSeatStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'available') return 'Còn trống';
  if (value === 'booked') return 'Đã đặt';
  if (value === 'holdingbyme') return 'Bạn đang giữ';
  if (value === 'holdingbyother') return 'Người khác đang giữ';
  return status || 'Chưa rõ';
};

export const labelRole = (role) => {
  const normalized = roleName(role);
  const value = normalized.toLowerCase();
  if (value === 'admin') return 'Quản trị viên';
  if (value === 'customer') return 'Khách hàng';
  if (value === 'operator') return 'Nhà xe';
  return normalized || 'Chưa rõ';
};

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
    status: tripStatusName(pick(t, ['status', 'Status'], 'Scheduled')),
  };
}
