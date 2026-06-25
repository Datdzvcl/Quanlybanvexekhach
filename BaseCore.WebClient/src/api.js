// // import { clientForPath, API_BASE, AUTH_API_BASE, AUTH_BASE } from './services/httpClient';
// // import { authApi } from './services/authApi';

// // export { API_BASE, AUTH_API_BASE, AUTH_BASE };

// // export function pick(obj, keys, fallback = '') {
// //   for (const key of keys) {
// //     if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
// //   }
// //   return fallback;
// // }

// // export async function apiFetch(path, options = {}) {
// //   const client = clientForPath(path);
// //   const method = (options.method || 'GET').toLowerCase();
// //   const config = {
// //     headers: options.headers,
// //     params: options.params,
// //   };

// //   let data = options.body;
// //   if (typeof data === 'string') {
// //     try {
// //       data = JSON.parse(data);
// //     } catch {
// //       // Keep non-JSON payloads intact for legacy callers.
// //     }
// //   }

// //   const response = await client.request({
// //     url: path,
// //     method,
// //     data,
// //     ...config,
// //   });

// //   return response.data;
// // }

// // export async function loginRequest(emailOrPhone, password) {
// //   return authApi.login({ emailOrPhone, password });
// // }

// // export const normalizeUser = (data) => {
// //   const rawUser = data?.user || data?.User || data || {};
// //   return {
// //     token: data?.token || data?.Token || '',
// //     userId: rawUser?.userID || rawUser?.UserID || rawUser?.userId || rawUser?.id || '',
// //     fullName: rawUser?.fullName || rawUser?.FullName || rawUser?.name || '',
// //     email: rawUser?.email || rawUser?.Email || '',
// //     phone: rawUser?.phone || rawUser?.Phone || '',
// //     role: rawUser?.role || rawUser?.Role || 'Customer',
// //   };
// // };

// // export const isAdminRole = (role) => String(role || '').toLowerCase() === 'admin';

// // export const formatVND = (value) =>
// //   new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

// // export const labelPaymentStatus = (status) => {
// //   const value = String(status || '').toLowerCase();
// //   if (value === 'paid') return 'Đã thanh toán';
// //   if (value === 'pending') return 'Chưa thanh toán';
// //   if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
// //   if (value === 'refunded') return 'Đã hoàn tiền';
// //   return status || 'Chưa rõ';
// // };

// // export const labelPaymentMethod = (method) => {
// //   const value = String(method || '').toLowerCase();
// //   if (
// //     value === 'cash' ||
// //     value === 'tienmat' ||
// //     value.includes('tiền mặt') ||
// //     value.includes('tien mat') ||
// //     value.includes('ti?n m?t') ||
// //     value.includes('tiá»n máº·t')
// //   ) return 'Tiền mặt';
// //   if (
// //     value === 'banktransfer' ||
// //     value === 'chuyenkhoan' ||
// //     value.includes('chuyển khoản') ||
// //     value.includes('chuyen khoan') ||
// //     value.includes('chuyá»ƒn khoáº£n')
// //   ) return 'Chuyển khoản ngân hàng';
// //   if (
// //     value === 'ewallet' ||
// //     value === 'vnpay' ||
// //     value.includes('ví điện tử') ||
// //     value.includes('vi dien tu') ||
// //     value.includes('vÃ­ Ä‘iá»‡n tá»­')
// //   ) return 'Ví điện tử/VNPay giả lập';
// //   return method || 'Chưa rõ';
// // };

// // export const labelBookingStatus = (status) => {
// //   const value = String(status || '').toLowerCase();
// //   if (value === 'pendingconfirm') return 'Đợi xác nhận';
// //   if (value === 'confirmed') return 'Đã xác nhận';
// //   if (value === 'cancelrequested') return 'Yêu cầu hủy';
// //   if (value === 'cancelrejected') return 'Từ chối hủy';
// //   if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
// //   return status || 'Chưa rõ';
// // };

// // export const labelTripStatus = (status) => {
// //   const value = String(status || '').toLowerCase();
// //   if (value === 'scheduled' || value === 'active') return 'Đã lên lịch';
// //   if (value === 'on-going' || value === 'ongoing') return 'Đang chạy';
// //   if (value === 'completed') return 'Hoàn thành';
// //   if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
// //   return status || 'Chưa rõ';
// // };

// // export const labelSeatStatus = (status) => {
// //   const value = String(status || '').toLowerCase();
// //   if (value === 'available') return 'Còn trống';
// //   if (value === 'booked') return 'Đã đặt';
// //   if (value === 'holdingbyme') return 'Bạn đang giữ';
// //   if (value === 'holdingbyother') return 'Người khác đang giữ';
// //   return status || 'Chưa rõ';
// // };

