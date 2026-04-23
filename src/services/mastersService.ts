import api from '@/lib/api';

export interface Master {
  id: number;
  name: string;
  category_id?: number | null;
  subject_id?: number | null;
  subject_name?: string | null;
  description?: string;
  is_duplicate_locked?: boolean;
  is_active: boolean;
  status: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  avatar_count?: number;
  avatars_count?: number;
  usage_count?: number;
  linked_avatar_count?: number;
  assigned_avatar_count?: number;
  avatar_usages?: unknown[];
  avatars?: unknown[];
  linked_avatars?: unknown[];
  advice_depth?: number;
  directness?: number;
  steps_limit?: number;
  sentence_length?: number;
  pause_markers?: boolean;
  emotion_pacing?: number;
  speak_friendly?: boolean;
}

export interface MasterListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: number;
  sort?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PersonaDuplicateCheckResponse {
  duplicate: boolean;
  is_locked: boolean;
  existing?: Master | null;
}

export interface PersonaSuggestionItem {
  label: string;
  description: string;
}

export interface PersonaSuggestionResponse {
  suggestions: PersonaSuggestionItem[];
  source: string;
  cached: boolean;
  usage?: Record<string, unknown> | null;
  reason?: string | null;
}

export interface PersonaCategory {
  id: number;
  tenant_id?: number | null;
  name: string;
  description?: string | null;
  position?: number | null;
}

type PersonaSubjectBinding = {
  subject_id: number | null;
  subject_name?: string | null;
};

const PERSONA_SUBJECT_BINDINGS_KEY = 'sm_persona_subject_bindings';

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['1', 'true', 'active'].includes(value.toLowerCase());
  return false;
};

const readPersonaSubjectBindings = (): Record<string, PersonaSubjectBinding> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(PERSONA_SUBJECT_BINDINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writePersonaSubjectBindings = (bindings: Record<string, PersonaSubjectBinding>) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PERSONA_SUBJECT_BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    // ignore storage issues and keep API flow working
  }
};

const persistPersonaSubjectBinding = (personaId: number | string | undefined, binding: PersonaSubjectBinding) => {
  if (typeof personaId === 'undefined' || personaId === null) return;
  const bindings = readPersonaSubjectBindings();
  bindings[String(personaId)] = binding;
  writePersonaSubjectBindings(bindings);
};

const removePersonaSubjectBinding = (personaId: number | string) => {
  const bindings = readPersonaSubjectBindings();
  if (!(String(personaId) in bindings)) return;
  delete bindings[String(personaId)];
  writePersonaSubjectBindings(bindings);
};

const normalizeMasterRecord = (record: any): Master => {
  const isActive =
    typeof record?.is_active !== 'undefined'
      ? toBoolean(record.is_active)
      : toBoolean(record?.status);
  const cachedPersonaBinding = record?.id != null ? readPersonaSubjectBindings()[String(record.id)] : null;
  const rawSubjectId =
    typeof record?.subject_id !== 'undefined'
      ? record.subject_id
      : typeof record?.sub_category_id !== 'undefined'
        ? record.sub_category_id
        : typeof record?.subject?.id !== 'undefined'
          ? record.subject.id
          : cachedPersonaBinding?.subject_id;
  const normalizedSubjectId = rawSubjectId !== null && typeof rawSubjectId !== 'undefined' ? Number(rawSubjectId) : null;
  const normalizedSubjectName =
    record?.subject_name ??
    record?.sub_category_name ??
    record?.subject?.name ??
    cachedPersonaBinding?.subject_name ??
    null;

  if (record?.id != null && (normalizedSubjectId !== null || normalizedSubjectName)) {
    persistPersonaSubjectBinding(record.id, {
      subject_id: normalizedSubjectId,
      subject_name: normalizedSubjectName,
    });
  }

  return {
    ...record,
    is_active: isActive,
    subject_id: normalizedSubjectId,
    subject_name: normalizedSubjectName,
    status:
      typeof record?.status !== 'undefined'
        ? toBoolean(record.status)
        : isActive,
    created_at: record?.created_at ?? record?.createdAt,
    updated_at: record?.updated_at ?? record?.updatedAt,
    deleted_at: record?.deleted_at ?? record?.deletedAt,
  };
};

const extractListPayload = (response: any): { data: any[]; meta?: any } => {
  if (Array.isArray(response)) {
    return { data: response };
  }

  if (Array.isArray(response?.data)) {
    return {
      data: response.data,
      meta: response.meta,
    };
  }

  if (Array.isArray(response?.data?.data)) {
    return {
      data: response.data.data,
      meta: response.data.meta ?? response.meta,
    };
  }

  if (Array.isArray(response?.items)) {
    return {
      data: response.items,
      meta: response.meta ?? response.pagination,
    };
  }

  return { data: [], meta: response?.meta };
};

const normalizeResponse = <T>(response: any): ApiResponse<T> => {
  const { data, meta } = extractListPayload(response);
  const normalizedData = data.map((item) => normalizeMasterRecord(item)) as T[];
  const total = meta?.total ?? response?.total ?? normalizedData.length;
  const limit = (meta?.limit ?? response?.limit ?? normalizedData.length) || 10;

  return {
    data: normalizedData,
    meta: {
      page: meta?.page ?? response?.page ?? 1,
      limit,
      total,
      totalPages:
        meta?.totalPages ??
        response?.total_pages ??
        (limit > 0 ? Math.ceil(total / limit) : 1),
    },
  };
};

