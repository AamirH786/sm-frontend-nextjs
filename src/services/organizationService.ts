import api from '@/lib/api';
import type {
  OrganizationCreatePayload,
  OrganizationItem,
  OrganizationOnboardResponse,
  OrganizationUpdatePayload,
} from '@/types/organization';

export type ListOrganizationsParams = {
  limit?: number;
  skip?: number;
  status?: string | number;
};

const normalizeOrganizationList = (payload: unknown): OrganizationItem[] => {
  if (Array.isArray(payload)) {
    return payload as OrganizationItem[];
  }

  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const possibleCollections = [data.items, data.results, data.data, data.organizations];
    const firstCollection = possibleCollections.find((entry) => Array.isArray(entry));
    if (Array.isArray(firstCollection)) {
      return firstCollection as OrganizationItem[];
    }
  }

  return [];
};

const organizationService = {
  async listOrganizations(params: ListOrganizationsParams = {}) {
    const requestParams: Record<string, string | number> = {
      limit: params.limit ?? 20,
      skip: params.skip ?? 0,
    };
    if (params.status !== undefined && params.status !== null && params.status !== '') {
      requestParams.status = params.status;
    }

    try {
      const response = await api.get<OrganizationItem[] | Record<string, unknown>>('/organizations', {
        params: requestParams,
      });
      const normalized = normalizeOrganizationList(response.data);
      if (normalized.length > 0 || requestParams.skip !== 0) {
        return normalized;
      }

      // Some deployments expose the list only with trailing slash; try once before returning empty.
      const fallbackResponse = await api.get<OrganizationItem[] | Record<string, unknown>>('/organizations/', {
        params: requestParams,
      });
      return normalizeOrganizationList(fallbackResponse.data);
    } catch (error: any) {
      if (error?.status === 404) {
        const fallbackResponse = await api.get<OrganizationItem[] | Record<string, unknown>>('/organizations/', {
          params: requestParams,
        });
        return normalizeOrganizationList(fallbackResponse.data);
      }
      throw error;
    }
  },

  async onboardOrganization(payload: OrganizationCreatePayload) {
    const apiPayload = {
      name: payload.name,
      email: payload.contact_person_email,
      phone: payload.contact_person_phone || null,
      address: payload.address || null,
      website: payload.website || null,
      logo_url: payload.logo_url || null,
      theme_color: payload.theme_color || null,
      description: payload.description || null,
      industry: payload.industry || null,
      contact_person_name: payload.contact_person_name,
      contact_person_email: payload.contact_person_email,
      contact_person_phone: payload.contact_person_phone || null,
    };
    const response = await api.post<OrganizationOnboardResponse>('/organizations/onboard', apiPayload);
    return response.data;
  },

  async updateOrganization(orgId: number, payload: OrganizationUpdatePayload) {
    const response = await api.put<OrganizationItem>(`/organizations/${orgId}`, payload);
    return response.data;
  },

  async deleteOrganization(orgId: number) {
    const response = await api.delete<{ message: string }>(`/organizations/${orgId}`);
    return response.data;
  },
};

export default organizationService;
