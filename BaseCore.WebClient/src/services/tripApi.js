import { apiClient } from './httpClient';

export const tripApi = {
  async search(params) {
    const response = await apiClient.get('/api/trips/search', { params });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/trips/${id}`);
    return response.data;
  },

  async getStops(id) {
    const response = await apiClient.get(`/api/trips/${id}/stops`);
    return response.data;
  },

  async adminList(params) {
    const response = await apiClient.get('/api/trips/admin', { params });
    return response.data;
  },

  async getBookings(id, params) {
    const response = await apiClient.get(`/api/trips/${id}/bookings`, { params });
    return response.data;
  },

  async create(payload) {
    const response = await apiClient.post('/api/trips', payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.put(`/api/trips/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`/api/trips/${id}`);
    return response.data;
  },
};
