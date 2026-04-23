import api from '@/lib/api';

export interface OnboardingMaster {
  id: number;
  key: string;
  label: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface OnboardingListResponse {
  data: OnboardingMaster[];
  total: number;
  page: number;
  limit: number;
}

const normalizeOnboardingMaster = (item: any): OnboardingMaster => ({
  id: item?.id,
  key: item?.key ?? '',
  label: item?.label ?? '',
  description: item?.description ?? '',
  is_active: Boolean(item?.is_active),
  created_at: item?.created_at ?? item?.createdAt,
  updated_at: item?.updated_at ?? item?.updatedAt,
});

const createOnboardingService = (endpoint: string) => ({
  list: async (params: OnboardingListParams = {}): Promise<OnboardingListResponse> => {
    const response = await api.get(`/admin/onboarding-masters/${endpoint}`, { params });
    const result = response.data;
    // Handle response with meta object: { data: [], meta: { page, limit, total } }
    if (result.data && result.meta) {
      return {
        data: result.data.map(normalizeOnboardingMaster),
        total: result.meta.total ?? result.data.length,
        page: result.meta.page ?? params.page ?? 1,
        limit: result.meta.limit ?? params.limit ?? 10,
      };
    }
    // Handle response with data at root level
    if (result.data) {
      return {
        data: result.data.map(normalizeOnboardingMaster),
        total: result.total ?? result.data.length,
        page: result.page ?? params.page ?? 1,
        limit: result.limit ?? params.limit ?? 10,
      };
    }
    // Handle array response
    if (Array.isArray(result)) {
      return { data: result.map(normalizeOnboardingMaster), total: result.length, page: params.page || 1, limit: params.limit || 10 };
    }
    return { data: [], total: 0, page: 1, limit: 10 };
  },

  getById: async (id: number): Promise<OnboardingMaster> => {
    const response = await api.get(`/admin/onboarding-masters/${endpoint}/${id}`);
    return normalizeOnboardingMaster(response.data?.data ?? response.data);
  },

  create: async (data: { key: string; label: string; description?: string }): Promise<OnboardingMaster> => {
    const response = await api.post(`/admin/onboarding-masters/${endpoint}`, data);
    return normalizeOnboardingMaster(response.data?.data ?? response.data);
  },

  update: async (id: number, data: { label?: string; key?: string; description?: string }): Promise<OnboardingMaster> => {
    const response = await api.put(`/admin/onboarding-masters/${endpoint}/${id}`, data);
    return normalizeOnboardingMaster(response.data?.data ?? response.data);
  },

  toggleStatus: async (id: number): Promise<{ success: boolean; id: number; is_active: boolean }> => {
    const response = await api.patch(`/admin/onboarding-masters/${endpoint}/${id}/toggle`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/onboarding-masters/${endpoint}/${id}`);
  },
});

export const interestsService = createOnboardingService('interests');
export const supportTypesService = createOnboardingService('support-types');
export const interactionStylesService = createOnboardingService('interaction-styles');