// // export const labelRole = (role) => {
// //   const value = String(role || '').toLowerCase();
// //   if (value === 'admin') return 'Quản trị viên';
// //   if (value === 'customer') return 'Khách hàng';
// //   if (value === 'operator') return 'Nhà xe';
// //   return role || 'Chưa rõ';
// // };

// // export function normalizeTrip(t) {
// //   const rawBus = t?.bus || t?.Bus || {};
// //   const rawOperator = rawBus?.operator || rawBus?.Operator || {};
// //   return {
// //     raw: t,
// //     id: pick(t, ['tripID', 'TripID', 'tripId', 'id', 'Id']),
// //     busId: Number(pick(t, ['busID', 'BusID', 'busId'], 0)),
// //     departureLocation: pick(t, ['departureLocation', 'DepartureLocation', 'fromLocation', 'FromLocation']),
// //     arrivalLocation: pick(t, ['arrivalLocation', 'ArrivalLocation', 'toLocation', 'ToLocation']),
// //     departureTime: pick(t, ['departureTime', 'DepartureTime']),
// //     arrivalTime: pick(t, ['arrivalTime', 'ArrivalTime']),
// //     operator: pick(
// //       t,
// //       ['operator', 'Operator', 'operatorName', 'OperatorName', 'busOperator', 'BusOperator', 'companyName', 'CompanyName'],
// //       pick(rawOperator, ['name', 'Name'])
// //     ),
// //     busType: pick(t, ['busType', 'BusType', 'type', 'Type'], pick(rawBus, ['busType', 'BusType'])),
// //     price: Number(pick(t, ['price', 'Price'], 0)),
// //     availableSeats: Number(pick(t, ['availableSeats', 'AvailableSeats'], 0)),
// //     status: pick(t, ['status', 'Status'], ''),
// //   };
// // }
// import { clientForPath, API_BASE, AUTH_API_BASE, AUTH_BASE } from './services/httpClient';
// import { authApi } from './services/authApi';

// export { API_BASE, AUTH_API_BASE, AUTH_BASE };

// export function pick(obj, keys, fallback = '') {
//   for (const key of keys) {
//     if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
//   }
//   return fallback;
// }

// export async function apiFetch(path, options = {}) {
//   const client = clientForPath(path);
//   const method = (options.method || 'GET').toLowerCase();
//   const config = {
//     headers: options.headers,
//     params: options.params,
//   };

//   let data = options.body;
//   if (typeof data === 'string') {
//     try {
//       data = JSON.parse(data);
//     } catch {
//       // Keep non-JSON payloads intact for legacy callers.
//     }
//   }

//   const response = await client.request({
//     url: path,
//     method,
//     data,
//     ...config,
//   });

//   return response.data;
// }

// export async function loginRequest(emailOrPhone, password) {
//   return authApi.login({ emailOrPhone, password });
// }

// export const normalizeUser = (data) => {
//   const rawUser = data?.user || data?.User || data || {};
//   return {
//     token: data?.token || data?.Token || '',
//     userId: rawUser?.userID || rawUser?.UserID || rawUser?.userId || rawUser?.id || '',
//     fullName: rawUser?.fullName || rawUser?.FullName || rawUser?.name || '',
//     email: rawUser?.email || rawUser?.Email || '',
//     phone: rawUser?.phone || rawUser?.Phone || '',
//     role: rawUser?.role ?? rawUser?.Role ?? 0,
//   };
// };

// export const isAdminRole = (role) =>
//   role === 2 || role === '2' || String(role || '').toLowerCase() === 'admin';

// export const formatVND = (value) =>
//   new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

// export const labelPaymentStatus = (status) => {
//   const value = String(status || '').toLowerCase();
//   if (value === 'paid') return 'Đã thanh toán';
//   if (value === 'pending') return 'Chưa thanh toán';
//   if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
//   if (value === 'refunded') return 'Đã hoàn tiền';
//   return status || 'Chưa rõ';
// };

// export const labelPaymentMethod = (method) => {
//   const value = String(method || '').toLowerCase();
//   if (
//     value === 'cash' ||
//     value === 'tienmat' ||
//     value.includes('tiền mặt') ||
//     value.includes('tien mat') ||
//     value.includes('ti?n m?t') ||
//     value.includes('tiá»n máº·t')
//   ) return 'Tiền mặt';
//   if (
//     value === 'banktransfer' ||
//     value === 'chuyenkhoan' ||
//     value.includes('chuyển khoản') ||
//     value.includes('chuyen khoan') ||
//     value.includes('chuyá»ƒn khoáº£n')
//   ) return 'Chuyển khoản ngân hàng';
//   export const labelPaymentMethod = (method) => {
//   const value = String(method || '').toLowerCase();
//   if (value === 'cash' || value === 'tienmat' || value.includes('tien mat'))
//     return 'Tiền mặt';
//   if (value === 'banktransfer' || value === 'chuyenkhoan' || value.includes('chuyen khoan'))
//     return 'Chuyển khoản ngân hàng';
//   if (value === 'ewallet' || value === 'vnpay' || value.includes('vi dien tu'))
//     return 'Ví điện tử/VNPay giả lập';
//   return method || 'Chưa rõ';
// };

