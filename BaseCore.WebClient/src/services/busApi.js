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

  // ── Image management ─────────────────────────────────────────
  async getImages(busId) {
    const response = await apiClient.get(`/api/busimages/bus/${busId}`);
    return response.data;
  },

  async addImage(payload) {
    const response = await apiClient.post('/api/busimages', payload);
    return response.data;
  },

  async uploadImage(busId, file) {
    const form = new FormData();
    form.append('busId', busId);
    form.append('file', file);
    const response = await apiClient.post('/api/busimages/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async setAvatar(imageId) {
    const response = await apiClient.patch(`/api/busimages/${imageId}/avatar`);
    return response.data;
  },

  async removeImage(imageId) {
    const response = await apiClient.delete(`/api/busimages/${imageId}`);
    return response.data;
  },
};
