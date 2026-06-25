import { apiClient } from './httpClient';

export const promotionApi = {
  async list() {
    const response = await apiClient.get('/api/promotions');
    return response.data;
  },

  async publicList() {
    const response = await apiClient.get('/api/promotions/public');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/api/promotions/${id}`);
    return response.data;
  },

  async create(payload) {
    const response = await apiClient.post('/api/promotions', payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.put(`/api/promotions/${id}`, payload);
    return response.data;
  },

  async disable(id) {
    const response = await apiClient.delete(`/api/promotions/${id}`);
    return response.data;
  },

  async validate(payload) {
    const response = await apiClient.post('/api/promotions/validate', payload);
    return response.data;
  },
};
