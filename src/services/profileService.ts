import api from '@/lib/api';

export interface ProfileData {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  role_id: number;
  status: number;
  has_password: boolean;

  // ✅ Derived UI Role (not from API directly)
  role?: 'Admin' | 'Employee' | 'Client' | 'User';
}

// ✅ Central Role Mapping (Very Important SaaS Practice)
const ROLE_MAP: Record<number, ProfileData['role']> = {
  1: 'Admin',
  2: 'Employee',
  3: 'Client',
};

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  reauth_token?: string;
}

const profileService = {
  getProfile: async (): Promise<ProfileData> => {
    const res = await api.get('/profile');

    const data = res.data;

    return {
      ...data,
      role: ROLE_MAP[data.role_id] || 'User',
    };
  },

  updateProfile: async (data: ProfileUpdatePayload): Promise<ProfileData> => {
    const res = await api.put('/profile', data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordPayload): Promise<{ message: string }> => {
    const res = await api.post('/profile/change-password', data);
    return res.data;
  },
};

export default profileService;
