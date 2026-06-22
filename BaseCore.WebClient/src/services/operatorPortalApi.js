import { apiClient } from './httpClient';

export const operatorPortalApi = {
  async me() {
    const response = await apiClient.get('/api/operator-portal/me');
    return response.data;
  },

  async dashboard() {
    const response = await apiClient.get('/api/operator-portal/dashboard');
    return response.data;
  },

  async listBuses(params) {
    const response = await apiClient.get('/api/operator-portal/buses', { params });
    return response.data;
  },

  async getBus(id) {
    const response = await apiClient.get(`/api/operator-portal/buses/${id}`);
    return response.data;
  },

  async uploadBusImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post('/api/operator-portal/buses/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async createBus(payload) {
    const response = await apiClient.post('/api/operator-portal/buses', payload);
    return response.data;
  },

  async updateBus(id, payload) {
    const response = await apiClient.put(`/api/operator-portal/buses/${id}`, payload);
    return response.data;
  },

  async removeBus(id) {
    const response = await apiClient.delete(`/api/operator-portal/buses/${id}`);
    return response.data;
  },

  async listTrips(params) {
    const response = await apiClient.get('/api/operator-portal/trips', { params });
    return response.data;
  },

  async getTrip(id) {
    const response = await apiClient.get(`/api/operator-portal/trips/${id}`);
    return response.data;
  },

  async createTrip(payload) {
    const response = await apiClient.post('/api/operator-portal/trips', payload);
    return response.data;
  },

  async updateTrip(id, payload) {
    const response = await apiClient.put(`/api/operator-portal/trips/${id}`, payload);
    return response.data;
  },

  async completeTrip(id) {
    const response = await apiClient.put(`/api/operator-portal/trips/${id}/complete`);
    return response.data;
  },

  async removeTrip(id) {
    const response = await apiClient.delete(`/api/operator-portal/trips/${id}`);
    return response.data;
  },

  async cloneTrip(id, payload) {
    const response = await apiClient.post(`/api/operator-portal/trips/${id}/clone`, payload);
    return response.data;
  },

  async revenueReport(params) {
    const response = await apiClient.get('/api/operator-portal/reports/revenue', { params });
    return response.data;
  },
};
