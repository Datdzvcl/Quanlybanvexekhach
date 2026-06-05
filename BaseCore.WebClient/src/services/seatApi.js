import { apiClient } from './httpClient';

export const seatApi = {
  async getByTrip(tripId, params) {
    const response = await apiClient.get(`/api/seats/trip/${tripId}`, { params });
    return response.data;
  },

  async hold(payload) {
    const response = await apiClient.post('/api/seats/hold', payload);
    return response.data;
  },

  async release(payload) {
    const response = await apiClient.post('/api/seats/release', payload);
    return response.data;
  },
};