// // BookingStatusConstant: Pending=0, Confirmed=1, Cancelled=2, Completed=3, Refunded=4, CancelRequested=5, CancelRejected=6
// export const labelBookingStatus = (status) => {
//   if (status === 0 || status === '0') return 'Chờ thanh toán';
//   if (status === 1 || status === '1') return 'Đã xác nhận';
//   if (status === 2 || status === '2') return 'Đã hủy';
//   if (status === 3 || status === '3') return 'Hoàn thành';
//   if (status === 4 || status === '4') return 'Đã hoàn tiền';
//   if (status === 5 || status === '5') return 'Yêu cầu hủy';
//   if (status === 6 || status === '6') return 'Từ chối hủy';
//   return status ?? 'Chưa rõ';
// };

// // TripStatusConstant: Scheduled=0, Ongoing=1, Completed=2, Cancelled=3
// export const labelTripStatus = (status) => {
//   if (status === 0 || status === '0') return 'Đã lên lịch';
//   if (status === 1 || status === '1') return 'Đang chạy';
//   if (status === 2 || status === '2') return 'Hoàn thành';
//   if (status === 3 || status === '3') return 'Đã hủy';
//   return status ?? 'Chưa rõ';
// };

// // SeatHoldStatusConstant: Holding=0, Confirmed=1, Released=2
// export const labelSeatStatus = (status) => {
//   const value = String(status || '').toLowerCase();
//   if (value === 'available') return 'Còn trống';
//   if (value === 'booked') return 'Đã đặt';
//   if (value === 'holdingbyme') return 'Bạn đang giữ';
//   if (value === 'holdingbyother') return 'Người khác đang giữ';
//   return status || 'Chưa rõ';
// };

// // RoleConstant: Customer=0, Operator=1, Admin=2
// export const labelRole = (role) => {
//   if (role === 0 || role === '0') return 'Khách hàng';
//   if (role === 1 || role === '1') return 'Nhà xe';
//   if (role === 2 || role === '2') return 'Quản trị viên';
//   return role ?? 'Chưa rõ';
// };

// export function normalizeTrip(t) {
//   const rawBus = t?.bus || t?.Bus || {};
//   const rawOperator = rawBus?.operator || rawBus?.Operator || {};
//   return {
//     raw: t,
//     id: pick(t, ['tripID', 'TripID', 'tripId', 'id', 'Id']),
//     busId: Number(pick(t, ['busID', 'BusID', 'busId'], 0)),
//     departureLocation: pick(t, ['departureLocation', 'DepartureLocation', 'fromLocation', 'FromLocation']),
//     arrivalLocation: pick(t, ['arrivalLocation', 'ArrivalLocation', 'toLocation', 'ToLocation']),
//     departureTime: pick(t, ['departureTime', 'DepartureTime']),
//     arrivalTime: pick(t, ['arrivalTime', 'ArrivalTime']),
//     operator: pick(
//       t,
//       ['operator', 'Operator', 'operatorName', 'OperatorName', 'busOperator', 'BusOperator', 'companyName', 'CompanyName'],
//       pick(rawOperator, ['name', 'Name'])
//     ),
//     busType: pick(t, ['busType', 'BusType', 'type', 'Type'], pick(rawBus, ['busType', 'BusType'])),
//     price: Number(pick(t, ['price', 'Price'], 0)),
//     availableSeats: Number(pick(t, ['availableSeats', 'AvailableSeats'], 0)),
//     status: pick(t, ['status', 'Status'], ''),
//   };

// }
// }


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
    role: rawUser?.role ?? rawUser?.Role ?? 0,
  };
};

export const isAdminRole = (role) =>
  role === 2 || role === '2' || String(role || '').toLowerCase() === 'admin';
export const isOperatorRole = (role) =>
  role === 1 || role === '1' || String(role || '').toLowerCase() === 'operator';

export const formatVND = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));

// export const labelPaymentStatus = (status) => {
//   const value = String(status || '').toLowerCase();
//   if (value === 1) return 'Da thanh toan';
//   if (value === 0) return 'Chua thanh toan';
//   if (value === 2 || value === 'canceled') return 'Da huy';
//   if (value === 4) return 'Da hoan tien';
//   return status || 'Chua ro';
// };
// export const labelPaymentStatus = (status) => {
//   const value = Number(status);

