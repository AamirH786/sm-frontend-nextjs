'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import organizationService, { type ListOrganizationsParams } from '@/services/organizationService';
import type {
  OrganizationCreatePayload,
  OrganizationItem,
  OrganizationOnboardResponse,
  OrganizationUpdatePayload,
} from '@/types/organization';

type OrganizationsContextValue = {
  items: OrganizationItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  limit: number;
  skip: number;
  fetchOrganizations: (params?: ListOrganizationsParams) => Promise<OrganizationItem[]>;
  createOrganization: (payload: OrganizationCreatePayload) => Promise<OrganizationOnboardResponse>;
  updateOrganization: (orgId: number, payload: OrganizationUpdatePayload) => Promise<OrganizationItem>;
  deleteOrganization: (orgId: number) => Promise<void>;
};

const OrganizationsContext = createContext<OrganizationsContextValue | undefined>(undefined);

const sortByNewest = (items: OrganizationItem[]) =>
  [...items].sort((a, b) => {
    const aTime = a.created_at ? Date.parse(a.created_at) : 0;
    const bTime = b.created_at ? Date.parse(b.created_at) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return b.id - a.id;
  });

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);
  const paginationRef = useRef({ limit: 20, skip: 0 });
  const itemsRef = useRef<OrganizationItem[]>([]);

  const updateItems = useCallback((nextItems: OrganizationItem[] | ((current: OrganizationItem[]) => OrganizationItem[])) => {
    setItems((current) => {
      const resolved = typeof nextItems === 'function'
        ? (nextItems as (current: OrganizationItem[]) => OrganizationItem[])(current)
        : nextItems;
      itemsRef.current = resolved;
      return resolved;
    });
  }, []);

  const fetchOrganizations = useCallback(async (params: ListOrganizationsParams = {}) => {
    const nextLimit = params.limit ?? paginationRef.current.limit;
    const nextSkip = params.skip ?? paginationRef.current.skip;
    paginationRef.current = { limit: nextLimit, skip: nextSkip };
    setLimit(nextLimit);
    setSkip(nextSkip);
    setLoading(true);
    setError(null);
    try {
      const response = await organizationService.listOrganizations({
        ...params,
        limit: nextLimit,
        skip: nextSkip,
      });
      const sorted = sortByNewest(response);
      updateItems(sorted);
      return sorted;
    } catch (err: any) {
      if (err?.cancelled) {
        return itemsRef.current;
      }
      const message = err?.message || 'Unable to load organizations.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateItems]);

  const createOrganization = useCallback(async (payload: OrganizationCreatePayload) => {
    setSaving(true);
    setError(null);
    try {
      const created = await organizationService.onboardOrganization(payload);
      updateItems((current) => sortByNewest([created.organization, ...current]));
      return created;
    } catch (err: any) {
      const message = err?.message || 'Unable to create organization.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [updateItems]);

  const updateOrganization = useCallback(async (orgId: number, payload: OrganizationUpdatePayload) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await organizationService.updateOrganization(orgId, payload);
      updateItems((current) => sortByNewest(current.map((item) => (item.id === orgId ? { ...item, ...updated } : item))));
      return updated;
    } catch (err: any) {
      const message = err?.message || 'Unable to update organization.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [updateItems]);

  const deleteOrganization = useCallback(async (orgId: number) => {
    setSaving(true);
    setError(null);
    try {
      await organizationService.deleteOrganization(orgId);
      updateItems((current) => current.filter((item) => item.id !== orgId));
    } catch (err: any) {
      const message = err?.message || 'Unable to delete organization.';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [updateItems]);

  const value = useMemo<OrganizationsContextValue>(() => ({
    items,
    loading,
    saving,
    error,
    limit,
    skip,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  }), [
    items,
    loading,
    saving,
    error,
    limit,
    skip,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  ]);

  return <OrganizationsContext.Provider value={value}>{children}</OrganizationsContext.Provider>;
}

export function useOrganizations() {
  const context = useContext(OrganizationsContext);
  if (!context) {
    throw new Error('useOrganizations must be used within OrganizationsProvider');
  }
  return context;
}
