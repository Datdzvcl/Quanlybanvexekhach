import { apiClient } from './httpClient';

export const bookingApi = {
  async create(payload) {
    const response = await apiClient.post('/api/bookings', payload);
    return response.data;
  },

  async my() {
    const response = await apiClient.get('/api/bookings/my');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/bookings/${id}`);
    return response.data;
  },

  async requestCancel(id, payload) {
    const response = await apiClient.put(`/api/bookings/${id}/request-cancel`, payload);
    return response.data;
  },

  async adminList(params) {
    const response = await apiClient.get('/api/bookings', { params });
    return response.data;
  },

  async confirm(id) {
    const response = await apiClient.put(`/api/bookings/${id}/confirm`);
    return response.data;
  },

  async approveCancel(id, payload) {
    const response = await apiClient.put(`/api/bookings/${id}/approve-cancel`, payload);
    return response.data;
  },

  async rejectCancel(id, payload) {
    const response = await apiClient.put(`/api/bookings/${id}/reject-cancel`, payload);
    return response.data;
  },

  async updatePaymentStatus(id, status) {
    const response = await apiClient.put(`/api/bookings/${id}/payment-status`, status);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`/api/bookings/${id}`);
    return response.data;
  },
};
