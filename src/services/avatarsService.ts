import api from '@/lib/api';
import { DEFAULT_KNOWLEDGE_LEVEL, type KnowledgeLevel } from '@/lib/avatarKnowledge';

export interface ActivePricing {
  id?: number;
  price: number;
  currency: string;
  duration_minutes: number;
  credits?: number | null;
  validity_days: number;
  is_premium?: boolean;
  discount_percent?: number | null;
  trial_minutes?: number | null;
}

export interface AvatarCourseSummary {
  id: number;
  title: string;
  slug: string;
  subject_id?: number | null;
  track_id?: number | null;
  level_id?: number | null;
}

export interface AvatarLearningScope {
  id: number;
  subject_id?: number | null;
  track_id?: number | null;
  level_id?: number | null;
}

export interface AvatarLearningScopeAssignment {
  avatar_id: number;
  scopes: AvatarLearningScope[];
}

export interface Avatar {
  id: number;
  avatar_name: string;
  category: string;
  persona: string;
  authority_level?: string;
  knowledge_source?: string;
  creator_type?: string;
  response_length?: string;
  question_frequency?: string;
  sensitivity_level?: string;
  memory_permission?: string;
  prompt_content?: string;
  greeting_message?: string;
  backstory?: string;
  primary_language?: string;
  response_language_code?: string;
  response_language_name?: string;
  response_language_native_name?: string;
  response_language_locale?: string;
  emotions?: number[] | { id: number; name: string }[];
  tones?: number[] | { id: number; name: string }[];
  domains?: number[] | { id: number; name: string }[];
  modes?: number[] | { id: number; name: string }[];
  communication_styles?: number[] | { id: number; name: string }[];
  deliveries?: number[] | { id: number; name: string }[];
  system_safety?: number[] | { id: number; name: string }[];
  // Pricing fields
  trial_minutes?: number;
  credits_per_minute?: number;
  one_time_price?: number;
  one_time_credits?: number;
  one_time_minutes?: number;
  video_url?: string;
  // HeyGen fields
  heygen_avatar_id?: string;
  heygen_voice_id?: string;
  heygen_preview_image?: string;
  heygen_preview_video?: string;
  heygen_gender?: string;
  heygen_language?: string;
  is_interactive?: boolean;
  avatar_type?: string;
  active_pricing?: ActivePricing | null;
  mapped_courses?: AvatarCourseSummary[];
  learning_scopes?: AvatarLearningScope[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AvatarListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
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

export const avatarsService = {
  list: async (params?: AvatarListParams): Promise<ApiResponse<Avatar>> => {
    const normalizedParams = {
      ...params,
      limit: params?.limit ? Math.min(params.limit, 100) : params?.limit,
    };
    const res = await api.get('/avatars', { params: normalizedParams });
    return normalizeResponse<Avatar>(res.data);
  },
  get: async (id: number): Promise<Avatar> => {
    const res = await api.get(`/avatars/${id}`);
    return res.data.data || res.data;
  },
  create: async (data: Partial<Avatar>): Promise<Avatar> => {
    const res = await api.post('/avatars', data);
    return res.data.data || res.data;
  },
  update: async (id: number, data: Partial<Avatar>): Promise<Avatar> => {
    const res = await api.put(`/avatars/${id}`, data);
    return res.data.data || res.data;
  },
  toggle: async (id: number): Promise<Avatar> => {
    const res = await api.patch(`/avatars/${id}/toggle`);
    return res.data.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/avatars/${id}`);
  },
  getKnowledgeDocuments: async (avatarId: number) => {
    const res = await api.get(`/avatars/${avatarId}/knowledge`);
    return res.data;
  },
  uploadKnowledgeDocument: async (
    avatarId: number,
    file: File,
    knowledgeLevel: KnowledgeLevel = DEFAULT_KNOWLEDGE_LEVEL
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('knowledge_level', knowledgeLevel);
    const res = await api.post(`/avatars/${avatarId}/knowledge/upload`, formData);
    return res.data;
  },
  deleteKnowledgeDocument: async (avatarId: number, documentId: number) => {
    await api.delete(`/avatars/${avatarId}/knowledge/${documentId}`);
  },
  getMappedCourses: async (avatarId: number): Promise<AvatarCourseSummary[]> => {
    const res = await api.get(`/admin/avatars/${avatarId}/courses`);
    const payload = res.data?.data || res.data;
    return Array.isArray(payload?.courses) ? payload.courses : [];
  },
  assignMappedCourses: async (avatarId: number, courseIds: number[]) => {
    const res = await api.post(`/admin/avatars/${avatarId}/courses`, {
      course_ids: courseIds,
    });
    return res.data?.data || res.data;
  },
  getLearningScopes: async (avatarId: number): Promise<AvatarLearningScope[]> => {
    const res = await api.get(`/admin/avatars/${avatarId}/learning-scopes`);
    const payload = res.data?.data || res.data;
    return Array.isArray(payload?.scopes) ? payload.scopes : [];
  },
  assignLearningScopes: async (
    avatarId: number,
    payload: { subject_ids: number[]; track_id?: number | null; level_id?: number | null }
  ): Promise<AvatarLearningScopeAssignment> => {
    const res = await api.post(`/admin/avatars/${avatarId}/learning-scopes`, {
      subject_ids: payload.subject_ids,
      track_id: payload.track_id ?? null,
      level_id: payload.level_id ?? null,
    });
    return res.data?.data || res.data;
  },
};

