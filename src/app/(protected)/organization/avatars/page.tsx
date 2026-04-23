'use client';

import { OrganizationPanelState, useOrganizationCurrentData } from '@/components/organization/OrganizationCurrentData';

type AvatarItem = {
  avatar_id: number;
  avatar_name: string;
  description?: string | null;
  preview_image?: string | null;
  price: number;
  minutes_per_month: number;
  validity_days: number;
  is_assigned: boolean;
};

function AvatarsContent() {
  const { data, loading, error } = useOrganizationCurrentData<{ items: AvatarItem[] }>('/organizations/current/avatars');
  const assigned = (data?.items ?? []).filter((item) => item.is_assigned);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">My Avatars</h1>
        <p className="mt-2 text-sm text-slate-500">Only avatars assigned to your organization are shown here.</p>
      </div>

      <OrganizationPanelState
        loading={loading}
        error={error}
        emptyMessage="Aapke paas koi avatar nahi hai. Ek ya adhik avatar lene ke liye purchase karein."
        hasData={assigned.length > 0}
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {assigned.map((item) => (
            <article key={item.avatar_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                {item.preview_image ? (
                  <img src={item.preview_image} alt={item.avatar_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No preview</div>
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{item.avatar_name}</h2>
              <p className="mt-2 text-sm text-slate-500">{item.description || 'Assigned avatar ready for organization use.'}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{item.minutes_per_month} min / month</span>
                <span>{item.validity_days} days</span>
              </div>
            </article>
          ))}
        </div>
      </OrganizationPanelState>
    </div>
  );
}

export default function OrganizationAvatarsPage() {
  return <AvatarsContent />;
}
