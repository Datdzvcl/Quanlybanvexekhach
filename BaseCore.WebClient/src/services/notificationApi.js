import { apiClient } from './httpClient';

export const notificationApi = {
  async my(take = 10) {
    const response = await apiClient.get('/api/notifications/my', { params: { take } });
    return response.data;
  },

  async markRead(id) {
    const response = await apiClient.put(`/api/notifications/${id}/read`);
    return response.data;
  },

  async markAllRead() {
    const response = await apiClient.put('/api/notifications/read-all');
    return response.data;
  },
};
