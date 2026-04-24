import api from '@/lib/api';
import organizationService from '@/services/organizationService';
import type { OrganizationItem } from '@/types/organization';

export type OrganizationMemberRecord = {
  id: number;
  organization_id: number;
  user_id: number;
  role: string;
  added_at: string;
  status: number;
  user?: {
    id: number;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type OrganizationBatchRecord = {
  id: number;
  organization_id: number;
  name: string;
  description?: string | null;
  schedule_days: string;
  schedule_time: string;
  duration_minutes: number;
  avatar_id?: number | null;
  course_id?: number | null;
  created_by?: number | null;
  status: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationBatchMemberRecord = {
  id: number;
  batch_id: number;
  member_id: number;
  added_at: string;
  status: number;
};

export type OrganizationEntitlementRecord = {
  id: number;
  organization_id: number;
  avatar_id: number;
  source_type: string;
  purchase_id?: number | null;
  assigned_by?: number | null;
  valid_until?: string | null;
  status: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationPurchaseRecord = {
  id: number;
  organization_id: number;
  item_type: string;
  item_id: number;
  quantity: number;
  price: number;
  total_minutes: number;
  valid_from?: string | null;
  valid_until?: string | null;
  transaction_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type BatchPayload = {
  name: string;
  description?: string | null;
  schedule_days: string;
  schedule_time: string;
  duration_minutes: number;
  avatar_id?: number | null;
  course_id?: number | null;
  status?: number | null;
};

export type EntitlementPayload = {
  avatar_id: number;
  source_type: string;
  purchase_id?: number | null;
  valid_until?: string | null;
};

const organizationAdminService = {
  listOrganizations: (params?: { limit?: number; skip?: number }) =>
    organizationService.listOrganizations(params),

  listMembers: async (orgId: number) => {
    const response = await api.get<OrganizationMemberRecord[]>(`/organizations/${orgId}/members`, {
      params: { limit: 100, skip: 0 },
    });
    return response.data ?? [];
  },

  listBatches: async (orgId: number) => {
    const response = await api.get<OrganizationBatchRecord[]>(`/organizations/${orgId}/batches`, {
      params: { limit: 100, skip: 0 },
    });
    return response.data ?? [];
  },

  createBatch: async (orgId: number, payload: BatchPayload) => {
    const response = await api.post<OrganizationBatchRecord>(`/organizations/${orgId}/batches`, payload);
    return response.data;
  },

  updateBatch: async (orgId: number, batchId: number, payload: BatchPayload) => {
    const response = await api.put<OrganizationBatchRecord>(`/organizations/${orgId}/batches/${batchId}`, payload);
    return response.data;
  },

  deleteBatch: async (orgId: number, batchId: number) => {
    await api.delete(`/organizations/${orgId}/batches/${batchId}`);
  },

  listBatchMembers: async (orgId: number, batchId: number) => {
    const response = await api.get<OrganizationBatchMemberRecord[]>(`/organizations/${orgId}/batches/${batchId}/members`);
    return response.data ?? [];
  },

  addBatchMembersBulk: async (orgId: number, batchId: number, memberIds: number[]) => {
    const response = await api.post<OrganizationBatchMemberRecord[]>(
      `/organizations/${orgId}/batches/${batchId}/members/bulk`,
      { member_ids: memberIds }
    );
    return response.data ?? [];
  },

  removeBatchMember: async (orgId: number, batchId: number, batchMemberId: number) => {
    await api.delete(`/organizations/${orgId}/batches/${batchId}/members/${batchMemberId}`);
  },

  listEntitlements: async (orgId: number) => {
    const response = await api.get<OrganizationEntitlementRecord[]>(`/organizations/${orgId}/entitlements`);
    return response.data ?? [];
  },

  assignEntitlement: async (orgId: number, payload: EntitlementPayload) => {
    const response = await api.post<OrganizationEntitlementRecord>(`/organizations/${orgId}/entitlements`, payload);
    return response.data;
  },

  removeEntitlement: async (orgId: number, entitlementId: number) => {
    await api.delete(`/organizations/${orgId}/entitlements/${entitlementId}`);
  },

  listPurchases: async (orgId: number) => {
    const response = await api.get<OrganizationPurchaseRecord[]>(`/organizations/${orgId}/purchases`);
    return response.data ?? [];
  },
};

export default organizationAdminService;
export type { OrganizationItem };
