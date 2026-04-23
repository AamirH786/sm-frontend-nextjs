import api from '@/lib/api';

export interface ResponseLanguage {
  id: number;
  code: string;
  name: string;
  native_name?: string | null;
  locale?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const LANGUAGE_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedLanguages: ResponseLanguage[] | null = null;
let cachedAt = 0;
let cachedAllLanguages: ResponseLanguage[] | null = null;
let cachedAllAt = 0;

export interface ResponseLanguagePayload {
  code: string;
  name: string;
  native_name?: string | null;
  locale?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

export const languagesService = {
  listActive: async (force = false): Promise<ResponseLanguage[]> => {
    if (!force && cachedLanguages && Date.now() - cachedAt < LANGUAGE_CACHE_TTL_MS) {
      return cachedLanguages;
    }

    const res = await api.get('/languages');
    const payload = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    cachedLanguages = payload;
    cachedAt = Date.now();
    return payload;
  },
  listAll: async (force = false): Promise<ResponseLanguage[]> => {
    if (!force && cachedAllLanguages && Date.now() - cachedAllAt < LANGUAGE_CACHE_TTL_MS) {
      return cachedAllLanguages;
    }

    const res = await api.get('/languages', { params: { include_inactive: true } });
    const payload = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    cachedAllLanguages = payload;
    cachedAllAt = Date.now();
    return payload;
  },
  create: async (data: ResponseLanguagePayload): Promise<ResponseLanguage> => {
    const res = await api.post('/languages', data);
    cachedLanguages = null;
    cachedAt = 0;
    cachedAllLanguages = null;
    cachedAllAt = 0;
    return res.data?.data || res.data;
  },
  update: async (id: number, data: Partial<ResponseLanguagePayload>): Promise<ResponseLanguage> => {
    const res = await api.patch(`/languages/${id}`, data);
    cachedLanguages = null;
    cachedAt = 0;
    cachedAllLanguages = null;
    cachedAllAt = 0;
    return res.data?.data || res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/languages/${id}`);
    cachedLanguages = null;
    cachedAt = 0;
    cachedAllLanguages = null;
    cachedAllAt = 0;
  },
  clearCache: () => {
    cachedLanguages = null;
    cachedAt = 0;
    cachedAllLanguages = null;
    cachedAllAt = 0;
  },
};
