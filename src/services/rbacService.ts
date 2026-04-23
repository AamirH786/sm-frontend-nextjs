import api from '@/lib/api';
import { normalizePaginationMeta } from '@/lib/pagination';

export interface Module {
  id: number;
  title: string;
  slug: string;
  group?: string;
  status: number;
  created_at?: string;
}

export interface Action {
  id: number;
  title: string;
  slug: string;
  status: number;
  created_at?: string;
}

export interface Permission {
  id: number;
  title?: string;
  slug: string;
  module_id: number;
  action_id: number;
  module?: Module;
  action?: Action;
  status: number;
  created_at?: string;
}

export interface Role {
  id: number;
  title: string;
  status: number;
  is_super_admin?: boolean;
  created_at?: string;
}

export interface User {
  id: number;
  username: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: number;
  role_title?: string;
  user_type?: string;
  phone?: string;
  status?: number;
  role?: Role;
  created_at?: string;
}

export interface UserDependencyCheckResponse {
  can_delete?: boolean;
  has_dependencies?: boolean;
  dependency_count?: number;
  dependencies?: unknown;
  message?: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalPages: number;
    page: number;
    limit: number;
    total: number;
  };
}

const MAX_LIST_PAGE_SIZE = 100;

function normalizeListResponse<T>(response: any): PaginatedResponse<T> {
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: normalizePaginationMeta(undefined, {
        page: 1,
        limit: response.length || 10,
        total: response.length,
      }),
    };
  }

  if (response?.data && Array.isArray(response.data)) {
    return {
      data: response.data,
      meta: normalizePaginationMeta(response.meta ?? response, {
        page: 1,
        limit: response.data.length || 10,
        total: response.data.length,
      }),
    };
  }

  return {
    data: [],
    meta: normalizePaginationMeta(undefined, { page: 1, limit: 10, total: 0 }),
  };
}

function normalizeItemResponse<T>(response: any): T {
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  return response;
}

async function fetchAllPaginated<T>(
  loader: (params: { page: number; limit: number }) => Promise<PaginatedResponse<T>>
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await loader({ page, limit: MAX_LIST_PAGE_SIZE });
    allItems.push(...response.data);
    totalPages = response.meta.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return allItems;
}

const modulesService = {
  async list(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Module>> {
    const res = await api.get('/modules', { params });
    return normalizeListResponse<Module>(res.data);
  },
  async listAll(): Promise<Module[]> {
    return fetchAllPaginated((params) => modulesService.list(params));
  },
  async get(id: number): Promise<Module> {
    const res = await api.get(`/modules/${id}`);
    return normalizeItemResponse<Module>(res.data);
  },
  async create(data: { title: string; slug?: string; group?: string; status?: number }): Promise<Module> {
    const res = await api.post('/modules', data);
    return normalizeItemResponse<Module>(res.data);
  },
  async update(id: number, data: { title?: string; slug?: string; group?: string; status?: number }): Promise<Module> {
    const res = await api.put(`/modules/${id}`, data);
    return normalizeItemResponse<Module>(res.data);
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/modules/${id}`);
  },
};

const actionsService = {
  async list(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Action>> {
    const res = await api.get('/actions', { params });
    return normalizeListResponse<Action>(res.data);
  },
  async get(id: number): Promise<Action> {
    const res = await api.get(`/actions/${id}`);
    return normalizeItemResponse<Action>(res.data);
  },
  async create(data: { title: string; slug?: string; status?: number }): Promise<Action> {
    const res = await api.post('/actions', data);
    return normalizeItemResponse<Action>(res.data);
  },
  async update(id: number, data: { title?: string; slug?: string; status?: number }): Promise<Action> {
    const res = await api.put(`/actions/${id}`, data);
    return normalizeItemResponse<Action>(res.data);
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/actions/${id}`);
  },
};