//   if (value === 1) return 'Đã thanh toán';
//   if (value === 0) return 'Chưa thanh toán';
//   if (value === 2) return 'Đã hủy';
//   if (value === 4) return 'Đã hoàn tiền';

//   return 'Chưa rõ';
// };
// api.js - SỬA LẠI
// export const labelPaymentStatus = (status) => {
//   // Xử lý dạng số (BookingStatus enum)
//   const num = Number(status);
//   if (!isNaN(num) && String(status).trim() !== '') {
//     if (num === 1) return 'Đã thanh toán';
//     if (num === 0) return 'Chưa thanh toán';
//     if (num === 2) return 'Đã hủy';
//     if (num === 4) return 'Đã hoàn tiền';
//   }

//   // Xử lý dạng string (paymentStatus từ API)
//   const value = String(status || '').toLowerCase();
//   if (value === 'paid')                          return 'Đã thanh toán';
//   if (value === 'pending')                       return 'Chưa thanh toán';
//   if (value === 'cancelled' || value === 'canceled') return 'Đã hủy';
//   if (value === 'refunded')                      return 'Đã hoàn tiền';

//   return 'Chưa rõ';
// };
export const labelPaymentStatus = (status) => {
  const num = Number(status);
  if (!isNaN(num) && status !== '' && status !== null && status !== undefined) {
    if (num === 0) return 'Chưa thanh toán';
    if (num === 1) return 'Đã thanh toán';
    if (num === 2) return 'Chờ hoàn tiền';
    if (num === 3) return 'Đã hoàn tiền';
  }
  return 'Chưa rõ';
};
export const labelPaymentMethod = (method) => {
  const value = String(method || '').toLowerCase();
  if (value === 'cash' || value === 'tienmat' || value.includes('tiền mặt'))
    return 'Tiền mặt';
  if (value === 'banktransfer' || value === 'chuyenkhoan' || value.includes('chuyển khoản'))
    return 'Chuyển khoản ngân hàng';
  if (value === 'ewallet' || value === 'vnpay' || value.includes('ví điện tử'))
    return 'Ví điện tử';
  return method || 'Chưa rõ';
};

export const labelBookingStatus = (status) => {
  if (status === 0 || status === '0') return 'Chờ xác nhận';
  if (status === 1 || status === '1') return 'Đã xác nhận';
  if (status === 2 || status === '2') return 'Đã hủy';
  if (status === 3 || status === '3') return 'Hoàn thành';
  if (status === 4 || status === '4') return 'Đã hoàn tiền';  // dữ liệu cũ
  if (status === 5 || status === '5') return 'Yêu cầu hủy';
  if (status === 6 || status === '6') return 'Từ chối hủy';
  if (status === 7 || status === '7') return 'Chờ hoàn tiền';  // dữ liệu cũ
  return 'Chưa rõ';
};

// TripStatusConstant: Scheduled=0, Ongoing=1, Completed=2, Cancelled=3
export const labelTripStatus = (status) => {
  if (status === 0 || status === '0') return 'Đã lên lịch';
  if (status === 1 || status === '1') return 'Đang chạy';
  if (status === 2 || status === '2') return 'Hoàn thành';
  if (status === 3 || status === '3') return 'Đã hủy';
  return status ?? 'Chưa rõ';
};

// SeatHoldStatusConstant: Holding=0, Confirmed=1, Released=2
export const labelSeatStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'available') return 'Còn trống';
  if (value === 'booked') return 'Đã đặt';
  if (value === 'holdingbyme') return 'Bạn đang giữ';
  if (value === 'holdingbyother') return 'Người khác đang giữ';
  return status || 'Chưa rõ';
};

// RoleConstant: Customer=0, Operator=1, Admin=2
export const labelRole = (role) => {
  if (role === 0 || role === '0') return 'Khách hàng';
  if (role === 1 || role === '1') return 'Nhà xe';
  if (role === 2 || role === '2') return 'Quản trị viên';
  return role ?? 'Chua ro';
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
    licensePlate: pick(t, ['licensePlate', 'LicensePlate'], pick(rawBus, ['licensePlate', 'LicensePlate'], '')),
    busType: pick(t, ['busType', 'BusType', 'type', 'Type'], pick(rawBus, ['busType', 'BusType'])),
    price: Number(pick(t, ['price', 'Price'], 0)),
    availableSeats: Number(pick(t, ['availableSeats', 'AvailableSeats'], 0)),
    capacity: Number(pick(t, ['capacity', 'Capacity'], pick(rawBus, ['capacity', 'Capacity'], 0))),
    status: pick(t, ['status', 'Status'], ''),
    driverID: pick(t, ['driverID', 'DriverID']) ?? null,
    driverName: pick(t, ['driverName', 'DriverName']) ?? null,
  };
}