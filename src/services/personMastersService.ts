import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base';

export interface PersonDocument {
  id: number;
  person_id: number;
  file_name: string;
  file_type: string;
  file_size: number | null;
  chunk_count: number;
  status: string;
  created_at: string;
}

export interface Person {
  id: number;
  name: string;
  designation?: string;
  company?: string;
  address?: string;
  description: string;
  photo_url?: string;
  face_descriptor?: number[] | null;
  document_count?: number;
  chunk_count?: number;
  documents?: PersonDocument[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PersonCreateData {
  name: string;
  designation?: string;
  company?: string;
  address?: string;
  description: string;
  photo?: File;
  face_descriptor?: number[];
}

export interface PersonListParams {
  page?: number;
  limit?: number;
  search?: string;
}

interface ApiResponse {
  data: Person[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const personMastersService = {
  list: async (params?: PersonListParams): Promise<ApiResponse> => {
    const skip = params?.page && params?.limit ? (params.page - 1) * params.limit : 0;
    const limit = params?.limit ?? 50;
    const res = await api.get('/persons/', { params: { skip, limit } });
    const d = res.data;
    const items: Person[] = d.data ?? [];
    const total: number = d.total ?? items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: items,
      meta: { page: params?.page ?? 1, limit, total, totalPages },
    };
  },

  get: async (id: number): Promise<Person> => {
    const res = await api.get(`/persons/${id}`);
    return res.data;
  },

  create: async (data: PersonCreateData): Promise<Person> => {
    const form = new FormData();
    form.append('name', data.name);
    form.append('description', data.description);
    if (data.designation) form.append('designation', data.designation);
    if (data.company) form.append('company', data.company);
    if (data.address) form.append('address', data.address);
    if (data.photo) form.append('photo', data.photo);
    if (data.face_descriptor) form.append('face_descriptor', JSON.stringify(data.face_descriptor));
    const res = await api.post('/persons/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },

  update: async (id: number, data: Partial<PersonCreateData>): Promise<Person> => {
    const form = new FormData();
    if (data.name) form.append('name', data.name);
    if (data.description !== undefined) form.append('description', data.description || '');
    if (data.designation !== undefined) form.append('designation', data.designation || '');
    if (data.company !== undefined) form.append('company', data.company || '');
    if (data.address !== undefined) form.append('address', data.address || '');
    if (data.photo) form.append('photo', data.photo);
    if (data.face_descriptor) form.append('face_descriptor', JSON.stringify(data.face_descriptor));
    const res = await api.put(`/persons/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/persons/${id}`);
  },

  uploadDocument: async (personId: number, file: File): Promise<PersonDocument> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/persons/${personId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteDocument: async (personId: number, docId: number): Promise<void> => {
    await api.delete(`/persons/${personId}/documents/${docId}`);
  },

  photoUrl: (id: number): string => {
    const base = getApiBaseUrl();
    return `${base}/persons/${id}/photo`;
  },
};
