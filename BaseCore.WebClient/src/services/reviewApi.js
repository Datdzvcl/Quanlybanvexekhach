import { apiClient as httpClient } from './httpClient';

export const reviewApi = {
  getByBooking: (bookingId) =>
    httpClient.get(`/api/reviews/booking/${bookingId}`).then((r) => r.data),

  getByTrip: (tripId, page = 1, pageSize = 10) =>
    httpClient.get(`/api/reviews/trip/${tripId}?page=${page}&pageSize=${pageSize}`).then((r) => r.data),

  create: (data) =>
    httpClient.post('/api/reviews', data).then((r) => r.data),
};
