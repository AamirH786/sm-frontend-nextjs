import api from '@/lib/api';

export interface AvatarPricing {
  id: number;
  avatar_id: number;
  price: number;
  currency: string;
  duration_minutes: number;
  credits: number | null;
  validity_days: number;
  is_premium: boolean;
  discount_percent: number;
  trial_minutes: number;
  reason: string;
  is_active: boolean;
  created_at: string;
  deactivated_at?: string;
  deactivation_reason?: string;
}

export interface CreatePricingData {
  avatar_id: number;
  price: number;
  currency: string;
  duration_minutes: number;
  credits?: number | null;
  validity_days: number;
  is_premium?: boolean;
  discount_percent?: number;
  trial_minutes?: number;
  reason: string;
}

export const avatarPricingService = {
  create: async (data: CreatePricingData): Promise<AvatarPricing> => {
    const res = await api.post('/avatar-pricing', data);
    return res.data.data || res.data;
  },

  getActive: async (avatarId: number): Promise<AvatarPricing | null> => {
    try {
      const res = await api.get(`/avatar-pricing/active/${avatarId}`);
      return res.data.data || res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  getHistory: async (avatarId: number): Promise<AvatarPricing[]> => {
    try {
      const res = await api.get(`/avatar-pricing/history/${avatarId}`);
      return res.data.data || res.data || [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  },

  deactivate: async (id: number, reason: string): Promise<AvatarPricing> => {
    const res = await api.patch(`/avatar-pricing/${id}/deactivate?reason=${encodeURIComponent(reason)}`);
    return res.data.data || res.data;
  },
};
