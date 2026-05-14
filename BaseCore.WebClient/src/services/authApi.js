import { authClient } from './httpClient';

export const authApi = {
  async login({ emailOrPhone, email, phone, login, password }) {
    const identifier = emailOrPhone || login || email || phone;
    const response = await authClient.post('/api/auth/login', {
      login: identifier,
      emailOrPhone: identifier,
      email,
      phone,
      password,
    });
    return response.data;
  },

  async register({ fullName, email, phone, password }) {
    const response = await authClient.post('/api/auth/register', {
      fullName,
      email,
      phone,
      password,
    });
    return response.data;
  },

  async me() {
    const response = await authClient.get('/api/auth/me');
    return response.data;
  },
};
