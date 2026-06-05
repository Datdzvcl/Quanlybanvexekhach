import { apiClient } from './httpClient';

export const userApi = {
  async list(params) {
    const response = await apiClient.get('/api/users', { params });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await apiClient.post('/api/users', payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.put(`/api/users/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  },
};
