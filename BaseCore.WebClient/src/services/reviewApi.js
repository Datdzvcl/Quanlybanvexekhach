import { apiClient } from './httpClient';

export const reviewApi = {
  async list(params) {
    const response = await apiClient.get('/api/reviews', { params });
    return response.data;
  },

  async suggestTrips(query) {
    const response = await apiClient.get('/api/reviews/suggest-trips', {
      params: { q: query },
    });
    return response.data;
  },

  async suggestOperators(query) {
    const response = await apiClient.get('/api/reviews/suggest-operators', {
      params: { q: query },
    });
    return response.data;
  },

  async byTrip(tripId) {
    const response = await apiClient.get(`/api/reviews/trip/${tripId}`);
    return response.data;
  },

  async byOperator(operatorId) {
    const response = await apiClient.get(`/api/reviews/operator/${operatorId}`);
    return response.data;
  },

  async byBooking(bookingId) {
    const response = await apiClient.get(`/api/reviews/booking/${bookingId}`);
    return response.data;
  },

  async create(payload) {
    const response = await apiClient.post('/api/reviews', payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.put(`/api/reviews/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`/api/reviews/${id}`);
    return response.data;
  },
  async listOperator(params) {
  const response = await apiClient.get('/api/operator/reviews', { params });
  return response.data;
},

async reply(id, content) {
  const response = await apiClient.put(`/api/reviews/${id}/reply`, { replyContent: content });
  return response.data;
},

async hide(id) {
  const response = await apiClient.put(`/api/reviews/${id}/hide`);
  return response.data;
},

async show(id) {
  const response = await apiClient.put(`/api/reviews/${id}/show`);
  return response.data;
},
};
