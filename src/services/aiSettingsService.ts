import api from '@/lib/api';

export interface AISettings {
  id: number;
  title: string;
  description?: string;
  api_keys?: {
    provider?: string;
    api_key?: string;
    model?: string;
    endpoint?: string;
  };
  status?: boolean;
  is_current?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AISettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
}

interface ApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

const normalizeResponse = <T>(response: any): ApiResponse<T> => {
  if (response.data && response.meta) {
    return response;
  }
  if (Array.isArray(response.data)) {
    return {
      data: response.data,
      meta: {
        page: response.page || 1,
        limit: response.limit || 10,
        total: response.total || response.data.length,
        totalPages: response.total_pages || Math.ceil((response.total || response.data.length) / (response.limit || 10)),
      },
    };
  }
  return {
    data: [],
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
  };
};

export const aiSettingsService = {
  list: async (params?: AISettingsListParams): Promise<ApiResponse<AISettings>> => {
    const res = await api.get('/ai-settings', { params });
    return normalizeResponse<AISettings>(res.data);
  },
  get: async (id: number): Promise<AISettings> => {
    const res = await api.get(`/ai-settings/${id}`);
    return res.data.data || res.data;
  },
  getCurrent: async (): Promise<AISettings> => {
    const res = await api.get('/ai-settings/current');
    return res.data.data || res.data;
  },
  create: async (data: Partial<AISettings>): Promise<AISettings> => {
    const res = await api.post('/ai-settings', data);
    return res.data.data || res.data;
  },
  update: async (id: number, data: Partial<AISettings>): Promise<AISettings> => {
    const res = await api.patch(`/ai-settings/${id}`, data);
    return res.data.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/ai-settings/${id}`);
  },
};
