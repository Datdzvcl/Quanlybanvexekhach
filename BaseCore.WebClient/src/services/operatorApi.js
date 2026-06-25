import { apiClient } from './httpClient';

export const operatorApi = {
  async list(params) {
    const response = await apiClient.get('/api/operators', { params });
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/operators/${id}`);
    return response.data;
  },

  async getProfile(id) {
    const response = await apiClient.get(`/api/operators/${id}/profile`);
    return response.data;
  },

  async create(payload) {
    const response = await apiClient.post('/api/operators', payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.put(`/api/operators/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`/api/operators/${id}`);
    return response.data;
  },

  async approve(id) {
    const response = await apiClient.put(`/api/operators/${id}/approve`);
    return response.data;
  },

  async reject(id, reason) {
    const response = await apiClient.put(`/api/operators/${id}/reject`, { reason });
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get('/api/operators/me');
    return response.data;
  },

  async updateMe(payload) {
    const response = await apiClient.put('/api/operators/me', payload);
    return response.data;
  },
};
