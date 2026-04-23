import api from '@/lib/api';

export interface SocialAccount {
  platform: string;
  url: string;
}

export interface WebsiteSettings {
  id?: number;
  website_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  logo_url?: string;
  favicon_url?: string;
  is_active?: boolean;
  // Credits & Billing
  currency?: string;
  credits_per_currency?: number;
  trial_reset_days?: number;
  purchase_validity_days?: number;
  low_balance_warning_mins?: number;
  deduction_interval_mins?: number;
  // Referral System
  referral_enabled?: boolean;
  referrer_reward_credits?: number;
  referred_signup_bonus?: number;
  referral_reward_on?: string;
  // Billing / Invoice
  gstin?: string;
  pan_number?: string;
  billing_company_name?: string;
  billing_footer_note?: string;
  // Social Accounts
  social_accounts?: SocialAccount[];
  created_at?: string;
  updated_at?: string;
}

export interface ContentPage {
  id: number;
  title: string;
  slug?: string;
  content_html: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContentPageListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface ContentPageListResponse {
  data: ContentPage[];
  total: number;
  page: number;
  limit: number;
}

export const websiteSettingsService = {
  get: async (): Promise<WebsiteSettings> => {
    const response = await api.get('/website-settings');
    return response.data;
  },

  update: async (data: Partial<WebsiteSettings>): Promise<WebsiteSettings> => {
    const response = await api.patch('/website-settings', data);
    return response.data;
  },

  toggleStatus: async (): Promise<WebsiteSettings> => {
    const response = await api.patch('/website-settings/toggle');
    return response.data;
  },
};

export const contentPagesService = {
  list: async (params: ContentPageListParams = {}): Promise<ContentPageListResponse> => {
    const response = await api.get('/content-pages', { params });
    return response.data;
  },

  getById: async (id: number): Promise<ContentPage> => {
    const response = await api.get(`/content-pages/${id}`);
    return response.data;
  },

  getBySlug: async (slug: string): Promise<ContentPage> => {
    const response = await api.get(`/content-pages/slug/${slug}`);
    return response.data;
  },

  create: async (data: Partial<ContentPage>): Promise<ContentPage> => {
    const response = await api.post('/content-pages', data);
    return response.data;
  },

  update: async (id: number, data: Partial<ContentPage>): Promise<ContentPage> => {
    const response = await api.patch(`/content-pages/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id: number): Promise<ContentPage> => {
    const response = await api.patch(`/content-pages/${id}/toggle`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/content-pages/${id}`);
  },
};
