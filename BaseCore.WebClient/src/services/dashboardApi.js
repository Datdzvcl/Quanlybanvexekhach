import { apiClient } from './httpClient';

export const dashboardApi = {
  async stats() {
    const response = await apiClient.get('/api/dashboard/stats');
    return response.data;
  },
};
