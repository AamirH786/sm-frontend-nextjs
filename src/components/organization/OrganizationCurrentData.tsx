'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useOrganizationCurrentData<T>(endpoint: string | null) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (!endpoint) {
      setState({
        data: null,
        loading: false,
        error: 'Organization context not available.',
      });
      return;
    }

    try {
      setState((current) => ({ ...current, loading: true, error: null }));
      const response = await api.get(endpoint);
      if (requestId !== requestIdRef.current) return;

      setState({
        data: response.data as T,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return;
      if (error?.cancelled) return;

      setState({
        data: null,
        loading: false,
        error: error?.message || error?.response?.data?.detail || 'Unable to load organization data.',
      });
    }
  }, [endpoint]);

  useEffect(() => {
    const run = async () => {
      if (!endpoint) {
        setState({
          data: null,
          loading: false,
          error: 'Organization context not available.',
        });
        return;
      }

      await load();
    };

    run();
  }, [endpoint, load]);

  return {
    ...state,
    reload: load,
  };
}

export function OrganizationPanelState({
  loading,
  error,
  emptyMessage,
  hasData,
  children,
}: {
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return <>{children}</>;
}
