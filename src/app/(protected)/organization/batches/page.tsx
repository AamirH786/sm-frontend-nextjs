'use client';

import { useAuth } from '@/hooks/useAuth';
import { OrganizationPanelState, useOrganizationCurrentData } from '@/components/organization/OrganizationCurrentData';

type BatchItem = {
  id: number;
  name: string;
  description?: string | null;
  schedule_days: string;
  schedule_time: string;
  duration_minutes: number;
  status: number;
};

export default function OrganizationBatchesPage() {
  const { userContext } = useAuth();
  const endpoint = userContext?.organization?.id ? '/organizations/current/batches' : null;
  const { data, loading, error } = useOrganizationCurrentData<BatchItem[]>(endpoint);
  const batches = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Batches</h1>
        <p className="mt-2 text-sm text-slate-500">Manage organization training schedules and avatar-linked cohorts.</p>
      </div>

      <OrganizationPanelState
        loading={loading}
        error={error}
        emptyMessage="No batches created for this organization yet."
        hasData={batches.length > 0}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {batches.map((batch) => (
            <article key={batch.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{batch.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">{batch.description || 'Organization batch schedule.'}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
                  {batch.status === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <span>{batch.schedule_days}</span>
                <span>{batch.schedule_time}</span>
                <span>{batch.duration_minutes} minutes</span>
                <span>Tenant scoped</span>
              </div>
            </article>
          ))}
        </div>
      </OrganizationPanelState>
    </div>
  );
}
