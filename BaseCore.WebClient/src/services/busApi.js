import { apiClient } from './httpClient';

export const busApi = {
  async list(params) {
    const response = await apiClient.get('/api/buses', { params });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/buses/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await apiClient.post('/api/buses', payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.put(`/api/buses/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`/api/buses/${id}`);
    return response.data;
  },
};
