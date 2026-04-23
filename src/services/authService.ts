import api from '@/lib/api';

const authService = {
  async login(credentials: { login_id: string; password: string }) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(data: { email: string; password: string; username?: string; phone?: string }) {
    const response = await api.post('/users/register', data);
    return response.data;
  },

  async logout(refresh_token: string) {
    const response = await api.post('/auth/logout', null, { params: { refresh_token } });
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/users/me');
    return response.data;
  },

  async updateProfile(data: { name?: string; phone?: string }) {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  async changePassword(data: { oldPassword: string; newPassword: string }) {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },
};

export default authService;
