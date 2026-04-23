import api from '@/lib/api';

export interface ProfileCategory {
  id: number;
  key: string;
  label: string;
  description?: string;
  sort_order: number;
  is_multi_select: boolean;
  is_required: boolean;
  is_active: boolean;
  option_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileOption {
  id: number;
  category_id: number;
  key: string;
  label: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const normalizeCategory = (item: any): ProfileCategory => ({
  id: item?.id,
  key: item?.key ?? '',
  label: item?.label ?? '',
  description: item?.description ?? '',
  sort_order: item?.sort_order ?? 0,
  is_multi_select: Boolean(item?.is_multi_select ?? true),
  is_required: Boolean(item?.is_required ?? true),
  is_active: Boolean(item?.is_active),
  option_count: item?.option_count,
  created_at: item?.created_at,
  updated_at: item?.updated_at,
});

const normalizeOption = (item: any): ProfileOption => ({
  id: item?.id,
  category_id: item?.category_id,
  key: item?.key ?? '',
  label: item?.label ?? '',
  description: item?.description ?? '',
  sort_order: item?.sort_order ?? 0,
  is_active: Boolean(item?.is_active),
  created_at: item?.created_at,
  updated_at: item?.updated_at,
});

const extractPaginated = <T>(result: any, normalizer: (x: any) => T): PaginatedResponse<T> => {
  if (result.data && result.meta) {
    return {
      data: result.data.map(normalizer),
      total: result.meta.total ?? result.data.length,
      page: result.meta.page ?? 1,
      limit: result.meta.limit ?? 50,
    };
  }
  if (Array.isArray(result)) {
    return { data: result.map(normalizer), total: result.length, page: 1, limit: 50 };
  }
  return { data: [], total: 0, page: 1, limit: 50 };
};

export const categoriesService = {
  list: async (params: ListParams = {}): Promise<PaginatedResponse<ProfileCategory>> => {
    const response = await api.get('/admin/profile-builder/categories', { params });
    return extractPaginated(response.data, normalizeCategory);
  },

  getById: async (id: number): Promise<ProfileCategory> => {
    const response = await api.get(`/admin/profile-builder/categories/${id}`);
    return normalizeCategory(response.data?.data ?? response.data);
  },

  create: async (data: {
    key: string;
    label: string;
    description?: string;
    sort_order?: number;
    is_multi_select?: boolean;
    is_required?: boolean;
  }): Promise<ProfileCategory> => {
    const response = await api.post('/admin/profile-builder/categories', data);
    return normalizeCategory(response.data?.data ?? response.data);
  },

  update: async (
    id: number,
    data: Partial<{ label: string; description: string; sort_order: number; is_multi_select: boolean; is_required: boolean; is_active: boolean }>
  ): Promise<ProfileCategory> => {
    const response = await api.put(`/admin/profile-builder/categories/${id}`, data);
    return normalizeCategory(response.data?.data ?? response.data);
  },

  toggleStatus: async (id: number): Promise<{ success: boolean; id: number; is_active: boolean }> => {
    const response = await api.patch(`/admin/profile-builder/categories/${id}/toggle`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/profile-builder/categories/${id}`);
  },
};

export const optionsService = {
  list: async (categoryId: number, params: ListParams = {}): Promise<PaginatedResponse<ProfileOption>> => {
    const response = await api.get(`/admin/profile-builder/categories/${categoryId}/options`, { params });
    return extractPaginated(response.data, normalizeOption);
  },

  create: async (
    categoryId: number,
    data: { key: string; label: string; description?: string; sort_order?: number }
  ): Promise<ProfileOption> => {
    const response = await api.post(`/admin/profile-builder/categories/${categoryId}/options`, data);
    return normalizeOption(response.data?.data ?? response.data);
  },

  update: async (
    categoryId: number,
    optionId: number,
    data: Partial<{ label: string; description: string; sort_order: number; is_active: boolean }>
  ): Promise<ProfileOption> => {
    const response = await api.put(`/admin/profile-builder/categories/${categoryId}/options/${optionId}`, data);
    return normalizeOption(response.data?.data ?? response.data);
  },

  toggleStatus: async (
    categoryId: number,
    optionId: number
  ): Promise<{ success: boolean; id: number; is_active: boolean }> => {
    const response = await api.patch(
      `/admin/profile-builder/categories/${categoryId}/options/${optionId}/toggle`
    );
    return response.data;
  },

  delete: async (categoryId: number, optionId: number): Promise<void> => {
    await api.delete(`/admin/profile-builder/categories/${categoryId}/options/${optionId}`);
  },
};
