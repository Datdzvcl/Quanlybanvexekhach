import { apiClient as httpClient } from './httpClient';

export const notificationApi = {
  getMyNotifications: (page = 1, pageSize = 20) =>
    httpClient.get(`/api/notifications/my?page=${page}&pageSize=${pageSize}`).then((r) => r.data),

  markRead: (id) =>
    httpClient.put(`/api/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    httpClient.put('/api/notifications/read-all').then((r) => r.data),
};
