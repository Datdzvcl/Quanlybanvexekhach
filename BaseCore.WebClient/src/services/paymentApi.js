import { apiClient } from './httpClient';

export const paymentApi = {
  async list(params) {
    const response = await apiClient.get('/api/bookings', { params });
    return response.data;
  },

  async byBooking(bookingId) {
    const response = await apiClient.get(`/api/payments/booking/${bookingId}`);
    return response.data;
  },

  async simulate(payload) {
    const response = await apiClient.post('/api/payments/simulate', payload);
    return response.data;
  },

  async confirm(id, payload = {}) {
    const response = await apiClient.put(`/api/payments/${id}/confirm`, payload);
    return response.data;
  },
};
