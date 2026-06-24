import { apiClient } from './httpClient';

export const dashboardApi = {
  async stats() {
    const response = await apiClient.get('/api/dashboard/stats');
    return response.data;
  },

  async adminSummary(params) {
    const response = await apiClient.get('/api/admin/dashboard-summary', { params });
    return response.data;
  },

  async revenueByDay(params) {
    const response = await apiClient.get('/api/admin/revenue-by-day', { params });
    return response.data;
  },

  async revenueByMonth(params) {
    const response = await apiClient.get('/api/admin/revenue-by-month', { params });
    return response.data;
  },

  async topRoutes(params) {
    const response = await apiClient.get('/api/admin/top-routes', { params });
    return response.data;
  },

  async topOperators(params) {
    const response = await apiClient.get('/api/admin/top-operators', { params });
    return response.data;
  },

  async bookingStatusStatistics(params) {
    const response = await apiClient.get('/api/admin/booking-status-statistics', { params });
    return response.data;
  },

  async recentBookings() {
    const response = await apiClient.get('/api/admin/bookings');
    return Array.isArray(response.data) ? response.data : [];
  },
};