const createMasterService = (endpoint: string) => ({
  list: async (params?: MasterListParams): Promise<ApiResponse<Master>> => {
    const res = await api.get(`/masters/${endpoint}`, { params });
    return normalizeResponse<Master>(res.data);
  },
  get: async (id: number): Promise<Master> => {
    const res = await api.get(`/masters/${endpoint}/${id}`);
    return normalizeMasterRecord(res.data.data || res.data);
  },
  create: async (data: Partial<Master>): Promise<Master> => {
    const res = await api.post(`/masters/${endpoint}`, data);
    return normalizeMasterRecord(res.data.data || res.data);
  },
  update: async (id: number, data: Partial<Master>): Promise<Master> => {
    const res = await api.put(`/masters/${endpoint}/${id}`, data);
    return normalizeMasterRecord(res.data.data || res.data);
  },
  toggle: async (id: number): Promise<Master> => {
    const res = await api.patch(`/masters/${endpoint}/${id}/toggle`);
    return normalizeMasterRecord(res.data.data || res.data);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/masters/${endpoint}/${id}`);
  },
});

export const emotionsService = createMasterService('emotions');
export const tonesService = createMasterService('tones');
export const communicationStylesService = createMasterService('communication-styles');
export const modesService = createMasterService('modes');
export const domainsService = createMasterService('domains');
export const deliveryService = createMasterService('delivery');
export const systemSafetyService = createMasterService('system-safety');
export const departmentsService = createMasterService('departments');
export const designationsService = createMasterService('designations');
export const personasService = {
  list: async (params?: MasterListParams): Promise<ApiResponse<Master>> => {
    const res = await api.get('/personas/', { params });
    return normalizeResponse<Master>(res.data);
  },
  create: async (data: Partial<Master>): Promise<Master> => {
    const res = await api.post('/personas/', data);
    const normalized = normalizeMasterRecord(res.data.data || res.data);
    if (normalized.id && Object.prototype.hasOwnProperty.call(data, 'subject_id')) {
      persistPersonaSubjectBinding(normalized.id, {
        subject_id: data.subject_id != null ? Number(data.subject_id) : null,
        subject_name: normalized.subject_name ?? null,
      });
      return {
        ...normalized,
        subject_id: data.subject_id != null ? Number(data.subject_id) : null,
      };
    }
    return normalized;
  },
  update: async (id: number, data: Partial<Master>): Promise<Master> => {
    const res = await api.put(`/personas/${id}`, data);
    const normalized = normalizeMasterRecord(res.data.data || res.data);
    if (Object.prototype.hasOwnProperty.call(data, 'subject_id')) {
      persistPersonaSubjectBinding(id, {
        subject_id: data.subject_id != null ? Number(data.subject_id) : null,
        subject_name: normalized.subject_name ?? null,
      });
      return {
        ...normalized,
        subject_id: data.subject_id != null ? Number(data.subject_id) : null,
      };
    }
    return normalized;
  },
  toggle: async (id: number): Promise<Master> => {
    const res = await api.patch(`/personas/${id}/toggle`);
    return normalizeMasterRecord(res.data.data || res.data);
  },
  delete: async (id: number) => {
    await api.delete(`/personas/${id}`);
    removePersonaSubjectBinding(id);
  },
  checkDuplicate: async (
    name: string,
    categoryId?: number | null,
    subjectId?: number | null
  ): Promise<PersonaDuplicateCheckResponse> => {
    const res = await api.get('/personas/check-duplicate', {
      params: {
        name,
        ...(typeof categoryId === 'number' ? { category_id: categoryId } : {}),
        ...(typeof subjectId === 'number' ? { subject_id: subjectId } : {}),
      },
    });
    return {
      duplicate: Boolean(res.data?.duplicate),
      is_locked: Boolean(res.data?.is_locked),
      existing: res.data?.existing ? normalizeMasterRecord(res.data.existing) : null,
    };
  },
  generateDescription: async (payload: { name: string; category_id: number; subject_id?: number | null }): Promise<PersonaSuggestionResponse> => {
    const res = await api.post('/personas/generate-description', payload);
    return {
      suggestions: Array.isArray(res.data?.suggestions) ? res.data.suggestions : [],
      source: res.data?.source || 'fallback',
      cached: Boolean(res.data?.cached),
      usage: res.data?.usage || null,
      reason: res.data?.reason || null,
    };
  },
  trackSuggestionSelection: async (payload: { name: string; category_id: number; subject_id?: number | null; label: string }): Promise<void> => {
    await api.post('/personas/suggestion-selected', payload);
  },
};

export const categoriesService = {
  list: async (): Promise<PersonaCategory[]> => {
    const res = await api.get('/categories');
    const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
    return payload.map((item: any) => ({
      id: Number(item.id),
      tenant_id: item.tenant_id ?? null,
      name: item.name,
      description: item.description ?? null,
      position: item.position ?? null,
    }));
  },
};

export const getMasterAvatarAssignmentCount = (record: Partial<Master> & Record<string, unknown>): number => {
  const numericKeys = [
    'avatar_count',
    'avatars_count',
    'usage_count',
    'linked_avatar_count',
    'assigned_avatar_count',
  ];

  for (const key of numericKeys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  const arrayKeys = ['avatar_usages', 'avatars', 'linked_avatars'];
  for (const key of arrayKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return 0;
};

export const isMasterAssignedToAvatar = (record: Partial<Master> & Record<string, unknown>): boolean =>
  getMasterAvatarAssignmentCount(record) > 0;