const permissionsService = {
  async list(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Permission>> {
    const res = await api.get('/permissions', { params });
    return normalizeListResponse<Permission>(res.data);
  },
  async listAll(): Promise<Permission[]> {
    return fetchAllPaginated((params) => permissionsService.list(params));
  },
  async get(id: number): Promise<Permission> {
    const res = await api.get(`/permissions/${id}`);
    return normalizeItemResponse<Permission>(res.data);
  },
  async create(data: { title: string; slug?: string; module_id?: number; action_id?: number; status?: number }): Promise<Permission> {
    const res = await api.post('/permissions', data);
    return normalizeItemResponse<Permission>(res.data);
  },
  async update(id: number, data: { title?: string; slug?: string; module_id?: number; action_id?: number; status?: number }): Promise<Permission> {
    const res = await api.put(`/permissions/${id}`, data);
    return normalizeItemResponse<Permission>(res.data);
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/permissions/${id}`);
  },
};

const rolesService = {
  async list(params?: { page?: number; limit?: number; search?: string; exclude_client?: boolean }): Promise<PaginatedResponse<Role>> {
    const res = await api.get('/roles', { params });
    return normalizeListResponse<Role>(res.data);
  },
  async get(id: number): Promise<Role> {
    const res = await api.get(`/roles/${id}`);
    return normalizeItemResponse<Role>(res.data);
  },
  async create(data: { title: string; status?: number; is_super_admin?: boolean }): Promise<Role> {
    const res = await api.post('/roles', data);
    return normalizeItemResponse<Role>(res.data);
  },
  async update(id: number, data: { title?: string; status?: number; is_super_admin?: boolean }): Promise<Role> {
    const res = await api.put(`/roles/${id}`, data);
    return normalizeItemResponse<Role>(res.data);
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/roles/${id}`);
  },
  async getPermissions(roleId: number): Promise<number[]> {
    try {
      const mappings = await fetchAllPaginated<{ permission_id?: number; id?: number }>((params) =>
        api
          .get('/role-permissions', {
            params: {
              role_id: roleId,
              ...params,
            },
          })
          .then((res) => normalizeListResponse<{ permission_id?: number; id?: number }>(res.data))
      );

      return mappings
        .map((mapping) => mapping.permission_id || mapping.id)
        .filter((value): value is number => typeof value === 'number');
    } catch {
      return [];
    }
  },
  async assignPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await api.post(`/role-permissions/${roleId}/permissions/bulk`, { permission_ids: permissionIds });
  },
};

const usersService = {
  async list(params?: { page?: number; limit?: number; search?: string; role_id?: number; status?: number; exclude_client?: boolean; sortBy?: string; sortOrder?: string }): Promise<PaginatedResponse<User>> {
    const res = await api.get('/users', { params });
    return normalizeListResponse<User>(res.data);
  },
  async get(id: number): Promise<User> {
    const res = await api.get(`/users/${id}`);
    return normalizeItemResponse<User>(res.data);
  },
  async getClientDetails(id: number): Promise<any> {
    const res = await api.get(`/users/${id}/client-details`);
    return res.data?.data ?? res.data;
  },
  async create(data: { name: string; password: string; email: string; role_id?: number }): Promise<User> {
    const res = await api.post('/users/admin-create', data);
    return normalizeItemResponse<User>(res.data);
  },
  async update(id: number, data: { name?: string; email?: string; role_id?: number }): Promise<User> {
    const res = await api.put(`/users/${id}`, data);
    return normalizeItemResponse<User>(res.data);
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
  async dependencyCheck(id: number): Promise<UserDependencyCheckResponse> {
    const res = await api.get(`/users/${id}/dependency-check`);
    return res.data;
  },
  async exportUser(id: number, format: 'csv' | 'excel'): Promise<Blob> {
    const res = await api.get(`/users/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
};

export {
  modulesService,
  actionsService,
  permissionsService,
  rolesService,
  usersService,
};
